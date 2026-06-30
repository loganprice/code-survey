import Parser from 'web-tree-sitter';
import type { LanguageParser, ParseResult, ImportEntry, SymbolEntry, ParseOptions } from '../types.ts';
import { formatLocation, formatDocstring } from '../types.ts';

let isParserInitialized = false;

async function ensureParserInit() {
  if (!isParserInitialized) {
    await Parser.init();
    isParserInitialized = true;
  }
}

export class PythonParser implements LanguageParser {
  private parser!: Parser;
  private lang!: Parser.Language;

  async initialize(wasmPath: string): Promise<void> {
    await ensureParserInit();
    this.lang = await Parser.Language.load(wasmPath);
    this.parser = new Parser();
    this.parser.setLanguage(this.lang);
  }

  parse(code: string, options?: ParseOptions): ParseResult {
    const tree = this.parser.parse(code);
    const imports: ImportEntry[] = [];
    const exports: SymbolEntry[] = [];
    const symbols: SymbolEntry[] = [];

    const getPythonDocstring = (n: Parser.SyntaxNode): string | undefined => {
      if (!options?.includeDocs) return undefined;
      const block = n.children.find(c => c.type === 'block');
      if (block && block.children.length > 0) {
        const firstChild = block.children[0];
        if (
          firstChild.type === 'expression_statement' &&
          firstChild.children[0]?.type === 'string'
        ) {
          const stringNode = firstChild.children[0];
          let rawText = stringNode.text;
          if (rawText.startsWith("'''") || rawText.startsWith('"""')) {
            rawText = rawText.slice(3, -3);
          } else if (rawText.startsWith("'") || rawText.startsWith('"')) {
            rawText = rawText.slice(1, -1);
          }
          return formatDocstring(rawText);
        }
      }
      return undefined;
    };

    const visit = (node: Parser.SyntaxNode) => {
      // 1. Imports: import os, sys
      if (node.type === 'import_statement') {
        const dottedNames = node.children.filter(c => c.type === 'dotted_name');
        for (const dotted of dottedNames) {
          imports.push({
            source: dotted.text,
            symbols: []
          });
        }
      }

      // 2. Imports: from math import sin, cos
      if (node.type === 'import_from_statement') {
        const dottedNames = node.children.filter(c => c.type === 'dotted_name');
        if (dottedNames.length > 0) {
          const source = dottedNames[0].text;
          const importedSymbols: string[] = [];

          // Find the index of the 'import' keyword child
          const importIndex = node.children.findIndex(c => c.type === 'import');
          if (importIndex !== -1) {
            // All dotted_names or identifiers after 'import' keyword are imported symbols
            for (let i = importIndex + 1; i < node.children.length; i++) {
              const child = node.children[i];
              if (child.type === 'dotted_name' || child.type === 'identifier') {
                importedSymbols.push(child.text);
              } else if (child.type === 'aliased_import') {
                // e.g. sin as s
                const realNameNode = child.children[0];
                if (realNameNode) {
                  importedSymbols.push(realNameNode.text);
                }
              }
            }
          }

          imports.push({ source, symbols: importedSymbols });
        }
      }

      // We only extract top-level definitions (module level) for classes and functions
      const isTopLevel = node.parent?.type === 'module';

      if (isTopLevel) {
        // 3. Classes
        if (node.type === 'class_definition') {
          const idNode = node.children.find(c => c.type === 'identifier');
          if (idNode) {
            const name = idNode.text;
            const isInternal = name.startsWith('_');
            const item: SymbolEntry = {
              name,
              type: 'class',
              location: formatLocation(node.startPosition.row + 1, node.endPosition.row + 1)
            };
            const doc = getPythonDocstring(node);
            if (doc) {
              item.doc = doc;
            }
            if (isInternal) symbols.push(item);
            else exports.push(item);
          }
        }

        // 4. Functions
        if (node.type === 'function_definition') {
          const idNode = node.children.find(c => c.type === 'identifier');
          if (idNode) {
            const name = idNode.text;
            const isInternal = name.startsWith('_');
            const item: SymbolEntry = {
              name,
              type: 'function',
              location: formatLocation(node.startPosition.row + 1, node.endPosition.row + 1)
            };
            const doc = getPythonDocstring(node);
            if (doc) {
              item.doc = doc;
            }
            if (isInternal) symbols.push(item);
            else exports.push(item);
          }
        }
      }

      for (const child of node.children) {
        visit(child);
      }
    };

    visit(tree.rootNode);

    return { imports, exports, symbols };
  }
}
