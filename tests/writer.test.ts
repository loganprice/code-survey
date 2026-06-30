import { test } from 'node:test';
import * as assert from 'node:assert';
import { generateDeterministicJson, generateDeterministicYaml, generateDeterministicMarkdown, generateDeterministicMermaid } from '../src/writer.ts';
import type { CodemapSchema } from '../src/types.ts';
import { parse } from 'yaml';

test('Writer - output is deterministic, sorted, and matches schema keys', () => {
  const unsortedData: CodemapSchema = {
    version: '1.0.0',
    project: {
      name: 'test-project',
      languages: ['python', 'typescript', 'go'],
      root: '.'
    },
    packageDependencies: {
      npm: {
        typescript: '^5.0.0',
        lodash: '^4.17.21'
      }
    },
    files: {
      'src/index.ts': {
        hash: 'h2',
        imports: [],
        exports: [],
        symbols: []
      },
      'src/utils.ts': {
        hash: 'h1',
        imports: [
          { source: 'lodash', symbols: ['map'] },
          { source: './helper', symbols: ['help'] }
        ],
        exports: [
          { name: 'parseQuery', type: 'function', location: 'Ln 6-10' },
          { name: 'formatDate', type: 'function', location: 'Ln 1-5' }
        ],
        symbols: []
      }
    },
    namespaces: {
      'MyNamespace': {
        files: ['src/utils.ts', 'src/index.ts'],
        exports: ['parseQuery', 'formatDate']
      }
    },
    externalImports: {
      lodash: ['src/utils.ts']
    },
    internalLinks: {
      'src/utils.ts:formatDate': ['src/index.ts']
    }
  };

  const jsonStr1 = generateDeterministicJson(unsortedData);
  const jsonStr2 = generateDeterministicJson(unsortedData);

  // Assert string-level equivalence for determinism
  assert.strictEqual(jsonStr1, jsonStr2);

  const parsed = JSON.parse(jsonStr1);

  // Assert root properties exist and are sorted
  const rootKeys = Object.keys(parsed);
  // Expected sorted keys: ["$schema", "externalImports", "files", "internalLinks", "namespaces", "packageDependencies", "project", "version"]
  // Note: $schema is optional, but if present it should be sorted.
  assert.deepEqual(
    rootKeys.filter(k => k !== '$schema'),
    ['externalImports', 'files', 'internalLinks', 'namespaces', 'packageDependencies', 'project', 'version']
  );

  // Assert arrays are sorted
  assert.deepEqual(parsed.project.languages, ['go', 'python', 'typescript']);
  assert.deepEqual(parsed.namespaces.MyNamespace.files, ['src/index.ts', 'src/utils.ts']);
  assert.deepEqual(parsed.namespaces.MyNamespace.exports, ['formatDate', 'parseQuery']);

  // Assert files list is sorted
  const fileKeys = Object.keys(parsed.files);
  assert.deepEqual(fileKeys, ['src/index.ts', 'src/utils.ts']);

  // Assert file exports are sorted by name
  assert.strictEqual(parsed.files['src/utils.ts'].exports[0].name, 'formatDate');
  assert.strictEqual(parsed.files['src/utils.ts'].exports[1].name, 'parseQuery');
});

test('Writer - YAML output is deterministic, sorted, and parsed correctly', () => {
  const unsortedData: CodemapSchema = {
    version: '1.0.0',
    project: {
      name: 'test-project',
      languages: ['python', 'typescript', 'go'],
      root: '.'
    },
    packageDependencies: {
      npm: {
        typescript: '^5.0.0',
        lodash: '^4.17.21'
      }
    },
    files: {
      'src/index.ts': {
        hash: 'h2',
        imports: [],
        exports: [],
        symbols: []
      },
      'src/utils.ts': {
        hash: 'h1',
        imports: [
          { source: 'lodash', symbols: ['map'] },
          { source: './helper', symbols: ['help'] }
        ],
        exports: [
          { name: 'parseQuery', type: 'function', location: 'Ln 6-10' },
          { name: 'formatDate', type: 'function', location: 'Ln 1-5' }
        ],
        symbols: []
      }
    },
    namespaces: {
      'MyNamespace': {
        files: ['src/utils.ts', 'src/index.ts'],
        exports: ['parseQuery', 'formatDate']
      }
    },
    externalImports: {
      lodash: ['src/utils.ts']
    },
    internalLinks: {
      'src/utils.ts:formatDate': ['src/index.ts']
    }
  };

  const yamlStr1 = generateDeterministicYaml(unsortedData);
  const yamlStr2 = generateDeterministicYaml(unsortedData);

  // Assert string-level equivalence for determinism
  assert.strictEqual(yamlStr1, yamlStr2);

  const parsed = parse(yamlStr1) as any;

  // Assert root properties exist and are sorted
  const rootKeys = Object.keys(parsed);
  assert.deepEqual(
    rootKeys.filter(k => k !== '$schema'),
    ['externalImports', 'files', 'internalLinks', 'namespaces', 'packageDependencies', 'project', 'version']
  );

  // Assert arrays are sorted
  assert.deepEqual(parsed.project.languages, ['go', 'python', 'typescript']);
  assert.deepEqual(parsed.namespaces.MyNamespace.files, ['src/index.ts', 'src/utils.ts']);
  assert.deepEqual(parsed.namespaces.MyNamespace.exports, ['formatDate', 'parseQuery']);

  // Assert files list is sorted
  const fileKeys = Object.keys(parsed.files);
  assert.deepEqual(fileKeys, ['src/index.ts', 'src/utils.ts']);

  // Assert file exports are sorted by name
  assert.strictEqual(parsed.files['src/utils.ts'].exports[0].name, 'formatDate');
  assert.strictEqual(parsed.files['src/utils.ts'].exports[1].name, 'parseQuery');
});

