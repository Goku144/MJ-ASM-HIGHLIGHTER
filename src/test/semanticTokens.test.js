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

const operatorNumberPath = path.join(__dirname, "..", "..", "examples", "color-operator-number-test.asm");
const operatorNumberText = fs.readFileSync(operatorNumberPath, "utf8");
const operatorNumberLines = operatorNumberText.split(/\r?\n/);
const operatorNumberDocument = {
  uri: { fsPath: operatorNumberPath },
  getText() {
    return operatorNumberText;
  }
};
const operatorNumberTable = new NasmAnalyzer().analyzeDocument(operatorNumberDocument);
const operatorNumberTokens = collectSemanticTokens(operatorNumberDocument, operatorNumberTable);

function tokenAtIn(tokenList, sourceLines, tokenText, lineIncludes) {
  const line = sourceLines.findIndex((value) => value.includes(lineIncludes));
  assert(line >= 0, `Missing line containing ${lineIncludes}`);
  const start = sourceLines[line].indexOf(tokenText);
  assert(start >= 0, `Missing token ${tokenText} on line ${line + 1}`);
  return tokenList.find((token) => token.line === line && token.start === start && token.length === tokenText.length);
}

function assertExampleToken(tokenText, lineIncludes, type, modifiers = []) {
  const token = tokenAtIn(operatorNumberTokens, operatorNumberLines, tokenText, lineIncludes);
  assert(token, `Expected semantic token for ${tokenText}`);
  assert.strictEqual(token.type, type, `Expected ${tokenText} to be ${type}`);
  for (const modifier of modifiers) {
    assert(token.modifiers.includes(modifier), `Expected ${tokenText} to include ${modifier}`);
  }
}

assertExampleToken("align", "section .rodata align=16", "modifier");
assertExampleToken("=", "section .rodata align=16", "operator");
assertExampleToken("16", "section .rodata align=16", "number");
assertExampleToken("1.0", "vector_a: dd 1.0", "number");
assertExampleToken("0xABCDEF", "mov rbx, 0xABCDEF", "number");
assertExampleToken("101010b", "mov rcx, 101010b", "number");
assertExampleToken("-1", "mov rdx, -1", "number");
assertExampleToken("8", "counter + rcx * 8", "number");

const commentPath = path.join(__dirname, "..", "..", "examples", "comment-ignore-test.asm");
const commentText = fs.readFileSync(commentPath, "utf8");
const commentLines = commentText.split(/\r?\n/);
const commentDocument = {
  uri: { fsPath: commentPath },
  getText() {
    return commentText;
  }
};
const commentTable = new NasmAnalyzer().analyzeDocument(commentDocument);
const commentTokens = collectSemanticTokens(commentDocument, commentTable);

function tokenAtOccurrence(tokenList, sourceLines, tokenText, lineIncludes, occurrence = 0) {
  const line = sourceLines.findIndex((value) => value.includes(lineIncludes));
  assert(line >= 0, `Missing line containing ${lineIncludes}`);
  const start = nthIndexOf(sourceLines[line], tokenText, occurrence);
  assert(start >= 0, `Missing token ${tokenText} occurrence ${occurrence} on line ${line + 1}`);
  return tokenList.find((token) => token.line === line && token.start === start && token.length === tokenText.length);
}

function assertCommentToken(tokenText, lineIncludes, occurrence = 0) {
  const token = tokenAtOccurrence(commentTokens, commentLines, tokenText, lineIncludes, occurrence);
  assert(!token, `Did not expect semantic token for commented ${tokenText}`);
}

function assertLiveCommentExampleToken(tokenText, lineIncludes, type, modifiers = [], occurrence = 0) {
  const token = tokenAtOccurrence(commentTokens, commentLines, tokenText, lineIncludes, occurrence);
  assert(token, `Expected semantic token for live ${tokenText}`);
  assert.strictEqual(token.type, type, `Expected ${tokenText} to be ${type}`);
  for (const modifier of modifiers) {
    assert(token.modifiers.includes(modifier), `Expected ${tokenText} to include ${modifier}`);
  }
}

function nthIndexOf(text, token, occurrence) {
  let from = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    const found = text.indexOf(token, from);
    if (found < 0 || index === occurrence) {
      return found;
    }
    from = found + token.length;
  }
  return -1;
}

assertLiveCommentExampleToken("SYS_WRITE", "mov rax, SYS_WRITE ;", "macro", ["readonly"]);
assertLiveCommentExampleToken("print_str_macro", "print_str_macro rdi, rsi ;", "macro");
assertLiveCommentExampleToken("1f", "jmp 1f ;", "variable", ["numericLabel"]);
assertLiveCommentExampleToken("1b", "jnz 1b ;", "variable", ["numericLabel"]);

assertCommentToken("print_str_macro", "; print_str_macro rdi, rsi");
assertCommentToken("SYS_WRITE", "; SYS_WRITE");
assertCommentToken("mov", "; mov rax, 1");
assertCommentToken("rax", "; mov rax, 1");
assertCommentToken("syscall", "; syscall");
assertCommentToken("1b", "; jnz 1b");
assertCommentToken("SYS_WRITE", "mov rax, SYS_WRITE ;", 1);
assertCommentToken("print_str_macro", "print_str_macro rdi, rsi ;", 1);
assertCommentToken("1f", "jmp 1f ;", 1);
assertCommentToken("1b", "jnz 1b ;", 1);

console.log("Semantic token classification test passed.");
