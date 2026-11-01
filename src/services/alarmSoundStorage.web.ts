import type { PreparedAlarmAsset } from "./prepareAlarmAsset";
import {
  alarmExtension,
  parseAlarmSoundMetadata,
  validateAlarmFile,
  type AlarmSoundMetadata,
  type CustomAlarmSound,
} from "../domain/alarmSound";

export type { CustomAlarmSound } from "../domain/alarmSound";

const DATABASE = "deskguard-audio-v1";
const STORE = "sounds";
const SELECTED = "selected";

interface StoredSound {
  metadata: AlarmSoundMetadata;
  blob: Blob;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "เบราว์เซอร์นี้เก็บไฟล์เสียงไม่ได้ ลองเปิดด้วย Safari หรือ Chrome",
        ),
      );
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    let failed = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => {
      if (failed) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(new Error("เปิดพื้นที่เก็บเสียงไม่ได้ กรุณาลองใหม่"));
    request.onblocked = () => {
      failed = true;
      reject(new Error("ปิดแท็บ DeskGuard อื่นก่อน แล้วลองเลือกเสียงอีกครั้ง"));
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    let request: IDBRequest<T>;
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(STORE, mode);
      request = operation(transaction.objectStore(STORE));
    } catch {
      database.close();
      reject(new Error("บันทึกไฟล์เสียงไม่ได้ กรุณาลองใหม่"));
      return;
    }
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result);
    };
    transaction.onabort = () => {
      const quota =
        transaction.error?.name === "QuotaExceededError" ||
        request.error?.name === "QuotaExceededError";
      database.close();
      reject(
        new Error(
          quota
            ? "พื้นที่เก็บเสียงไม่พอ เลือกไฟล์ที่เล็กลงหรือเพิ่มพื้นที่ว่างแล้วลองใหม่"
            : "บันทึกหรืออ่านไฟล์เสียงไม่ได้ กรุณาลองใหม่",
        ),
      );
    };
    // Request failure aborts the transaction, preserving the previous selection.
  });
}

export async function loadCustomAlarmSound(): Promise<CustomAlarmSound | null> {
  const value: unknown = await withStore("readonly", (store) =>
    store.get(SELECTED),
  );
  if (value === undefined) return null;
  if (typeof value !== "object" || value === null) {
    throw new Error("ข้อมูลเสียงเดิมไม่สมบูรณ์ กรุณาเลือกเสียงใหม่");
  }
  const record = value as Partial<StoredSound>;
  const metadata = parseAlarmSoundMetadata(record.metadata);
  if (
    !metadata ||
    !(record.blob instanceof Blob) ||
    record.blob.size !== metadata.size ||
    validateAlarmFile({
      name: metadata.name,
      size: record.blob.size,
      mimeType: record.blob.type,
    })
  ) {
    throw new Error("ไฟล์เสียงเดิมอ่านไม่ได้ กรุณาเลือกเสียงใหม่");
  }
  return {
    id: metadata.id,
    name: metadata.name,
    size: metadata.size,
    uri: URL.createObjectURL(record.blob),
    sourceName: metadata.sourceName,
  };
}

export async function saveCustomAlarmSound(
  asset: PreparedAlarmAsset,
): Promise<CustomAlarmSound> {
  const validation = validateAlarmFile(asset);
  if (validation) throw new Error(validation);
  let blob: Blob;
  if (asset.file instanceof Blob) {
    blob = asset.file;
  } else if (asset.uri.startsWith("blob:") || asset.uri.startsWith("data:")) {
    // Only picker-created local sources are accepted. Import never downloads a
    // remote URL or uploads audio to a server.
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error("อ่านไฟล์ที่เลือกไม่ได้ กรุณาเลือกใหม่");
    blob = await response.blob();
  } else {
    throw new Error("อ่านไฟล์ที่เลือกไม่ได้ กรุณาเลือกใหม่");
  }
  const actualValidation = validateAlarmFile({
    name: asset.name,
    size: blob.size,
    mimeType: blob.type || asset.mimeType,
  });
  if (actualValidation) throw new Error(actualValidation);
  const metadata: AlarmSoundMetadata = {
    version: 1,
    id: crypto.randomUUID(),
    name: asset.name,
    size: blob.size,
    extension: alarmExtension(asset.name)!,
    ...(asset.sourceName ? { sourceName: asset.sourceName } : {}),
  };
  const uri = URL.createObjectURL(blob);
  try {
    await withStore("readwrite", (store) =>
      store.put({ metadata, blob }, SELECTED),
    );
  } catch (error) {
    URL.revokeObjectURL(uri);
    throw error;
  }
  return {
    id: metadata.id,
    name: metadata.name,
    size: metadata.size,
    uri,
    sourceName: metadata.sourceName,
  };
}

export async function removeCustomAlarmSound(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(SELECTED));
}

export function releaseCustomAlarmSound(sound: CustomAlarmSound | null): void {
  if (sound?.uri.startsWith("blob:")) URL.revokeObjectURL(sound.uri);
}
