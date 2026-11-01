import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ALARM_BYTES,
  alarmExtension,
  ownedAlarmFileName,
  parseAlarmSoundMetadata,
  validateAlarmFile,
  validateAlarmImport,
  type AlarmSoundMetadata,
} from "../src/domain/alarmSound";

test("alarm import accepts supported extensions, including uppercase and provider-unknown MIME", () => {
  for (const name of [
    "เพลงปลุก.MP3",
    "tone.m4a",
    "my.alert.WAV",
    "alarm.aac",
  ]) {
    assert.equal(
      validateAlarmFile({
        name,
        size: 200,
        mimeType: "application/octet-stream",
      }),
      null,
    );
  }
  assert.equal(
    validateAlarmFile({ name: "tone.m4a", mimeType: "audio/mp4" }),
    null,
  );
  assert.equal(
    validateAlarmFile({ name: "tone.wav", size: MAX_ALARM_BYTES }),
    null,
  );
});

test("MP4 is allowed for import, but never as a persisted audio file", () => {
  for (const mimeType of [
    undefined,
    "video/mp4",
    "audio/mp4",
    "application/mp4",
    "application/octet-stream",
  ]) {
    assert.equal(
      validateAlarmImport({ name: "เสียงปลุก.MP4", size: 1000, mimeType }),
      null,
    );
  }
  assert.ok(validateAlarmFile({ name: "clip.mp4", size: 1000 }));
  for (const size of [0, -1, Infinity, MAX_ALARM_BYTES + 1]) {
    assert.ok(validateAlarmImport({ name: "clip.mp4", size }));
  }
  assert.ok(
    validateAlarmImport({
      name: "clip.mp4",
      size: 1000,
      mimeType: "image/png",
    }),
  );
  assert.ok(validateAlarmImport({ name: "clip.mov", size: 1000 }));
});

test("alarm import rejects unusable sizes and unsupported or mismatched files", () => {
  for (const size of [0, -1, NaN, Infinity, 1.5, MAX_ALARM_BYTES + 1]) {
    assert.ok(validateAlarmFile({ name: "tone.mp3", size }));
  }
  for (const name of ["photo.png", "song.mp3.exe", "mp3", "", "movie.mp4"]) {
    assert.ok(validateAlarmFile({ name, size: 100 }));
  }
  assert.ok(
    validateAlarmFile({ name: "photo.mp3", size: 100, mimeType: "image/png" }),
  );
  assert.ok(
    validateAlarmFile({ name: "movie.m4a", size: 100, mimeType: "video/mp4" }),
  );
  assert.equal(alarmExtension("music.M4A"), "m4a");
});

const metadata: AlarmSoundMetadata = {
  version: 1,
  id: "87fdc117-0865-4b2a-b236-daa8eaa5ef76",
  name: "my.alarm.wav",
  extension: "wav",
  size: 4000,
};

test("saved metadata cannot redirect native file access outside its private directory", () => {
  assert.deepEqual(parseAlarmSoundMetadata(metadata), metadata);
  assert.equal(ownedAlarmFileName(metadata), `${metadata.id}.wav`);
  for (const id of [
    "../outside",
    "..",
    "file:///secret",
    "a/b",
    "a\\b",
    "a%2fb",
    "",
  ]) {
    assert.equal(parseAlarmSoundMetadata({ ...metadata, id }), null);
    assert.throws(() => ownedAlarmFileName({ ...metadata, id }));
  }
  // Even a path-like original name is display metadata, never the storage path.
  assert.equal(
    ownedAlarmFileName({ ...metadata, name: "../../other.wav" }),
    `${metadata.id}.wav`,
  );
});

test("corrupt persisted metadata is rejected instead of restoring an unusable selection", () => {
  for (const value of [
    null,
    [],
    "sound",
    {},
    { ...metadata, version: 2 },
    { ...metadata, size: 0 },
    { ...metadata, size: MAX_ALARM_BYTES + 1 },
    { ...metadata, extension: "mp3" },
    { ...metadata, name: "other.png" },
    { ...metadata, name: "a".repeat(1025) + ".wav" },
  ]) {
    assert.equal(parseAlarmSoundMetadata(value), null);
  }
});

test("extracted audio retains its original video display name without changing storage paths", () => {
  const extracted = {
    ...metadata,
    name: "เสียงปลุก.m4a",
    extension: "m4a",
    sourceName: "เสียงปลุก.mp4",
  };
  assert.deepEqual(parseAlarmSoundMetadata(extracted), extracted);
  for (const sourceName of [null, 7, "clip.mov", "a".repeat(1025) + ".mp4"]) {
    assert.equal(parseAlarmSoundMetadata({ ...extracted, sourceName }), null);
  }
  assert.equal(
    parseAlarmSoundMetadata({ ...metadata, sourceName: "clip.mp4" }),
    null,
  );
});
