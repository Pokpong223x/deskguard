import assert from "node:assert/strict";
import test from "node:test";
import {
  MotionDetector,
  type Sensitivity,
  type Vector3,
} from "../src/domain/motion";

const REST = { x: 0, y: 0, z: 1 };
const NO_ROTATION = { x: 0, y: 0, z: 0 };

function warmup(
  detector: MotionDetector,
  orientation: Vector3 = REST,
  start = 0,
): void {
  for (let time = start; time <= start + 1_000; time += 20) {
    const result = detector.sample(orientation, NO_ROTATION, time);
    assert.equal(result.triggered, false);
    assert.equal(result.ready, time - start >= 700);
  }
}

test("stationary gravity in different orientations and small sensor noise do not trigger", () => {
  for (const orientation of [
    REST,
    { x: 1, y: 0, z: 0 },
    { x: 0.6, y: 0, z: 0.8 },
  ]) {
    const detector = new MotionDetector("high");
    warmup(detector, orientation);
    for (let time = 1_020; time <= 5_000; time += 20) {
      const noise = Math.sin(time / 77) * 0.008;
      const result = detector.sample(
        {
          x: orientation.x + noise,
          y: orientation.y - noise,
          z: orientation.z + noise,
        },
        { x: 0.01, y: -0.01, z: 0.005 },
        time,
      );
      assert.equal(result.ready, true);
      assert.equal(result.triggered, false);
      assert.ok(result.acceleration < 0.04);
      assert.ok(result.score < 1);
    }
  }
});

test("sustained acceleration triggers once after the time threshold and reset allows a new session", () => {
  const detector = new MotionDetector("medium");
  for (const start of [0, 10_000]) {
    warmup(detector, REST, start);
    const triggerTimes: number[] = [];
    for (let time = start + 1_020; time <= start + 2_000; time += 20) {
      const result = detector.sample({ x: 0.4, y: 0, z: 1 }, null, time);
      if (result.triggered) triggerTimes.push(time);
    }
    assert.deepEqual(triggerTimes, [start + 1_280]);
    detector.reset();
  }
});

test("gyroscope detects sustained rotation even when the gravity direction stays unchanged", () => {
  const detector = new MotionDetector("medium");
  warmup(detector);
  let triggered = false;
  for (let time = 1_020; time <= 1_400; time += 20) {
    const result = detector.sample(REST, { x: 0, y: 0, z: 0.5 }, time);
    assert.equal(result.acceleration, 0);
    triggered ||= result.triggered;
  }
  assert.equal(triggered, true);
});

test("a sustained tilt can also be detected without a gyroscope", () => {
  const detector = new MotionDetector("medium");
  warmup(detector);
  let triggered = false;
  for (let time = 1_020; time <= 1_600; time += 20) {
    const angle = Math.min((time - 1_000) / 600, 1) * 0.7;
    triggered ||= detector.sample(
      { x: Math.sin(angle), y: 0, z: Math.cos(angle) },
      null,
      time,
    ).triggered;
  }
  assert.equal(triggered, true);
});

test("an isolated sharp tap does not trigger or leave a false baseline tail", () => {
  for (const sensitivity of ["low", "medium", "high"] as const) {
    const detector = new MotionDetector(sensitivity);
    warmup(detector);
    const tap = detector.sample(
      { x: 12, y: 0, z: 1 },
      { x: 8, y: 0, z: 0 },
      1_020,
    );
    assert.ok(tap.score > 1);
    assert.equal(tap.triggered, false);
    for (let time = 1_040; time <= 2_000; time += 20) {
      assert.equal(detector.sample(REST, NO_ROTATION, time).triggered, false);
    }
  }
});

test("a quiet sample breaks the sustained movement interval", () => {
  const detector = new MotionDetector("high");
  warmup(detector);
  for (const time of [1_020, 1_100, 1_200]) {
    assert.equal(
      detector.sample(REST, { x: 0.4, y: 0, z: 0 }, time).triggered,
      false,
    );
  }
  detector.sample(REST, NO_ROTATION, 1_220);
  assert.equal(
    detector.sample(REST, { x: 0.4, y: 0, z: 0 }, 1_240).triggered,
    false,
  );
  assert.equal(
    detector.sample(REST, { x: 0.4, y: 0, z: 0 }, 1_400).triggered,
    false,
  );
  assert.equal(
    detector.sample(REST, { x: 0.4, y: 0, z: 0 }, 1_500).triggered,
    true,
  );
});