test('Writer - Markdown output is deterministic', () => {
  const unsortedData: CodemapSchema = {
    version: '1.0.0',
    project: {
      name: 'test-project',
      languages: ['python', 'typescript', 'go'],
      root: '.'
    },
    packageDependencies: {
      npm: {
        typescript: '^5.0.0',
        lodash: '^4.17.21'
      }
    },
    files: {
      'src/index.ts': {
        hash: 'h2',
        imports: [],
        exports: [],
        symbols: []
      },
      'src/utils.ts': {
        hash: 'h1',
        imports: [
          { source: 'lodash', symbols: ['map'] },
          { source: './helper', symbols: ['help'] }
        ],
        exports: [
          { name: 'parseQuery', type: 'function', location: 'Ln 6-10' },
          { name: 'formatDate', type: 'function', location: 'Ln 1-5' }
        ],
        symbols: []
      }
    },
    namespaces: {
      'MyNamespace': {
        files: ['src/utils.ts', 'src/index.ts'],
        exports: ['parseQuery', 'formatDate']
      }
    },
    externalImports: {
      lodash: ['src/utils.ts']
    },
    internalLinks: {
      'src/utils.ts:formatDate': ['src/index.ts']
    }
  };

  const mdStr1 = generateDeterministicMarkdown(unsortedData);
  const mdStr2 = generateDeterministicMarkdown(unsortedData);

  assert.strictEqual(mdStr1, mdStr2);
  assert.ok(mdStr1.includes('# Project: test-project'));
  assert.ok(mdStr1.includes('### `src/utils.ts`'));
  assert.ok(mdStr1.includes('- `parseQuery` (function, Ln 6-10)'));
});

test('Writer - Mermaid output is deterministic and formatted correctly', () => {
  const unsortedData: CodemapSchema = {
    version: '1.0.0',
    project: {
      name: 'test-project',
      languages: ['typescript'],
      root: '.'
    },
    packageDependencies: {},
    files: {
      'src/index.ts': {
        hash: 'h2',
        imports: [],
        exports: [],
        symbols: []
      },
      'src/utils.ts': {
        hash: 'h1',
        imports: [],
        exports: [],
        symbols: []
      }
    },
    namespaces: {},
    externalImports: {},
    internalLinks: {
      'src/utils.ts:formatDate': ['src/index.ts']
    }
  };

  const mermaidStr1 = generateDeterministicMermaid(unsortedData);
  const mermaidStr2 = generateDeterministicMermaid(unsortedData);

  assert.strictEqual(mermaidStr1, mermaidStr2);
  assert.ok(mermaidStr1.includes('graph TD'));
  assert.ok(mermaidStr1.includes('node_0["src/index.ts"]'));
  assert.ok(mermaidStr1.includes('node_1["src/utils.ts"]'));
  // Index depends on/imports Utils: node_0 --> node_1
  assert.ok(mermaidStr1.includes('node_0 --> node_1'));
});

test('Writer - Markdown output can include Table of Contents and navigation', () => {
  const unsortedData: CodemapSchema = {
    version: '1.0.0',
    project: {
      name: 'test-project',
      languages: ['typescript'],
      root: '.'
    },
    packageDependencies: {},
    files: {
      'src/index.ts': {
        hash: 'h2',
        imports: [],
        exports: [],
        symbols: []
      }
    },
    namespaces: {},
    externalImports: {},
    internalLinks: {}
  };

  const mdStr = generateDeterministicMarkdown(unsortedData, { includeToc: true });

  assert.ok(mdStr.includes('## Table of Contents'));
  assert.ok(mdStr.includes('- [src/index.ts](#srcindexts)'));
  assert.ok(mdStr.includes('[Back to Table of Contents](#table-of-contents)'));
});



