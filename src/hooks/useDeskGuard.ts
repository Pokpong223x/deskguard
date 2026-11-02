import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Vibration } from "react-native";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { setAudioModeAsync } from "expo-audio";
import { useAlarmSound } from "./useAlarmSound";
import { waitForAudioReady } from "../services/audioReady";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { MotionDetector, type Vector3 } from "../domain/motion";
import { MutationQueue } from "../domain/mutationQueue";
import {
  interruptedPhase,
  shouldHoldForDeviceAuth,
  staleSensorAction,
} from "../domain/guardLifecycle";
import {
  authenticateWithDevice,
  cancelDeviceAuthentication,
  getDeviceAuthAvailability,
  type DeviceAuthAvailability,
} from "../services/deviceAuth";
import type {
  GuardEvent,
  GuardMode,
  GuardPhase,
  GuardReading,
  GuardSettings,
  SensorStatus,
} from "../types";
import {
  DEFAULT_SETTINGS,
  loadGuardData,
  matchesPin,
  persistHistory,
  persistNewPin,
  persistSettings,
  validPin,
  type PinRecord,
} from "../services/storage";

const SAMPLE_INTERVAL = 50;
const STALE_AFTER = 1_500;
const EMPTY_READING: GuardReading = {
  acceleration: 0,
  rotation: 0,
  score: 0,
  ready: false,
};
const KEEP_AWAKE_TAG = "deskguard-active-session";
const clock = () => performance.now();

