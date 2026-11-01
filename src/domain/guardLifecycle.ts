import type { GuardPhase } from "../types";

/** Missing sensor samples cannot silence an alarm that already fired. */
export function staleSensorAction(
  phase: GuardPhase,
  authenticating: boolean,
): "none" | "refresh" | "interrupt" {
  if (authenticating || phase === "alarm" || phase === "interrupted")
    return "none";
  return phase === "idle" ? "refresh" : "interrupt";
}

/** Losing foreground monitoring does not authorize an active session's unlock. */
export function interruptedPhase(phase: GuardPhase): GuardPhase {
  return phase === "idle" || phase === "countdown" ? "idle" : "interrupted";
}

/** Only the transient inactive authentication sheet gets a lifecycle exception. */
export function shouldHoldForDeviceAuth(
  nextState: string,
  authenticating: boolean,
): boolean {
  return nextState === "inactive" && authenticating;
}
