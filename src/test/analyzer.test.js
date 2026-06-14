"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { NasmAnalyzer } = require("../language/nasmAnalyzer");

const fixturePath = path.join(__dirname, "fixtures", "semantic.asm");
const text = fs.readFileSync(fixturePath, "utf8");

const document = {
  uri: { fsPath: fixturePath },
  getText() {
    return text;
  }
};

const table = new NasmAnalyzer().analyzeDocument(document);

assert(table.lookup("macros", "SYS_WRITE"), "Expected SYS_WRITE macro constant");
assert(table.lookup("macros", "BUFFER_SIZE"), "Expected BUFFER_SIZE macro constant");
assert(table.lookup("macros", "LOCAL_COUNT"), "Expected LOCAL_COUNT assign macro");
assert(table.lookup("macros", "Person_size"), "Expected generated Person_size struct constant");
assert(table.lookup("macros", "INCLUDED_CONST"), "Expected included macro constant");

assert(table.lookup("macroFunctions", "PUSH_ALL"), "Expected PUSH_ALL macro function");
assert(table.lookup("macroFunctions", "MAKE_LABEL"), "Expected MAKE_LABEL macro function");
assert(table.lookup("macroFunctions", "BIT"), "Expected function-like define BIT");
assert(table.lookup("macroFunctions", "INCLUDED_MACRO"), "Expected included macro function");

assert(table.lookup("labels", "_start"), "Expected _start label");
assert(table.lookup("labels", "asm_hello"), "Expected asm_hello label");
assert(table.lookup("dataSymbols", "global_counter"), "Expected global_counter data symbol");
assert(table.lookup("localLabels", ".done"), "Expected .done local label");
assert(table.numericLabels.has("1"), "Expected numeric label 1");
assert(table.lookup("macroLocalLabels", "%%local_label"), "Expected macro-local label");

assert(table.lookup("globals", "asm_hello").attribute === "function", "Expected global function attribute");
assert(table.lookup("globals", "global_counter").attribute === "data", "Expected global data attribute");
assert(table.lookup("externs", "printf"), "Expected printf extern");

assert(table.lookup("sections", ".note.GNU-stack"), "Expected GNU stack section");
assert(table.lookup("structs", "Person"), "Expected Person struct");
assert(table.lookup("structFields", "Person.age"), "Expected Person.age field");

console.log("Analyzer semantic index test passed.");
