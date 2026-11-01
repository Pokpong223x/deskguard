import assert from "node:assert/strict";
import test from "node:test";
import {
  interruptedPhase,
  shouldHoldForDeviceAuth,
  staleSensorAction,
} from "../src/domain/guardLifecycle";

test("cancelling device authentication cannot silence an already-triggered alarm through the stale watchdog", () => {
  assert.equal(staleSensorAction("alarm", true), "none");
  // A cancelled OS sheet clears the authentication flag before a sensor
  // callback necessarily arrives. The alarm must survive that gap too.
  assert.equal(staleSensorAction("alarm", false), "none");
});

test("sensor loss ends live monitoring while retaining the owner's unlock requirement", () => {
  assert.equal(staleSensorAction("armed", false), "interrupt");
  assert.equal(interruptedPhase("armed"), "interrupted");
  assert.equal(staleSensorAction("interrupted", false), "none");
  assert.equal(interruptedPhase("interrupted"), "interrupted");
  // A round which has not armed can still be cancelled without authentication.
  assert.equal(staleSensorAction("countdown", false), "interrupt");
  assert.equal(interruptedPhase("countdown"), "idle");
});

test("idle sample loss requests reconnection without creating a locked session", () => {
  assert.equal(staleSensorAction("idle", false), "refresh");
  assert.equal(interruptedPhase("idle"), "idle");
});

test("authentication sheet may defer stale checks but genuine backgrounding always interrupts", () => {
  assert.equal(shouldHoldForDeviceAuth("inactive", true), true);
  assert.equal(staleSensorAction("armed", true), "none");
  assert.equal(shouldHoldForDeviceAuth("inactive", false), false);
  for (const nextState of ["active", "background", "unknown"]) {
    assert.equal(shouldHoldForDeviceAuth(nextState, true), false);
    assert.equal(shouldHoldForDeviceAuth(nextState, false), false);
  }
  assert.equal(interruptedPhase("alarm"), "interrupted");
});
