import { test } from 'node:test';
import * as assert from 'node:assert';
import { getWasmPath } from '../src/utils/wasm-loader.ts';
import { TypeScriptParser } from '../src/parsers/typescript.ts';
import { PythonParser } from '../src/parsers/python.ts';
import { GoParser } from '../src/parsers/go.ts';
import { JavaParser } from '../src/parsers/java.ts';
import { CSharpParser } from '../src/parsers/csharp.ts';
import { RustParser } from '../src/parsers/rust.ts';
import { JavaScriptParser } from '../src/parsers/javascript.ts';

test('Parser: TypeScript - imports, exports, and internal symbols', async () => {
  const wasmPath = await getWasmPath('typescript');
  const parser = new TypeScriptParser();
  await parser.initialize(wasmPath);

  const mockCode = `
    import { foo, bar } from './helper.ts';
    import defaultImport from 'lodash';

    export class Service {
      run() {}
    }

    export function calculate(val: number): number {
      const helper = (x: number) => x * 2;
      return helper(val);
    }

    function internalHelper() {
      console.log('internal');
    }
  `;

  const result = parser.parse(mockCode);

  // Assert Imports
  assert.strictEqual(result.imports.length, 2);
  const helperImport = result.imports.find(i => i.source === './helper.ts')!;
  assert.ok(helperImport);
  assert.deepEqual(helperImport.symbols.sort(), ['bar', 'foo']);

  const lodashImport = result.imports.find(i => i.source === 'lodash')!;
  assert.ok(lodashImport);
  assert.deepEqual(lodashImport.symbols, ['defaultImport']);

  // Assert Exports
  const serviceExport = result.exports.find(e => e.name === 'Service')!;
  assert.ok(serviceExport);
  assert.strictEqual(serviceExport.type, 'class');
  assert.strictEqual(serviceExport.location, 'Ln 5-7');

  const calculateExport = result.exports.find(e => e.name === 'calculate')!;
  assert.ok(calculateExport);
  assert.strictEqual(calculateExport.type, 'function');

  // Assert Internal Symbols
  const helperSymbol = result.symbols.find(s => s.name === 'internalHelper')!;
  assert.ok(helperSymbol);
  assert.strictEqual(helperSymbol.type, 'function');

  // Assert local variables (like helper) are NOT captured
  const localVal = result.symbols.find(s => s.name === 'helper');
  assert.strictEqual(localVal, undefined, 'Local variables inside functions should not be captured');

  // Assert local variables (like helper) ARE captured when includeInternalVars is true
  const resultWithVars = parser.parse(mockCode, { includeInternalVars: true });
  const localValWithVars = resultWithVars.symbols.find(s => s.name === 'helper');
  assert.ok(localValWithVars, 'Local variables should be captured if includeInternalVars is true');
  assert.strictEqual(localValWithVars.type, 'variable');
});

test('Parser: TypeScript - extracts JSDoc and comments', async () => {
  const wasmPath = await getWasmPath('typescript');
  const parser = new TypeScriptParser();
  await parser.initialize(wasmPath);

  const mockCode = `
    /**
     * Service responsible for handling operations.
     * Another sentence here.
     */
    export class Service {
      run() {}
    }

    // A simple math operation
    export function calculate(val: number): number {
      return val * 2;
    }
  `;

  const result = parser.parse(mockCode, { includeDocs: true });
  const service = result.exports.find(e => e.name === 'Service')!;
  assert.ok(service);
  assert.strictEqual(service.doc, 'Service responsible for handling operations.');

  const calculate = result.exports.find(e => e.name === 'calculate')!;
  assert.ok(calculate);
  assert.strictEqual(calculate.doc, 'A simple math operation');
});

test('Parser: Python - imports, exports, and internal symbols', async () => {
  const wasmPath = await getWasmPath('python');
  const parser = new PythonParser();
  await parser.initialize(wasmPath);

  const mockCode = `
import os
from math import sin, cos

class MyClass:
    def method(self):
        pass

def calculate_value(x):
    return x * 2

def _internal_helper():
    pass
  `;

  const result = parser.parse(mockCode);

  // Assert Imports
  assert.strictEqual(result.imports.length, 2);
  const mathImport = result.imports.find(i => i.source === 'math')!;
  assert.ok(mathImport);
  assert.deepEqual(mathImport.symbols.sort(), ['cos', 'sin']);

  const osImport = result.imports.find(i => i.source === 'os')!;
  assert.ok(osImport);
  assert.deepEqual(osImport.symbols, []);

  // Assert Exports
  const classExport = result.exports.find(e => e.name === 'MyClass')!;
  assert.ok(classExport);
  assert.strictEqual(classExport.type, 'class');

  const calcExport = result.exports.find(e => e.name === 'calculate_value')!;
  assert.ok(calcExport);
  assert.strictEqual(calcExport.type, 'function');

  // Assert Internal Symbols (starting with _)
  const internalSymbol = result.symbols.find(s => s.name === '_internal_helper')!;
  assert.ok(internalSymbol);
  assert.strictEqual(internalSymbol.type, 'function');
});

