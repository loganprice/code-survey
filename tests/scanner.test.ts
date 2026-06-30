import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { scanDirectory } from '../src/scanner.ts';

test('Scanner - recursive walk, hash, and ignore rules', async () => {
  // Create a temporary test directory
  const tempDir = path.resolve('./temp_scanner_test');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Scaffold mock files
    fs.writeFileSync(path.join(tempDir, 'file1.ts'), 'console.log("hello");');
    
    const subdir = path.join(tempDir, 'subdir');
    fs.mkdirSync(subdir);
    fs.writeFileSync(path.join(subdir, 'file2.py'), 'print("world")');

    // Create directories that should be ignored
    const gitDir = path.join(tempDir, '.git');
    fs.mkdirSync(gitDir);
    fs.writeFileSync(path.join(gitDir, 'config'), '[core]\nrepositoryformatversion = 0');

    const nodeModulesDir = path.join(tempDir, 'node_modules');
    fs.mkdirSync(nodeModulesDir);
    fs.writeFileSync(path.join(nodeModulesDir, 'package.json'), '{}');

    // Create a custom ignored file
    fs.writeFileSync(path.join(tempDir, 'ignored.txt'), 'ignore me');

    // Run scanner
    const result = await scanDirectory(tempDir, ['ignored.txt']);

    // Assert scanned files
    const filePaths = result.map(f => f.relativePath).sort();
    assert.deepEqual(filePaths, [
      'file1.ts',
      'subdir/file2.py'
    ]);

    // Assert correct hashes
    const file1Entry = result.find(f => f.relativePath === 'file1.ts')!;
    assert.ok(file1Entry.hash);
    assert.strictEqual(typeof file1Entry.hash, 'string');
    assert.strictEqual(file1Entry.hash.length, 64); // SHA-256 length in hex

  } finally {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

test('Scanner - respects maxDepth traversal limit', () => {
  const tempDir = path.resolve('./temp_scanner_depth_test');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    fs.writeFileSync(path.join(tempDir, 'root_file.ts'), 'root');

    const sub1 = path.join(tempDir, 'sub1');
    fs.mkdirSync(sub1);
    fs.writeFileSync(path.join(sub1, 'sub1_file.ts'), 'sub1');

    const sub2 = path.join(sub1, 'sub2');
    fs.mkdirSync(sub2);
    fs.writeFileSync(path.join(sub2, 'sub2_file.ts'), 'sub2');

    // Case 1: maxDepth = 0 (only root files)
    const result0 = scanDirectory(tempDir, [], 0);
    assert.deepEqual(result0.map(f => f.relativePath), ['root_file.ts']);

    // Case 2: maxDepth = 1 (root and sub1 files)
    const result1 = scanDirectory(tempDir, [], 1);
    const paths1 = result1.map(f => f.relativePath).sort();
    assert.deepEqual(paths1, ['root_file.ts', 'sub1/sub1_file.ts']);

    // Case 3: maxDepth = 2 (all files)
    const result2 = scanDirectory(tempDir, [], 2);
    const paths2 = result2.map(f => f.relativePath).sort();
    assert.deepEqual(paths2, ['root_file.ts', 'sub1/sub1_file.ts', 'sub1/sub2/sub2_file.ts']);

  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

