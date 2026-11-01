import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { PreparedAlarmAsset } from "./prepareAlarmAsset";
import * as FileSystem from "expo-file-system/legacy";
import {
  alarmExtension,
  ownedAlarmFileName,
  parseAlarmSoundMetadata,
  validateAlarmFile,
  type AlarmSoundMetadata,
  type CustomAlarmSound,
} from "../domain/alarmSound";

export type { CustomAlarmSound } from "../domain/alarmSound";

const SOUND_KEY = "deskguard.custom-alarm.v1";

function soundDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("ไม่สามารถเปิดพื้นที่เก็บเสียงได้ กรุณาลองใหม่");
  }
  return `${FileSystem.documentDirectory}deskguard-alarm/`;
}

function soundUri(metadata: AlarmSoundMetadata): string {
  return `${soundDirectory()}${ownedAlarmFileName(metadata)}`;
}

function parseSaved(raw: string | null): AlarmSoundMetadata | null {
  if (raw === null) return null;
  try {
    return parseAlarmSoundMetadata(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function deleteOwned(metadata: AlarmSoundMetadata): Promise<void> {
  // This derives one file under our own document directory; never delete a user URI.
  await FileSystem.deleteAsync(soundUri(metadata), { idempotent: true });
}

export async function loadCustomAlarmSound(): Promise<CustomAlarmSound | null> {
  const raw = await AsyncStorage.getItem(SOUND_KEY);
  if (raw === null) return null;
  const metadata = parseSaved(raw);
  if (!metadata)
    throw new Error("ข้อมูลเสียงเดิมไม่สมบูรณ์ กรุณาเลือกเสียงใหม่");
  const uri = soundUri(metadata);
  const info = await FileSystem.getInfoAsync(uri);
  if (
    !info.exists ||
    info.isDirectory ||
    info.size !== metadata.size ||
    validateAlarmFile({ name: metadata.name, size: info.size })
  ) {
    throw new Error("ไม่พบไฟล์เสียงเดิมหรือไฟล์อ่านไม่ได้ กรุณาเลือกเสียงใหม่");
  }
  return {
    id: metadata.id,
    name: metadata.name,
    size: info.size,
    uri,
    sourceName: metadata.sourceName,
  };
}

export async function saveCustomAlarmSound(
  asset: PreparedAlarmAsset,
): Promise<CustomAlarmSound> {
  const validation = validateAlarmFile(asset);
  if (validation) throw new Error(validation);
  if (!asset.uri.startsWith("file://") && !asset.uri.startsWith("content://")) {
    throw new Error("อ่านไฟล์เสียงไม่ได้ กรุณาเลือกไฟล์จากแอป Files อีกครั้ง");
  }
  const source = await FileSystem.getInfoAsync(asset.uri);
  if (!source.exists || source.isDirectory) {
    throw new Error("ไม่พบไฟล์ที่เลือก กรุณาเลือกเสียงใหม่");
  }
  const sourceValidation = validateAlarmFile({ ...asset, size: source.size });
  if (sourceValidation) throw new Error(sourceValidation);
  const metadata: AlarmSoundMetadata = {
    version: 1,
    id: Crypto.randomUUID(),
    name: asset.name,
    size: source.size,
    extension: alarmExtension(asset.name)!,
    ...(asset.sourceName ? { sourceName: asset.sourceName } : {}),
  };
  const old = parseSaved(await AsyncStorage.getItem(SOUND_KEY));
  await FileSystem.makeDirectoryAsync(soundDirectory(), {
    intermediates: true,
  });
  const uri = soundUri(metadata);
  try {
    await FileSystem.copyAsync({ from: asset.uri, to: uri });
    const copied = await FileSystem.getInfoAsync(uri);
    if (!copied.exists || copied.isDirectory || copied.size !== source.size) {
      throw new Error("คัดลอกไฟล์เสียงไม่สำเร็จ กรุณาลองใหม่");
    }
    // Commit the selection only after the complete file exists. A failed write
    // preserves both the old record and its audio file.
    await AsyncStorage.setItem(SOUND_KEY, JSON.stringify(metadata));
  } catch (error) {
    await deleteOwned(metadata).catch(() => undefined);
    throw error;
  }
  if (old) await deleteOwned(old).catch(() => undefined);
  return {
    id: metadata.id,
    name: metadata.name,
    size: metadata.size,
    uri,
    sourceName: metadata.sourceName,
  };
}

export async function removeCustomAlarmSound(): Promise<void> {
  const old = parseSaved(await AsyncStorage.getItem(SOUND_KEY));
  // Removing the selection first makes reset durable even if old-file cleanup
  // fails. Corrupt metadata never becomes an arbitrary filesystem delete.
  await AsyncStorage.removeItem(SOUND_KEY);
  if (old) await deleteOwned(old).catch(() => undefined);
}

export function releaseCustomAlarmSound(_sound: CustomAlarmSound | null): void {
  // Native persisted file URIs have no in-memory URL resource to release.
}
