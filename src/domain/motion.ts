export type Sensitivity = "low" | "medium" | "high";

export type Vector3 = { x: number; y: number; z: number };

export const SENSITIVITY = {
  low: { label: "ต่ำ", accelerationThreshold: 0.24, rotationThreshold: 0.65 },
  medium: {
    label: "ปานกลาง",
    accelerationThreshold: 0.13,
    rotationThreshold: 0.35,
  },
  high: { label: "สูง", accelerationThreshold: 0.07, rotationThreshold: 0.18 },
} as const satisfies Record<
  Sensitivity,
  { label: string; accelerationThreshold: number; rotationThreshold: number }
>;

export type MotionSample = {
  /** Difference from the estimated gravity vector, in g. */
  acceleration: number;
  /** Angular speed, in radians per second. Zero when no gyroscope is available. */
  rotation: number;
  /** A value of 1 reaches the selected sensitivity threshold. */
  score: number;
  /** True for only the sample that first confirms sustained movement. */
  triggered: boolean;
  ready: boolean;
};

const WARMUP_MS = 700;
const SUSTAINED_MOVEMENT_MS = 250;
const STALE_GAP_MS = 500;
const GRAVITY_TIME_CONSTANT_MS = 900;
const EMPTY_SAMPLE: MotionSample = {
  acceleration: 0,
  rotation: 0,
  score: 0,
  triggered: false,
  ready: false,
};

function clamp(value: number, limit: number): number {
  return Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value)) : 0;
}

function magnitude(vector: Vector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

/**
 * Foreground movement detection, not a calibrated instrument or theft guarantee.
 * Keep the device still during the first 700 ms. A low-pass gravity estimate
 * removes its stationary orientation; its residual is the acceleration signal.
 * While a movement candidate is active, baseline adaptation pauses so that an
 * impact cannot contaminate the baseline or sustained motion disappear into it.
 *
 * A single short tap is intentionally ignored. Slow movements below the chosen
 * thresholds can also be missed. Without a gyroscope, rotation around the gravity
 * axis cannot be detected reliably. A missing stream starts a new calibration;
 * this class cannot detect motion while the OS has suspended sensor delivery.
 */
export class MotionDetector {
  private sensitivity: Sensitivity;
  private gravity: Vector3 | null = null;
  private startedAt: number | null = null;
  private lastTimestamp: number | null = null;
  private aboveThresholdSince: number | null = null;
  private hasTriggered = false;

  constructor(sensitivity: Sensitivity) {
    this.sensitivity = sensitivity;
  }

  reset(): void {
    this.recalibrate();
    this.hasTriggered = false;
  }

  private recalibrate(): void {
    this.gravity = null;
    this.startedAt = null;
    this.lastTimestamp = null;
    this.aboveThresholdSince = null;
  }

  setSensitivity(value: Sensitivity): void {
    if (value !== this.sensitivity) {
      this.sensitivity = value;
      this.recalibrate();
    }
  }

  sample(
    acceleration: Vector3,
    rotation: Vector3 | null,
    timestampMs: number,
  ): MotionSample {
    // An invalid gravity reading cannot be interpreted as real movement.
    if (
      !Number.isFinite(timestampMs) ||
      !Number.isFinite(acceleration.x) ||
      !Number.isFinite(acceleration.y) ||
      !Number.isFinite(acceleration.z)
    ) {
      this.recalibrate();
      return { ...EMPTY_SAMPLE };
    }

    if (
      this.lastTimestamp !== null &&
      (timestampMs < this.lastTimestamp ||
        timestampMs - this.lastTimestamp > STALE_GAP_MS)
    ) {
      this.recalibrate();
    }

    const boundedAcceleration = {
      x: clamp(acceleration.x, 16),
      y: clamp(acceleration.y, 16),
      z: clamp(acceleration.z, 16),
    };
    const angularSpeed = rotation
      ? magnitude({
          x: clamp(rotation.x, 35),
          y: clamp(rotation.y, 35),
          z: clamp(rotation.z, 35),
        })
      : 0;

    if (
      this.gravity === null ||
      this.startedAt === null ||
      this.lastTimestamp === null
    ) {
      this.gravity = boundedAcceleration;
      this.startedAt = timestampMs;
      this.lastTimestamp = timestampMs;
      return { ...EMPTY_SAMPLE };
    }

    const deltaMs = timestampMs - this.lastTimestamp;
    this.lastTimestamp = timestampMs;
    const ready = timestampMs - this.startedAt >= WARMUP_MS;
    const residual = {
      x: boundedAcceleration.x - this.gravity.x,
      y: boundedAcceleration.y - this.gravity.y,
      z: boundedAcceleration.z - this.gravity.z,
    };
    const linearAcceleration = magnitude(residual);
    const thresholds = SENSITIVITY[this.sensitivity];
    const score = Math.max(
      linearAcceleration / thresholds.accelerationThreshold,
      angularSpeed / thresholds.rotationThreshold,
    );

    if (!ready || score < 1) {
      const alpha = 1 - Math.exp(-deltaMs / GRAVITY_TIME_CONSTANT_MS);
      this.gravity = {
        x: this.gravity.x + alpha * residual.x,
        y: this.gravity.y + alpha * residual.y,
        z: this.gravity.z + alpha * residual.z,
      };
    }

    if (!ready) {
      return { ...EMPTY_SAMPLE };
    }

    let triggered = false;
    if (score >= 1) {
      this.aboveThresholdSince ??= timestampMs;
      if (
        !this.hasTriggered &&
        timestampMs - this.aboveThresholdSince >= SUSTAINED_MOVEMENT_MS
      ) {
        triggered = true;
        this.hasTriggered = true;
      }
    } else {
      this.aboveThresholdSince = null;
    }

    return {
      acceleration: linearAcceleration,
      rotation: angularSpeed,
      score,
      triggered,
      ready,
    };
  }
}
