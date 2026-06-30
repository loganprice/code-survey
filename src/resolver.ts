import * as path from 'node:path';
import type { FileEntry, NamespaceEntry, PackageDependencies } from './types.ts';

export function resolveImports(
  files: Record<string, FileEntry>,
  namespaces: Record<string, NamespaceEntry>,
  packageDeps: PackageDependencies
): {
  externalImports: Record<string, string[]>;
  internalLinks: Record<string, string[]>;
} {
  const externalImports: Record<string, string[]> = {};
  const internalLinks: Record<string, string[]> = {};

  const filePaths = Object.keys(files);

  // Helper to add external import
  const addExternalImport = (pkg: string, file: string) => {
    if (!externalImports[pkg]) externalImports[pkg] = [];
    if (!externalImports[pkg].includes(file)) {
      externalImports[pkg].push(file);
    }
  };

  // Helper to add internal link
  const addInternalLink = (
    targetFile: string,
    symbol: string | null,
    sourceFile: string
  ) => {
    const key = symbol ? `${targetFile}:${symbol}` : targetFile;
    if (!internalLinks[key]) internalLinks[key] = [];
    if (!internalLinks[key].includes(sourceFile)) {
      internalLinks[key].push(sourceFile);
    }
  };

  // Extract all package names for quick external checks
  const npmPackages = new Set(Object.keys(packageDeps.npm || {}));
  const pipPackages = new Set(Object.keys(packageDeps.pip || {}));
  const nugetPackages = new Set(Object.keys(packageDeps.nuget || {}));
  const mavenPackages = new Set(Object.keys(packageDeps.maven || {}));
  const goPackages = new Set(Object.keys(packageDeps.go || {}));

  function isExternal(source: string): boolean {
    return (
      npmPackages.has(source) ||
      pipPackages.has(source) ||
      nugetPackages.has(source) ||
      mavenPackages.has(source) ||
      goPackages.has(source)
    );
  }

  for (const sourceFile of filePaths) {
    const entry = files[sourceFile];
    const sourceDir = path.dirname(sourceFile);

    for (const imp of entry.imports) {
      const { source, symbols } = imp;

      // 1. Check if external package
      if (isExternal(source)) {
        addExternalImport(source, sourceFile);
        continue;
      }

      // 2. JS/TS Relative Path Resolution
      if (source.startsWith('.')) {
        const resolvedBase = path.normalize(path.join(sourceDir, source));
        // Candidate extensions
        const candidates = [
          resolvedBase,
          resolvedBase + '.ts',
          resolvedBase + '.tsx',
          resolvedBase + '.js',
          resolvedBase + '.jsx',
          resolvedBase + '.d.ts',
          path.join(resolvedBase, 'index.ts'),
          path.join(resolvedBase, 'index.tsx'),
          path.join(resolvedBase, 'index.js')
        ];

        let resolvedFile: string | null = null;
        for (const cand of candidates) {
          const normalizedCand = cand.replace(/\\/g, '/');
          if (files[normalizedCand]) {
            resolvedFile = normalizedCand;
            break;
          }
        }

        if (resolvedFile) {
          if (symbols.length === 0) {
            addInternalLink(resolvedFile, null, sourceFile);
          } else {
            for (const sym of symbols) {
              addInternalLink(resolvedFile, sym, sourceFile);
            }
          }
        }
        continue;
      }

      // 3. Python Dotted Path Resolution
      const isPythonDotted =
        sourceFile.endsWith('.py') &&
        !source.includes('/') &&
        (source.includes('.') || source.startsWith('.'));
      if (isPythonDotted) {
        let normalizedSource = source;
        if (source.startsWith('.')) {
          const dots = source.match(/^\.+/)?.[0] || '';
          const remainder = source.substring(dots.length);
          const dotCount = dots.length;
          let targetDir = sourceDir;
          for (let i = 1; i < dotCount; i++) {
            targetDir = path.dirname(targetDir);
          }
          normalizedSource = remainder
            ? path.join(targetDir, remainder.replace(/\./g, '/'))
            : targetDir;
        } else {
          normalizedSource = source.replace(/\./g, '/');
        }

        const candidate = (normalizedSource + '.py').replace(/\\/g, '/');
        if (files[candidate]) {
          if (symbols.length === 0) {
            addInternalLink(candidate, null, sourceFile);
          } else {
            for (const sym of symbols) {
              addInternalLink(candidate, sym, sourceFile);
            }
          }
          continue;
        }
      }

      // 4. Namespace / Java Package / C# using Resolution
      if (namespaces[source]) {
        const ns = namespaces[source];
        for (const targetFile of ns.files) {
          if (symbols.length === 0) {
            addInternalLink(targetFile, null, sourceFile);
          } else {
            for (const sym of symbols) {
              const targetEntry = files[targetFile];
              if (targetEntry && targetEntry.exports.some(e => e.name === sym)) {
                addInternalLink(targetFile, sym, sourceFile);
              }
            }
          }
        }
        continue;
      }

      // Java specific sub-namespace class import: import com.example.utils.Formatter
      if (source.includes('.')) {
        const lastDot = source.lastIndexOf('.');
        const nsName = source.substring(0, lastDot);
        const className = source.substring(lastDot + 1);
        if (namespaces[nsName]) {
          const ns = namespaces[nsName];
          for (const targetFile of ns.files) {
            const targetEntry = files[targetFile];
            if (targetEntry && targetEntry.exports.some(e => e.name === className)) {
              addInternalLink(targetFile, className, sourceFile);
            }
          }
          continue;
        }
      }

      // 5. Fallback check: if import is a direct filename match in files
      const simpleCandidate = source.replace(/\\/g, '/');
      if (files[simpleCandidate]) {
        addInternalLink(simpleCandidate, null, sourceFile);
      }
    }
  }

  return { externalImports, internalLinks };
}
