import assert from "node:assert/strict";
import test from "node:test";
import { MutationQueue } from "../src/domain/mutationQueue";

test("pending blocks arming throughout a delayed settings or PIN commit", async () => {
  const queue = new MutationQueue();
  let finish!: () => void;
  let saved = false;
  const disk = new Promise<void>((resolve) => { finish = resolve; });
  const operation = queue.run(async () => {
    await disk;
    saved = true;
  });
  assert.equal(queue.pending, true);
  await Promise.resolve();
  assert.equal(saved, false);
  assert.equal(queue.pending, true);
  finish();
  await operation;
  assert.equal(saved, true);
  assert.equal(queue.pending, false);
});

test("clearing history cannot be undone by a late event write", async () => {
  const queue = new MutationQueue();
  let finish!: () => void;
  const disk = new Promise<void>((resolve) => { finish = resolve; });
  let history: string[] = [];
  const event = queue.run(async () => { await disk; history = ["motion"]; });
  const clear = queue.run(async () => { history = []; });
  await Promise.resolve();
  assert.deepEqual(history, []);
  finish();
  await event;
  // The queued clear still owns the pending lock until it completes.
  await clear;
  assert.deepEqual(history, []);
  assert.equal(queue.pending, false);
});

test("a rejected write is reported but does not poison later saves", async () => {
  const queue = new MutationQueue();
  const failed = queue.run(async () => { throw new Error("disk full"); });
  let saved = false;
  const next = queue.run(async () => { saved = true; return 42; });
  await assert.rejects(failed, /disk full/);
  assert.equal(await next, 42);
  assert.equal(saved, true);
  assert.equal(queue.pending, false);
});
