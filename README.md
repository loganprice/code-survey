# Codemap

**Codemap** is a deterministic codebase mapping tool designed to summarize repository structures for AI coding agents. It scans the files in your project, parses their ASTs using Tree-sitter to extract imports, exports, and symbols, and maps their interdependencies. 

By default, Codemap generates a token-optimized representation of the codebase, ensuring that your agent receives the necessary architectural context without wasting context window space on redundant syntactic overhead or internal local variables.

---

## Features

- **Multi-Language Support:** AST parsing for TypeScript/JavaScript, Python, Go, Java, C#, and Rust.
- **Exclusion of Internal Variables:** Excludes internal function-scoped variables by default to reduce noise (toggleable via flag).
- **Multiple Formats:** Support for `JSON`, `YAML`, a custom token-dense `Markdown`, and `Mermaid` flowcharts.
- **Compacted Line Locations:** Encodes coordinates into a compact `"Ln X-Y"` format to save character space.
- **Deterministic Output:** Recursively sorts files, namespaces, imports, and exports alphabetically, keeping git diffs clean and maximizing LLM context-cache hit rates.
- **Git-Delta Maps:** Map only the files that have changed in git (committed since a branch/hash, or uncommitted changes).
- **Traversal Depth Limits:** Traversal depth restriction for scaling up to large repositories or monorepos.

---

## Installation

```bash
npm install @lprice/codemap
```

*Note: Requires Node.js or Deno installed on the system.*

---

## CLI Usage

Run `codemap` from the terminal:

```bash
codemap [options]
```

### Options

| Option | Alias | Description |
| :--- | :--- | :--- |
| `--root <dir>` | `-r` | The root directory of the codebase to map (default: current directory). |
| `--output <file>` | `-o` | The output path for the mapped artifact (default: `<root>/codemap.json`). |
| `--exclude <list>` | `-e` | Comma-separated list of additional file/folder patterns to exclude. |
| `--format <type>` | `-f` | Output format: `json`, `yaml`, `markdown`, or `mermaid` (default: inferred from output path). |
| `--internal-vars` | | Include internal/local variables in the mapping (default: `false`). |
| `--include-docs` | | Extract docstring/JSDoc summaries for class/function symbols (default: `false`). |
| `--include-toc`  | | Generate a Table of Contents and navigation links in Markdown format (default: `false`). |
| `--max-depth <n>` | | Maximum directory traversal depth (default: unlimited). |
| `--symbols-filter <list>`| | Comma-separated list of symbol types to keep (e.g. `class,method`) (default: all). |
| `--diff <target>` | | Generate map only for files changed since `<target>` (e.g. `main` or `HEAD`). |
| `--help` | `-h` | Show CLI help message. |

---

## Use Cases & Recipe Matrix

Depending on the task, you can mix and match output formats and options. Below is a guide on when to use each configuration:

### 1. Repository Onboarding & Architecture Discovery
* **Use Case:** Feeding an AI agent a high-level structure of a new codebase for the first time.
* **Goal:** Maximize high-level layout context while minimizing token cost.
* **Recommended Options:** `--format markdown --include-toc`
* **CLI Example:**
  ```bash
  codemap -f markdown --include-toc -o codemap.md
  ```
* **Why it works:** The custom Markdown format strips away structural JSON syntax (braces, quotes, commas), resulting in the lowest baseline token footprint (~2k tokens). Adding `--include-toc` generates a clickable table of contents and "Back to Top" links, allowing the agent to navigate modular files directly using markdown anchor targets.

### 2. Deep Refactoring & Function Editing
* **Use Case:** The agent is writing or modifying functions and needs a detailed map of all local variables, parameters, and API docstrings.
* **Goal:** High fidelity internal information.
* **Recommended Options:** `--format yaml --internal-vars --include-docs`
* **CLI Example:**
  ```bash
  codemap -f yaml --internal-vars --include-docs -o codemap.yaml
  ```
* **Why it works:** YAML is machine-parsable for the agent while remaining 36% smaller than JSON. Toggling `--internal-vars` maps block-scoped local variables, and `--include-docs` injects comments so the agent understands implementation context.

