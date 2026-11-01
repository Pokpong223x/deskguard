import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createFile, MP4BoxBuffer } from "mp4box";
import { MAX_ALARM_BYTES } from "../src/domain/alarmSound";
import { extractMp4Audio, Mp4AudioError } from "../src/domain/mp4Audio";

function fixture(name = "video-aac.mp4"): ArrayBuffer {
  const bytes = readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

function parse(input: ArrayBuffer) {
  const file = createFile(true);
  file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(input, 0), true);
  file.flush();
  return file;
}

function hasCode(code: string) {
  return (error: unknown) =>
    error instanceof Mp4AudioError && error.code === code;
}

for (const name of ["video-aac.mp4", "video-aac-fragmented.mp4"]) {
  test(`extracts playable AAC structure and preserves every audio sample from ${name}`, async () => {
    const input = fixture(name);
    const source = parse(input);
    const sourceInfo = source.getInfo();
    assert.equal(sourceInfo.videoTracks.length, 1);
    const sourceAudio = sourceInfo.audioTracks[0];
    const before = source.getTrackSamplesInfo(sourceAudio.id);

    const bytes = await extractMp4Audio(input);
    const output = parse(bytes.buffer);
    const info = output.getInfo();
    assert.equal(info.tracks.length, 1);
    assert.equal(info.audioTracks.length, 1);
    assert.equal(info.videoTracks.length, 0);
    assert.equal(info.audioTracks[0].codec, "mp4a.40.2");
    assert.ok(info.duration > 0);
    assert.ok(info.audioTracks[0].duration > 0);
    assert.deepEqual(info.audioTracks[0].edits, sourceAudio.edits);
    const after = output.getTrackSamplesInfo(info.audioTracks[0].id);
    assert.equal(after.length, before.length);
    for (let index = 0; index < before.length; index++) {
      const original = before[index];
      const extracted = after[index];
      assert.deepEqual(
        [
          extracted.dts,
          extracted.cts,
          extracted.duration,
          extracted.timescale,
          extracted.size,
        ],
        [
          original.dts,
          original.cts,
          original.duration,
          original.timescale,
          original.size,
        ],
      );
      assert.deepEqual(
        new Uint8Array(bytes.buffer, extracted.offset, extracted.size),
        new Uint8Array(input, original.offset, original.size),
      );
    }
  });
}

test("rejects a video that has no audio track", async () => {
  await assert.rejects(
    extractMp4Audio(fixture("video-silent.mp4")),
    hasCode("no-audio"),
  );
});

test("rejects empty, oversized and truncated files before parsing", async () => {
  await assert.rejects(extractMp4Audio(new ArrayBuffer(0)), hasCode("invalid"));
  await assert.rejects(
    extractMp4Audio(new ArrayBuffer(MAX_ALARM_BYTES + 1)),
    hasCode("too-large"),
  );
  const input = fixture();
  await assert.rejects(
    extractMp4Audio(input.slice(0, input.byteLength - 1)),
    hasCode("invalid"),
  );
  const damaged = input.slice(0);
  new DataView(damaged).setUint32(0, 0xffffffff);
  await assert.rejects(extractMp4Audio(damaged), hasCode("invalid"));
});

test("rejects malformed nested sample tables without allocating their declared count", async () => {
  for (const type of ["stsz", "stts"]) {
    const input = fixture();
    const offset = Buffer.from(input).indexOf(type, 0, "ascii") - 4;
    assert.ok(offset > 0);
    new DataView(input).setUint32(
      offset + (type === "stsz" ? 16 : 12),
      0xffffffff,
    );
    await assert.rejects(extractMp4Audio(input), hasCode("invalid"));
  }
});

test("rejects an audio sample offset outside mdat even when box lengths are valid", async () => {
  const input = fixture();
  const source = parse(input);
  const audio = source.getTrackById(source.getInfo().audioTracks[0].id);
  const start = audio.mdia.minf.stbl.stco.start;
  assert.ok(start !== undefined);
  new DataView(input).setUint32(start + 16, input.byteLength + 1);
  await assert.rejects(extractMp4Audio(input), hasCode("invalid"));
});

test("rejects unsupported and encrypted audio sample entries", async () => {
  for (const [type, code] of [
    ["alac", "unsupported"],
    ["enca", "encrypted"],
  ]) {
    const input = fixture();
    const bytes = Buffer.from(input);
    const offset = bytes.indexOf("mp4a", 0, "ascii");
    assert.ok(offset > 0);
    bytes.write(type, offset, 4, "ascii");
    await assert.rejects(extractMp4Audio(input), hasCode(code));
  }
});

test("rejects sample-description changes the fragment writer cannot represent", async () => {
  const input = fixture();
  const source = parse(input);
  const audio = source.getTrackById(source.getInfo().audioTracks[0].id);
  const start = audio.mdia.minf.stbl.stsc.start;
  assert.ok(start !== undefined);
  new DataView(input).setUint32(start + 24, 2);
  await assert.rejects(extractMp4Audio(input), hasCode("unsupported"));
});
