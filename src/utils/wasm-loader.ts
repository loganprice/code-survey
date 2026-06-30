import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const WASM_FILE_MAP: Record<string, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  python: 'tree-sitter-python.wasm',
  go: 'tree-sitter-go.wasm',
  java: 'tree-sitter-java.wasm',
  csharp: 'tree-sitter-c_sharp.wasm',
  rust: 'tree-sitter-rust.wasm'
};

const CDN_BASE_URL = 'https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.13/out';

export async function getWasmPath(language: string): Promise<string> {
  const fileName = WASM_FILE_MAP[language];
  if (!fileName) {
    throw new Error(`Unsupported tree-sitter language: ${language}`);
  }

  // 1. Try local node_modules relative to this file
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const nodeModulesPath = path.resolve(
    currentDir,
    '..',
    '..',
    'node_modules',
    'tree-sitter-wasms',
    'out',
    fileName
  );
  if (fs.existsSync(nodeModulesPath)) {
    return nodeModulesPath;
  }

  // 2. Try working directory's node_modules
  const localPath = path.resolve(
    process.cwd(),
    'node_modules',
    'tree-sitter-wasms',
    'out',
    fileName
  );
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // 3. Try user's home directory cache
  const cacheDir = path.resolve(os.homedir(), '.codemap', 'grammars');
  const cachePath = path.resolve(cacheDir, fileName);

  if (fs.existsSync(cachePath)) {
    return cachePath;
  }

  // 4. Fallback: Download from CDN to cache directory
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const url = `${CDN_BASE_URL}/${fileName}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM from CDN: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(cachePath, buffer);
    return cachePath;
  } catch (err: any) {
    throw new Error(
      `Could not resolve or download WASM grammar for ${language}: ${err.message}`
    );
  }
}
