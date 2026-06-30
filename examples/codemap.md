# Project: bold-hypatia
Languages: typescript

## Dependencies
- **npm**: @types/node (^20.11.0), tree-sitter-wasms (^0.1.11), typescript (^5.3.3), web-tree-sitter (^0.22.4), yaml (^2.4.5)

## Files

### `src/index.ts`
Hash: ce74e94cf64ba8a391c2ac68159a9d7dfc016819826ffbe6479464014613b8c7
- **Imports**:
  - `./parser.ts`: CodebaseParser, parsePackageDependencies
  - `./resolver.ts`: resolveImports
  - `./scanner.ts`: scanDirectory
  - `./types.ts`: CodemapSchema, FileEntry, NamespaceEntry
  - `./writer.ts`: generateDeterministicJson, generateDeterministicMarkdown, generateDeterministicYaml
  - `node:fs`: fs
  - `node:path`: path
- **Exports**:
  - `CodemapOptions` (type, Ln 9-15)
  - `createCodemap` (function, Ln 17-150)

### `src/parser.ts`
Hash: 5cc5af6c3a80f6268ea0ac080196ca8de47eff3c9c15b2845f67fb58f440bd0d
- **Imports**:
  - `./parsers/csharp.ts`: CSharpParser
  - `./parsers/go.ts`: GoParser
  - `./parsers/java.ts`: JavaParser
  - `./parsers/python.ts`: PythonParser
  - `./parsers/typescript.ts`: TypeScriptParser
  - `./types.ts`: LanguageParser, PackageDependencies, ParseOptions, ParseResult
  - `./utils/wasm-loader.ts`: getWasmPath
  - `node:fs`: fs
  - `node:path`: path
- **Exports**:
  - `CodebaseParser` (class, Ln 148-187)
  - `parsePackageDependencies` (function, Ln 13-144)

### `src/parsers/csharp.ts`
Hash: 9ebc2a9458aec3561bd2bfd8a0c9c0669ebbc354d3e95c917fee8036d8f6cc13
- **Imports**:
  - `../types.ts`: ImportEntry, LanguageParser, ParseOptions, ParseResult, SymbolEntry
  - `../types.ts`: formatLocation
  - `web-tree-sitter`: Parser
- **Exports**:
  - `CSharpParser` (class, Ln 19-111)
- **Symbols**:
  - `ensureParserInit` (function, Ln 7-12)
  - `isCSharpPublic` (function, Ln 14-17)
  - `isParserInitialized` (variable, Ln 5)

### `src/parsers/go.ts`
Hash: 07c2228c55bbd5288a464e7ab78b5e4920b9b90c67ecf2fbaa87581ef96b8d15
- **Imports**:
  - `../types.ts`: ImportEntry, LanguageParser, ParseOptions, ParseResult, SymbolEntry
  - `../types.ts`: formatLocation
  - `web-tree-sitter`: Parser
- **Exports**:
  - `GoParser` (class, Ln 21-124)
- **Symbols**:
  - `ensureParserInit` (function, Ln 7-12)
  - `isGoExported` (function, Ln 14-19)
  - `isParserInitialized` (variable, Ln 5)

### `src/parsers/java.ts`
Hash: fe115e60a1ccaae56f6899dd185989a7d2514ef98a71176835e16073c8369536
- **Imports**:
  - `../types.ts`: ImportEntry, LanguageParser, ParseOptions, ParseResult, SymbolEntry
  - `../types.ts`: formatLocation
  - `web-tree-sitter`: Parser
- **Exports**:
  - `JavaParser` (class, Ln 22-102)
- **Symbols**:
  - `ensureParserInit` (function, Ln 7-12)
  - `isJavaPublic` (function, Ln 14-20)
  - `isParserInitialized` (variable, Ln 5)

### `src/parsers/python.ts`
Hash: 200ed04ee9b16ab4cfaa2f8f8756c96c327b5837b5c70c49eff9e130bf3ded81
- **Imports**:
  - `../types.ts`: ImportEntry, LanguageParser, ParseOptions, ParseResult, SymbolEntry
  - `../types.ts`: formatLocation
  - `web-tree-sitter`: Parser
- **Exports**:
  - `PythonParser` (class, Ln 14-118)
- **Symbols**:
  - `ensureParserInit` (function, Ln 7-12)
  - `isParserInitialized` (variable, Ln 5)

### `src/parsers/typescript.ts`
Hash: f0160ee6e63d6cc51cb0eb8f9dd42f04c0ef435d3cf0c25bb64b71e594763d6f
- **Imports**:
  - `../types.ts`: ImportEntry, LanguageParser, ParseOptions, ParseResult, SymbolEntry
  - `../types.ts`: formatLocation
  - `web-tree-sitter`: Parser
