import * as Crypto from "expo-crypto";
import type { DocumentPickerAsset } from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { isMp4Video, validateAlarmImport } from "../domain/alarmSound";
import { extractMp4Audio } from "../domain/mp4Audio";

export type PreparedAlarmAsset = DocumentPickerAsset & { sourceName?: string };
export interface PreparedAlarmImport {
  asset: PreparedAlarmAsset;
  cleanup: () => void;
}

export async function prepareAlarmAsset(
  asset: DocumentPickerAsset,
): Promise<PreparedAlarmImport> {
  if (!asset.uri.startsWith("file://") && !asset.uri.startsWith("content://")) {
    throw new Error("อ่านไฟล์ไม่ได้ กรุณาเลือกไฟล์จากแอป Files อีกครั้ง");
  }
  const source = new File(asset.uri);
  if (!source.exists) throw new Error("ไม่พบไฟล์ที่เลือก กรุณาเลือกใหม่");
  const validation = validateAlarmImport({ ...asset, size: source.size });
  if (validation) throw new Error(validation);
  if (!isMp4Video(asset.name))
    return { asset: { ...asset, size: source.size }, cleanup: () => {} };

  const audio = await extractMp4Audio(await source.arrayBuffer());
  // The source name is display-only; all writable paths use generated IDs.
  const output = new File(
    Paths.cache,
    `deskguard-extracted-${Crypto.randomUUID()}.m4a`,
  );
  const cleanup = () => {
    try {
      if (output.exists) output.delete();
    } catch {
      /* OS can reclaim cache files. */
    }
  };
  try {
    output.write(audio);
    if (!output.exists || output.size !== audio.byteLength)
      throw new Error("บันทึกเสียงจากวิดีโอไม่สำเร็จ กรุณาลองใหม่");
    return {
      asset: {
        uri: output.uri,
        name: asset.name.trim().replace(/\.mp4$/i, ".m4a"),
        mimeType: "audio/mp4",
        size: audio.byteLength,
        sourceName: asset.name,
        lastModified: Date.now(),
      },
      cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
