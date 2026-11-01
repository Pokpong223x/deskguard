import type { DocumentPickerAsset } from "expo-document-picker";
import { isMp4Video, validateAlarmImport } from "../domain/alarmSound";
import { extractMp4Audio } from "../domain/mp4Audio";
import type { PreparedAlarmImport } from "./prepareAlarmAsset";

export async function prepareAlarmAsset(
  asset: DocumentPickerAsset,
): Promise<PreparedAlarmImport> {
  let blob: Blob;
  if (asset.file instanceof Blob) blob = asset.file;
  else if (asset.uri.startsWith("blob:") || asset.uri.startsWith("data:")) {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error("อ่านไฟล์ที่เลือกไม่ได้ กรุณาเลือกใหม่");
    blob = await response.blob();
  } else throw new Error("อ่านไฟล์ที่เลือกไม่ได้ กรุณาเลือกใหม่");
  const validation = validateAlarmImport({
    ...asset,
    size: blob.size,
    mimeType: blob.type || asset.mimeType,
  });
  if (validation) throw new Error(validation);
  if (!isMp4Video(asset.name))
    return { asset: { ...asset, size: blob.size }, cleanup: () => {} };

  const audio = await extractMp4Audio(await blob.arrayBuffer());
  // A new audio-only file is probed and persisted; the video is never stored.
  const file = new File(
    [new Uint8Array(audio)],
    asset.name.trim().replace(/\.mp4$/i, ".m4a"),
    { type: "audio/mp4" },
  );
  const uri = URL.createObjectURL(file);
  return {
    asset: {
      uri,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      file,
      sourceName: asset.name,
      lastModified: file.lastModified,
    },
    cleanup: () => URL.revokeObjectURL(uri),
  };
}