- **Exports**:
  - `TypeScriptParser` (class, Ln 14-150)
- **Symbols**:
  - `ensureParserInit` (function, Ln 7-12)
  - `isParserInitialized` (variable, Ln 5)

### `src/resolver.ts`
Hash: 26de28af071ddba07dbb1d441293914411ad319c7ef590d315b1f28480774000
- **Imports**:
  - `./types.ts`: FileEntry, NamespaceEntry, PackageDependencies
  - `node:path`: path
- **Exports**:
  - `resolveImports` (function, Ln 4-184)
- **Symbols**:
  - `isExternal` (function, Ln 45-53)

### `src/scanner.ts`
Hash: 0457b8ca3cbbc5ea664ce63dc0b13fad0fb7441ab2dbcae11fc469f9ed79bdac
- **Imports**:
  - `node:crypto`: crypto
  - `node:fs`: fs
  - `node:path`: path
- **Exports**:
  - `calculateHash` (function, Ln 23-26)
  - `scanDirectory` (function, Ln 28-68)
  - `ScannedFile` (type, Ln 5-9)
- **Symbols**:
  - `DEFAULT_IGNORED_DIRS` (variable, Ln 11-21)
  - `walk` (function, Ln 36-64)

### `src/types.ts`
Hash: 025f075bbca200207049738a5afbd7a215e4175f65c51147e7905c2c6c974608
- **Exports**:
  - `CodemapSchema` (type, Ln 42-51)
  - `FileEntry` (type, Ln 30-35)
  - `formatLocation` (function, Ln 26-28)
  - `ImportEntry` (type, Ln 15-18)
  - `LanguageParser` (type, Ln 64-67)
  - `NamespaceEntry` (type, Ln 37-40)
  - `PackageDependencies` (type, Ln 7-13)
  - `ParseOptions` (type, Ln 53-55)
  - `ParseResult` (type, Ln 57-62)
  - `ProjectMetadata` (type, Ln 1-5)
  - `SymbolEntry` (type, Ln 20-24)

### `src/utils/wasm-loader.ts`
Hash: 4b39e55e8fe996c5e8a49b1e49465d8e98ff75a8a26bfd5df3ac1029fa5b64b4
- **Imports**:
  - `node:fs`: fs
  - `node:os`: os
  - `node:path`: path
  - `node:url`: fileURLToPath
- **Exports**:
  - `getWasmPath` (function, Ln 17-78)
- **Symbols**:
  - `CDN_BASE_URL` (variable, Ln 15)
  - `WASM_FILE_MAP` (variable, Ln 6-13)

### `src/writer.ts`
Hash: 5ef02b0b2c99dc2e63efc7f88299271ad26e72a7cabc2d5e4b593947ebb87eb3
- **Imports**:
  - `./types.ts`: CodemapSchema, FileEntry, NamespaceEntry
  - `yaml`: stringify
- **Exports**:
  - `generateDeterministicJson` (function, Ln 61-64)
  - `generateDeterministicMarkdown` (function, Ln 71-151)
  - `generateDeterministicYaml` (function, Ln 66-69)
  - `sortCodemapData` (function, Ln 22-59)
- **Symbols**:
  - `sortObjectKeys` (function, Ln 5-20)

### `tests/integration.test.ts`
Hash: dec990cae05e353a5d11dd0a95e659c1cdf4b654f8d4027e4cfebfb4f3516039
- **Imports**:
  - `../src/index.ts`: createCodemap
  - `node:assert`: assert
  - `node:fs`: fs
  - `node:path`: path
  - `node:test`: test
  - `yaml`: parse

### `tests/package-parser.test.ts`
Hash: 97dd9e8e959f7abbdb7953bfbbef7743b4dec40d3f9a6391ba13cfbcb3ffae17
- **Imports**:
  - `../src/parser.ts`: parsePackageDependencies
  - `node:assert`: assert
  - `node:fs`: fs
  - `node:path`: path
  - `node:test`: test

### `tests/parsers.test.ts`
Hash: 62cc43e6af0449dab01caa3620f24d06bda7922fa3cb5abd3e5863af3c7bbe49
- **Imports**:
  - `../src/parsers/csharp.ts`: CSharpParser
  - `../src/parsers/go.ts`: GoParser
  - `../src/parsers/java.ts`: JavaParser
  - `../src/parsers/python.ts`: PythonParser
  - `../src/parsers/typescript.ts`: TypeScriptParser
  - `../src/utils/wasm-loader.ts`: getWasmPath
  - `node:assert`: assert
  - `node:test`: test

### `tests/resolver.test.ts`
Hash: 65cf32a0902937498da9c0f1626e59d89b7021dcf57bef20caf9fba7389e1964
- **Imports**:
  - `../src/resolver.ts`: resolveImports
  - `../src/types.ts`: FileEntry, NamespaceEntry, PackageDependencies
  - `node:assert`: assert
  - `node:test`: test

