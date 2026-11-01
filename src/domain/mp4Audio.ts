import { createFile, MP4BoxBuffer, type Sample } from "mp4box";
import { MAX_ALARM_BYTES } from "./alarmSound";

type Mp4AudioErrorCode =
  "invalid" | "too-large" | "no-audio" | "unsupported" | "encrypted";

export class Mp4AudioError extends Error {
  constructor(
    public readonly code: Mp4AudioErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "Mp4AudioError";
  }
}

const invalid = () =>
  new Mp4AudioError(
    "invalid",
    "ไฟล์วิดีโอไม่สมบูรณ์หรืออ่านข้อมูลเสียงไม่ได้ กรุณาเลือกไฟล์อื่น",
  );
const tooLarge = () =>
  new Mp4AudioError(
    "too-large",
    "ไฟล์วิดีโอหรือเสียงที่แยกได้ต้องมีขนาดไม่เกิน 10 MB",
  );
const unsupported = () =>
  new Mp4AudioError(
    "unsupported",
    "เสียงในวิดีโอนี้ยังไม่รองรับ กรุณาเลือก MP4 ที่ใช้เสียง AAC",
  );
const encrypted = () =>
  new Mp4AudioError(
    "encrypted",
    "ไม่สามารถแยกเสียงจากวิดีโอที่มีการป้องกันได้",
  );

// A 10 MB alarm should never need enormous sample tables. Check before MP4Box
// allocates one object per sample, including tables in unselected video tracks.
const MAX_SAMPLES = 250_000;
const CONTAINERS = new Set([
  "moov",
  "trak",
  "mdia",
  "minf",
  "stbl",
  "edts",
  "dinf",
  "mvex",
  "moof",
  "traf",
]);
const TABLE_WIDTHS: Record<string, number> = {
  stts: 8,
  ctts: 8,
  stsc: 12,
  stco: 4,
  co64: 8,
  stss: 4,
};
type ByteRange = { start: number; end: number };

