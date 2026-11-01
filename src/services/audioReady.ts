import { createAudioPlayer, type AudioPlayer } from "expo-audio";

// Import validates the decoder as well as the filename. No sound is played here.
export async function validateAudioSource(uri: string): Promise<void> {
  const probe = createAudioPlayer({ uri }, { updateInterval: 100 });
  try {
    await waitForAudioReady(probe);
  } finally {
    probe.remove();
  }
}

export function waitForAudioReady(
  player: AudioPlayer,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let finished = false;
    let subscription: { remove(): void } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      subscription?.remove();
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve();
    };
    const abort = () => finish(new Error("ยกเลิกการโหลดเสียงแล้ว"));
    const check = () => {
      const status = player.currentStatus;
      if (status.error) {
        finish(new Error("อ่านเสียงในไฟล์นี้ไม่ได้ ลองใช้ไฟล์เสียงอื่น"));
      } else if (
        status.isLoaded &&
        Number.isFinite(status.duration) &&
        status.duration > 0
      ) {
        finish();
      }
    };
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    subscription = player.addListener("playbackStatusUpdate", check);
    timer = setTimeout(
      () =>
        finish(
          new Error("โหลดเสียงไม่สำเร็จ ลองเลือกไฟล์เสียงอื่นที่เปิดฟังได้"),
        ),
      8_000,
    );
    check();
  });
}