test('Parser: Python - extracts docstrings', async () => {
  const wasmPath = await getWasmPath('python');
  const parser = new PythonParser();
  await parser.initialize(wasmPath);

  const mockCode = `
class MyClass:
    """Class docstring.
    Multiple lines of class docstring.
    """
    def method(self):
        """Method docstring."""
        pass

def calculate_value(x):
    '''Function docstring.'''
    return x * 2
  `;

  const result = parser.parse(mockCode, { includeDocs: true });
  const classExport = result.exports.find(e => e.name === 'MyClass')!;
  assert.ok(classExport);
  assert.strictEqual(classExport.doc, 'Class docstring.');

  const calcExport = result.exports.find(e => e.name === 'calculate_value')!;
  assert.ok(calcExport);
  assert.strictEqual(calcExport.doc, 'Function docstring.');
});

test('Parser: Go - imports, exports, and internal symbols', async () => {
  const wasmPath = await getWasmPath('go');
  const parser = new GoParser();
  await parser.initialize(wasmPath);

  const mockCode = `
package main

import (
	"fmt"
	"math"
)

type Config struct {
	Port int
}

type internalState struct {
	active bool
}

func CalculateValue(x int) int {
	return x * 2
}

func helper() {
	fmt.Println("internal")
}
  `;

  const result = parser.parse(mockCode);

  // Assert Package Namespace
  assert.strictEqual(result.namespace, 'main');

  // Assert Imports
  assert.strictEqual(result.imports.length, 2);
  const mathImport = result.imports.find(i => i.source === 'math')!;
  assert.ok(mathImport);
  const fmtImport = result.imports.find(i => i.source === 'fmt')!;
  assert.ok(fmtImport);

  // Assert Exports (Starts with uppercase)
  const configExport = result.exports.find(e => e.name === 'Config')!;
  assert.ok(configExport);
  assert.strictEqual(configExport.type, 'type');

  const calcExport = result.exports.find(e => e.name === 'CalculateValue')!;
  assert.ok(calcExport);
  assert.strictEqual(calcExport.type, 'function');

  // Assert Internal Symbols (Starts with lowercase)
  const stateSymbol = result.symbols.find(s => s.name === 'internalState')!;
  assert.ok(stateSymbol);
  assert.strictEqual(stateSymbol.type, 'type');

  const helperSymbol = result.symbols.find(s => s.name === 'helper')!;
  assert.ok(helperSymbol);
  assert.strictEqual(helperSymbol.type, 'function');
});

test('Parser: Java - imports, exports, and internal symbols', async () => {
  const wasmPath = await getWasmPath('java');
  const parser = new JavaParser();
  await parser.initialize(wasmPath);

  const mockCode = `
package com.example.app;

import java.util.List;
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello");
    }

    private void runHelper() {
        // internal helper
    }
}

class InternalClass {
    // not public
}
  `;

  const result = parser.parse(mockCode);

  // Assert Package Namespace
  assert.strictEqual(result.namespace, 'com.example.app');

  // Assert Imports
  assert.strictEqual(result.imports.length, 2);
  const listImport = result.imports.find(i => i.source === 'java.util.List')!;
  assert.ok(listImport);

  // Assert Exports (Public Class)
  const mainExport = result.exports.find(e => e.name === 'Main')!;
  assert.ok(mainExport);
  assert.strictEqual(mainExport.type, 'class');

  // Assert Internal Symbols (Non-public class and class methods)
  const internalClass = result.symbols.find(s => s.name === 'InternalClass')!;
  assert.ok(internalClass);
  assert.strictEqual(internalClass.type, 'class');

  const mainMethod = result.symbols.find(s => s.name === 'main')!;
  assert.ok(mainMethod);
  assert.strictEqual(mainMethod.type, 'method');

  const runHelperMethod = result.symbols.find(s => s.name === 'runHelper')!;
  assert.ok(runHelperMethod);
  assert.strictEqual(runHelperMethod.type, 'method');
});

test('Parser: C# - imports, exports, and internal symbols', async () => {
  const wasmPath = await getWasmPath('csharp');
  const parser = new CSharpParser();
  await parser.initialize(wasmPath);

  const mockCode = `
using System;
using System.Collections.Generic;

namespace MyCompany.MyApp
{
    public class MainController
    {
        public void Run()
        {
            Console.WriteLine("Hello");
        }

        private void Helper()
        {
        }
    }

    class InternalController
    {
    }
}
  `;

  const result = parser.parse(mockCode);

  // Assert Package Namespace
  assert.strictEqual(result.namespace, 'MyCompany.MyApp');

  // Assert Imports
  assert.strictEqual(result.imports.length, 2);
  const sysImport = result.imports.find(i => i.source === 'System')!;
  assert.ok(sysImport);

  // Assert Exports (Public Class)
  const controllerExport = result.exports.find(e => e.name === 'MainController')!;
  assert.ok(controllerExport);
  assert.strictEqual(controllerExport.type, 'class');

  // Assert Internal Symbols (Non-public class and class methods)
  const internalController = result.symbols.find(s => s.name === 'InternalController')!;
  assert.ok(internalController);
  assert.strictEqual(internalController.type, 'class');

  const runMethod = result.symbols.find(s => s.name === 'Run')!;
  assert.ok(runMethod);
  assert.strictEqual(runMethod.type, 'method');

  const helperMethod = result.symbols.find(s => s.name === 'Helper')!;
  assert.ok(helperMethod);
  assert.strictEqual(helperMethod.type, 'method');
});

