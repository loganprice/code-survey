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

export class JavaScriptParser implements LanguageParser {
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

    const visit = (node: Parser.SyntaxNode) => {
      // 1. Imports
      if (node.type === 'import_statement') {
        const stringNode = node.children.find(c => c.type === 'string');
        let source = '';
        if (stringNode) {
          const fragment = stringNode.children.find(c => c.type === 'string_fragment');
          source = fragment ? fragment.text : stringNode.text.replace(/['"]/g, '');
        }

        const importedSymbols: string[] = [];
        const clause = node.children.find(c => c.type === 'import_clause');
        if (clause) {
          // Default import: import defaultImport from 'lodash'
          const defaultImportId = clause.children.find(c => c.type === 'identifier');
          if (defaultImportId) {
            importedSymbols.push(defaultImportId.text);
          }

          // Named imports: import { a, b } from 'c'
          const namedImports = clause.children.find(c => c.type === 'named_imports');
          if (namedImports) {
            for (const child of namedImports.children) {
              if (child.type === 'import_specifier') {
                const idNode = child.children.find(c => c.type === 'identifier');
                if (idNode) {
                  importedSymbols.push(idNode.text);
                }
              }
            }
          }

          // Namespace import: import * as ns from 'c'
          const namespaceImport = clause.children.find(c => c.type === 'namespace_import');
          if (namespaceImport) {
            const idNode = namespaceImport.children.find(c => c.type === 'identifier');
            if (idNode) {
              importedSymbols.push(idNode.text);
            }
          }
        }
        imports.push({ source, symbols: importedSymbols });
      }

      // Check if this node is exported
      const isExported = node.parent?.type === 'export_statement';

      // Helper to get docstring for JS node
      const getDocstring = (n: Parser.SyntaxNode): string | undefined => {
        if (!options?.includeDocs) return undefined;
        let prev = n.parent?.type === 'export_statement'
          ? n.parent.previousSibling
          : n.previousSibling;
        const comments: string[] = [];
        while (prev && prev.type === 'comment') {
          comments.unshift(prev.text);
          prev = prev.previousSibling;
        }
        if (comments.length > 0) {
          return formatDocstring(comments.join('\n'));
        }
        return undefined;
      };

      // Helper to add symbol
      const addSymbol = (name: string, type: SymbolEntry['type'], startNode: Parser.SyntaxNode) => {
        const item: SymbolEntry = {
          name,
          type,
          location: formatLocation(startNode.startPosition.row + 1, startNode.endPosition.row + 1)
        };
        const doc = getDocstring(startNode);
        if (doc) {
          item.doc = doc;
        }
        if (isExported) {
          exports.push(item);
        } else {
          symbols.push(item);
        }
      };

      // 2. Classes
      if (node.type === 'class_declaration') {
        const idNode = node.children.find(c => c.type === 'identifier' || c.type === 'type_identifier');
        if (idNode) {
          addSymbol(idNode.text, 'class', node);
        }
      }

      // 3. Functions
      if (node.type === 'function_declaration' || node.type === 'generator_function_declaration') {
        const idNode = node.children.find(c => c.type === 'identifier');
        if (idNode) {
          addSymbol(idNode.text, 'function', node);
        }
      }

      // 4. Lexical & Variable Declarations (export const x = 5)
      if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
        const isTopLevel = node.parent?.type === 'program' || node.parent?.type === 'export_statement';
        if (isTopLevel || (options?.includeInternalVars ?? false)) {
          for (const declarator of node.children) {
            if (declarator.type === 'variable_declarator') {
              const idNode = declarator.children.find(c => c.type === 'identifier');
              if (idNode) {
                const isVarExported = node.parent?.type === 'export_statement';
                const item: SymbolEntry = {
                  name: idNode.text,
                  type: 'variable',
                  location: formatLocation(node.startPosition.row + 1, node.endPosition.row + 1)
                };
                const doc = getDocstring(node);
                if (doc) {
                  item.doc = doc;
                }
                if (isVarExported) exports.push(item);
                else symbols.push(item);
              }
            }
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