### `tests/scanner.test.ts`
Hash: f388bd9fe03b6565b17c0945572652a9fc140dc6686563b6010936b970c368b1
- **Imports**:
  - `../src/scanner.ts`: scanDirectory
  - `node:assert`: assert
  - `node:fs`: fs
  - `node:path`: path
  - `node:test`: test

### `tests/wasm-loader.test.ts`
Hash: 49c0d02dbe091c5866a42bd6b6890020496df21bd47b4304101f66493b8523a4
- **Imports**:
  - `../src/utils/wasm-loader.ts`: getWasmPath
  - `node:assert`: assert
  - `node:fs`: fs
  - `node:test`: test

### `tests/writer.test.ts`
Hash: 9b05221af50c74b6b051a7c27447990b0baf8be89f2ab235d5349c50d737f98f
- **Imports**:
  - `../src/types.ts`: CodemapSchema
  - `../src/writer.ts`: generateDeterministicJson, generateDeterministicMarkdown, generateDeterministicYaml
  - `node:assert`: assert
  - `node:test`: test
  - `yaml`: parse

## Links
- `src/index.ts:createCodemap` -> `tests/integration.test.ts`
- `src/parser.ts:CodebaseParser` -> `src/index.ts`
- `src/parser.ts:parsePackageDependencies` -> `src/index.ts`, `tests/package-parser.test.ts`
- `src/parsers/csharp.ts:CSharpParser` -> `src/parser.ts`, `tests/parsers.test.ts`
- `src/parsers/go.ts:GoParser` -> `src/parser.ts`, `tests/parsers.test.ts`
- `src/parsers/java.ts:JavaParser` -> `src/parser.ts`, `tests/parsers.test.ts`
- `src/parsers/python.ts:PythonParser` -> `src/parser.ts`, `tests/parsers.test.ts`
- `src/parsers/typescript.ts:TypeScriptParser` -> `src/parser.ts`, `tests/parsers.test.ts`
- `src/resolver.ts:resolveImports` -> `src/index.ts`, `tests/resolver.test.ts`
- `src/scanner.ts:scanDirectory` -> `src/index.ts`, `tests/scanner.test.ts`
- `src/types.ts:CodemapSchema` -> `src/index.ts`, `src/writer.ts`, `tests/writer.test.ts`
- `src/types.ts:FileEntry` -> `src/index.ts`, `src/resolver.ts`, `src/writer.ts`, `tests/resolver.test.ts`
- `src/types.ts:ImportEntry` -> `src/parsers/csharp.ts`, `src/parsers/go.ts`, `src/parsers/java.ts`, `src/parsers/python.ts`, `src/parsers/typescript.ts`
- `src/types.ts:LanguageParser` -> `src/parser.ts`, `src/parsers/csharp.ts`, `src/parsers/go.ts`, `src/parsers/java.ts`, `src/parsers/python.ts`, `src/parsers/typescript.ts`
- `src/types.ts:NamespaceEntry` -> `src/index.ts`, `src/resolver.ts`, `src/writer.ts`, `tests/resolver.test.ts`
- `src/types.ts:PackageDependencies` -> `src/parser.ts`, `src/resolver.ts`, `tests/resolver.test.ts`
- `src/types.ts:ParseOptions` -> `src/parser.ts`, `src/parsers/csharp.ts`, `src/parsers/go.ts`, `src/parsers/java.ts`, `src/parsers/python.ts`, `src/parsers/typescript.ts`
- `src/types.ts:ParseResult` -> `src/parser.ts`, `src/parsers/csharp.ts`, `src/parsers/go.ts`, `src/parsers/java.ts`, `src/parsers/python.ts`, `src/parsers/typescript.ts`
- `src/types.ts:SymbolEntry` -> `src/parsers/csharp.ts`, `src/parsers/go.ts`, `src/parsers/java.ts`, `src/parsers/python.ts`, `src/parsers/typescript.ts`
- `src/types.ts:formatLocation` -> `src/parsers/csharp.ts`, `src/parsers/go.ts`, `src/parsers/java.ts`, `src/parsers/python.ts`, `src/parsers/typescript.ts`
- `src/utils/wasm-loader.ts:getWasmPath` -> `src/parser.ts`, `tests/parsers.test.ts`, `tests/wasm-loader.test.ts`
- `src/writer.ts:generateDeterministicJson` -> `src/index.ts`, `tests/writer.test.ts`
- `src/writer.ts:generateDeterministicMarkdown` -> `src/index.ts`, `tests/writer.test.ts`
- `src/writer.ts:generateDeterministicYaml` -> `src/index.ts`, `tests/writer.test.ts`
