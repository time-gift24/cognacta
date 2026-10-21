import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const eslint = new ESLint({ cwd: fileURLToPath(new URL("../", import.meta.url)) });
async function violations(code, filePath = "src/components/probe.tsx") {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter(message => ["no-restricted-imports", "no-restricted-globals", "no-restricted-properties", "no-restricted-syntax"].includes(message.ruleId));
}

test("shared modules reject adapter, fixture and platform imports, including re-exports and dynamic imports", async () => {
  for (const code of [
    'import { createDemoAdapters } from "@/adapters/demo";',
    'import type { Adapter } from "../../adapters/native";',
    'import data from "../__fixtures__/data";',
    'import data from "../mocks/data";',
    'export { createMockGateway } from "../chat/mock-gateway";',
    'export * from "@tauri-apps/api/core";',
    'void import("electron");',
    'void import("../adapters/http");',
    'import { readFile } from "node:fs/promises";',
  ]) assert.ok((await violations(code)).length, code);
});

test("shared modules reject direct network, storage and host capabilities", async () => {
  for (const code of [
    'void fetch("/api");',
    'void window.fetch("/api");',
    'new WebSocket("wss://example.test");',
    'void localStorage.getItem("draft");',
    'void window["sessionStorage"].getItem("draft");',
    'void globalThis.indexedDB.open("cache");',
    'void navigator.clipboard.writeText("text");',
    'void window.navigator["clipboard"].writeText("text");',
    'window.open("https://example.test");',
    'const { localStorage: storage } = window; void storage;',
    'const { clipboard } = navigator; void clipboard;',
  ]) assert.ok((await violations(code)).length, code);
});

test("interfaces, injected capabilities and normal DOM rendering stay allowed", async () => {
  for (const code of [
    'import type { ChatGateway } from "@/chat/gateway";',
    'import { useAppDependencies } from "@/app/dependencies";',
    'const host = { open() {} }; host.open();',
    'function read(fetch: () => void) { fetch(); } void read;',
    'const localStorage = { getItem: () => null }; localStorage.getItem();',
    'window.addEventListener("resize", () => document.body.focus());',
    'const open = true; const view = { open }; void view;',
    'interface Host { confirm(message: string): Promise<boolean> }; type Props = { open: boolean };',
    'void window.getSelection(); void window.matchMedia("(hover: hover)");',
  ]) assert.deepEqual(await violations(code), [], code);
  for (const filePath of ["src/adapters/browser/host.ts", "src/main.tsx", "src/bootstrap.ts", "src/bootstrap/native.ts"]) {
    assert.deepEqual(await violations('void fetch("/api"); window.localStorage.getItem("theme");', filePath), [], filePath);
  }
});
