/**
 * لایه ضبط صوت قابل استفاده مجدد برای آزمونهای گفتار.
 *
 * این کلاس فقط فریمهای عددی RMS/peak را به لایه تحلیل میدهد و هیچ نمونه خام صوتی
 * را ذخیره، آپلود یا ارسال نمیکند. MediaRecorder عمداً استفاده نمیشود، چون هیچ
 * فایل صوتیایی تولید نمیشود؛ پردازش از طریق Web Audio API و AnalyserNode است.
 */
import { MPT_CONFIG } from "./mpt-config";
import type { AudioFrame } from "./mpt-types";

export type MicStatus = "idle" | "requesting" | "ready" | "denied" | "unsupported" | "error";

export type MicError = "UNSUPPORTED" | "DENIED" | "NOT_FOUND" | "DISCONNECTED" | "CAPTURE_FAILED" | "TIMEOUT";

export type BrowserAudioSupport = {
  getUserMedia: boolean;
  audioContext: boolean;
  analyser: boolean;
  mediaRecorder: boolean;
};

export const MIC_ERROR_LABELS: Record<MicError, string> = {
  UNSUPPORTED: "مرورگر شما از ضبط صوت پشتیبانی نمیکند. از مرورگر بهروز شده دیگری استفاده کنید.",
  DENIED: "دسترسی به میکروفون رد شد. در تنظیمات مرورگر، اجازه میکروفون را برای این سایت فعال کنید و دوباره تلاش کنید.",
  NOT_FOUND: "میکروفونی پیدا نشد. ابتدا میکروفون را وصل یا فعال کنید.",
  DISCONNECTED: "میکروفون حین ضبط قطع شد. اتصال آن را بررسی کرده و آزمون را تکرار کنید.",
  CAPTURE_FAILED: "آغاز ضبط صوت با مشکل مواجه شد. صفحه را دوباره بارگذاری کرده و تلاش کنید.",
  TIMEOUT: "درخواست مجوز میکروفون بیپاسخ ماند. پنجره اجازه میکروفون مرورگر را بررسی کنید و دوباره تلاش کنید.",
};

type AudioContextConstructor = new () => AudioContext;

export function getBrowserAudioSupport(): BrowserAudioSupport {
  if (typeof window === "undefined") {
    return { getUserMedia: false, audioContext: false, analyser: false, mediaRecorder: false };
  }
  const legacy = globalThis as typeof globalThis & { webkitAudioContext?: AudioContextConstructor };
  const AudioCtor = legacy.AudioContext ?? legacy.webkitAudioContext;
  return {
    getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    audioContext: Boolean(AudioCtor),
    analyser: Boolean(AudioCtor && "createAnalyser" in AudioCtor.prototype),
    mediaRecorder: typeof MediaRecorder !== "undefined",
  };
}

export function isAudioCaptureSupported(): boolean {
  const support = getBrowserAudioSupport();
  return support.getUserMedia && support.audioContext && support.analyser;
}

export class AudioCapture {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private stopped = true;
  /** هر تلاش جدید یا توقف، تلاشهای قدیمی را باطل میکند تا استریم دیررس آزاد شود. */
  private epoch = 0;

  get running(): boolean {
    return !this.stopped;
  }

  elapsedMs(): number {
    return this.stopped ? 0 : Math.max(0, performance.now() - this.startedAt);
  }

  /** نرخ نمونهبرداری AudioContext؛ صفر یعنی ضبط آغاز نشده است. */
  get sampleRate(): number {
    return this.context?.sampleRate ?? 0;
  }

