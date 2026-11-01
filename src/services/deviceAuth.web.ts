import {
  deviceAuthAvailability,
  type DeviceAuthAvailability,
  type DeviceAuthResult,
} from "../domain/deviceAuth";

export type {
  DeviceAuthAvailability,
  DeviceAuthResult,
} from "../domain/deviceAuth";

export async function getDeviceAuthAvailability(): Promise<DeviceAuthAvailability> {
  return deviceAuthAvailability({
    platform: "web",
    hasDeviceCredential: false,
    biometrics: [],
    expoGo: false,
  });
}

export async function authenticateWithDevice(): Promise<DeviceAuthResult> {
  return {
    status: "error",
    message: (await getDeviceAuthAvailability()).detail,
  };
}

export async function cancelDeviceAuthentication(): Promise<void> {}
