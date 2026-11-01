import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import type { GuardPhase } from "../types";
import { validateAlarmImport } from "../domain/alarmSound";
import { prepareAlarmAsset } from "../services/prepareAlarmAsset";
import { validateAudioSource, waitForAudioReady } from "../services/audioReady";
import {
  loadCustomAlarmSound,
  saveCustomAlarmSound,
  removeCustomAlarmSound,
  releaseCustomAlarmSound,
  type CustomAlarmSound,
} from "../services/alarmSoundStorage";

const DEFAULT_SOUND = require("../../assets/alarm.wav");

export function useAlarmSound(phase: GuardPhase) {
  const [sound, setSound] = useState<CustomAlarmSound | null>(null);
  const [busy, setBusy] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const player = useAudioPlayer(
    sound && !fallback ? { uri: sound.uri } : DEFAULT_SOUND,
    { updateInterval: 100 },
  );
  const status = useAudioPlayerStatus(player);
  const playerRef = useRef(player);
  playerRef.current = player;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const mounted = useRef(true);
  const busyRef = useRef(true);
  const previewActive = useRef(false);
  const previewGeneration = useRef(0);
  const previewAbort = useRef<AbortController | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const stopPreview = useCallback(() => {
    previewGeneration.current += 1;
    previewAbort.current?.abort();
    previewAbort.current = null;
    clearTimeout(previewTimer.current);
    if (previewActive.current) {
      try {
        playerRef.current.pause();
      } catch {
        /* Released on unmount. */
      }
    }
    previewActive.current = false;
    if (mounted.current) {
      setPreviewing(false);
      setPreviewLoading(false);
    }
  }, []);

  const stop = useCallback(() => {
    stopPreview();
    try {
      playerRef.current.pause();
    } catch {
      /* Released on unmount. */
    }
  }, [stopPreview]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void loadCustomAlarmSound()
      .then((loaded) => {
        if (cancelled) releaseCustomAlarmSound(loaded);
        else setSound(loaded);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "อ่านเสียงที่บันทึกไว้ไม่ได้ กำลังใช้เสียง DeskGuard เลือกไฟล์ใหม่ได้",
          );
      })
      .finally(() => {
        if (!cancelled) {
          busyRef.current = false;
          setBusy(false);
        }
      });
    const listener = AppState.addEventListener("change", (next) => {
      if (next !== "active") stopPreview();
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      stop();
      listener.remove();
    };
  }, [stop, stopPreview]);

  useEffect(() => () => releaseCustomAlarmSound(sound), [sound]);
  useEffect(() => {
    if (phase !== "idle") stopPreview();
  }, [phase, stopPreview]);
  useEffect(() => {
    if (previewActive.current && status.didJustFinish) stopPreview();
  }, [status.didJustFinish, stopPreview]);

  const handlePlaybackError = useCallback(() => {
    stopPreview();
    if (soundRef.current && !fallbackRef.current) {
      fallbackRef.current = true;
      setFallback(true);
      setError(
        "เล่นไฟล์ที่เลือกไม่ได้ จึงเปลี่ยนมาใช้เสียง DeskGuard เลือกไฟล์อื่นได้ในหน้าตั้งค่า",
      );
      setPlaybackError(
        "เล่นไฟล์ที่เลือกไม่ได้ จึงใช้เสียง DeskGuard แจ้งเตือนแทน",
      );
      return true;
    }
    return false;
  }, [stopPreview]);

  useEffect(() => {
    if (!status.error) return;
    if (!handlePlaybackError()) {
      setError("เล่นเสียงไม่ได้ ตรวจสอบระดับเสียงแล้วลองอีกครั้ง");
      setPlaybackError("เล่นเสียงไม่ได้ ตรวจสอบระดับเสียงแล้วลองอีกครั้ง");
    }
  }, [status.error, handlePlaybackError]);

  const choose = useCallback(async () => {
    if (busyRef.current || phaseRef.current !== "idle") return;
    busyRef.current = true;
    setBusy(true);
    stopPreview();
    setError(null);
    setNotice(null);
    let pickedUri: string | undefined;
    let cleanupPrepared: (() => void) | undefined;
    try {
      // Invoke synchronously from the button's user gesture for browser pickers.
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*", "video/mp4"],
        multiple: false,
        copyToCacheDirectory: true,
        base64: false,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      pickedUri = asset.uri;
      if (!mounted.current) return;
      const validation = validateAlarmImport(asset);
      if (validation) throw new Error(validation);
      const prepared = await prepareAlarmAsset(asset);
      cleanupPrepared = prepared.cleanup;
      if (!mounted.current || phaseRef.current !== "idle") return;
      await validateAudioSource(prepared.asset.uri);
      if (!mounted.current || phaseRef.current !== "idle") return;
      const saved = await saveCustomAlarmSound(prepared.asset);
      if (!mounted.current) {
        releaseCustomAlarmSound(saved);
        return;
      }
      setSound(saved);
      setPlaybackError(null);
      fallbackRef.current = false;
      setFallback(false);
      setNotice(
        saved.sourceName
          ? "ดึงเสียงจากวิดีโอแล้ว กดฟังตัวอย่างเพื่อตรวจระดับเสียง"
          : "บันทึกเสียงของคุณแล้ว กดฟังตัวอย่างเพื่อตรวจระดับเสียง",
      );
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? `${reason.message} · ยังไม่ได้เปลี่ยนเสียงที่ใช้อยู่`
            : "เพิ่มเสียงไม่ได้ เสียงเดิมยังอยู่ ลองเลือกไฟล์อีกครั้ง",
        );
    } finally {
      cleanupPrepared?.();
      if (Platform.OS === "web" && pickedUri?.startsWith("blob:"))
        URL.revokeObjectURL(pickedUri);
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [stopPreview]);

  const reset = useCallback(async () => {
    if (busyRef.current || phaseRef.current !== "idle") return;
    busyRef.current = true;
    setBusy(true);
    stopPreview();
    setError(null);
    setNotice(null);
    try {
      await removeCustomAlarmSound();
      if (!mounted.current) return;
      setSound(null);
      setPlaybackError(null);
      fallbackRef.current = false;
      setFallback(false);
      setNotice("กลับมาใช้เสียง DeskGuard แล้ว");
    } catch {
      if (mounted.current)
        setError("เปลี่ยนเสียงไม่สำเร็จ เสียงที่เลือกไว้ยังอยู่ ลองอีกครั้ง");
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [stopPreview]);

  const togglePreview = useCallback(async () => {
    if (previewActive.current) {
      stopPreview();
      return;
    }
    if (busyRef.current || phaseRef.current !== "idle") return;
    setError(null);
    setNotice(null);
    previewActive.current = true;
    const token = ++previewGeneration.current;
    const controller = new AbortController();
    previewAbort.current = controller;
    setPreviewLoading(true);
    const current = playerRef.current;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "doNotMix",
      });
      await waitForAudioReady(current, controller.signal);
      await current.seekTo(0);
      if (
        token !== previewGeneration.current ||
        phaseRef.current !== "idle" ||
        !mounted.current
      )
        return;
      current.loop = false;
      current.volume = 0.7;
      current.play();
      setPreviewLoading(false);
      setPreviewing(true);
      previewTimer.current = setTimeout(stopPreview, 10_000);
    } catch {
      if (token !== previewGeneration.current || !mounted.current) return;
      if (!handlePlaybackError())
        setError("ฟังตัวอย่างไม่ได้ ลองใหม่หรือตรวจสอบไฟล์เสียง");
      stopPreview();
    }
  }, [handlePlaybackError, stopPreview]);

  const isBusy = useCallback(() => busyRef.current, []);
  const clearPlaybackError = useCallback(() => setPlaybackError(null), []);
  return {
    sound,
    busy,
    previewing,
    previewLoading,
    error,
    playbackError,
    notice,
    usingDefault: fallback,
    player,
    status,
    choose,
    reset,
    togglePreview,
    stopPreview,
    stop,
    isBusy,
    clearPlaybackError,
    handlePlaybackError,
  };
}
