import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import { getWasmPath } from '../src/utils/wasm-loader.ts';

test('WASM Loader - resolve valid wasm paths', async () => {
  const languages = ['typescript', 'javascript', 'python', 'go', 'java', 'csharp'];

  for (const lang of languages) {
    const wasmPath = await getWasmPath(lang);
    assert.ok(wasmPath, `WASM path for ${lang} should be resolved`);
    assert.ok(fs.existsSync(wasmPath), `WASM file for ${lang} should exist at ${wasmPath}`);
  }
});
