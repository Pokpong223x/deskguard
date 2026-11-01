import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { GuardEvent, GuardSettings } from "../types";

const SETTINGS_KEY = "deskguard.settings.v1";
const HISTORY_KEY = "deskguard.history.v1";
const PIN_KEY = "deskguard.pin.v1";

export const DEFAULT_SETTINGS: GuardSettings = {
  sensitivity: "medium",
  sound: true,
  haptics: true,
};

export interface PinRecord {
  salt: string;
  hash: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSettings(raw: string | null): GuardSettings {
  if (raw === null) return { ...DEFAULT_SETTINGS };
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value) ||
    !["low", "medium", "high"].includes(String(value.sensitivity)) ||
    typeof value.sound !== "boolean" ||
    typeof value.haptics !== "boolean"
  ) {
    throw new Error("Invalid settings");
  }
  return value as unknown as GuardSettings;
}

function validEvent(item: unknown): item is GuardEvent {
  return (
    isRecord(item) &&
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.at === "number" &&
    Number.isFinite(new Date(item.at).getTime()) &&
    typeof item.acceleration === "number" &&
    Number.isFinite(item.acceleration) &&
    item.acceleration >= 0 &&
    typeof item.rotation === "number" &&
    Number.isFinite(item.rotation) &&
    item.rotation >= 0 &&
    ["device", "demo"].includes(String(item.source)) &&
    ["motion", "interrupted"].includes(String(item.kind))
  );
}

function parseHistory(raw: string | null): {
  history: GuardEvent[];
  recovered: boolean;
} {
  if (raw === null) return { history: [], recovered: false };
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid history");
  const validItems = value.filter(validEvent);
  return {
    history: validItems.slice(0, 100),
    recovered: validItems.length !== value.length,
  };
}

async function loadPin(): Promise<PinRecord | null> {
  // Browser storage is for the explicitly labeled demo only. Native PIN hashes
  // use iOS Keychain / Android Keystore-backed storage; raw PINs are never saved.
  const raw =
    Platform.OS === "web"
      ? await AsyncStorage.getItem(PIN_KEY)
      : await SecureStore.getItemAsync(PIN_KEY);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value) ||
    typeof value.salt !== "string" ||
    typeof value.hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.hash)
  ) {
    throw new Error("Invalid PIN record");
  }
  return { salt: value.salt, hash: value.hash };
}

export async function loadGuardData() {
  const [settingsRaw, historyRaw, pin] = await Promise.all([
    AsyncStorage.getItem(SETTINGS_KEY),
    AsyncStorage.getItem(HISTORY_KEY),
    loadPin(),
  ]);
  const warnings: string[] = [];
  let settings: GuardSettings;
  let history: GuardEvent[];
  try {
    settings = parseSettings(settingsRaw);
  } catch {
    settings = { ...DEFAULT_SETTINGS };
    warnings.push("อ่านการตั้งค่าเดิมไม่ได้ จึงใช้ค่าเริ่มต้น");
  }
  try {
    const parsed = parseHistory(historyRaw);
    history = parsed.history;
    if (parsed.recovered)
      warnings.push("ประวัติบางรายการไม่สมบูรณ์ จึงแสดงเฉพาะรายการที่อ่านได้");
  } catch {
    history = [];
    warnings.push("อ่านประวัติเดิมไม่ได้ เริ่มบันทึกเหตุการณ์ใหม่ได้ตามปกติ");
  }
  // Non-sensitive preferences can recover independently. A missing/unreadable
  // PIN record above still rejects the entire load: never replace it silently.
  return {
    settings,
    history,
    pin,
    warning: warnings.length ? warnings.join(" · ") : null,
  };
}

export function persistSettings(settings: GuardSettings): Promise<void> {
  return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function persistHistory(history: GuardEvent[]): Promise<void> {
  return AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history.slice(0, 100)),
  );
}

export function validPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

async function digestPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

export async function matchesPin(
  pin: string,
  record: PinRecord,
): Promise<boolean> {
  if (!validPin(pin)) return false;
  const digest = await digestPin(pin, record.salt);
  let difference = digest.length ^ record.hash.length;
  for (let index = 0; index < digest.length; index += 1) {
    difference |= digest.charCodeAt(index) ^ record.hash.charCodeAt(index);
  }
  return difference === 0;
}

export async function persistNewPin(pin: string): Promise<PinRecord> {
  if (!validPin(pin)) throw new Error("PIN must contain four digits");
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const record: PinRecord = { salt, hash: await digestPin(pin, salt) };
  const value = JSON.stringify(record);
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(PIN_KEY, value);
  } else {
    await SecureStore.setItemAsync(PIN_KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return record;
}
