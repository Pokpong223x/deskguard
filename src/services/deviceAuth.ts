import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import * as LocalAuthentication from "expo-local-authentication";
import {
  deviceAuthAvailability,
  deviceAuthFailure,
  type DeviceAuthAvailability,
  type DeviceAuthCapabilities,
  type DeviceAuthResult,
} from "../domain/deviceAuth";

export type {
  DeviceAuthAvailability,
  DeviceAuthResult,
} from "../domain/deviceAuth";

export async function getDeviceAuthAvailability(): Promise<DeviceAuthAvailability> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return deviceAuthAvailability({
      platform: "web",
      hasDeviceCredential: false,
      biometrics: [],
      expoGo: false,
    });
  }
  try {
    const [level, types] = await Promise.all([
      LocalAuthentication.getEnrolledLevelAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const biometrics: DeviceAuthCapabilities["biometrics"] = [];
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    )
      biometrics.push("face");
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
      biometrics.push("fingerprint");
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS))
      biometrics.push("iris");
    return deviceAuthAvailability({
      platform: Platform.OS,
      hasDeviceCredential: level >= LocalAuthentication.SecurityLevel.SECRET,
      biometrics,
      // StoreClient also includes development builds, so use Expo's native
      // Expo Go test rather than Constants.executionEnvironment.
      expoGo: isRunningInExpoGo(),
    });
  } catch {
    return {
      available: false,
      label: "การยืนยันของเครื่อง",
      detail:
        "ตรวจการยืนยันของเครื่องไม่ได้ ลองเปิดแอปใหม่หรือใช้ PIN ของ DeskGuard",
    };
  }
}

let authenticating = false;

export async function authenticateWithDevice(): Promise<DeviceAuthResult> {
  if (authenticating)
    return {
      status: "error",
      message: "กำลังยืนยันตัวตน กรุณารอหน้าต่างของระบบ",
    };
  authenticating = true;
  try {
    const availability = await getDeviceAuthAvailability();
    if (!availability.available)
      return { status: "error", message: availability.detail };
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "ยืนยันตัวตนเพื่อหยุดเฝ้าระวัง DeskGuard",
      cancelLabel: "ยกเลิก",
      fallbackLabel: "ใช้รหัสเครื่อง",
      disableDeviceFallback: false,
      biometricsSecurityLevel: "strong",
    });
    return result.success
      ? { status: "success" }
      : deviceAuthFailure(result.error);
  } catch {
    return deviceAuthFailure("unknown");
  } finally {
    authenticating = false;
  }
}

/** iOS exposes no cancellation method here; callers must ignore stale results. */
export async function cancelDeviceAuthentication(): Promise<void> {
  if (Platform.OS === "android" && authenticating) {
    await LocalAuthentication.cancelAuthenticate().catch(() => undefined);
  }
}
