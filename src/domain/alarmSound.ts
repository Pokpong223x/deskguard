export const MAX_ALARM_BYTES = 10 * 1024 * 1024;
export const ALARM_EXTENSIONS = ["mp3", "m4a", "wav", "aac"] as const;
export type AlarmExtension = (typeof ALARM_EXTENSIONS)[number];

export interface CustomAlarmSound {
  id: string;
  name: string;
  size: number;
  uri: string;
  sourceName?: string;
}

export interface AlarmSoundMetadata {
  version: 1;
  id: string;
  name: string;
  size: number;
  extension: AlarmExtension;
  sourceName?: string;
}

export function isMp4Video(name: string): boolean {
  return /\.mp4$/i.test(name.trim());
}

/** MP4 is an import format only; persisted alarm files remain audio-only. */
export function validateAlarmImport(file: {
  name: string;
  size?: number;
  mimeType?: string;
}): string | null {
  if (!isMp4Video(file.name)) return validateAlarmFile(file);
  const sizeError = validateAlarmFile({ name: "audio.m4a", size: file.size });
  if (sizeError) return sizeError.replaceAll("ไฟล์เสียง", "ไฟล์");
  if (file.name.length > 1024)
    return "ชื่อไฟล์ยาวเกินไป กรุณาเปลี่ยนชื่อแล้วเลือกใหม่";
  const mime = file.mimeType?.toLowerCase().split(";")[0].trim();
  if (
    mime &&
    ![
      "video/mp4",
      "audio/mp4",
      "application/mp4",
      "application/octet-stream",
    ].includes(mime)
  ) {
    return "ไฟล์นี้ไม่ใช่วิดีโอ MP4 ที่รองรับ กรุณาเลือกไฟล์ใหม่";
  }
  return null;
}

export function alarmExtension(name: string): AlarmExtension | null {
  const extension = /\.([a-z0-9]+)$/i.exec(name.trim())?.[1].toLowerCase();
  return ALARM_EXTENSIONS.includes(extension as AlarmExtension)
    ? (extension as AlarmExtension)
    : null;
}

export function validateAlarmFile(file: {
  name: string;
  size?: number;
  mimeType?: string;
}): string | null {
  if (
    !file.name.trim() ||
    file.name.length > 1024 ||
    !alarmExtension(file.name)
  ) {
    return "เลือกไฟล์เสียง MP3, M4A, WAV หรือ AAC";
  }
  if (file.size !== undefined) {
    if (!Number.isSafeInteger(file.size) || file.size <= 0) {
      return "ไฟล์เสียงว่างหรืออ่านขนาดไม่ได้ กรุณาเลือกไฟล์ใหม่";
    }
    if (file.size > MAX_ALARM_BYTES) {
      return "ไฟล์เสียงต้องมีขนาดไม่เกิน 10 MB กรุณาเลือกไฟล์ที่เล็กลง";
    }
  }
  const mime = file.mimeType?.toLowerCase().split(";")[0].trim();
  if (
    mime &&
    !mime.startsWith("audio/") &&
    !["application/octet-stream", "application/mp4"].includes(mime)
  ) {
    return "ไฟล์นี้ไม่ใช่ไฟล์เสียงที่รองรับ กรุณาเลือก MP3, M4A, WAV หรือ AAC";
  }
  return null;
}

/** Only generated IDs become file names; the user's display name is never a path. */
export function ownedAlarmFileName(metadata: AlarmSoundMetadata): string {
  if (
    !/^[a-zA-Z0-9-]{1,80}$/.test(metadata.id) ||
    !ALARM_EXTENSIONS.includes(metadata.extension)
  ) {
    throw new Error("ข้อมูลไฟล์เสียงไม่สมบูรณ์ กรุณาเลือกเสียงใหม่");
  }
  return `${metadata.id}.${metadata.extension}`;
}

export function parseAlarmSoundMetadata(
  value: unknown,
): AlarmSoundMetadata | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(record.id) ||
    typeof record.name !== "string" ||
    record.name.length > 1024 ||
    typeof record.size !== "number" ||
    validateAlarmFile({ name: record.name, size: record.size }) !== null ||
    record.extension !== alarmExtension(record.name) ||
    (record.sourceName !== undefined &&
      (typeof record.sourceName !== "string" ||
        record.sourceName.length > 1024 ||
        !isMp4Video(record.sourceName) ||
        record.extension !== "m4a"))
  )
    return null;
  return {
    version: 1,
    id: record.id,
    name: record.name,
    size: record.size,
    extension: record.extension as AlarmExtension,
    ...(typeof record.sourceName === "string"
      ? { sourceName: record.sourceName }
      : {}),
  };
}
