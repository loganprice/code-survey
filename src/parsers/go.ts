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

function isGoExported(name: string): boolean {
  if (name.length === 0) return false;
  const firstChar = name[0];
  // Returns true if the first char is uppercase (A-Z) and not numeric/special
  return firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
}

export class GoParser implements LanguageParser {
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
    let namespace: string | undefined;

    const visit = (node: Parser.SyntaxNode) => {
      // 1. Package clause (Namespace)
      if (node.type === 'package_clause') {
        const idNode = node.children.find(c => c.type === 'package_identifier');
        if (idNode) {
          namespace = idNode.text;
        }
      }

      // 2. Imports
      if (node.type === 'import_spec') {
        const stringNode = node.children.find(
          c => c.type === 'interpreted_string_literal' || c.type === 'raw_string_literal'
        );
        if (stringNode) {
          const source = stringNode.text.replace(/['"]/g, '');
          imports.push({
            source,
            symbols: []
          });
        }
      }

      // We only extract top-level definitions
      const isTopLevel = node.parent?.type === 'source_file';

      if (isTopLevel) {
        // Helper to add Go symbol based on capitalization
        const getGoDocstring = (n: Parser.SyntaxNode): string | undefined => {
          if (!options?.includeDocs) return undefined;
          let prev = n.previousSibling;
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

        const addGoSymbol = (name: string, type: SymbolEntry['type'], startNode: Parser.SyntaxNode) => {
          const item: SymbolEntry = {
            name,
            type,
            location: formatLocation(startNode.startPosition.row + 1, startNode.endPosition.row + 1)
          };
          const doc = getGoDocstring(startNode);
          if (doc) {
            item.doc = doc;
          }
          if (isGoExported(name)) {
            exports.push(item);
          } else {
            symbols.push(item);
          }
        };

        // 3. Types (Structs, Interfaces, Type definitions)
        if (node.type === 'type_declaration') {
          // type_declaration can wrap type_spec
          for (const child of node.children) {
            if (child.type === 'type_spec') {
              const idNode = child.children.find(c => c.type === 'type_identifier');
              if (idNode) {
                addGoSymbol(idNode.text, 'type', node);
              }
            }
          }
        }

        // 4. Functions
        if (node.type === 'function_declaration') {
          const idNode = node.children.find(c => c.type === 'identifier');
          if (idNode) {
            addGoSymbol(idNode.text, 'function', node);
          }
        }

        // 5. Global Variables & Constants
        if (node.type === 'var_declaration' || node.type === 'const_declaration') {
          for (const spec of node.children) {
            if (spec.type === 'var_spec' || spec.type === 'const_spec') {
              // Find identifiers declared
              const ids = spec.children.filter(c => c.type === 'identifier');
              for (const idNode of ids) {
                addGoSymbol(idNode.text, 'variable', node);
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

    return { imports, exports, symbols, namespace };
  }
}
