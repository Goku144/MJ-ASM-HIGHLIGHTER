"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { NasmAnalyzer, splitCodeAndComment } = require("../language/nasmAnalyzer");

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

const splitDouble = splitCodeAndComment('db "hello; still string", 0 ; real comment');
assert.strictEqual(splitDouble.code, 'db "hello; still string", 0 ', "Semicolon inside double quotes must stay in code");
assert.strictEqual(splitDouble.comment, "; real comment", "Expected trailing comment after double-quoted string");

const splitSingle = splitCodeAndComment("db 'hello; still string', 0 ; real comment");
assert.strictEqual(splitSingle.code, "db 'hello; still string', 0 ", "Semicolon inside single quotes must stay in code");
assert.strictEqual(splitSingle.comment, "; real comment", "Expected trailing comment after single-quoted string");

const commentOnlyText = [
  "%define LIVE_CONST 1",
  "%define STRING_CONST \"hello; still string\"",
  "live_label:",
  "    mov rax, LIVE_CONST ; COMMENTED_CONST",
  "; %define COMMENTED_CONST 99",
  "; %macro COMMENTED_MACRO 0",
  "; %endmacro",
  "; global commented_global:function",
  "; extern commented_extern",
  "; commented_label:",
  "; 7:",
  "; .commented_local:",
  "; %%commented_macro_local:"
].join("\n");
const commentOnlyDocument = {
  uri: { fsPath: path.join(__dirname, "fixtures", "comment-index.virtual.asm") },
  getText() {
    return commentOnlyText;
  }
};
const commentOnlyTable = new NasmAnalyzer().analyzeDocument(commentOnlyDocument);

assert(commentOnlyTable.lookup("macros", "LIVE_CONST"), "Expected live macro constant");
assert(commentOnlyTable.lookup("macros", "STRING_CONST"), "Expected string macro with semicolon");
assert(commentOnlyTable.lookup("labels", "live_label"), "Expected live label");
assert(!commentOnlyTable.lookup("macros", "COMMENTED_CONST"), "Commented macro constant must not be indexed");
assert(!commentOnlyTable.lookup("macroFunctions", "COMMENTED_MACRO"), "Commented macro function must not be indexed");
assert(!commentOnlyTable.lookup("globals", "commented_global"), "Commented global must not be indexed");
assert(!commentOnlyTable.lookup("externs", "commented_extern"), "Commented extern must not be indexed");
assert(!commentOnlyTable.lookup("labels", "commented_label"), "Commented label must not be indexed");
assert(!commentOnlyTable.numericLabels.has("7"), "Commented numeric label must not be indexed");
assert(!commentOnlyTable.lookup("localLabels", ".commented_local"), "Commented local label must not be indexed");
assert(!commentOnlyTable.lookup("macroLocalLabels", "%%commented_macro_local"), "Commented macro-local label must not be indexed");

console.log("Analyzer semantic index test passed.");