/** Reject incomplete boxes and impossible table counts before library parsing. */
function inspectContainer(input: ArrayBuffer): ByteRange[] {
  const view = new DataView(input);
  const mediaRanges: ByteRange[] = [];
  let boxCount = 0;
  let sampleCount = 0;
  let movieCount = 0;
  let formatCount = 0;
  const walk = (start: number, end: number, depth: number) => {
    if (depth > 12) throw invalid();
    for (let offset = start; offset < end;) {
      if (end - offset < 8 || ++boxCount > 10_000) throw invalid();
      let size = view.getUint32(offset);
      let header = 8;
      const type = String.fromCharCode(...new Uint8Array(input, offset + 4, 4));
      if (size === 1) {
        if (end - offset < 16) throw invalid();
        size =
          view.getUint32(offset + 8) * 0x1_0000_0000 +
          view.getUint32(offset + 12);
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (!Number.isSafeInteger(size) || size < header || size > end - offset)
        throw invalid();
      const payload = offset + header;
      const length = size - header;
      if (depth === 0) {
        if (type === "ftyp") formatCount++;
        if (type === "moov") movieCount++;
        if (type === "mdat")
          mediaRanges.push({ start: payload, end: offset + size });
      }
      if (type === "senc" || type === "pssh") throw encrypted();
      if (type === "stsz" || type === "stz2") {
        if (length < 12) throw invalid();
        const count = view.getUint32(payload + 8);
        sampleCount += count;
        if (sampleCount > MAX_SAMPLES) throw invalid();
        if (type === "stsz") {
          if (view.getUint32(payload + 4) === 0 && count > (length - 12) / 4)
            throw invalid();
        } else {
          const bits = view.getUint8(payload + 7);
          if (
            ![4, 8, 16].includes(bits) ||
            Math.ceil((count * bits) / 8) > length - 12
          )
            throw invalid();
        }
      } else if (TABLE_WIDTHS[type]) {
        if (
          length < 8 ||
          view.getUint32(payload + 4) > (length - 8) / TABLE_WIDTHS[type]
        )
          throw invalid();
      } else if (type === "trun") {
        if (length < 8) throw invalid();
        const flags = view.getUint32(payload) & 0x00ffffff;
        const count = view.getUint32(payload + 4);
        const entrySize =
          [0x100, 0x200, 0x400, 0x800].filter((flag) => flags & flag).length *
          4;
        const prefix = 8 + (flags & 1 ? 4 : 0) + (flags & 4 ? 4 : 0);
        sampleCount += count;
        if (sampleCount > MAX_SAMPLES || prefix + count * entrySize > length)
          throw invalid();
      }
      if (CONTAINERS.has(type)) walk(payload, offset + size, depth + 1);
      offset += size;
    }
  };
  walk(0, input.byteLength, 0);
  if (formatCount !== 1 || movieCount !== 1 || mediaRanges.length === 0)
    throw invalid();
  return mediaRanges;
}

function isSupportedDescription(description: Sample["description"]): boolean {
  if (!("type" in description) || !("getCodec" in description)) return false;
  if (
    description.type === "enca" ||
    ("sinfs" in description &&
      Array.isArray(description.sinfs) &&
      description.sinfs.length > 0)
  )
    throw encrypted();
  // AAC-LC, HE-AAC and HE-AACv2 can be remuxed without a native encoder.
  return (
    description.type === "mp4a" &&
    /^mp4a\.40\.(2|5|29)$/.test(description.getCodec())
  );
}

/**
 * Remux the first supported AAC track into an audio-only fragmented M4A.
 * Sample bytes are copied unchanged; no video, transcoder, DOM or native module
 * is needed, so the same implementation works in Expo Go and on the web.
 */
export async function extractMp4Audio(
  input: ArrayBuffer,
): Promise<Uint8Array<ArrayBuffer>> {
  if (input.byteLength > MAX_ALARM_BYTES) throw tooLarge();
  if (input.byteLength < 8) throw invalid();
  const ranges = inspectContainer(input);
  const file = createFile(true);
  try {
    file.onError = () => {
      throw invalid();
    };
    // Keep mdat even when moov is at the end of a camera recording.
    file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(input, 0), true);
    file.flush();
    const info = file.getInfo();
    if (
      !info.hasMoov ||
      !Number.isSafeInteger(info.timescale) ||
      info.timescale <= 0
    )
      throw invalid();
    if (info.audioTracks.length === 0) {
      if (file.moov.traks.some((track) => track.mdia.hdlr.handler === "soun"))
        throw unsupported();
      throw new Mp4AudioError(
        "no-audio",
        "วิดีโอนี้ไม่มีเสียง กรุณาเลือกวิดีโอที่มีเสียง",
      );
    }
    const audio = info.audioTracks.find((track) => {
      const descriptions = file.getTrackById(track.id).mdia.minf.stbl.stsd
        .entries;
      // MP4Box's fragment writer uses description 1 throughout each track.
      return (
        descriptions.length === 1 && descriptions.every(isSupportedDescription)
      );
    });
    if (!audio) throw unsupported();
    const samples = file.getTrackSamplesInfo(audio.id);
    if (
      !samples.length ||
      samples.length > MAX_SAMPLES ||
      !Number.isSafeInteger(audio.timescale) ||
      audio.timescale <= 0
    )
      throw invalid();
    let sampleBytes = 0;
    let mediaDuration = 0;
    for (const sample of samples) {
      if (
        sample.description_index !== 0 ||
        !isSupportedDescription(sample.description)
      )
        throw unsupported();
      // The fragment writer uses unsigned 32-bit composition offsets/durations.
      if (
        sample.cts < sample.dts ||
        sample.cts - sample.dts > 0xffffffff ||
        sample.duration > 0xffffffff
      )
        throw unsupported();
      if (
        !Number.isSafeInteger(sample.offset) ||
        !Number.isSafeInteger(sample.size) ||
        sample.size <= 0 ||
        !Number.isSafeInteger(sample.dts) ||
        sample.dts < 0 ||
        !Number.isSafeInteger(sample.cts) ||
        !Number.isSafeInteger(sample.duration) ||
        sample.duration <= 0 ||
        sample.timescale !== audio.timescale ||
        !ranges.some(
          (range) =>
            sample.offset >= range.start &&
            sample.offset + sample.size <= range.end,
        )
      )
        throw invalid();
      sampleBytes += sample.size;
      mediaDuration = Math.max(mediaDuration, sample.dts + sample.duration);
      if (sampleBytes > MAX_ALARM_BYTES) throw tooLarge();
    }
    const movieDuration =
      audio.movie_duration > 0
        ? audio.movie_duration
        : Math.ceil((mediaDuration * info.timescale) / audio.timescale);
    if (
      !Number.isSafeInteger(mediaDuration) ||
      !Number.isSafeInteger(movieDuration) ||
      movieDuration <= 0
    )
      throw invalid();

    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let outputBytes = 0;
    let completedSamples = 0;
    const append = (buffer: ArrayBuffer) => {
      outputBytes += buffer.byteLength;
      if (outputBytes > MAX_ALARM_BYTES) throw tooLarge();
      chunks.push(new Uint8Array(buffer));
    };
    file.onSegment = (id, _user, buffer, nextSample) => {
      if (id !== audio.id) throw invalid();
      append(buffer);
      completedSamples = nextSample;
    };
    file.setSegmentOptions(audio.id, null, {
      nbSamples: 1000,
      rapAlignement: false,
    });
    // Initialization resets duration fields for streaming. Restore the selected
    // track's duration and edits for local playback, then serialize the init again.
    file.initializeSegmentation("per-track");
    const track = file.getTrackById(audio.id);
    if (
      (file.moov.mvhd.version === 0 && movieDuration > 0xffffffff) ||
      (track.tkhd.version === 0 && movieDuration > 0xffffffff) ||
      (track.mdia.mdhd.version === 0 && mediaDuration > 0xffffffff)
    )
      throw invalid();
    file.moov.mvhd.duration = movieDuration;
    track.tkhd.duration = movieDuration;
    track.mdia.mdhd.duration = mediaDuration;
    const initialization = file.initializeSegmentation("per-track");
    if (initialization.length !== 1 || initialization[0].id !== audio.id)
      throw invalid();
    append(initialization[0].buffer);
    file.start();
    file.flush();
    if (completedSamples !== samples.length || chunks.length < 2)
      throw invalid();

    const output = new Uint8Array(outputBytes);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return output;
  } catch (error) {
    if (error instanceof Mp4AudioError) throw error;
    throw invalid();
  } finally {
    file.stop();
  }
}