  /**
   * درخواست مجوز و آغاز نمونهبرداری. تنها باید در پاسخ به اقدام صریح کاربر فراخوانی شود.
   * فراخوانی دوم در حین ضبط نادیده گرفته میشود تا ضبط همزمان رخ ندهد.
   */
  async start(
    onFrame: (frame: AudioFrame) => void,
    onError: (error: MicError) => void,
    intervalMs: number = MPT_CONFIG.frameIntervalMs,
    /** اختیاری؛ تنها آزمونی که به F0 نیاز دارد از آن استفاده میکند. */
    onSamples?: (samples: Float32Array, sampleRate: number) => void,
  ): Promise<void> {
    if (!this.stopped) return;
    const epoch = ++this.epoch;

    const support = getBrowserAudioSupport();
    if (!isAudioCaptureSupported()) {
      onError(support.getUserMedia ? "UNSUPPORTED" : "NOT_FOUND");
      return;
    }

    let context: AudioContext | null = null;
    let mediaPromise: Promise<MediaStream> | null = null;
    try {
      const legacy = globalThis as typeof globalThis & { webkitAudioContext?: AudioContextConstructor };
      const Context = legacy.AudioContext ?? legacy.webkitAudioContext;
      if (!Context) throw new Error("AudioContext unavailable");

      // AudioContext پیش از درخواست مجوز و در همان تیک اقدام کاربر ساخته میشود تا
      // سیاست پخش خودکار مرورگر آن را معلق نکند. وعده resume نیز میتواند تا یک
      // اقدام بعدی کاربر حل نشود، بنابراین منتظر نامحدود نمیمانیم.
      context = new Context();
      const resumed =
        context.state === "suspended" ? context.resume().catch(() => undefined) : Promise.resolve();

      // برخی مرورگرها / WebViewها وعده getUserMedia را بیپاسخ میگذارند (مثلاً وقتی
      // پنجره مجوز پشت پنجره دیگری گیر میکند). بدون مهلت، نشانگر «درخواست دسترسی»
      // برای همیشه میماند و دکمه آغاز اندازهگیری قفل میشود.
      mediaPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      let permissionTimer: ReturnType<typeof setTimeout> | null = null;
      const stream = await Promise.race([
        mediaPromise,
        new Promise<never>((_, reject) => {
          permissionTimer = setTimeout(
            () => reject(new DOMException("Microphone permission timed out", "TimeoutError")),
            12000,
          );
        }),
      ]);
      if (permissionTimer !== null) clearTimeout(permissionTimer);

      // اگر کاربر حین درخواست مجوز تلاش دیگری را آغاز کرده یا صفحه را ترک کرده است،
      // استریم دیررس بیاستفاده را آزاد میکنیم.
      if (epoch !== this.epoch) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      // اگر کاربر در حین درخواست مجوز صفحه را ترک کرده باشد، استریم بلافاصله آزاد میشود.
      if (!this.stopped) {
        this.stream = stream;
        await Promise.race([
          resumed,
          new Promise<void>((resolve) => setTimeout(resolve, 1200)),
        ]);
        if (epoch !== this.epoch) return;
        // اگر هنوز معلق است، تلاش دوباره پس از پذیرش مجوز توسط کاربر انجام میشود.
        if (context.state === "suspended") void context.resume().catch(() => undefined);
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);

        const sampleRate = context.sampleRate;
        this.context = context;
        this.source = source;
        this.analyser = analyser;
        this.startedAt = performance.now();
        this.stopped = false;

        for (const track of stream.getAudioTracks()) {
          track.addEventListener("ended", () => {
            if (!this.stopped && epoch === this.epoch) {
              onError("DISCONNECTED");
              this.cleanup();
            }
          });
        }

        const samples = new Float32Array(analyser.fftSize);
        this.timer = setInterval(() => {
          if (this.stopped) return;
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          let peak = 0;
          for (let i = 0; i < samples.length; i++) {
            const value = samples[i];
            sum += value * value;
            const absolute = Math.abs(value);
            if (absolute > peak) peak = absolute;
          }
          const rms = Math.sqrt(sum / samples.length);
          const t = performance.now() - this.startedAt;
          if (Number.isFinite(rms) && Number.isFinite(peak)) {
            onFrame({ t, rms, peak });
            // کپی مستقل از بفر چندبارمصرف AnalyserNode؛ فقط در حافظه و بدون ذخیره یا ارسال.
            if (onSamples) onSamples(new Float32Array(samples), sampleRate);
          }
        }, intervalMs);
      } else {
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        onError("DENIED");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
        onError("NOT_FOUND");
      } else if (name === "TimeoutError") {
        onError("TIMEOUT");
        // ممکن است مجوز بعد از مهلت داده شود؛ استریم دیررس نباید بدون استفاده بماند.
        void mediaPromise
          ?.then((stream) => stream.getTracks().forEach((track) => track.stop()))
          .catch(() => undefined);
      } else {
        onError("CAPTURE_FAILED");
      }
      this.cleanup();
      // در صورت شکست پیش از واگذاری context به کلاس، منبع محلی هم آزاد میشود.
      if (context) void context.close().catch(() => undefined);
    }
  }

  /** آزادسازی کامل منابع؛ هنگام خروج از صفحه حتماً فراخوانی میشود. */
  stop(): void {
    this.epoch += 1;
    this.cleanup();
  }

  private cleanup(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        // در صورت قطع شدن استریم، جدا کردن منبع میتواند خطا دهد؛ بیخطر است.
      }
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        if (track.readyState === "live") track.stop();
      });
      this.stream = null;
    }
    this.analyser = null;
    if (this.context) {
      void this.context.close().catch(() => undefined);
      this.context = null;
    }
  }
}
