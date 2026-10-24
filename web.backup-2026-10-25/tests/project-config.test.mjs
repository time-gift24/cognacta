import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

test("local registry configuration stays ignored and untracked", () => {
  const options = { cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8" };
  const ignored = spawnSync("git", ["check-ignore", "--no-index", "--quiet", "--", ".npmrc"], options);
  assert.equal(ignored.status, 0, "Local registry configuration must be ignored");
  const tracked = spawnSync("git", ["ls-files", "--", ".npmrc"], options);
  assert.equal(tracked.status, 0);
  assert.equal(tracked.stdout, "", "Local registry configuration must not be tracked");
});

test("typecheck catches errors in both referenced projects", async (t) => {
  const { scripts } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const [command, ...args] = scripts.typecheck.split(/\s+/);
  assert.equal(command, "tsc");
  const directory = await mkdtemp(join(tmpdir(), "cognacta-typecheck-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
    files: [], references: [{ path: "app" }, { path: "node" }],
  }));
  for (const name of ["app", "node"]) {
    await mkdir(join(directory, name));
    await writeFile(join(directory, name, "tsconfig.json"), JSON.stringify({
      compilerOptions: { noEmit: true, types: [], skipLibCheck: true }, files: ["index.ts"],
    }));
    await writeFile(join(directory, name, "index.ts"), 'export const value: number = "wrong";\n');
  }
  const compiler = fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url));
  const run = () => spawnSync(process.execPath, [compiler, ...args], { cwd: directory, encoding: "utf8", timeout: 15000 });
  const invalid = run();
  assert.equal(invalid.error, undefined);
  assert.notEqual(invalid.status, 0, "Type errors must fail the typecheck script");
  assert.match(invalid.stdout, /app\/index\.ts.*TS2322/);
  assert.match(invalid.stdout, /node\/index\.ts.*TS2322/);
  for (const name of ["app", "node"]) {
    await writeFile(join(directory, name, "index.ts"), "export const value: number = 42;\n");
  }
  const valid = run();
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
});
