export interface DeviceAuthAvailability {
  available: boolean;
  label: string;
  detail: string;
}

export type DeviceAuthResult =
  { status: "success" } | { status: "cancelled" | "error"; message: string };

export interface DeviceAuthCapabilities {
  platform: "ios" | "android" | "web" | "other";
  hasDeviceCredential: boolean;
  biometrics: Array<"face" | "fingerprint" | "iris">;
  expoGo: boolean;
}

/** A device credential is sufficient; biometric enrollment is not required. */
export function deviceAuthAvailability(
  capabilities: DeviceAuthCapabilities,
): DeviceAuthAvailability {
  if (capabilities.platform === "web" || capabilities.platform === "other") {
    return {
      available: false,
      label: "การยืนยันของเครื่อง",
      detail:
        "ใช้ Face ID, Touch ID หรือรหัสเครื่องได้ในแอปบนมือถือ เว็บใช้ PIN ของ DeskGuard",
    };
  }
  if (!capabilities.hasDeviceCredential) {
    return {
      available: false,
      label: "การยืนยันของเครื่อง",
      detail: "ตั้งรหัสล็อกหน้าจอในเครื่องก่อน จึงจะใช้การยืนยันของเครื่องได้",
    };
  }
  if (
    capabilities.platform === "ios" &&
    capabilities.expoGo &&
    capabilities.biometrics.includes("face")
  ) {
    return {
      available: true,
      label: "รหัสเครื่อง",
      detail:
        "Expo Go ใช้รหัสเครื่องผ่านหน้าต่างของระบบได้ ส่วน Face ID ต้องติดตั้ง development build ของ DeskGuard",
    };
  }
  const method = capabilities.biometrics.includes("face")
    ? capabilities.platform === "ios"
      ? "Face ID"
      : "สแกนใบหน้า"
    : capabilities.biometrics.includes("fingerprint")
      ? capabilities.platform === "ios"
        ? "Touch ID"
        : "ลายนิ้วมือ"
      : null;
  return {
    available: true,
    label: method ? `${method} หรือรหัสเครื่อง` : "รหัสเครื่อง",
    detail:
      "ระบบของโทรศัพท์เป็นผู้ยืนยันตัวตน แอปไม่เห็นและไม่เก็บรหัสเครื่องหรือข้อมูลใบหน้า",
  };
}

/** Failures and cancellation never become successful disarm authorization. */
export function deviceAuthFailure(error: string): DeviceAuthResult {
  if (["user_cancel", "app_cancel", "system_cancel"].includes(error)) {
    return { status: "cancelled", message: "ยกเลิกการยืนยันตัวตนแล้ว" };
  }
  const messages: Record<string, string> = {
    not_enrolled:
      "ยังไม่ได้ตั้งค่าการยืนยันตัวตนในเครื่อง ลองตั้งค่ารหัสเครื่องแล้วลองใหม่",
    passcode_not_set: "ยังไม่ได้ตั้งรหัสล็อกหน้าจอ กรุณาตั้งรหัสเครื่องก่อน",
    not_available:
      "การยืนยันของเครื่องยังไม่พร้อม ลองใหม่หรือใช้ PIN ของ DeskGuard",
    lockout: "ระบบพักการสแกนชั่วคราว ปลดล็อกโทรศัพท์ด้วยรหัสเครื่องแล้วลองใหม่",
    timeout: "การยืนยันหมดเวลา กรุณาลองใหม่",
    authentication_failed: "ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่",
    user_fallback:
      "ยังยืนยันตัวตนไม่สำเร็จ กรุณาใช้รหัสเครื่องในหน้าต่างของระบบ",
    missing_usage_description:
      "แอปนี้ยังไม่ได้ตั้งค่าสิทธิ์ Face ID ต้องติดตั้ง DeskGuard รุ่นที่ตั้งค่าสิทธิ์แล้ว",
  };
  return {
    status: "error",
    message:
      messages[error] ??
      "เปิดการยืนยันของเครื่องไม่สำเร็จ ลองใหม่หรือใช้ PIN ของ DeskGuard",
  };
}
