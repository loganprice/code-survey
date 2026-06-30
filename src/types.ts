export interface ProjectMetadata {
  name: string;
  languages: string[];
  root: string;
}

export interface PackageDependencies {
  npm?: Record<string, string>;
  nuget?: Record<string, string>;
  go?: Record<string, string>;
  maven?: Record<string, string>;
  pip?: Record<string, string>;
}

export interface ImportEntry {
  source: string;
  symbols: string[];
}

export interface SymbolEntry {
  name: string;
  type: 'class' | 'interface' | 'struct' | 'method' | 'function' | 'variable' | 'type';
  location: string;
  doc?: string;
}

export function formatLocation(start: number, end: number): string {
  return start === end ? `Ln ${start}` : `Ln ${start}-${end}`;
}

export function formatDocstring(text: string): string {
  let cleaned = text
    .replace(/\/\*\*|\*\/|\/\/|\*/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ');

  const sentenceMatch = cleaned.match(/^[^.!?]+[.!?]/);
  if (sentenceMatch) {
    cleaned = sentenceMatch[0];
  }

  if (cleaned.length > 120) {
    cleaned = cleaned.substring(0, 117) + '...';
  }
  return cleaned.trim();
}

export interface FileEntry {
  hash: string;
  imports: ImportEntry[];
  exports: SymbolEntry[];
  symbols: SymbolEntry[];
}

export interface NamespaceEntry {
  files: string[];
  exports: string[];
}

export interface CodemapSchema {
  version: string;
  $schema?: string;
  project: ProjectMetadata;
  packageDependencies: PackageDependencies;
  files: Record<string, FileEntry>;
  namespaces: Record<string, NamespaceEntry>;
  externalImports: Record<string, string[]>;
  internalLinks: Record<string, string[]>;
}

export interface ParseOptions {
  includeInternalVars?: boolean;
  includeDocs?: boolean;
  symbolsFilter?: string[];
}

export interface ParseResult {
  imports: ImportEntry[];
  exports: SymbolEntry[];
  symbols: SymbolEntry[];
  namespace?: string;
}

export interface LanguageParser {
  initialize(wasmPath: string): Promise<void>;
  parse(code: string, options?: ParseOptions): ParseResult;
}

export interface CodemapResult {
  filesCount: number;
  symbolsCount: {
    class: number;
    interface: number;
    struct: number;
    method: number;
    function: number;
    variable: number;
    type: number;
  };
}