export function useDeskGuard() {
  const [phase, setPhaseState] = useState<GuardPhase>("idle");
  const [sensorStatus, setSensorStatusState] =
    useState<SensorStatus>("checking");
  const [countdown, setCountdown] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reading, setReading] = useState<GuardReading>(EMPTY_READING);
  const [samples, setSamples] = useState<number[]>([]);
  const [history, setHistory] = useState<GuardEvent[]>([]);
  const [settings, setSettings] = useState<GuardSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [mode, setModeState] = useState<GuardMode>("device");
  const [deviceAuth, setDeviceAuth] = useState<DeviceAuthAvailability>({
    available: false,
    label: "ยืนยันด้วยเครื่อง",
    detail: "กำลังตรวจวิธียืนยันตัวตนของเครื่อง…",
  });
  const [authBusy, setAuthBusy] = useState(false);

  const alarmSound = useAlarmSound(phase);
  const { player } = alarmSound;
  const mounted = useRef(true);
  const initialized = useRef(false);
  const phaseRef = useRef<GuardPhase>("idle");
  const modeRef = useRef<GuardMode>("device");
  const statusRef = useRef<SensorStatus>("checking");
  const settingsRef = useRef<GuardSettings>(DEFAULT_SETTINGS);
  const historyRef = useRef<GuardEvent[]>([]);
  const pinRef = useRef<PinRecord | null>(null);
  const readingRef = useRef<GuardReading>(EMPTY_READING);
  const detector = useRef(new MotionDetector("medium"));
  const subscriptions = useRef<Array<{ remove(): void }>>([]);
  const generation = useRef(0);
  const connecting = useRef(false);
  const lastSampleAt = useRef(0);
  const gyro = useRef<{ value: Vector3; at: number } | null>(null);
  const foreground = useRef(
    AppState.currentState !== "background" &&
      AppState.currentState !== "inactive",
  );
  const countdownEnds = useRef(0);
  const awaitingCalibration = useRef(false);
  const sessionStarted = useRef(0);
  const demoMotionUntil = useRef(0);
  const writeQueue = useRef(new MutationQueue());
  const pinAttempts = useRef({ count: 0, lockedUntil: 0 });
  const pinBusy = useRef(false);
  const deviceAuthRef = useRef(deviceAuth);
  const authInFlight = useRef(false);
  const authRequest = useRef(0);
  const sessionVersion = useRef(0);
  const [audioResumeVersion, setAudioResumeVersion] = useState(0);

  const refreshDeviceAuth = useCallback(async () => {
    const availability = await getDeviceAuthAvailability();
    if (!mounted.current) return;
    deviceAuthRef.current = availability;
    setDeviceAuth(availability);
  }, []);

  const setPhase = useCallback((value: GuardPhase) => {
    phaseRef.current = value;
    if (mounted.current) setPhaseState(value);
  }, []);

  const setSensorStatus = useCallback((value: SensorStatus) => {
    statusRef.current = value;
    if (mounted.current) setSensorStatusState(value);
  }, []);

  // All persistent mutations are serialized, including alarm events, settings,
  // PIN changes and history clearing. A late write cannot restore deleted data.
  const enqueue = useCallback(<T>(operation: () => Promise<T>): Promise<T> => {
    return writeQueue.current.run(operation);
  }, []);

  const stopSignals = useCallback(() => {
    Vibration.cancel();
    alarmSound.stop();
  }, [alarmSound.stop]);

  const disconnectSensors = useCallback(() => {
    generation.current += 1;
    connecting.current = false;
    subscriptions.current.forEach((subscription) => subscription.remove());
    subscriptions.current = [];
    gyro.current = null;
    lastSampleAt.current = 0;
  }, []);

  const appendEvent = useCallback(
    (kind: GuardEvent["kind"]) => {
      const event: GuardEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        at: Date.now(),
        acceleration: readingRef.current.acceleration,
        rotation: readingRef.current.rotation,
        source: modeRef.current,
        kind,
      };
      void enqueue(async () => {
        const next = [event, ...historyRef.current].slice(0, 100);
        // Keep a detected event visible in this session even if disk space fails.
        historyRef.current = next;
        if (mounted.current) setHistory(next);
        try {
          await persistHistory(next);
        } catch {
          if (mounted.current)
            setError(
              "บันทึกประวัติไม่สำเร็จ เหตุการณ์นี้ยังแสดงอยู่จนกว่าจะปิดแอป",
            );
        }
      });
    },
    [enqueue],
  );

  const interrupt = useCallback(
    (message: string) => {
      const previousPhase = phaseRef.current;
      const wasActive =
        previousPhase !== "idle" && previousPhase !== "interrupted";
      // Losing monitoring must not count as a successful owner unlock.
      setPhase(interruptedPhase(previousPhase));
      awaitingCalibration.current = false;
      countdownEnds.current = 0;
      detector.current.reset();
      stopSignals();
      if (wasActive) {
        appendEvent("interrupted");
        if (mounted.current) {
          setCountdown(0);
          setNotice(message);
        }
      }
    },
    [appendEvent, setPhase, stopSignals],
  );

  const consumeSample = useCallback(
    (acceleration: Vector3, rotation: Vector3 | null, now: number) => {
      if (!foreground.current || !mounted.current) return;
      if (
        ![acceleration.x, acceleration.y, acceleration.z].every(Number.isFinite)
      )
        return;
      if (
        modeRef.current === "device" &&
        (phaseRef.current === "countdown" || phaseRef.current === "armed") &&
        lastSampleAt.current > 0 &&
        now - lastSampleAt.current > 500
      ) {
        interrupt(
          "หยุดเฝ้าระวังแล้ว เพราะข้อมูลเซนเซอร์ขาดช่วง กรุณาเริ่มใหม่",
        );
      }
      lastSampleAt.current = now;
      const result = detector.current.sample(acceleration, rotation, now);
      const nextReading: GuardReading = {
        acceleration: result.acceleration,
        rotation: result.rotation,
        score: result.score,
        ready: result.ready,
      };
      readingRef.current = nextReading;
      setReading(nextReading);
      setSamples((previous) => [...previous.slice(-59), result.acceleration]);
      if (result.ready && statusRef.current !== "ready")
        setSensorStatus("ready");
      else if (!result.ready && statusRef.current === "ready")
        setSensorStatus("checking");

      if (awaitingCalibration.current && result.ready) {
        awaitingCalibration.current = false;
        sessionStarted.current = now;
        setElapsedSeconds(0);
        setPhase("armed");
        return;
      }
      if (phaseRef.current === "armed" && result.triggered) {
        setPhase("alarm");
        appendEvent("motion");
      }
    },
    [appendEvent, interrupt, setPhase, setSensorStatus],
  );

  const connectSensors = useCallback(
    async (requestPermission: boolean) => {
      if (
        modeRef.current !== "device" ||
        connecting.current ||
        phaseRef.current !== "idle"
      )
        return;
      if (Platform.OS === "web") {
        setSensorStatus("unavailable");
        setNotice(
          "เปิดใน Expo Go บน iPhone เพื่อใช้เซนเซอร์จริง หรือเลือกโหมดตัวอย่าง",
        );
        return;
      }
      disconnectSensors();
      const ticket = generation.current;
      connecting.current = true;
      setSensorStatus("checking");
      setError(null);
      const valid = () =>
        mounted.current &&
        generation.current === ticket &&
        modeRef.current === "device";
      // Permission sheets and hardware calls must not leave the app checking forever.
      const timeout = setTimeout(() => {
        if (valid() && statusRef.current === "checking") {
          disconnectSensors();
          setSensorStatus("stale");
          setError(
            "ยังไม่ได้รับข้อมูลเซนเซอร์ ลองเชื่อมต่ออีกครั้งและอนุญาต Motion & Fitness ในการตั้งค่า",
          );
        }
      }, 12_000);
      try {
        const permission = requestPermission
          ? await Accelerometer.requestPermissionsAsync()
          : await Accelerometer.getPermissionsAsync();
        if (!valid()) return;
        if (!permission.granted) {
          setSensorStatus("denied");
          if (requestPermission)
            setError(
              "ยังไม่ได้รับสิทธิ์การเคลื่อนไหว เปิดสิทธิ์ Motion & Fitness ให้ Expo Go ในการตั้งค่า iPhone แล้วลองใหม่",
            );
          return;
        }
        const available = await Accelerometer.isAvailableAsync();
        if (!valid()) return;
        if (!available) {
          setSensorStatus("unavailable");
          setError(
            "เครื่องนี้ไม่มีข้อมูล Accelerometer ที่ใช้งานได้ ลองบน iPhone จริงหรือใช้โหมดตัวอย่าง",
          );
          return;
        }
        detector.current.reset();
        readingRef.current = EMPTY_READING;
        setReading(EMPTY_READING);
        setSamples([]);
        lastSampleAt.current = clock();
        Accelerometer.setUpdateInterval(SAMPLE_INTERVAL);
        subscriptions.current.push(
          Accelerometer.addListener((value) => {
            if (!valid()) return;
            const now = clock();
            const freshGyro =
              gyro.current && now - gyro.current.at <= 250
                ? gyro.current.value
                : null;
            consumeSample(value, freshGyro, now);
          }),
        );
        // Gyroscope is an optional extra signal. A missing gyroscope does not
        // prevent accelerometer-only protection and stale gyro data is ignored.
        try {
          if ((await Gyroscope.isAvailableAsync()) && valid()) {
            Gyroscope.setUpdateInterval(SAMPLE_INTERVAL);
            subscriptions.current.push(
              Gyroscope.addListener((value) => {
                if (valid()) gyro.current = { value, at: clock() };
              }),
            );
          }
        } catch {
          if (valid())
            setNotice(
              "ใช้ Accelerometer เพียงตัวเดียว เนื่องจากอ่าน Gyroscope ไม่ได้",
            );
        }
      } catch {
        if (valid()) {
          setSensorStatus("unavailable");
          setError(
            "เชื่อมต่อเซนเซอร์ไม่สำเร็จ ลองอีกครั้งบน iPhone และตรวจสอบสิทธิ์การเคลื่อนไหว",
          );
        }
      } finally {
        clearTimeout(timeout);
        if (valid()) connecting.current = false;
      }
    },
    [consumeSample, disconnectSensors, setSensorStatus],
  );

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void Promise.all([loadGuardData(), refreshDeviceAuth()])
      .then(([data]) => {
        if (cancelled) return;
        settingsRef.current = data.settings;
        historyRef.current = data.history;
        pinRef.current = data.pin;
        detector.current.setSensitivity(data.settings.sensitivity);
        setSettings(data.settings);
        setHistory(data.history);
        setHasPin(data.pin !== null);
        if (data.warning) setNotice(data.warning);
        initialized.current = true;
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "อ่านข้อมูลที่บันทึกไว้ไม่สำเร็จ กรุณาปิดแล้วเปิดแอปใหม่ก่อนเริ่มเฝ้าระวัง",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    if (Platform.OS === "web") setSensorStatus("unavailable");
    else void connectSensors(false);

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        foreground.current = nextState === "active";
        if (
          nextState === "active" &&
          phaseRef.current === "alarm" &&
          !authInFlight.current
        ) {
          setAudioResumeVersion((value) => value + 1);
        }
        if (nextState === "active" && !authInFlight.current)
          void refreshDeviceAuth();
        // The OS authentication sheet can make iOS inactive. This is not an
        // owner unlock, and must not stop an existing alarm. A real background
        // transition always invalidates any pending authentication result.
        if (shouldHoldForDeviceAuth(nextState, authInFlight.current)) return;
        if (nextState === "background") {
          authRequest.current += 1;
          void cancelDeviceAuthentication();
        }
        if (
          nextState === "active" &&
          initialized.current &&
          modeRef.current === "device" &&
          phaseRef.current === "idle" &&
          !connecting.current &&
          statusRef.current !== "ready"
        ) {
          void connectSensors(false);
        }
        if (nextState !== "active") {
          interrupt(
            "การเฝ้าระวังขาดช่วง เพราะแอปออกจากหน้าจอหรือล็อกเครื่อง ขณะนี้ไม่ได้ตรวจจับ ยืนยันตัวตนเพื่อจบรอบแล้วเริ่มใหม่",
          );
          // An iOS permission sheet temporarily marks the app inactive. Do not
          // invalidate that very request; a real background transition still does.
          if (nextState === "background" || !connecting.current) {
            disconnectSensors();
            setSensorStatus("stale");
            readingRef.current = EMPTY_READING;
            setReading(EMPTY_READING);
          }
        }
      },
    );
    return () => {
      cancelled = true;
      mounted.current = false;
      authRequest.current += 1;
      void cancelDeviceAuthentication();
      appStateSubscription.remove();
      disconnectSensors();
      stopSignals();
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [
    connectSensors,
    disconnectSensors,
    interrupt,
    setSensorStatus,
    stopSignals,
    refreshDeviceAuth,
  ]);

  useEffect(() => {
    if (mode !== "demo") return;
    detector.current.reset();
    let sampleIndex = 0;
    const timer = setInterval(() => {
      if (!foreground.current || modeRef.current !== "demo") return;
      const now = clock();
      sampleIndex += 1;
      const moving = now < demoMotionUntil.current;
      // Only explicit demo mode creates synthetic input, through the same
      // detector and lifecycle as real sensor data. No fabricated device graph.
      consumeSample(
        {
          x: moving
            ? Math.sin(sampleIndex * 1.2) * 0.9
            : Math.sin(sampleIndex * 0.7) * 0.003,
          y: moving ? 0.4 * Math.cos(sampleIndex) : 0,
          z: 1,
        },
        { x: moving ? 2.8 : 0, y: 0, z: 0 },
        now,
      );
    }, SAMPLE_INTERVAL);
    return () => clearInterval(timer);
  }, [consumeSample, mode]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = clock();
      if (!foreground.current) return;
      if (phaseRef.current === "countdown" && countdownEnds.current > 0) {
        const remaining = Math.max(
          0,
          Math.ceil((countdownEnds.current - now) / 1000),
        );
        setCountdown(remaining);
        if (remaining === 0 && !awaitingCalibration.current) {
          countdownEnds.current = 0;
          awaitingCalibration.current = true;
          detector.current.reset();
          setReading(EMPTY_READING);
        }
      }
      if (phaseRef.current === "armed" || phaseRef.current === "alarm") {
        setElapsedSeconds(Math.floor((now - sessionStarted.current) / 1000));
      }
      const staleAction = staleSensorAction(
        phaseRef.current,
        authInFlight.current,
      );
      if (
        modeRef.current === "device" &&
        staleAction !== "none" &&
        lastSampleAt.current > 0 &&
        now - lastSampleAt.current > STALE_AFTER
      ) {
        disconnectSensors();
        setSensorStatus("stale");
        if (staleAction === "interrupt")
          interrupt(
            "การตรวจจับขาดช่วง เพราะข้อมูลเซนเซอร์ขาดหาย ยืนยันตัวตนเพื่อจบรอบแล้วเริ่มใหม่",
          );
        else void connectSensors(false);
        setReading(EMPTY_READING);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [connectSensors, disconnectSensors, interrupt, setSensorStatus]);

  useEffect(() => {
    if (phase !== "alarm") {
      stopSignals();
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    if (settings.haptics && Platform.OS !== "web")
      Vibration.vibrate([0, 500, 300, 500], true);
    if (settings.sound) {
      void setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "doNotMix",
      })
        .then(async () => {
          await waitForAudioReady(player, controller.signal);
          await player.seekTo(0);
          if (cancelled || phaseRef.current !== "alarm") return;
          player.loop = true;
          player.volume = 0.7;
          player.play();
        })
        .catch(() => {
          if (!cancelled) {
            const usingDefault = alarmSound.handlePlaybackError();
            setError(
              usingDefault
                ? "เล่นไฟล์ที่เลือกไม่ได้ จึงใช้เสียง DeskGuard แจ้งเตือนแทน"
                : "ตรวจพบการขยับ แต่เล่นเสียงไม่ได้ ตรวจสอบระดับเสียงและอุปกรณ์เสียงที่เชื่อมต่อ",
            );
          }
        });
    }
    return () => {
      cancelled = true;
      controller.abort();
      stopSignals();
    };
  }, [
    phase,
    player,
    settings.haptics,
    settings.sound,
    stopSignals,
    alarmSound.handlePlaybackError,
    audioResumeVersion,
  ]);

  useEffect(() => {
    if (phase === "alarm" && settings.sound && alarmSound.playbackError) {
      setError(alarmSound.playbackError);
    }
  }, [alarmSound.playbackError, phase, settings.sound]);

  const active = phase !== "idle" && phase !== "interrupted";
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG)
      .then(() => {
        if (cancelled)
          void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled && Platform.OS !== "web") {
          interrupt(
            "หยุดเฝ้าระวัง เพราะไม่สามารถคงหน้าจอให้เปิดอยู่ได้ ลองเริ่มใหม่",
          );
        }
      });
    return () => {
      cancelled = true;
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [active, interrupt]);

  const clearFeedback = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const retrySensors = useCallback(async () => {
    if (modeRef.current === "demo") return;
    await connectSensors(true);
  }, [connectSensors]);

  const start = useCallback(async () => {
    clearFeedback();
    if (!initialized.current) {
      setError("ข้อมูลยังไม่พร้อม กรุณาปิดแล้วเปิดแอปใหม่");
      return;
    }
    if (phaseRef.current !== "idle") return;
    if (pinBusy.current || writeQueue.current.pending) {
      setError("กำลังบันทึกข้อมูล รอสักครู่แล้วเริ่มเฝ้าระวังอีกครั้ง");
      return;
    }
    if (alarmSound.isBusy()) {
      setError("รอให้เตรียมเสียงเสร็จก่อนเริ่มเฝ้าระวัง");
      return;
    }
    if (!pinRef.current && !deviceAuthRef.current.available) {
      setError(
        "ตั้ง PIN ของแอป หรือเปิดใช้วิธียืนยันตัวตนของเครื่องก่อนเริ่มเฝ้าระวัง",
      );
      return;
    }
    if (!foreground.current) {
      setError("เปิดแอปค้างไว้ก่อนเริ่มเฝ้าระวัง");
      return;
    }
    if (
      statusRef.current !== "ready" ||
      clock() - lastSampleAt.current > STALE_AFTER
    ) {
      setError(
        "เซนเซอร์ยังไม่พร้อม เชื่อมต่อเซนเซอร์และรอให้ได้รับข้อมูลก่อนเริ่ม",
      );
      return;
    }
    alarmSound.stopPreview();
    alarmSound.clearPlaybackError();
    detector.current.reset();
    awaitingCalibration.current = false;
    countdownEnds.current = clock() + 5_000;
    demoMotionUntil.current = 0;
    setCountdown(5);
    setElapsedSeconds(0);
    sessionVersion.current += 1;
    setPhase("countdown");
  }, [
    clearFeedback,
    setPhase,
    alarmSound.isBusy,
    alarmSound.stopPreview,
    alarmSound.clearPlaybackError,
  ]);

  const cancelCountdown = useCallback(() => {
    if (phaseRef.current !== "countdown") return;
    setPhase("idle");
    countdownEnds.current = 0;
    awaitingCalibration.current = false;
    detector.current.reset();
    setCountdown(0);
    setNotice("ยกเลิกการเริ่มเฝ้าระวังแล้ว");
  }, [setPhase]);

  const checkPin = useCallback(async (pin: string): Promise<boolean> => {
    if (pinAttempts.current.lockedUntil > Date.now()) {
      setError("ใส่ PIN ผิดหลายครั้ง กรุณารอ 30 วินาทีแล้วลองใหม่");
      return false;
    }
    if (!pinRef.current || !(await matchesPin(pin, pinRef.current))) {
      pinAttempts.current.count += 1;
      if (pinAttempts.current.count >= 5) {
        pinAttempts.current = { count: 0, lockedUntil: Date.now() + 30_000 };
        setError("ใส่ PIN ผิด 5 ครั้ง กรุณารอ 30 วินาทีแล้วลองใหม่");
      } else setError("PIN ไม่ถูกต้อง ลองใส่รหัส 4 หลักอีกครั้ง");
      return false;
    }
    pinAttempts.current = { count: 0, lockedUntil: 0 };
    return true;
  }, []);

  const disarm = useCallback(
    async (pin: string): Promise<boolean> => {
      if (pinBusy.current || authInFlight.current || !initialized.current)
        return false;
      pinBusy.current = true;
      const session = sessionVersion.current;
      const request = authRequest.current;
      setError(null);
      try {
        if (!(await checkPin(pin))) return false;
        if (
          !mounted.current ||
          session !== sessionVersion.current ||
          request !== authRequest.current ||
          !foreground.current
        ) {
          if (mounted.current)
            setError("การยืนยันถูกขัดจังหวะ กลับเข้าแอปแล้วลองอีกครั้ง");
          return false;
        }
        sessionVersion.current += 1;
        setPhase("idle");
        countdownEnds.current = 0;
        awaitingCalibration.current = false;
        detector.current.reset();
        stopSignals();
        setCountdown(0);
        setNotice("หยุดเฝ้าระวังแล้ว");
        return true;
      } catch {
        setError("ตรวจสอบ PIN ไม่สำเร็จ ลองอีกครั้ง");
        return false;
      } finally {
        pinBusy.current = false;
      }
    },
    [checkPin, setPhase, stopSignals],
  );

  const authenticateAndDisarm = useCallback(async (): Promise<boolean> => {
    if (
      authInFlight.current ||
      pinBusy.current ||
      !initialized.current ||
      !foreground.current ||
      phaseRef.current === "idle" ||
      phaseRef.current === "countdown"
    )
      return false;
    const session = sessionVersion.current;
    const request = ++authRequest.current;
    authInFlight.current = true;
    setAuthBusy(true);
    setError(null);
    try {
      const result = await authenticateWithDevice();
      if (!mounted.current) return false;
      if (
        session !== sessionVersion.current ||
        request !== authRequest.current ||
        AppState.currentState === "background"
      ) {
        setError("การยืนยันตัวตนถูกขัดจังหวะ กลับเข้าแอปแล้วลองอีกครั้ง");
        return false;
      }
      if (result.status !== "success") {
        setError(result.message);
        return false;
      }
      sessionVersion.current += 1;
      setPhase("idle");
      countdownEnds.current = 0;
      awaitingCalibration.current = false;
      detector.current.reset();
      stopSignals();
      setCountdown(0);
      setNotice("ยืนยันด้วยเครื่องแล้ว หยุดเฝ้าระวังแล้ว");
      return true;
    } catch {
      if (mounted.current)
        setError(
          "ยืนยันด้วยเครื่องไม่สำเร็จ ลองใหม่หรือใช้ PIN ของแอปถ้าตั้งไว้",
        );
      return false;
    } finally {
      authInFlight.current = false;
      if (mounted.current) {
        setAuthBusy(false);
        // A cancelled OS sheet may have interrupted audio focus. Restart only
        // the existing alarm; never silently rearm an interrupted session.
        if (phaseRef.current === "alarm" && foreground.current)
          setAudioResumeVersion((value) => value + 1);
      }
    }
  }, [setPhase, stopSignals]);

  useEffect(() => {
    if (
      phase === "idle" &&
      foreground.current &&
      initialized.current &&
      modeRef.current === "device" &&
      statusRef.current !== "ready"
    ) {
      void connectSensors(false);
    }
  }, [phase, connectSensors]);

  const savePin = useCallback(
    async (newPin: string, currentPin?: string): Promise<boolean> => {
      if (pinBusy.current) return false;
      setError(null);
      if (!initialized.current) {
        setError("ข้อมูลยังไม่พร้อม กรุณาปิดแล้วเปิดแอปใหม่");
        return false;
      }
      if (phaseRef.current !== "idle") {
        setError("หยุดเฝ้าระวังก่อนเปลี่ยน PIN");
        return false;
      }
      if (!validPin(newPin)) {
        setError("ใช้ตัวเลข 4 หลักสำหรับ PIN");
        return false;
      }
      pinBusy.current = true;
      try {
        if (pinRef.current && !(await checkPin(currentPin ?? ""))) return false;
        return await enqueue(async () => {
          if (phaseRef.current !== "idle" || !foreground.current) {
            setError("กลับเข้าแอปและหยุดเฝ้าระวังก่อนเปลี่ยน PIN");
            return false;
          }
          pinRef.current = await persistNewPin(newPin);
          setHasPin(true);
          setNotice("บันทึก PIN แล้ว");
          return true;
        });
      } catch {
        setError("บันทึก PIN ไม่สำเร็จ รหัสเดิมยังใช้งานอยู่ กรุณาลองใหม่");
        return false;
      } finally {
        pinBusy.current = false;
      }
    },
    [checkPin, enqueue],
  );

  const updateSettings = useCallback(
    async (patch: Partial<GuardSettings>) => {
      if (!initialized.current || phaseRef.current !== "idle") {
        setError("หยุดเฝ้าระวังก่อนเปลี่ยนการตั้งค่า");
        return;
      }
      setError(null);
      try {
        await enqueue(async () => {
          if (phaseRef.current !== "idle") return;
          const next = { ...settingsRef.current, ...patch };
          await persistSettings(next);
          settingsRef.current = next;
          detector.current.setSensitivity(next.sensitivity);
          setSettings(next);
          setNotice("บันทึกการตั้งค่าแล้ว");
        });
      } catch {
        setError("บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่");
      }
    },
    [enqueue],
  );

  const clearHistory = useCallback(async () => {
    if (!initialized.current || phaseRef.current !== "idle") {
      const message = "หยุดเฝ้าระวังก่อนล้างประวัติ";
      setError(message);
      throw new Error(message);
    }
    setError(null);
    try {
      await enqueue(async () => {
        if (phaseRef.current !== "idle") throw new Error("Guard became active");
        await persistHistory([]);
        historyRef.current = [];
        setHistory([]);
        setNotice("ล้างประวัติแล้ว");
      });
    } catch {
      const message = "ล้างประวัติไม่สำเร็จ รายการเดิมยังอยู่ กรุณาลองใหม่";
      setError(message);
      throw new Error(message);
    }
  }, [enqueue]);

  const setMode = useCallback(
    (value: GuardMode) => {
      if (phaseRef.current !== "idle") {
        setError("หยุดเฝ้าระวังก่อนเปลี่ยนโหมด");
        return;
      }
      if (value === modeRef.current) return;
      clearFeedback();
      disconnectSensors();
      detector.current.reset();
      modeRef.current = value;
      setModeState(value);
      setSamples([]);
      readingRef.current = EMPTY_READING;
      setReading(EMPTY_READING);
      setSensorStatus(value === "demo" ? "checking" : "unavailable");
      if (value === "demo")
        setNotice("โหมดตัวอย่างใช้ข้อมูลจำลอง ไม่ได้เฝ้าระวังมือถือจริง");
      else void connectSensors(false);
    },
    [clearFeedback, connectSensors, disconnectSensors, setSensorStatus],
  );

  const simulateMotion = useCallback(() => {
    if (modeRef.current !== "demo") return;
    if (phaseRef.current !== "armed") {
      setNotice("เริ่มเฝ้าระวังและรอให้นับถอยหลังเสร็จก่อนจำลองการขยับ");
      return;
    }
    demoMotionUntil.current = clock() + 1_000;
  }, []);

  const chooseAlarmSound = useCallback(async () => {
    await alarmSound.choose();
    // The native Files sheet temporarily makes the app inactive and disconnects
    // sensors. Reconnect without another permission prompt when it returns.
    if (
      mounted.current &&
      foreground.current &&
      modeRef.current === "device" &&
      Platform.OS !== "web"
    ) {
      await connectSensors(false);
    }
  }, [alarmSound.choose, connectSensors]);

  return {
    phase,
    sensorStatus,
    countdown,
    elapsedSeconds,
    reading,
    samples,
    history,
    settings,
    loading,
    error,
    notice,
    hasPin,
    deviceAuth,
    authBusy,
    canArm: hasPin || deviceAuth.available,
    authenticateAndDisarm,
    mode,
    alarmSound,
    chooseAlarmSound,
    start,
    cancelCountdown,
    disarm,
    savePin,
    updateSettings,
    clearHistory,
    setMode,
    simulateMotion,
    retrySensors,
    clearFeedback,
  };
}
