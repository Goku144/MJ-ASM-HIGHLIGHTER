"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { NasmAnalyzer } = require("../language/nasmAnalyzer");
const { collectSemanticTokens, tokenTypes, tokenModifiers } = require("../language/semanticTokens");

const fixturePath = path.join(__dirname, "fixtures", "semantic.asm");
const text = fs.readFileSync(fixturePath, "utf8");
const lines = text.split(/\r?\n/);
const document = {
  uri: { fsPath: fixturePath },
  getText() {
    return text;
  }
};

const table = new NasmAnalyzer().analyzeDocument(document);
const tokens = collectSemanticTokens(document, table);

function tokenAt(tokenText, lineIncludes) {
  const line = lines.findIndex((value) => value.includes(lineIncludes));
  assert(line >= 0, `Missing fixture line containing ${lineIncludes}`);
  const start = lines[line].indexOf(tokenText);
  assert(start >= 0, `Missing token ${tokenText} on line ${line + 1}`);
  return tokens.find((token) => token.line === line && token.start === start && token.length === tokenText.length);
}

function assertToken(tokenText, lineIncludes, type, modifiers = []) {
  const token = tokenAt(tokenText, lineIncludes);
  assert(token, `Expected semantic token for ${tokenText}`);
  assert.strictEqual(token.type, type, `Expected ${tokenText} to be ${type}`);
  for (const modifier of modifiers) {
    assert(token.modifiers.includes(modifier), `Expected ${tokenText} to include ${modifier}`);
  }
}

assert(tokenTypes.includes("macro"), "Legend should include standard macro token type");
assert(tokenTypes.includes("struct"), "Legend should include standard struct token type");
assert(tokenModifiers.includes("numericLabel"), "Legend should include numericLabel modifier");
assert(tokenModifiers.includes("macroLocal"), "Legend should include macroLocal modifier");

assertToken("SYS_WRITE", "mov rax, SYS_WRITE", "macro", ["readonly"]);
assertToken("PUSH_ALL", "PUSH_ALL", "macro");
assertToken("INCLUDED_MACRO", "INCLUDED_MACRO LOCAL_COUNT", "macro");
assertToken("1f", "jmp 1f", "variable", ["numericLabel"]);
assertToken("1b", "jnz 1b", "variable", ["numericLabel"]);
assertToken(".done", "je .done", "function", ["local"]);
assertToken("Person", "Person.age", "struct");
assertToken(".age", "Person.age", "property");
assertToken("asm_hello", "global asm_hello:function", "function", ["exported"]);
assertToken("global_counter", "global global_counter:data", "variable", ["exported"]);
assertToken("printf", "extern printf", "function", ["external"]);
assertToken(".note.GNU-stack", "section .note.GNU-stack", "namespace", ["section"]);
assertToken("noexec", "noalloc noexec", "modifier");

const crossFilePath = path.join(__dirname, "..", "..", "examples", "cross-file-macro-test.asm");
const crossFileText = fs.readFileSync(crossFilePath, "utf8");
const crossFileLines = crossFileText.split(/\r?\n/);
const crossFileDocument = {
  uri: { fsPath: crossFilePath },
  getText() {
    return crossFileText;
  }
};
const crossFileTable = new NasmAnalyzer().analyzeDocument(crossFileDocument);
const crossFileTokens = collectSemanticTokens(crossFileDocument, crossFileTable);
const macroLine = crossFileLines.findIndex((value) => value.includes("print_str_macro rdi, rsi"));
const macroStart = crossFileLines[macroLine].indexOf("print_str_macro");
const macroToken = crossFileTokens.find(
  (token) => token.line === macroLine && token.start === macroStart && token.length === "print_str_macro".length
);
assert(macroToken, "Expected included print_str_macro semantic token");
assert.strictEqual(macroToken.type, "macro", "Expected included print_str_macro to be macro token");

console.log("Semantic token classification test passed.");
