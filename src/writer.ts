import { stringify } from 'yaml';
import type { CodemapSchema, FileEntry, NamespaceEntry } from './types.ts';

// Recursively sort object keys alphabetically
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sortedObj: any = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sortedObj[key] = sortObjectKeys(obj[key]);
  }
  return sortedObj;
}

export function sortCodemapData(data: CodemapSchema): CodemapSchema {
  // Deep clone data to avoid mutating original inputs
  const clone: CodemapSchema = JSON.parse(JSON.stringify(data));

  // 1. Sort project languages
  clone.project.languages.sort();

  // 2. Sort file elements
  for (const fileKey of Object.keys(clone.files)) {
    const fileEntry: FileEntry = clone.files[fileKey];
    fileEntry.imports.sort((a, b) => a.source.localeCompare(b.source));
    for (const imp of fileEntry.imports) {
      imp.symbols.sort();
    }
    fileEntry.exports.sort((a, b) => a.name.localeCompare(b.name));
    fileEntry.symbols.sort((a, b) => a.name.localeCompare(b.name));
  }

  // 3. Sort namespace elements
  for (const nsKey of Object.keys(clone.namespaces)) {
    const nsEntry: NamespaceEntry = clone.namespaces[nsKey];
    nsEntry.files.sort();
    nsEntry.exports.sort();
  }

  // 4. Sort external imports lists
  for (const extKey of Object.keys(clone.externalImports)) {
    clone.externalImports[extKey].sort();
  }

  // 5. Sort internal links lists
  for (const linkKey of Object.keys(clone.internalLinks)) {
    clone.internalLinks[linkKey].sort();
  }

  // 6. Recursively sort all keys
  return sortObjectKeys(clone);
}

export function generateDeterministicJson(data: CodemapSchema): string {
  const sortedData = sortCodemapData(data);
  return JSON.stringify(sortedData, null, 2);
}

export function generateDeterministicYaml(data: CodemapSchema): string {
  const sortedData = sortCodemapData(data);
  return stringify(sortedData, { sortMapEntries: true });
}

export function generateDeterministicMermaid(data: CodemapSchema): string {
  const sortedData = sortCodemapData(data);
  const lines: string[] = ['graph TD'];

  const fileKeys = Object.keys(sortedData.files).sort();
  if (fileKeys.length === 0) {
    return 'graph TD\n';
  }

  // Create node declarations
  const fileToId: Record<string, string> = {};
  fileKeys.forEach((fileKey, index) => {
    fileToId[fileKey] = `node_${index}`;
    lines.push(`  node_${index}["${fileKey}"]`);
  });

  // Collect edges deterministically
  const linkSet = new Set<string>();
  const linkKeys = Object.keys(sortedData.internalLinks).sort();
  for (const linkKey of linkKeys) {
    const sourceFile = linkKey.split(':')[0];
    const sourceId = fileToId[sourceFile];
    if (!sourceId) continue;

    const targets = sortedData.internalLinks[linkKey];
    for (const targetFile of targets) {
      const targetId = fileToId[targetFile];
      if (targetId && sourceId !== targetId) {
        const edge = `  ${targetId} --> ${sourceId}`;
        linkSet.add(edge);
      }
    }
  }

  // Sort edges to ensure output is deterministic
  const sortedEdges = Array.from(linkSet).sort();
  lines.push(...sortedEdges);

  return lines.join('\n') + '\n';
}

export function generateDeterministicMarkdown(data: CodemapSchema, options?: { includeToc?: boolean }): string {
  const sortedData = sortCodemapData(data);
  const lines: string[] = [];

  // Project Info
  lines.push(`# Project: ${sortedData.project.name}`);
  lines.push(`Languages: ${sortedData.project.languages.join(', ')}`);
  
  // Table of Contents
  if (options?.includeToc) {
    lines.push('\n## Table of Contents');
    lines.push('- [Dependencies](#dependencies)');
    lines.push('- [Files](#files)');
    const fileKeys = Object.keys(sortedData.files).sort();
    for (const fileKey of fileKeys) {
      const anchor = fileKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      lines.push(`  - [${fileKey}](#${anchor})`);
    }
    const nsKeys = Object.keys(sortedData.namespaces).sort();
    if (nsKeys.length > 0) {
      lines.push('- [Namespaces](#namespaces)');
    }
    const linkKeys = Object.keys(sortedData.internalLinks).sort();
    if (linkKeys.length > 0) {
      lines.push('- [Links](#links)');
    }
  }

  // Package Dependencies
  const depKeys = Object.keys(sortedData.packageDependencies).sort();
  if (depKeys.length > 0) {
    lines.push('\n## Dependencies');
    for (const key of depKeys) {
      const deps = (sortedData.packageDependencies as any)[key];
      const items = Object.keys(deps).sort().map(d => `${d} (${deps[d]})`);
      if (items.length > 0) {
        lines.push(`- **${key}**: ${items.join(', ')}`);
      }
    }
  }

  // Files
  const fileKeys = Object.keys(sortedData.files).sort();
  if (fileKeys.length > 0) {
    lines.push('\n## Files');
    for (const fileKey of fileKeys) {
      const fileEntry = sortedData.files[fileKey];
      lines.push(`\n### \`${fileKey}\``);
      lines.push(`Hash: ${fileEntry.hash}`);

      // Imports
      if (fileEntry.imports.length > 0) {
        lines.push('- **Imports**:');
        for (const imp of fileEntry.imports) {
          const syms = imp.symbols.length > 0 ? `: ${imp.symbols.join(', ')}` : '';
          lines.push(`  - \`${imp.source}\`${syms}`);
        }
      }

      // Exports
      if (fileEntry.exports.length > 0) {
        lines.push('- **Exports**:');
        for (const exp of fileEntry.exports) {
          const docStr = exp.doc ? ` - ${exp.doc}` : '';
          lines.push(`  - \`${exp.name}\` (${exp.type}, ${exp.location})${docStr}`);
        }
      }

      // Symbols
      if (fileEntry.symbols.length > 0) {
        lines.push('- **Symbols**:');
        for (const sym of fileEntry.symbols) {
          const docStr = sym.doc ? ` - ${sym.doc}` : '';
          lines.push(`  - \`${sym.name}\` (${sym.type}, ${sym.location})${docStr}`);
        }
      }

      if (options?.includeToc) {
        lines.push('\n[Back to Table of Contents](#table-of-contents)');
      }
    }
  }

  // Namespaces
  const nsKeys = Object.keys(sortedData.namespaces).sort();
  if (nsKeys.length > 0) {
    lines.push('\n## Namespaces');
    for (const nsKey of nsKeys) {
      const nsEntry = sortedData.namespaces[nsKey];
      lines.push(`\n### ${nsKey}`);
      lines.push(`- **Files**: ${nsEntry.files.join(', ')}`);
      lines.push(`- **Exports**: ${nsEntry.exports.join(', ')}`);
    }
  }

  // Links
  const linkKeys = Object.keys(sortedData.internalLinks).sort();
  if (linkKeys.length > 0) {
    lines.push('\n## Links');
    for (const linkKey of linkKeys) {
      const targets = sortedData.internalLinks[linkKey];
      lines.push(`- \`${linkKey}\` -> ${targets.map(t => `\`${t}\``).join(', ')}`);
    }
  }

  return lines.join('\n') + '\n';
}