test("irregular sample intervals use elapsed time rather than sample count", () => {
  const detector = new MotionDetector("medium");
  warmup(detector);
  const moving = { x: 0.5, y: 0, z: 1 };
  for (const time of [1_020, 1_031, 1_170, 1_269]) {
    assert.equal(detector.sample(moving, null, time).triggered, false);
  }
  assert.equal(detector.sample(moving, null, 1_270).triggered, true);
});

test("a stale stream requires a new warmup and cannot complete an earlier movement candidate", () => {
  const detector = new MotionDetector("medium");
  warmup(detector);
  detector.sample(REST, { x: 1, y: 0, z: 0 }, 1_020);
  detector.sample(REST, { x: 1, y: 0, z: 0 }, 1_200);
  const resumed = detector.sample(REST, { x: 1, y: 0, z: 0 }, 2_000);
  assert.equal(resumed.ready, false);
  assert.equal(resumed.triggered, false);
  warmup(detector, REST, 2_000);
  assert.equal(
    detector.sample(REST, { x: 1, y: 0, z: 0 }, 3_020).triggered,
    false,
  );
  assert.equal(
    detector.sample(REST, { x: 1, y: 0, z: 0 }, 3_280).triggered,
    true,
  );
});

test("a backwards or nonfinite timestamp restarts calibration", () => {
  const detector = new MotionDetector("medium");
  warmup(detector);
  assert.equal(detector.sample(REST, NO_ROTATION, 500).ready, false);
  assert.equal(detector.sample(REST, NO_ROTATION, Number.NaN).ready, false);
  assert.equal(detector.sample(REST, NO_ROTATION, 2_000).ready, false);
});

test("stream interruptions and sensitivity changes do not unlatch an already triggered session", () => {
  const detector = new MotionDetector("medium");
  warmup(detector);
  detector.sample(REST, { x: 1, y: 0, z: 0 }, 1_020);
  assert.equal(
    detector.sample(REST, { x: 1, y: 0, z: 0 }, 1_280).triggered,
    true,
  );

  warmup(detector, REST, 2_000);
  detector.sample(REST, { x: 1, y: 0, z: 0 }, 3_020);
  assert.equal(
    detector.sample(REST, { x: 1, y: 0, z: 0 }, 3_280).triggered,
    false,
  );

  detector.setSensitivity("high");
  warmup(detector, REST, 4_000);
  detector.sample(REST, { x: 1, y: 0, z: 0 }, 5_020);
  assert.equal(
    detector.sample(REST, { x: 1, y: 0, z: 0 }, 5_280).triggered,
    false,
  );
});

test("sensitivity changes which sustained motion is detected", () => {
  const outcomes = (["high", "medium", "low"] as Sensitivity[]).map(
    (sensitivity) => {
      const detector = new MotionDetector(sensitivity);
      warmup(detector);
      let triggered = false;
      for (let time = 1_020; time <= 1_500; time += 20) {
        triggered ||= detector.sample(
          REST,
          { x: 0.25, y: 0, z: 0 },
          time,
        ).triggered;
      }
      return triggered;
    },
  );
  assert.deepEqual(outcomes, [true, false, false]);

  const detector = new MotionDetector("high");
  warmup(detector);
  detector.setSensitivity("low");
  assert.equal(detector.sample(REST, NO_ROTATION, 1_020).ready, false);
});

test("invalid sensor values never escape as nonfinite metrics or produce an alarm", () => {
  const detector = new MotionDetector("medium");
  warmup(detector);
  const invalidAcceleration = detector.sample(
    { x: Number.NaN, y: 0, z: 1 },
    null,
    1_020,
  );
  assert.equal(invalidAcceleration.ready, false);
  assert.equal(invalidAcceleration.triggered, false);
  assert.ok(
    Object.values(invalidAcceleration).every(
      (value) => typeof value === "boolean" || Number.isFinite(value),
    ),
  );

  warmup(detector, REST, 2_000);
  const invalidRotation = detector.sample(
    REST,
    { x: Number.NaN, y: Infinity, z: -Infinity },
    3_020,
  );
  assert.equal(invalidRotation.rotation, 0);
  assert.equal(invalidRotation.triggered, false);
  const bounded = detector.sample(
    { x: Number.MAX_VALUE, y: 0, z: 1 },
    { x: Number.MAX_VALUE, y: 0, z: 0 },
    3_040,
  );
  assert.ok(Number.isFinite(bounded.score));
  assert.ok(bounded.acceleration <= 16);
  assert.equal(bounded.rotation, 35);
  assert.equal(bounded.triggered, false);
});
