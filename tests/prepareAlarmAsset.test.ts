import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { DocumentPickerAsset } from "expo-document-picker";
import { createFile, MP4BoxBuffer } from "mp4box";
import { MAX_ALARM_BYTES } from "../src/domain/alarmSound";
import { prepareAlarmAsset } from "../src/services/prepareAlarmAsset.web";

async function fixture(name: string, displayName: string, type: string) {
  const bytes = await readFile(new URL(`fixtures/${name}`, import.meta.url));
  return new File([new Uint8Array(bytes)], displayName, { type });
}

function pickedFile(file: File, uri: string): DocumentPickerAsset {
  return {
    name: file.name,
    uri,
    file,
    size: file.size,
    mimeType: file.type,
    lastModified: file.lastModified,
  };
}

function mediaInfo(buffer: ArrayBuffer) {
  const parser = createFile();
  parser.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0), true);
  parser.flush();
  return parser.getInfo();
}

test("MP4 import produces an audio-only M4A asset with source metadata and disposable URL", async (t) => {
  const source = await fixture("video-aac.mp4", "เสียงปลุก.MP4", "video/mp4");
  const sourceUri = URL.createObjectURL(source);
  t.after(() => URL.revokeObjectURL(sourceUri));
  assert.ok(mediaInfo(await source.arrayBuffer()).videoTracks.length > 0);

  const prepared = await prepareAlarmAsset(pickedFile(source, sourceUri));
  t.after(prepared.cleanup);
  assert.equal(prepared.asset.name, "เสียงปลุก.m4a");
  assert.equal(prepared.asset.sourceName, source.name);
  assert.equal(prepared.asset.mimeType, "audio/mp4");
  assert.ok(prepared.asset.file instanceof File);
  assert.equal(prepared.asset.size, prepared.asset.file.size);
  assert.notEqual(prepared.asset.uri, sourceUri);

  const audio = await fetch(prepared.asset.uri);
  assert.equal(audio.headers.get("content-type"), "audio/mp4");
  const info = mediaInfo(await audio.arrayBuffer());
  assert.equal(info.tracks.length, 1);
  assert.equal(info.videoTracks.length, 0);
  assert.equal(info.audioTracks.length, 1);
  assert.match(info.audioTracks[0].codec, /^mp4a\.40\./);
  assert.ok(info.audioTracks[0].nb_samples > 0);

  prepared.cleanup();
  await assert.rejects(fetch(prepared.asset.uri));
  assert.equal((await fetch(sourceUri)).status, 200);
});

test("a provider Blob URI can supply MP4 bytes when no File object is supplied", async (t) => {
  const source = await fixture("video-aac.mp4", "clip.mp4", "video/mp4");
  const sourceUri = URL.createObjectURL(source);
  t.after(() => URL.revokeObjectURL(sourceUri));
  const prepared = await prepareAlarmAsset({
    ...pickedFile(source, sourceUri),
    file: undefined,
    size: 1,
  });
  t.after(prepared.cleanup);
  assert.equal(prepared.asset.name, "clip.m4a");
  assert.ok(prepared.asset.size! > 1);
  assert.equal(
    mediaInfo(await prepared.asset.file!.arrayBuffer()).videoTracks.length,
    0,
  );
});

test("actual source bytes override misleading picker sizes before extraction", async () => {
  const oversized = new File([new Uint8Array(MAX_ALARM_BYTES + 1)], "big.mp4", {
    type: "video/mp4",
  });
  await assert.rejects(
    prepareAlarmAsset({ ...pickedFile(oversized, "blob:unused"), size: 1 }),
    /10 MB/,
  );
  const empty = new File([], "empty.mp4", { type: "video/mp4" });
  await assert.rejects(
    prepareAlarmAsset({ ...pickedFile(empty, "blob:unused"), size: 1024 }),
    /ว่าง/,
  );
});

test("a real video without audio is rejected with actionable feedback", async () => {
  const source = await fixture("video-silent.mp4", "silent.mp4", "video/mp4");
  await assert.rejects(
    prepareAlarmAsset(pickedFile(source, "blob:unused")),
    /วิดีโอนี้ไม่มีเสียง/,
  );
});

test("ordinary audio preserves its bytes and source URL, using the actual file size", async (t) => {
  const bytes = await readFile(new URL("../assets/alarm.wav", import.meta.url));
  const source = new File([new Uint8Array(bytes)], "alarm.wav", {
    type: "audio/wav",
  });
  const sourceUri = URL.createObjectURL(source);
  t.after(() => URL.revokeObjectURL(sourceUri));
  const prepared = await prepareAlarmAsset({
    ...pickedFile(source, sourceUri),
    size: 1,
  });
  assert.equal(prepared.asset.file, source);
  assert.equal(prepared.asset.uri, sourceUri);
  assert.equal(prepared.asset.size, source.size);
  assert.equal(prepared.asset.name, "alarm.wav");
  assert.equal(prepared.asset.sourceName, undefined);
  prepared.cleanup();
  assert.deepEqual(
    new Uint8Array(await (await fetch(sourceUri)).arrayBuffer()),
    new Uint8Array(bytes),
  );
});