### 3. Laser-Focused Feature Development (Git Diffs)
* **Use Case:** The agent is fixing a bug on a branch or preparing a PR, and only needs context on files they are changing.
* **Goal:** Zero token wastage on unrelated files.
* **Recommended Options:** `--diff main --format markdown` (or `--diff HEAD`)
* **CLI Example:**
  ```bash
  codemap --diff main -f markdown -o codemap.md
  ```
* **Why it works:** This command queries Git and maps only modified or staged files. Instead of a 15 KB map, it creates a targeted map (often under 1 KB), drastically keeping the agent's context window clean.

### 4. Dependency & Module Coupling Analysis
* **Use Case:** Visualizing module dependencies or helping the agent analyze architectural coupling.
* **Goal:** Clear visual depiction of imports.
* **Recommended Options:** `--format mermaid`
* **CLI Example:**
  ```bash
  codemap -f mermaid -o codemap.mermaid
  ```
* **Why it works:** Generates standard Mermaid.js syntax that the agent can read to identify circular imports or module boundaries. It can also be pasted directly into markdown viewers to render visual flowcharts.

### 5. Large Codebases & Monorepos
* **Use Case:** Mapping massive repositories where parsing everything would exceed token limits.
* **Goal:** Limit size while maintaining structure.
* **Recommended Options:** `--max-depth 2 --symbols-filter class,interface --format markdown`
* **CLI Example:**
  ```bash
  codemap --max-depth 2 --symbols-filter class,interface -f markdown -o codemap.md
  ```
* **Why it works:** Restricting `--max-depth 2` stops traversal deep inside folders (like third-party directories or deep utility folders). Limiting `--symbols-filter class,interface` removes functions and methods, mapping out only the top-level architecture skeleton.

---

## Programmatic Usage

You can also import and run `createCodemap` directly in your TypeScript/JavaScript projects:

```typescript
import { createCodemap } from '@lprice/codemap';

await createCodemap({
  root: './my-project',
  output: './my-project/codemap.md',
  excludes: ['node_modules', 'dist'],
  format: 'markdown',
  includeInternalVars: false,
  includeDocs: true,
  includeToc: true,
  maxDepth: 3,
  symbolsFilter: ['class', 'interface', 'method', 'function'],
  diff: 'main'
});
```

---

## Benchmarks & Token Efficiency

To optimize feeding maps into LLM coding agents, we analyzed the token usage and file size differences of maps generated on this codebase using different formatting options and symbol boundaries:

| Output Format | Location Format | Docs? | Internal Vars Included? | File Size | Est. Tokens | Size Savings |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **JSON** | Object (`{start, end}`) | No | Yes (original baseline) | `73.2 KB` | ~21,000 – 24,000 | Baseline |
| **YAML** | Object (`{start, end}`) | No | Yes | `46.7 KB` | ~11,000 – 13,000 | **-36.2%** |
| **Markdown** | String (`Ln X-Y`) | No | Yes | `20.7 KB` | ~4,200 – 4,700 | **-71.7%** |
| **YAML** | String (`Ln X-Y`) | No | No (optimized default) | `15.8 KB` | ~3,900 – 4,300 | **-78.4%** |
| **Markdown** | String (`Ln X-Y`) | No | No (optimized default) | **`10.1 KB`** | **~2,200 – 2,500** | **-86.2%** |
| **Markdown** | String (`Ln X-Y`) | **Yes** | No | **`10.5 KB`** | **~2,400 – 2,600** | **-85.6%** |
| **Mermaid** | Node IDs | No | No | **`1.3 KB`** | **~300 – 400** | **-98.2%** |

### Key Takeaways
1. **JSON to YAML Conversion:** Saves around **36%** in raw characters.
2. **Compact Locations (`Ln X-Y`) & Variable Pruning:** By removing internal function variables, we strip away redundant implementation details, cutting size by over **70%**.
3. **Custom Markdown Format:** Offers the ultimate token density. By stripping away structural syntax (braces, quotes, commas), a Markdown map uses **nearly 7x fewer tokens** than the original JSON output, saving upwards of **20,000 tokens** per LLM call!
