import { test } from 'node:test';
import * as assert from 'node:assert';
import { resolveImports } from '../src/resolver.ts';
import type { FileEntry, NamespaceEntry, PackageDependencies } from '../src/types.ts';

test('Resolver - correctly resolves internal, external, and namespace imports', () => {
  const files: Record<string, FileEntry> = {
    // TypeScript files
    'src/utils.ts': {
      hash: 'h1',
      imports: [{ source: 'lodash', symbols: ['map'] }],
      exports: [
        { name: 'formatDate', type: 'function', location: 'Ln 1-5' },
        { name: 'parseQuery', type: 'function', location: 'Ln 6-10' }
      ],
      symbols: []
    },
    'src/index.ts': {
      hash: 'h2',
      imports: [{ source: './utils', symbols: ['formatDate'] }],
      exports: [],
      symbols: []
    },

    // Python files
    'src/helper.py': {
      hash: 'h3',
      imports: [],
      exports: [
        { name: 'do_work', type: 'function', location: 'Ln 1-5' }
      ],
      symbols: []
    },
    'src/main.py': {
      hash: 'h4',
      imports: [{ source: 'src.helper', symbols: ['do_work'] }],
      exports: [],
      symbols: []
    },

    // C# files
    'src/Controller.cs': {
      hash: 'h5',
      imports: [],
      exports: [
        { name: 'Controller', type: 'class', location: 'Ln 5-12' }
      ],
      symbols: []
    },
    'src/Main.cs': {
      hash: 'h6',
      imports: [{ source: 'MyCompany.MyApp', symbols: [] }],
      exports: [],
      symbols: []
    }
  };

  const namespaces: Record<string, NamespaceEntry> = {
    'MyCompany.MyApp': {
      files: ['src/Controller.cs'],
      exports: ['Controller']
    }
  };

  const packageDeps: PackageDependencies = {
    npm: { lodash: '^4.17.21' }
  };

  const result = resolveImports(files, namespaces, packageDeps);

  // Assert external imports resolved
  assert.deepEqual(result.externalImports, {
    lodash: ['src/utils.ts']
  });

  // Assert TS internal link resolved (relative import)
  assert.ok(result.internalLinks['src/utils.ts:formatDate']);
  assert.deepEqual(result.internalLinks['src/utils.ts:formatDate'], ['src/index.ts']);

  // Assert Python internal link resolved (dotted path import)
  assert.ok(result.internalLinks['src/helper.py:do_work']);
  assert.deepEqual(result.internalLinks['src/helper.py:do_work'], ['src/main.py']);

  // Assert C# internal link resolved (namespace using)
  assert.ok(result.internalLinks['src/Controller.cs']);
  assert.deepEqual(result.internalLinks['src/Controller.cs'], ['src/Main.cs']);
});
