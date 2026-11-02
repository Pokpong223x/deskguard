import type { Sensitivity } from "./domain/motion";

export type GuardMode = "device" | "demo";
export type GuardPhase =
  "idle" | "countdown" | "armed" | "alarm" | "interrupted";
export type SensorStatus =
  "checking" | "ready" | "unavailable" | "denied" | "stale";

export interface GuardSettings {
  sensitivity: Sensitivity;
  sound: boolean;
  haptics: boolean;
  autoQuiet: boolean;
}

export interface GuardReading {
  acceleration: number;
  rotation: number;
  score: number;
  ready: boolean;
}

export interface GuardEvent {
  id: string;
  at: number;
  acceleration: number;
  rotation: number;
  source: GuardMode;
  kind: "motion" | "interrupted";
}
