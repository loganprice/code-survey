import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { scanDirectory } from './scanner.ts';
import { CodebaseParser, parsePackageDependencies } from './parser.ts';
import { resolveImports } from './resolver.ts';
import { generateDeterministicJson, generateDeterministicYaml, generateDeterministicMarkdown, generateDeterministicMermaid } from './writer.ts';
import type { CodemapSchema, FileEntry, NamespaceEntry, SymbolEntry, CodemapResult } from './types.ts';

export interface CodemapOptions {
  root: string;
  output: string;
  excludes?: string[];
  format?: 'json' | 'yaml' | 'markdown' | 'mermaid';
  includeInternalVars?: boolean;
  includeDocs?: boolean;
  maxDepth?: number;
  symbolsFilter?: string[];
  diff?: boolean | string;
  includeToc?: boolean;
}

function getGitChangedFiles(rootDir: string, diffTarget: string | boolean): Set<string> {
  const changed = new Set<string>();
  try {
    const target = typeof diffTarget === 'string' ? diffTarget : 'HEAD';
    const diffOutput = execSync(`git diff --name-only ${target}`, { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    for (const line of diffOutput.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) changed.add(trimmed);
    }
    const statusOutput = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    for (const line of statusOutput.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) {
        const filePath = trimmed.substring(3).trim();
        if (filePath) changed.add(filePath);
      }
    }
  } catch {
    // Ignore git errors (e.g. not a git repository)
  }
  return changed;
}

export async function createCodemap(options: CodemapOptions): Promise<CodemapResult> {
  const rootDir = path.resolve(options.root);

  // Load .codemapignore if it exists
  const ignoreFile = path.join(rootDir, '.codemapignore');
  const ignoreExcludes: string[] = [];
  if (fs.existsSync(ignoreFile)) {
    const content = fs.readFileSync(ignoreFile, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        ignoreExcludes.push(trimmed);
      }
    }
  }
  const excludes = [...(options.excludes || []), ...ignoreExcludes];

  // 1. Scan directory
  const scannedFiles = scanDirectory(rootDir, excludes, options.maxDepth);
  let filesToProcess = scannedFiles;
  if (options.diff) {
    const changedFiles = getGitChangedFiles(rootDir, options.diff);
    filesToProcess = scannedFiles.filter(f => changedFiles.has(f.relativePath));
  }

  const symbolsCount = {
    class: 0,
    interface: 0,
    struct: 0,
    method: 0,
    function: 0,
    variable: 0,
    type: 0
  };

  // 2. Initialize parser
  const parser = new CodebaseParser();
  await parser.initialize();

  const files: Record<string, FileEntry> = {};
  const namespaces: Record<string, NamespaceEntry> = {};
  const detectedLanguages = new Set<string>();

  // 3. Filter and parse supported files
  const supportedExtensions = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.go',
    '.java',
    '.cs',
    '.rs'
  ]);

  for (const file of filesToProcess) {
    const ext = path.extname(file.relativePath);
    if (!supportedExtensions.has(ext)) {
      continue;
    }

    let lang = '';
    if (ext === '.ts' || ext === '.tsx') {
      lang = 'typescript';
    } else if (ext === '.js' || ext === '.jsx') {
      lang = 'javascript';
    } else if (ext === '.py') {
      lang = 'python';
    } else if (ext === '.go') {
      lang = 'go';
    } else if (ext === '.java') {
      lang = 'java';
    } else if (ext === '.cs') {
      lang = 'csharp';
    } else if (ext === '.rs') {
      lang = 'rust';
    }

    if (lang) {
      detectedLanguages.add(lang);
    }

    try {
      const code = fs.readFileSync(file.absolutePath, 'utf-8');
      const parseResult = parser.parseFile(file.relativePath, code, {
        includeInternalVars: options.includeInternalVars,
        includeDocs: options.includeDocs
      });

      const filterSymbols = (list: SymbolEntry[]) => {
        if (!options.symbolsFilter) return list;
        return list.filter(s => options.symbolsFilter!.includes(s.type));
      };

      const filteredExports = filterSymbols(parseResult.exports);
      const filteredSymbols = filterSymbols(parseResult.symbols);

      for (const exp of filteredExports) {
        if (exp.type in symbolsCount) {
          symbolsCount[exp.type]++;
        }
      }
      for (const sym of filteredSymbols) {
        if (sym.type in symbolsCount) {
          symbolsCount[sym.type]++;
        }
      }

      files[file.relativePath] = {
        hash: file.hash,
        imports: parseResult.imports,
        exports: filteredExports,
        symbols: filteredSymbols
      };

      // Handle namespace
      if (parseResult.namespace) {
        const ns = parseResult.namespace;
        if (!namespaces[ns]) {
          namespaces[ns] = { files: [], exports: [] };
        }
        if (!namespaces[ns].files.includes(file.relativePath)) {
          namespaces[ns].files.push(file.relativePath);
        }
        for (const exp of filteredExports) {
          if (!namespaces[ns].exports.includes(exp.name)) {
            namespaces[ns].exports.push(exp.name);
          }
        }
      }
    } catch {
      // Ignore reading or parsing errors for robustness
    }
  }

  // 4. Parse package dependencies
  const packageDependencies = parsePackageDependencies(rootDir);

  // 5. Resolve links
  const { externalImports, internalLinks } = resolveImports(
    files,
    namespaces,
    packageDependencies
  );

  // 6. Build schema object
  const schemaObj: CodemapSchema = {
    version: '1.0.0',
    $schema: 'https://raw.githubusercontent.com/username/codemap/main/schema.json',
    project: {
      name: path.basename(rootDir) || 'project',
      languages: Array.from(detectedLanguages),
      root: '.'
    },
    packageDependencies,
    files,
    namespaces,
    externalImports,
    internalLinks
  };

  // 7. Write output deterministically
  let format = options.format;
  if (!format) {
    const ext = path.extname(options.output).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      format = 'yaml';
    } else if (ext === '.md' || ext === '.markdown') {
      format = 'markdown';
    } else if (ext === '.mermaid' || ext === '.mmd') {
      format = 'mermaid';
    } else {
      format = 'json';
    }
  }

  const outputStr = format === 'yaml'
    ? generateDeterministicYaml(schemaObj)
    : format === 'markdown'
      ? generateDeterministicMarkdown(schemaObj, { includeToc: options.includeToc })
      : format === 'mermaid'
        ? generateDeterministicMermaid(schemaObj)
        : generateDeterministicJson(schemaObj);

  const outputDir = path.dirname(options.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(options.output, outputStr, 'utf-8');

  return {
    filesCount: Object.keys(files).length,
    symbolsCount
  };
}
