import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { createPreviewServer } from "../scripts/serve-web.mjs";

test("standalone preview serves assets and rejects traversal and writes", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "deskguard-preview-"));
  await writeFile(join(root, "index.html"), "<title>DeskGuard</title>");
  await writeFile(join(root, "app.js"), "console.log('ready')");
  const server = createPreviewServer(root);
  t.after(async () => { await new Promise<void>((r) => server.close(() => r())); await rm(root, { recursive: true }); });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  const read = (path: string, method = "GET") => new Promise<{ status: number; body: string; type: string }>((resolve, reject) => {
    request({ hostname: "127.0.0.1", port, path, method }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode!, body, type: response.headers["content-type"] ?? "" }));
    }).on("error", reject).end();
  });
  assert.match((await read("/")).body, /DeskGuard/);
  assert.match((await read("/app.js")).type, /javascript/);
  assert.equal((await read("/app.js", "HEAD")).body, "");
  assert.equal((await read("/missing.js")).status, 404);
  assert.equal((await read("/", "POST")).status, 405);
  assert.equal((await read("/%E0%A4")).status, 400);
  for (const path of ["/..%2fsecret", "/..%5csecret", "/%00"]) {
    assert.equal((await read(path)).status, 403);
  }
});
