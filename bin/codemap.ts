#!/usr/bin/env node
import { createCodemap } from '../src/index.ts';
import * as path from 'node:path';
import * as fs from 'node:fs';

function printHelp() {
  console.log(`
Codemap - Deterministically maps codebases for AI coding agents.

Usage:
  codemap [options]

Options:
  --root, -r         The root directory of the codebase to map (default: current directory)
  --output, -o       The output path for the mapped artifact (default: <root>/codemap.json)
  --exclude, -e      Comma-separated list of additional file/folder patterns to exclude
  --format, -f       The output format: 'json', 'yaml', 'markdown', or 'mermaid' (default: inferred from output path)
  --internal-vars    Include internal/local variables in the mapping (default: false)
  --include-docs     Extract docstring/JSDoc summaries for class/function symbols (default: false)
  --include-toc      Generate a Table of Contents and navigation links in Markdown format (default: false)
  --max-depth <n>    Maximum directory traversal depth (default: unlimited)
  --symbols-filter   Comma-separated list of symbol types to keep (e.g. class,method) (default: all)
  --diff <target>    Generate map only for files changed since <target> (default: HEAD). Staged/unstaged files are always included.
  --help, -h         Show this help message
`);
}

async function main() {
  const args = process.argv.slice(2);
  let root = process.cwd();

  // Quick scan for root arg to resolve config path correctly
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' || args[i] === '-r') {
      if (args[i + 1]) root = args[i + 1];
      break;
    }
  }

  const absoluteRoot = path.resolve(root);

  // Load project-level config file if it exists
  let configOptions: any = {};
  const jsonConfig = path.join(absoluteRoot, 'codemap.config.json');
  const yamlConfig = path.join(absoluteRoot, 'codemap.config.yaml');
  const ymlConfig = path.join(absoluteRoot, 'codemap.config.yml');

  if (fs.existsSync(jsonConfig)) {
    try {
      configOptions = JSON.parse(fs.readFileSync(jsonConfig, 'utf-8'));
    } catch (err: any) {
      console.error(`Error parsing codemap.config.json: ${err.message}`);
      process.exit(1);
    }
  } else if (fs.existsSync(yamlConfig) || fs.existsSync(ymlConfig)) {
    const target = fs.existsSync(yamlConfig) ? yamlConfig : ymlConfig;
    try {
      const yamlContent = fs.readFileSync(target, 'utf-8');
      const { parse: parseYaml } = await import('yaml');
      configOptions = parseYaml(yamlContent);
    } catch (err: any) {
      console.error(`Error parsing ${path.basename(target)}: ${err.message}`);
      process.exit(1);
    }
  }

  // Set default values from config options
  let output = configOptions.output;
  let excludes = configOptions.excludes || [];
  let format = configOptions.format;
  let includeInternalVars = configOptions.includeInternalVars ?? false;
  let includeDocs = configOptions.includeDocs ?? false;
  let includeToc = configOptions.includeToc ?? false;
  let maxDepth = configOptions.maxDepth;
  let symbolsFilter = configOptions.symbolsFilter;
  let diff = configOptions.diff;

  // Command line overrides
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--root' || arg === '-r') {
      // Already handled during pre-scan
      i++;
    } else if (arg === '--output' || arg === '-o') {
      output = args[++i];
    } else if (arg === '--exclude' || arg === '-e') {
      const patterns = args[++i];
      if (patterns) {
        excludes = [
          ...excludes,
          ...patterns.split(',').map(p => p.trim())
        ];
      }
    } else if (arg === '--format' || arg === '-f') {
      const val = args[++i];
      if (val === 'json' || val === 'yaml' || val === 'markdown' || val === 'mermaid') {
        format = val;
      } else {
        console.error(`Error: format must be 'json', 'yaml', 'markdown', or 'mermaid', got '${val}'.`);
        process.exit(1);
      }
    } else if (arg === '--internal-vars') {
      includeInternalVars = true;
    } else if (arg === '--include-docs') {
      includeDocs = true;
    } else if (arg === '--include-toc') {
      includeToc = true;
    } else if (arg === '--max-depth') {
      const val = args[++i];
      maxDepth = parseInt(val, 10);
      if (isNaN(maxDepth)) {
        console.error(`Error: --max-depth must be a number, got '${val}'.`);
        process.exit(1);
      }
    } else if (arg === '--symbols-filter') {
      const val = args[++i];
      if (val) {
        symbolsFilter = val.split(',').map(s => s.trim());
      }
    } else if (arg === '--diff') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        diff = nextArg;
        i++;
      } else {
        diff = true;
      }
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  const absoluteOutput = output
    ? path.resolve(output)
    : path.join(absoluteRoot, 'codemap.json');

  console.error(`Mapping codebase at: ${absoluteRoot}`);
  console.error(`Output target:       ${absoluteOutput}`);

  try {
    const result = await createCodemap({
      root: absoluteRoot,
      output: absoluteOutput,
      excludes,
      format,
      includeInternalVars,
      includeDocs,
      includeToc,
      maxDepth,
      symbolsFilter,
      diff
    });

    console.error('Codemap generated successfully!');

    // Token Estimator budget report
    if (fs.existsSync(absoluteOutput)) {
      const content = fs.readFileSync(absoluteOutput, 'utf-8');
      const sizeBytes = fs.statSync(absoluteOutput).size;
      const sizeKb = (sizeBytes / 1024).toFixed(1);

      // Estimate tokens based on syntax ratios
      let charToTokenRatio = 3.2; // JSON baseline
      const actualExt = path.extname(absoluteOutput).toLowerCase();
      const actualFormat = format || (actualExt === '.yaml' || actualExt === '.yml' ? 'yaml' : actualExt === '.md' || actualExt === '.markdown' ? 'markdown' : actualExt === '.mermaid' || actualExt === '.mmd' ? 'mermaid' : 'json');

      if (actualFormat === 'yaml') {
        charToTokenRatio = 3.7;
      } else if (actualFormat === 'markdown') {
        charToTokenRatio = 4.2;
      } else if (actualFormat === 'mermaid') {
        charToTokenRatio = 3.8;
      }

      const estTokens = Math.round(content.length / charToTokenRatio);

      process.stderr.write('\n--- Codemap Token Budget Estimator ---\n');
      process.stderr.write(`Output Format:    ${actualFormat}\n`);
      process.stderr.write(`Files Mapped:     ${result.filesCount}\n`);

      const symbolLines: string[] = [];
      for (const [key, val] of Object.entries(result.symbolsCount)) {
        if (val > 0) {
          symbolLines.push(`  - ${key}: ${val}`);
        }
      }
      if (symbolLines.length > 0) {
        process.stderr.write('Symbol Breakdown:\n');
        process.stderr.write(symbolLines.join('\n') + '\n');
      }

      process.stderr.write(`File Size:        ${sizeKb} KB (${sizeBytes} bytes)\n`);
      process.stderr.write(`Estimated Tokens: ~${estTokens.toLocaleString()} tokens\n`);
      process.stderr.write('--------------------------------------\n\n');
    }
  } catch (err: any) {
    console.error(`Error generating codemap: ${err.message}`);
    process.exit(1);
  }
}

main();
