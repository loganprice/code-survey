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

function isCSharpPublic(node: Parser.SyntaxNode): boolean {
  const modifiers = node.children.filter(c => c.type === 'modifier');
  return modifiers.some(m => m.text === 'public');
}

export class CSharpParser implements LanguageParser {
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
      // 1. Namespace declaration
      if (
        node.type === 'namespace_declaration' ||
        node.type === 'file_scoped_namespace_declaration'
      ) {
        const idNode = node.children.find(
          c => c.type === 'qualified_name' || c.type === 'identifier'
        );
        if (idNode) {
          namespace = idNode.text;
        }
      }

      // 2. Usings (Imports)
      if (node.type === 'using_directive') {
        const idNode = node.children.find(
          c => c.type === 'qualified_name' || c.type === 'identifier'
        );
        if (idNode) {
          imports.push({
            source: idNode.text,
            symbols: []
          });
        }
      }

      // 3. Classes, Interfaces, and Structs
      // Helper to get docstring for C# node
      const getCSharpDocstring = (n: Parser.SyntaxNode): string | undefined => {
        if (!options?.includeDocs) return undefined;
        let prev = n.previousSibling;
        const comments: string[] = [];
        while (prev && (prev.type === 'comment' || prev.type.includes('comment'))) {
          comments.unshift(prev.text);
          prev = prev.previousSibling;
        }
        if (comments.length > 0) {
          return formatDocstring(comments.join('\n'));
        }
        return undefined;
      };

      // 3. Classes, Interfaces, and Structs
      if (
        node.type === 'class_declaration' ||
        node.type === 'interface_declaration' ||
        node.type === 'struct_declaration'
      ) {
        const idNode = node.children.find(c => c.type === 'identifier');
        if (idNode) {
          let symType: SymbolEntry['type'] = 'class';
          if (node.type === 'interface_declaration') symType = 'interface';
          if (node.type === 'struct_declaration') symType = 'struct';

          const item: SymbolEntry = {
            name: idNode.text,
            type: symType,
            location: formatLocation(node.startPosition.row + 1, node.endPosition.row + 1)
          };
          const doc = getCSharpDocstring(node);
          if (doc) {
            item.doc = doc;
          }

          if (isCSharpPublic(node)) {
            exports.push(item);
          } else {
            symbols.push(item);
          }
        }
      }

      // 4. Methods
      if (node.type === 'method_declaration') {
        const idNode = node.children.find(c => c.type === 'identifier');
        if (idNode) {
          const item: SymbolEntry = {
            name: idNode.text,
            type: 'method',
            location: formatLocation(node.startPosition.row + 1, node.endPosition.row + 1)
          };
          const doc = getCSharpDocstring(node);
          if (doc) {
            item.doc = doc;
          }
          symbols.push(item);
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