test('Parser: Rust - imports, exports, and internal symbols', async () => {
  const wasmPath = await getWasmPath('rust');
  const parser = new RustParser();
  await parser.initialize(wasmPath);

  const mockCode = `
    use std::collections::HashMap;
    use std::path::{self, Path};

    /// A struct mapping names to values.
    pub struct MapContainer {
        data: HashMap<String, String>
    }

    impl MapContainer {
        /// Creates a new MapContainer.
        pub fn new() -> Self {
            let initial_capacity = 10;
            MapContainer { data: HashMap::with_capacity(initial_capacity) }
        }

        fn helper(&self) {}
    }

    fn module_level_func() {}
  `;

  const result = parser.parse(mockCode, { includeDocs: true, includeInternalVars: true });

  // Assert Imports
  assert.strictEqual(result.imports.length, 2);
  const hashmapImport = result.imports.find(i => i.source === 'std::collections')!;
  assert.ok(hashmapImport);
  assert.deepEqual(hashmapImport.symbols, ['HashMap']);

  const pathImport = result.imports.find(i => i.source === 'std::path')!;
  assert.ok(pathImport);
  assert.deepEqual(pathImport.symbols, ['self', 'Path']);

  // Assert Exports
  const structExport = result.exports.find(e => e.name === 'MapContainer')!;
  assert.ok(structExport);
  assert.strictEqual(structExport.type, 'struct');
  assert.strictEqual(structExport.doc, 'A struct mapping names to values.');

  const newMethod = result.exports.find(e => e.name === 'new')!;
  assert.ok(newMethod);
  assert.strictEqual(newMethod.type, 'method');
  assert.strictEqual(newMethod.doc, 'Creates a new MapContainer.');

  // Assert Internal Symbols
  const helperMethod = result.symbols.find(s => s.name === 'helper')!;
  assert.ok(helperMethod);
  assert.strictEqual(helperMethod.type, 'method');

  const moduleFunc = result.symbols.find(s => s.name === 'module_level_func')!;
  assert.ok(moduleFunc);
  assert.strictEqual(moduleFunc.type, 'function');

  // Assert Local Variable
  const localVal = result.symbols.find(s => s.name === 'initial_capacity')!;
  assert.ok(localVal);
  assert.strictEqual(localVal.type, 'variable');
});

test('Parser: JavaScript - imports, exports, and internal symbols', async () => {
  const wasmPath = await getWasmPath('javascript');
  const parser = new JavaScriptParser();
  await parser.initialize(wasmPath);

  const mockCode = `
    import { foo, bar } from './helper.js';
    import defaultImport from 'lodash';

    /**
     * A class representing a processor.
     */
    export class Processor {
      process() {}
    }

    /**
     * Calculates the value.
     */
    export function calculate(val) {
      const multiplier = 2;
      return val * multiplier;
    }

    function internalHelper() {
      console.log('internal');
    }
  `;

  const result = parser.parse(mockCode, { includeDocs: true, includeInternalVars: true });

  // Assert Imports
  assert.strictEqual(result.imports.length, 2);
  const helperImport = result.imports.find(i => i.source === './helper.js')!;
  assert.ok(helperImport);
  assert.deepEqual(helperImport.symbols.sort(), ['bar', 'foo']);

  // Assert Exports
  const procExport = result.exports.find(e => e.name === 'Processor')!;
  assert.ok(procExport);
  assert.strictEqual(procExport.type, 'class');
  assert.strictEqual(procExport.doc, 'A class representing a processor.');

  const calcExport = result.exports.find(e => e.name === 'calculate')!;
  assert.ok(calcExport);
  assert.strictEqual(calcExport.type, 'function');
  assert.strictEqual(calcExport.doc, 'Calculates the value.');

  // Assert Internal Symbols
  const internalHelper = result.symbols.find(s => s.name === 'internalHelper')!;
  assert.ok(internalHelper);
  assert.strictEqual(internalHelper.type, 'function');

  // Assert Local Variable
  const localVal = result.symbols.find(s => s.name === 'multiplier')!;
  assert.ok(localVal);
  assert.strictEqual(localVal.type, 'variable');
});




