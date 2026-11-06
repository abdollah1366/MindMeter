import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";

/** پوشه‌ی فایل‌ها؛ بیرون از public تا دسترسی فقط از مسیر /api/files و با بررسی مجوز باشد */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(process.cwd(), "uploads");

export const MAX_UPLOAD_MB = 5;

type Kind = "AVATAR" | "DOCUMENT" | "CHAT";

/** نوع واقعی فایل از روی بایت‌های ابتدایی (به پسوند یا نوع اعلام‌شده‌ی مرورگر اعتماد نمی‌کنیم) */
export function sniff(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" | "application/pdf" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString() === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

function cleanName(name: string) {
  return (name || "file").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120);
}

/**
 * ذخیره‌ی فایل. تصویرها با sharp دوباره ساخته می‌شوند (حذف متادیتا مثل موقعیت مکانی و کوچک‌سازی).
 * عکس پروفایل مربعی ۳۲۰ پیکسلی webp می‌شود.
 */
export async function saveUpload(opts: { ownerId: string; kind: Kind; file: File; scopeId?: string; allowPdf: boolean }) {
  const { file, kind } = opts;
  if (!file || typeof file === "string" || file.size === 0) return { error: "فایلی انتخاب نشده است." } as const;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return { error: `حجم فایل باید کمتر از ${MAX_UPLOAD_MB} مگابایت باشد.` } as const;
  const input = Buffer.from(await file.arrayBuffer());
  const type = sniff(input);
  if (!type || (type === "application/pdf" && !opts.allowPdf)) {
    return { error: opts.allowPdf ? "فقط تصویر (JPG، PNG، WebP) یا PDF پذیرفته می‌شود." : "فقط تصویر JPG، PNG یا WebP پذیرفته می‌شود." } as const;
  }

  let out: Buffer = input;
  let mime: string = type;
  let ext = type === "application/pdf" ? "pdf" : "bin";
  try {
    if (type !== "application/pdf") {
      const img = sharp(input, { failOn: "error" }).rotate();
      if (kind === "AVATAR") {
        out = await img.resize(320, 320, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
        mime = "image/webp";
        ext = "webp";
      } else {
        out = await img.resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
        mime = "image/jpeg";
        ext = "jpg";
      }
    }
  } catch {
    return { error: "فایل تصویر خراب است یا خوانده نمی‌شود." } as const;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedAs = `${Date.now().toString(36)}-${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, storedAs), out);
  const name = cleanName(file.name).replace(/\.[^.]+$/, "") + `.${ext}`;
  const upload = await db.upload.create({ data: { ownerId: opts.ownerId, kind, scopeId: opts.scopeId ?? null, name, mime, size: out.length, storedAs } });
  return { upload } as const;
}

export async function readUploadFile(storedAs: string) {
  if (!/^[a-z0-9]+-[a-f0-9]{24}\.(webp|jpg|pdf)$/.test(storedAs)) throw new Error("bad name");
  return readFile(path.join(UPLOAD_DIR, storedAs));
}

export async function deleteUpload(id: string) {
  const u = await db.upload.delete({ where: { id } }).catch(() => null);
  if (u) await unlink(path.join(UPLOAD_DIR, u.storedAs)).catch(() => {});
}
