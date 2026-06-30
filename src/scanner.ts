import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface ScannedFile {
  relativePath: string;
  absolutePath: string;
  hash: string;
}

const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '.venv',
  'venv',
  'dist',
  'bin',
  'build',
  'target',
  'obj'
]);

export function calculateHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function scanDirectory(
  rootDir: string,
  customExcludes: string[] = [],
  maxDepth?: number
): ScannedFile[] {
  const absoluteRoot = path.resolve(rootDir);
  const excludeSet = new Set(customExcludes);
  const results: ScannedFile[] = [];

  function walk(currentDir: string, currentDepth = 0) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryName = entry.name;
      const fullPath = path.join(currentDir, entryName);
      const relativePath = path.relative(absoluteRoot, fullPath);

      // Check default ignores and custom excludes
      if (
        DEFAULT_IGNORED_DIRS.has(entryName) ||
        excludeSet.has(entryName) ||
        excludeSet.has(relativePath)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        if (maxDepth === undefined || currentDepth < maxDepth) {
          walk(fullPath, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        const hash = calculateHash(fullPath);
        results.push({
          relativePath,
          absolutePath: fullPath,
          hash
        });
      }
    }
  }

  walk(absoluteRoot);
  return results;
}
