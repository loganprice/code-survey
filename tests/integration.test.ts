import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createCodemap } from '../src/index.ts';
import { parse as parseYaml } from 'yaml';

test('Integration - end-to-end codebase mapping', async () => {
  const tempDir = path.resolve('./temp_integration_test');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const srcDir = path.join(tempDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  try {
    // 1. Package files
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { lodash: '^4.17.21' } })
    );

    // 2. TypeScript files
    fs.writeFileSync(
      path.join(srcDir, 'utils.ts'),
      `export function format(val: string): string { return val.trim(); }`
    );
    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      `import { format } from './utils.ts';`
    );

    // 3. Python files
    fs.writeFileSync(
      path.join(srcDir, 'helper.py'),
      `def do_work(): pass`
    );
    fs.writeFileSync(
      path.join(srcDir, 'main.py'),
      `from src.helper import do_work`
    );

    // 4. C# files
    fs.writeFileSync(
      path.join(srcDir, 'Controller.cs'),
      `namespace App { public class Controller {} }`
    );
    fs.writeFileSync(
      path.join(srcDir, 'Main.cs'),
      `using App;`
    );

    // Run mapping
    const outputPath = path.join(tempDir, 'codemap.json');
    await createCodemap({
      root: tempDir,
      output: outputPath,
      excludes: []
    });

    assert.ok(fs.existsSync(outputPath), 'Output codemap.json should be created');
    const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

    // Assert project metadata
    assert.strictEqual(content.project.name, 'temp_integration_test');
    assert.deepEqual(content.project.languages.sort(), ['csharp', 'python', 'typescript']);

    // Assert package dependencies
    assert.deepEqual(content.packageDependencies.npm, { lodash: '^4.17.21' });

    // Assert parsed files count
    assert.ok(content.files['src/utils.ts']);
    assert.ok(content.files['src/index.ts']);
    assert.ok(content.files['src/helper.py']);
    assert.ok(content.files['src/main.py']);
    assert.ok(content.files['src/Controller.cs']);
    assert.ok(content.files['src/Main.cs']);

    // Assert namespace C# parsed
    assert.ok(content.namespaces['App']);
    assert.deepEqual(content.namespaces['App'].files, ['src/Controller.cs']);

    // Assert link resolutions
    assert.deepEqual(content.internalLinks['src/utils.ts:format'], ['src/index.ts']);
    assert.deepEqual(content.internalLinks['src/helper.py:do_work'], ['src/main.py']);
    assert.deepEqual(content.internalLinks['src/Controller.cs'], ['src/Main.cs']);

  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

test('Integration - end-to-end YAML codebase mapping', async () => {
  const tempDir = path.resolve('./temp_integration_yaml_test');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const srcDir = path.join(tempDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  try {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { lodash: '^4.17.21' } })
    );

    fs.writeFileSync(
      path.join(srcDir, 'utils.ts'),
      `export function format(val: string): string { return val.trim(); }`
    );

    const outputPath = path.join(tempDir, 'codemap.yaml');
    await createCodemap({
      root: tempDir,
      output: outputPath,
      excludes: []
    });

    assert.ok(fs.existsSync(outputPath), 'Output codemap.yaml should be created');
    const rawYaml = fs.readFileSync(outputPath, 'utf-8');
    const content = parseYaml(rawYaml) as any;

    assert.strictEqual(content.project.name, 'temp_integration_yaml_test');
    assert.deepEqual(content.project.languages, ['typescript']);
    assert.ok(content.files['src/utils.ts']);
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

test('Integration - advanced features (maxDepth, includeDocs, symbolsFilter)', async () => {
  const tempDir = path.resolve('./temp_integration_advanced_test');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const srcDir = path.join(tempDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const subDir = path.join(srcDir, 'sub');
  fs.mkdirSync(subDir, { recursive: true });

  try {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: {} })
    );

    // 1. Write file with JSDoc
    fs.writeFileSync(
      path.join(srcDir, 'utils.ts'),
      `
      /**
       * Formats string values.
       */
      export class Formatter {
        format() {}
      }

      export function helper() {}
      `
    );

    // 2. Write file inside nested directory that should be ignored due to depth
    fs.writeFileSync(
      path.join(subDir, 'nested.ts'),
      `export class Nested {}`
    );

    const outputPath = path.join(tempDir, 'codemap.json');
    await createCodemap({
      root: tempDir,
      output: outputPath,
      excludes: [],
      maxDepth: 1, // Will include src/utils.ts (depth 1) but ignore src/sub/nested.ts (depth 2)
      includeDocs: true,
      symbolsFilter: ['class'] // Exclude helper function
    });

    assert.ok(fs.existsSync(outputPath), 'Output codemap.json should be created');
    const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

    assert.ok(content.files['src/utils.ts'], 'src/utils.ts should be captured');
    assert.strictEqual(content.files['src/sub/nested.ts'], undefined, 'Nested files past depth limit should be ignored');

    const exports = content.files['src/utils.ts'].exports;
    // Check symbols filter: helper is function, so it should be excluded. Only class Formatter remains.
    assert.strictEqual(exports.length, 1);
    assert.strictEqual(exports[0].name, 'Formatter');
    assert.strictEqual(exports[0].doc, 'Formats string values.');
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

test('Integration - ignore file loading (.codemapignore) and result counts', async () => {
  const tempDir = path.resolve('./temp_integration_ignore_test');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const srcDir = path.join(tempDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  try {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: {} })
    );

    // Write .codemapignore
    fs.writeFileSync(
      path.join(tempDir, '.codemapignore'),
      `
      # ignore helper
      src/helper.ts
      `
    );

    // Write tracked and ignored files
    fs.writeFileSync(
      path.join(srcDir, 'main.ts'),
      `export class Main {}`
    );

    fs.writeFileSync(
      path.join(srcDir, 'helper.ts'),
      `export function help() {}`
    );

    const outputPath = path.join(tempDir, 'codemap.json');
    const result = await createCodemap({
      root: tempDir,
      output: outputPath,
      excludes: []
    });

    assert.ok(fs.existsSync(outputPath));
    const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

    // Main should be included, helper ignored
    assert.ok(content.files['src/main.ts']);
    assert.strictEqual(content.files['src/helper.ts'], undefined);

    // Verify result counts
    assert.strictEqual(result.filesCount, 1);
    assert.strictEqual(result.symbolsCount.class, 1);
    assert.strictEqual(result.symbolsCount.function, 0);

  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});



