"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { endVisit, saveVisitNote, sendVisitFile } from "@/server/visit";

type Role = "patient" | "clinician";
type ChatMessage = { id: string; mine: boolean; body: string; at: string };
type Signal = { id: string; kind: string; payload: string; at: string };
type Conn = "waiting" | "connecting" | "connected" | "reconnecting" | "ended";

type Props = {
  appointmentId: string;
  role: Role;
  otherName: string;
  startsAt: string;
  endsAt: string;
  serverNow: string;
  iceServers: RTCIceServer[];
  tests: { slug: string; title: string; code: string }[];
};

const fa = (n: number) => n.toLocaleString("fa-IR");
const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${fa(Math.floor(s / 60)).padStart(2, "۰")}:${fa(s % 60).padStart(2, "۰")}`;
};
const rid = () => Math.random().toString(36).slice(2, 10);

const CONN_LABEL: Record<Conn, { text: string; style: string }> = {
  waiting: { text: "در انتظار ورود طرف مقابل", style: "bg-amber-100 text-amber-800" },
  connecting: { text: "در حال برقراری اتصال…", style: "bg-sky-100 text-sky-800" },
  connected: { text: "متصل", style: "bg-emerald-100 text-emerald-800" },
  reconnecting: { text: "اتصال ضعیف، در حال اتصال دوباره…", style: "bg-orange-100 text-orange-800" },
  ended: { text: "جلسه پایان یافت", style: "bg-slate-200 text-slate-700" },
};

/** پیام‌های چت که لینک تست دارند قابل کلیک می‌شوند */
const FILE_RE = /^\[\[file:([a-z0-9]+)\|([a-z/]+)\|(.+)\]\]$/;

function ChatBody({ text }: { text: string }) {
  const file = FILE_RE.exec(text);
  if (file) {
    const [, id, mime, name] = file;
    const href = `/api/files/${id}`;
    return mime.startsWith("image/") ? (
      <a href={href} target="_blank" rel="noopener" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={name} className="max-h-48 rounded-lg" />
      </a>
    ) : (
      <a href={href} target="_blank" rel="noopener" className="font-bold underline" dir="auto">
        📎 {name}
      </a>
    );
  }
  const parts = text.split(/(\/tests\/[a-z0-9-]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\/tests\/[a-z0-9-]+$/.test(p) ? (
          <Link key={i} href={p} target="_blank" className="font-bold underline">
            باز کردن تست
          </Link>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function VisitRoom(props: Props) {
  const { appointmentId, role, otherName, iceServers, tests } = props;
  const isClinician = role === "clinician";

  const [joined, setJoined] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [conn, setConn] = useState<Conn>("waiting");
  const [otherOnline, setOtherOnline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [now, setNow] = useState(() => Date.now());
  const [stats, setStats] = useState<{ rtt?: number; loss?: number } | null>(null);
  const [unread, setUnread] = useState(0);
  const [tab, setTab] = useState<"chat" | "note">("chat");

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenTrack = useRef<MediaStreamTrack | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  /** شناسه‌ی نسخه‌ی فعلی اتصال (هر offer یک شناسه‌ی تازه دارد) */
  const pcId = useRef<string | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const mySession = useRef(rid());
  const otherSession = useRef<string | null>(null);
  const seen = useRef(new Set<string>());
  const since = useRef(props.serverNow);
  const msgSince = useRef(new Date(0).toISOString());
  const ended = useRef(false);
  const chatBox = useRef<HTMLDivElement>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const post = useCallback(
    (body: object) =>
      fetch(`/api/visit/${appointmentId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null),
    [appointmentId],
  );
  const signal = useCallback((kind: string, payload: object) => post({ type: "signal", kind, payload: JSON.stringify(payload) }), [post]);

  // ساعت جلسه
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // پیش‌نمایش دوربین و میکروفون (اتاق انتظار)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { width: 1280, height: 720 } });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        localStream.current = s;
      } catch {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) return s.getTracks().forEach((t) => t.stop());
          localStream.current = s;
          setCamOn(false);
          setMediaError("دوربین در دسترس نیست؛ جلسه به‌صورت صوتی برگزار می‌شود.");
        } catch {
          setMicOn(false);
          setCamOn(false);
          setMediaError("دسترسی به دوربین و میکروفون داده نشد. می‌توانید از چت استفاده کنید یا دسترسی را در مرورگر فعال کنید و صفحه را دوباره باز کنید.");
        }
      }
      if (localVideo.current && localStream.current) localVideo.current.srcObject = localStream.current;
    })();
    return () => {
      cancelled = true;
      localStream.current?.getTracks().forEach((t) => t.stop());
      screenTrack.current?.stop();
      pc.current?.close();
    };
  }, []);

  const applyBandwidth = useCallback(async (low: boolean) => {
    const sender = pc.current?.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings[0].maxBitrate = low ? 150_000 : 1_500_000;
    params.encodings[0].scaleResolutionDownBy = low ? 3 : 1;
    await sender.setParameters(params).catch(() => {});
  }, []);

  const newPeer = useCallback(
    (id: string) => {
      pc.current?.close();
      pendingIce.current = [];
      pcId.current = id;
      const peer = new RTCPeerConnection({ iceServers });
      pc.current = peer;
      const stream = localStream.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          if (track.kind === "video" && screenTrack.current) peer.addTrack(screenTrack.current, stream);
          else peer.addTrack(track, stream);
        }
      }
      // اگر محلی دوربین یا میکروفون نداریم، باز هم دریافت تصویر و صدای طرف مقابل ممکن باشد
      if (!stream?.getAudioTracks().length) peer.addTransceiver("audio", { direction: "recvonly" });
      if (!stream?.getVideoTracks().length) peer.addTransceiver("video", { direction: "recvonly" });

      peer.ontrack = (e) => {
        if (remoteVideo.current && e.streams[0]) remoteVideo.current.srcObject = e.streams[0];
      };
      peer.onicecandidate = (e) => {
        if (e.candidate) signal("ice", { pc: id, candidate: e.candidate.toJSON() });
      };
      peer.onconnectionstatechange = () => {
        if (pc.current !== peer || ended.current) return;
        const st = peer.connectionState;
        if (st === "connected") {
          setConn("connected");
          applyBandwidth(lowRef.current);
        } else if (st === "disconnected") setConn("reconnecting");
        else if (st === "failed") {
          setConn("reconnecting");
          // متخصص اتصال را از نو می‌سازد
          if (isClinician) setTimeout(() => pc.current === peer && makeOffer(), 1500);
        }
      };
      return peer;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iceServers, signal, isClinician, applyBandwidth],
  );

  const lowRef = useRef(lowBandwidth);
  lowRef.current = lowBandwidth;

  const makeOffer = useCallback(async () => {
    const id = rid();
    const peer = newPeer(id);
    setConn("connecting");
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    signal("offer", { pc: id, sdp: peer.localDescription });
  }, [newPeer, signal]);

  const flushIce = async () => {
    const peer = pc.current;
    if (!peer?.remoteDescription) return;
    for (const c of pendingIce.current.splice(0)) await peer.addIceCandidate(c).catch(() => {});
  };

  const handleSignal = useCallback(
    async (s: Signal) => {
      let data: { pc?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; session?: string } = {};
      try {
        data = JSON.parse(s.payload);
      } catch {}
      if (s.kind === "bye") {
        ended.current = true;
        setConn("ended");
        pc.current?.close();
        return;
      }
      if (s.kind === "hello") {
        // ورود تازه‌ی طرف مقابل (یا بارگذاری دوباره‌ی صفحه‌اش): متخصص اتصال تازه پیشنهاد می‌دهد
        if (data.session && data.session !== otherSession.current) {
          otherSession.current = data.session;
          if (isClinician) await makeOffer();
        }
        return;
      }
      if (s.kind === "offer" && !isClinician && data.pc && data.sdp) {
        const peer = newPeer(data.pc);
        setConn("connecting");
        await peer.setRemoteDescription(data.sdp);
        await flushIce();
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        signal("answer", { pc: data.pc, sdp: peer.localDescription });
        return;
      }
      if (s.kind === "answer" && isClinician && data.pc === pcId.current && data.sdp && pc.current?.signalingState === "have-local-offer") {
        await pc.current.setRemoteDescription(data.sdp);
        await flushIce();
        return;
      }
      if (s.kind === "ice" && data.pc === pcId.current && data.candidate) {
        pendingIce.current.push(data.candidate);
        await flushIce();
      }
    },
    [isClinician, makeOffer, newPeer, signal],
  );

  // polling سیگنال‌ها و پیام‌ها
  useEffect(() => {
    if (!joined) return;
    let stop = false;
    let busy = false;
    const tick = async () => {
      if (busy || stop) return;
      busy = true;
      try {
        const res = await fetch(`/api/visit/${appointmentId}?since=${encodeURIComponent(since.current)}&msgSince=${encodeURIComponent(msgSince.current)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data: { status: string; otherOnline: boolean; signals: Signal[]; messages: ChatMessage[] } = await res.json();
          setOtherOnline(data.otherOnline);
          if (data.status === "COMPLETED" || data.status === "CANCELLED") {
            ended.current = true;
            setConn("ended");
            pc.current?.close();
          }
          for (const s of data.signals) {
            if (seen.current.has(s.id)) continue;
            seen.current.add(s.id);
            since.current = s.at;
            await handleSignal(s);
          }
          const fresh = data.messages.filter((m) => !seen.current.has(m.id));
          if (fresh.length) {
            fresh.forEach((m) => seen.current.add(m.id));
            msgSince.current = fresh[fresh.length - 1].at;
            setMessages((prev) => [...prev, ...fresh]);
            const fromOther = fresh.filter((m) => !m.mine).length;
            if (fromOther && tabRef.current !== "chat") setUnread((u) => u + fromOther);
          }
        }
      } finally {
        busy = false;
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    // اعلام حضور هر ۵ ثانیه
    const hello = () => !ended.current && signal("hello", { session: mySession.current });
    hello();
    const h = setInterval(hello, 5000);
    return () => {
      stop = true;
      clearInterval(t);
      clearInterval(h);
    };
  }, [joined, appointmentId, handleSignal, signal]);

  // کیفیت اتصال
  useEffect(() => {
    if (conn !== "connected") return;
    const t = setInterval(async () => {
      const report = await pc.current?.getStats();
      if (!report) return;
      let rtt: number | undefined;
      let lost = 0;
      let received = 0;
      report.forEach((r) => {
        if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime != null) rtt = r.currentRoundTripTime * 1000;
        if (r.type === "inbound-rtp") {
          lost += r.packetsLost ?? 0;
          received += r.packetsReceived ?? 0;
        }
      });
      setStats({ rtt, loss: received + lost ? (lost / (received + lost)) * 100 : 0 });
    }, 3000);
    return () => clearInterval(t);
  }, [conn]);

  useEffect(() => {
    chatBox.current?.scrollTo({ top: chatBox.current.scrollHeight });
  }, [messages, tab]);

  useEffect(() => {
    applyBandwidth(lowBandwidth);
  }, [lowBandwidth, applyBandwidth]);

  const toggleMic = () => {
    const next = !micOn;
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };
  const toggleCam = () => {
    const next = !camOn;
    localStream.current?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  };

  const stopShare = useCallback(async () => {
    screenTrack.current?.stop();
    screenTrack.current = null;
    setSharing(false);
    const cam = localStream.current?.getVideoTracks()[0] ?? null;
    const sender = pc.current?.getSenders().find((s) => s.track?.kind === "video" || (!s.track && cam));
    await sender?.replaceTrack(cam).catch(() => {});
    if (localVideo.current) localVideo.current.srcObject = localStream.current;
  }, []);

  const toggleShare = async () => {
    if (sharing) return stopShare();
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      screenTrack.current = track;
      track.onended = () => stopShare();
      const sender = pc.current?.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
      else if (isClinician && pc.current) await makeOffer();
      if (localVideo.current) localVideo.current.srcObject = display;
      setSharing(true);
    } catch {}
  };

  const sendMessage = async (text: string) => {
    const body = text.trim();
    if (!body) return;
    setDraft("");
    await post({ type: "message", body });
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setNoteSaved("saving");
    const r = await saveVisitNote(appointmentId, note);
    setNoteSaved(r.ok ? "saved" : "error");
    if (r.ok) setNote("");
  };

  const start = new Date(props.startsAt).getTime();
  const end = new Date(props.endsAt).getTime();
  const elapsed = (now - start) / 1000;
  const remaining = (end - now) / 1000;

  // ───────────── اتاق انتظار ─────────────
  if (!joined) {
    return (
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_18rem]">
        <div className="relative aspect-video overflow-hidden rounded-3xl bg-slate-900">
          <video ref={localVideo} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          {!camOn && <div className="absolute inset-0 grid place-items-center text-sm text-slate-300">دوربین خاموش است</div>}
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            <button onClick={toggleMic} className={`rounded-full px-4 py-2 text-sm ${micOn ? "bg-white/90 text-slate-800" : "bg-rose-600 text-white"}`}>
              {micOn ? "🎙 میکروفون روشن" : "🔇 میکروفون خاموش"}
            </button>
            <button onClick={toggleCam} className={`rounded-full px-4 py-2 text-sm ${camOn ? "bg-white/90 text-slate-800" : "bg-rose-600 text-white"}`}>
              {camOn ? "📷 دوربین روشن" : "🚫 دوربین خاموش"}
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">اتاق انتظار</p>
          <h1 className="mt-1 text-xl font-extrabold">ویزیت با {otherName}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {remaining <= 0
              ? "زمان جلسه گذشته است."
              : elapsed < 0
                ? `جلسه ${mmss(-elapsed)} دیگر شروع می‌شود.`
                : "جلسه شروع شده است."}
          </p>
          {mediaError && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">{mediaError}</p>}
          <ul className="mt-4 space-y-1 text-xs leading-6 text-slate-500">
            <li>• در جای آرام و خصوصی بنشینید و از هدفون استفاده کنید.</li>
            <li>• اگر اینترنت ضعیف است، داخل جلسه «حالت اینترنت ضعیف» را روشن کنید.</li>
            <li>• جلسه ضبط نمی‌شود.</li>
          </ul>
          <button onClick={() => setJoined(true)} className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700">
            ورود به جلسه
          </button>
        </div>
      </div>
    );
  }

  // ───────────── پایان جلسه ─────────────
  if (conn === "ended") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-4xl">🌿</p>
        <h1 className="mt-3 text-xl font-extrabold">جلسه پایان یافت</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">از اینکه وقت گذاشتید سپاسگزاریم.</p>
        <Link href={isClinician ? "/panel/appointments" : "/appointments"} className="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-2 text-white">
          بازگشت به نوبت‌ها
        </Link>
      </div>
    );
  }

  const st = CONN_LABEL[conn === "waiting" && otherOnline ? "connecting" : conn];
  const weak = stats && ((stats.rtt ?? 0) > 400 || (stats.loss ?? 0) > 5);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${st.style}`} data-testid="conn">
              {st.text}
            </span>
            {stats && conn === "connected" && (
              <span className={`text-xs ${weak ? "text-orange-600" : "text-slate-400"}`}>
                {weak ? "کیفیت اینترنت پایین است" : "کیفیت اتصال خوب"}
                {stats.rtt != null && ` · ${fa(Math.round(stats.rtt))}ms`}
              </span>
            )}
          </div>
          <span className="font-mono text-slate-600" dir="ltr">
            {elapsed >= 0 ? mmss(elapsed) : `-${mmss(-elapsed)}`}
            {remaining > 0 && remaining < 5 * 60 && <span className="ms-2 text-orange-600">({mmss(remaining)} مانده)</span>}
          </span>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-3xl bg-slate-900">
          <video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-contain" data-testid="remote" />
          {conn !== "connected" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-200">
              <div>
                <p className="text-lg font-bold">{otherName}</p>
                <p className="mt-2 text-sm text-slate-400">{otherOnline ? "در حال اتصال…" : "هنوز وارد جلسه نشده است"}</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-3 start-3 w-32 overflow-hidden rounded-2xl border-2 border-white/40 bg-slate-800 shadow-lg sm:w-48">
            <video
              ref={(el) => {
                localVideo.current = el;
                if (el && !el.srcObject) el.srcObject = sharing ? new MediaStream([screenTrack.current!]) : localStream.current;
              }}
              autoPlay
              playsInline
              muted
              className={`aspect-video w-full object-cover ${sharing ? "" : "-scale-x-100"}`}
            />
            {!camOn && !sharing && <div className="absolute inset-0 grid place-items-center text-xs text-slate-300">دوربین خاموش</div>}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <button onClick={toggleMic} className={`rounded-full px-4 py-2 ${micOn ? "bg-white border border-slate-200" : "bg-rose-600 text-white"}`}>
            {micOn ? "🎙 قطع صدا" : "🔇 وصل صدا"}
          </button>
          <button onClick={toggleCam} className={`rounded-full px-4 py-2 ${camOn ? "bg-white border border-slate-200" : "bg-rose-600 text-white"}`}>
            {camOn ? "📷 خاموش کردن دوربین" : "🚫 روشن کردن دوربین"}
          </button>
          {typeof navigator !== "undefined" && "getDisplayMedia" in (navigator.mediaDevices ?? {}) && (
            <button onClick={toggleShare} className={`rounded-full px-4 py-2 ${sharing ? "bg-brand-600 text-white" : "bg-white border border-slate-200"}`}>
              {sharing ? "⏹ توقف اشتراک صفحه" : "🖥 اشتراک صفحه"}
            </button>
          )}
          <button
            onClick={() => setLowBandwidth(!lowBandwidth)}
            className={`rounded-full px-4 py-2 ${lowBandwidth ? "bg-amber-500 text-white" : "bg-white border border-slate-200"}`}
          >
            {lowBandwidth ? "📶 حالت اینترنت ضعیف: روشن" : "📶 حالت اینترنت ضعیف"}
          </button>
          {isClinician ? (
            <form
              action={endVisit}
              onSubmit={(e) => {
                if (!confirm("جلسه پایان یابد؟")) e.preventDefault();
              }}
            >
              <input type="hidden" name="appointmentId" value={appointmentId} />
              <button className="rounded-full bg-rose-600 px-5 py-2 font-bold text-white">پایان جلسه</button>
            </form>
          ) : (
            <Link href="/appointments" className="rounded-full bg-rose-600 px-5 py-2 font-bold text-white">
              ترک جلسه
            </Link>
          )}
        </div>
      </section>

      <aside className="flex h-[32rem] flex-col rounded-3xl border border-slate-200 bg-white lg:h-auto lg:max-h-[42rem]">
        <div className="flex border-b border-slate-100 text-sm">
          <button
            onClick={() => {
              setTab("chat");
              setUnread(0);
            }}
            className={`flex-1 py-3 ${tab === "chat" ? "border-b-2 border-brand-600 font-bold text-brand-700" : "text-slate-500"}`}
          >
            گفتگو {unread > 0 && <span className="ms-1 rounded-full bg-rose-500 px-1.5 text-xs text-white">{fa(unread)}</span>}
          </button>
          {isClinician && (
            <button
              onClick={() => setTab("note")}
              className={`flex-1 py-3 ${tab === "note" ? "border-b-2 border-brand-600 font-bold text-brand-700" : "text-slate-500"}`}
            >
              یادداشت و تست
            </button>
          )}
        </div>

        {tab === "chat" ? (
          <>
            <div ref={chatBox} className="flex-1 space-y-2 overflow-y-auto p-4" data-testid="chat">
              {messages.length === 0 && <p className="text-center text-xs text-slate-400">پیامی رد و بدل نشده است.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? "justify-start" : "justify-end"}`}>
                  <p
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-6 ${
                      m.mine ? "rounded-tr-sm bg-brand-600 text-white" : "rounded-tl-sm bg-surface text-slate-800"
                    }`}
                  >
                    <ChatBody text={m.body} />
                  </p>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(draft);
              }}
              className="flex gap-2 border-t border-slate-100 p-3"
            >
              <label title="ارسال تصویر یا PDF" className={`grid w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-500 hover:text-brand-600 ${uploading ? "opacity-50" : ""}`}>
                {uploading ? "…" : "📎"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  data-testid="chat-file"
                  disabled={uploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setUploading(true);
                    setFileError(null);
                    const fd = new FormData();
                    fd.set("file", f);
                    const r = await sendVisitFile(appointmentId, fd).catch(() => ({ error: "ارسال فایل انجام نشد." }));
                    setUploading(false);
                    if (r.error) setFileError(r.error);
                  }}
                />
              </label>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                placeholder="پیام…"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button className="rounded-xl bg-brand-600 px-4 text-sm text-white">ارسال</button>
            </form>
            {fileError && <p className="px-3 pb-2 text-xs text-rose-600">{fileError}</p>}
          </>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <div>
              <h3 className="text-sm font-bold">یادداشت جلسه</h3>
              <p className="text-xs text-slate-400">در یادداشت‌های بالینی پرونده ذخیره می‌شود و مراجع آن را نمی‌بیند.</p>
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteSaved("idle");
                }}
                rows={7}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm leading-7"
              />
              <div className="mt-2 flex items-center gap-3">
                <button onClick={saveNote} disabled={noteSaved === "saving"} className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white">
                  ذخیره‌ی یادداشت
                </button>
                {noteSaved === "saved" && <span className="text-xs text-emerald-700">✓ ذخیره شد</span>}
                {noteSaved === "error" && <span className="text-xs text-rose-700">ذخیره نشد</span>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold">ارسال تست به مراجع</h3>
              <p className="text-xs text-slate-400">لینک تست در گفتگو فرستاده می‌شود و نتیجه در پرونده‌ی مراجع ثبت می‌شود.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tests.map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => sendMessage(`لطفاً این تست را انجام دهید: ${t.title} (${t.code}) /tests/${t.slug}`)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:border-brand-400 hover:text-brand-700"
                  >
                    {t.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
