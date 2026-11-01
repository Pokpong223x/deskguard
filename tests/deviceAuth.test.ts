import assert from "node:assert/strict";
import test from "node:test";
import {
  deviceAuthAvailability,
  deviceAuthFailure,
  type DeviceAuthCapabilities,
} from "../src/domain/deviceAuth";

const iphone: DeviceAuthCapabilities = {
  platform: "ios",
  hasDeviceCredential: true,
  biometrics: ["face"],
  expoGo: false,
};

test("device passcode alone is sufficient without biometric hardware or enrollment", () => {
  const available = deviceAuthAvailability({ ...iphone, biometrics: [] });
  assert.equal(available.available, true);
  assert.equal(available.label, "รหัสเครื่อง");
  assert.equal(
    deviceAuthAvailability({ ...iphone, hasDeviceCredential: false }).available,
    false,
  );
});

test("Expo Go offers OS passcode on Face ID devices without claiming Face ID support", () => {
  assert.equal(
    deviceAuthAvailability({ ...iphone, expoGo: true }).available,
    true,
  );
  assert.equal(
    deviceAuthAvailability({ ...iphone, expoGo: true }).label,
    "รหัสเครื่อง",
  );
  assert.equal(
    deviceAuthAvailability({
      ...iphone,
      expoGo: true,
      hasDeviceCredential: false,
    }).available,
    false,
  );
  assert.match(
    deviceAuthAvailability({ ...iphone, expoGo: true }).detail,
    /development build/,
  );
  assert.equal(deviceAuthAvailability(iphone).available, true);
  assert.match(deviceAuthAvailability(iphone).label, /Face ID/);
  assert.equal(
    deviceAuthAvailability({
      ...iphone,
      expoGo: true,
      biometrics: ["fingerprint"],
    }).available,
    true,
  );
  assert.match(
    deviceAuthAvailability({ ...iphone, biometrics: ["fingerprint"] }).label,
    /Touch ID/,
  );
});

test("web never claims system authentication even when capability data is provided", () => {
  assert.equal(
    deviceAuthAvailability({ ...iphone, platform: "web" }).available,
    false,
  );
});

test("cancelled, denied and unknown OS outcomes never grant authorization", () => {
  for (const reason of ["user_cancel", "app_cancel", "system_cancel"]) {
    assert.equal(deviceAuthFailure(reason).status, "cancelled");
  }
  for (const reason of [
    "authentication_failed",
    "user_fallback",
    "lockout",
    "not_available",
    "passcode_not_set",
    "future-error-code",
  ]) {
    assert.equal(deviceAuthFailure(reason).status, "error");
  }
});
