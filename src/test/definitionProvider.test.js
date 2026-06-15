"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { NasmAnalyzer } = require("../language/nasmAnalyzer");
const {
  createDeclarationProvider,
  createDefinitionProvider,
  getNasmSymbolAtPosition
} = require("../language/definitionProvider");

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(startLine, startCharacter, endLine, endCharacter) {
    this.start = new Position(startLine, startCharacter);
    this.end = new Position(endLine, endCharacter);
  }
}

class Location {
  constructor(uri, range) {
    this.uri = uri;
    this.range = range;
  }
}

class Uri {
  constructor(fsPath) {
    this.fsPath = fsPath;
  }

  toString() {
    return `file://${this.fsPath}`;
  }
}

class FixtureDocument {
  constructor(filePath, text) {
    this.uri = vscodeMock.Uri.file(filePath);
    this.lines = (text === undefined ? fs.readFileSync(filePath, "utf8") : text).split(/\r?\n/);
    this.lineCount = this.lines.length;
  }

  lineAt(line) {
    return { text: this.lines[line] };
  }

  getText() {
    return this.lines.join("\n");
  }
}

const vscodeMock = {
  Location,
  Position,
  Range,
  Uri: {
    file(filePath) {
      return new Uri(path.resolve(filePath));
    },
    parse(value) {
      return new Uri(value);
    }
  }
};

const root = path.resolve(__dirname, "..", "..");
const provider = createDefinitionProvider(vscodeMock, new NasmAnalyzer());
const declarationProvider = createDeclarationProvider(vscodeMock, new NasmAnalyzer());
const mainPath = path.join(root, "examples", "go-to-definition-test.asm");
const includePath = path.join(root, "examples", "GoToDefinition.inc");
const printStrPath = path.join(root, "examples", "PrintStr.inc");
const commentPath = path.join(root, "examples", "comment-ignore-test.asm");
const semanticFixturePath = path.join(root, "src", "test", "fixtures", "semantic.asm");
const mainDocument = new FixtureDocument(mainPath);
const includeDocument = new FixtureDocument(includePath);
const commentDocument = new FixtureDocument(commentPath);
const semanticDocument = new FixtureDocument(semanticFixturePath);

function definitionFor(document, token, lineIncludes, occurrence = 0) {
  return locationFor(provider, document, token, lineIncludes, occurrence);
}

function declarationFor(document, token, lineIncludes, occurrence = 0) {
  return locationFor(declarationProvider, document, token, lineIncludes, occurrence);
}

function locationFor(activeProvider, document, token, lineIncludes, occurrence = 0) {
  const line = lineContaining(document, lineIncludes);
  const character = nthIndexOf(document.lines[line], token, occurrence);
  assert(character >= 0, `Missing token ${token}`);
  const location = activeProvider.provideDefinition
    ? activeProvider.provideDefinition(document, new Position(line, character))
    : activeProvider.provideDeclaration(document, new Position(line, character));
  assert(location, `Expected location for ${token}`);
  return location;
}

function assertNoLocation(activeProvider, document, token, lineIncludes, occurrence = 0) {
  const line = lineContaining(document, lineIncludes);
  const character = nthIndexOf(document.lines[line], token, occurrence);
  assert(character >= 0, `Missing token ${token}`);
  const location = activeProvider.provideDefinition
    ? activeProvider.provideDefinition(document, new Position(line, character))
    : activeProvider.provideDeclaration(document, new Position(line, character));
  assert.strictEqual(location, undefined, `Did not expect navigation location for commented ${token}`);
}

function assertLocation(location, expectedPath, lineIncludes, token, lineOccurrence = 0) {
  const expectedLines = fs.readFileSync(expectedPath, "utf8").split(/\r?\n/);
  const matchingLines = expectedLines
    .map((text, index) => ({ text, index }))
    .filter((entry) => entry.text.includes(lineIncludes));
  const line = matchingLines[lineOccurrence] ? matchingLines[lineOccurrence].index : -1;
  assert(line >= 0, `Missing expected line containing ${lineIncludes}`);
  const character = expectedLines[line].indexOf(token);
  assert(character >= 0, `Missing expected token ${token}`);

  assert.strictEqual(path.resolve(location.uri.fsPath), path.resolve(expectedPath), "Expected target file");
  assert.strictEqual(location.range.start.line, line, "Expected target line");
  assert.strictEqual(location.range.start.character, character, "Expected target character");
}

function assertDocumentLocation(location, document, line, character) {
  assert.strictEqual(path.resolve(location.uri.fsPath), path.resolve(document.uri.fsPath), "Expected target document");
  assert.strictEqual(location.range.start.line, line, "Expected target line");
  assert.strictEqual(location.range.start.character, character, "Expected target character");
}

function lineContaining(document, text) {
  const line = document.lines.findIndex((value) => value.includes(text));
  assert(line >= 0, `Missing line containing ${text}`);
  return line;
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

function symbolAt(document, token, lineIncludes, offset = 0) {
  const line = lineContaining(document, lineIncludes);
  const character = document.lines[line].indexOf(token) + offset;
  assert(character >= offset, `Missing token ${token}`);
  return getNasmSymbolAtPosition(document, new Position(line, character));
}

assertLocation(definitionFor(mainDocument, "print_str_macro", "print_str_macro rdi, rsi"), includePath, "%macro print_str_macro 2", "print_str_macro");
assertLocation(declarationFor(mainDocument, "print_str_macro", "print_str_macro rdi, rsi"), includePath, "%macro print_str_macro 2", "print_str_macro");
assertLocation(definitionFor(includeDocument, "SYS_WRITE", "mov rax, SYS_WRITE"), includePath, "%define SYS_WRITE 1", "SYS_WRITE");
assertLocation(definitionFor(includeDocument, "STDOUT", "mov rdi, STDOUT"), includePath, "%define STDOUT 1", "STDOUT");
assertLocation(definitionFor(mainDocument, "local_function", "call local_function"), mainPath, "local_function:", "local_function");
assertLocation(definitionFor(mainDocument, ".loop", "jnz .loop"), mainPath, ".loop:", ".loop");
assertLocation(definitionFor(mainDocument, "1f", "jmp 1f"), mainPath, "1:", "1");
assertLocation(definitionFor(mainDocument, "1b", "jnz 1b"), mainPath, "1:", "1");
assertLocation(definitionFor(mainDocument, "printf", "call printf"), mainPath, "extern printf", "printf");
assertLocation(definitionFor(mainDocument, "Person", "istruc Person"), includePath, "struc Person", "Person");
assertLocation(definitionFor(mainDocument, "Person.age", "at Person.age, dd 21"), includePath, ".age: resd 1", ".age");
assertLocation(definitionFor(mainDocument, "asm_hello", "global asm_hello:function"), mainPath, "asm_hello:", "asm_hello", 1);
assertLocation(definitionFor(semanticDocument, "Person_size", "person_buffer: resb Person_size"), semanticFixturePath, "struc Person", "Person");
assertLocation(definitionFor(commentDocument, "SYS_WRITE", "mov rax, SYS_WRITE ;"), printStrPath, "%define SYS_WRITE 1", "SYS_WRITE");
assertLocation(definitionFor(commentDocument, "print_str_macro", "print_str_macro rdi, rsi ;"), printStrPath, "%macro print_str_macro 2", "print_str_macro");
assertLocation(definitionFor(commentDocument, "1b", "jnz 1b ;"), commentPath, "1:", "1");

assertNoLocation(provider, commentDocument, "print_str_macro", "; print_str_macro rdi, rsi");
assertNoLocation(provider, commentDocument, "SYS_WRITE", "; SYS_WRITE");
assertNoLocation(provider, commentDocument, "1b", "; jnz 1b");
assertNoLocation(provider, commentDocument, "SYS_WRITE", "mov rax, SYS_WRITE ;", 1);
assertNoLocation(provider, commentDocument, "print_str_macro", "print_str_macro rdi, rsi ;", 1);
assertNoLocation(provider, commentDocument, "1f", "jmp 1f ;", 1);
assertNoLocation(provider, commentDocument, "1b", "jnz 1b ;", 1);
assertNoLocation(declarationProvider, commentDocument, "SYS_WRITE", "mov rax, SYS_WRITE ;", 1);

const scopedLocalDocument = new FixtureDocument(
  path.join(root, "src", "test", "fixtures", "local-label-scope.virtual.asm"),
  [
    "section .text",
    "first:",
    ".loop:",
    "    nop",
    "second:",
    ".loop:",
    "    jnz .loop"
  ].join("\n")
);
assertDocumentLocation(definitionFor(scopedLocalDocument, ".loop", "jnz .loop"), scopedLocalDocument, 5, 0);

const macroLocalDocument = new FixtureDocument(
  path.join(root, "src", "test", "fixtures", "macro-local-scope.virtual.asm"),
  [
    "%macro TEST 0",
    "%%loop:",
    "    jmp %%loop ; first",
    "%endmacro",
    "%macro TEST2 0",
    "%%loop:",
    "    jmp %%loop ; second",
    "%endmacro"
  ].join("\n")
);
assertDocumentLocation(definitionFor(macroLocalDocument, "%%loop", "first"), macroLocalDocument, 1, 0);
assertDocumentLocation(definitionFor(macroLocalDocument, "%%loop", "second"), macroLocalDocument, 5, 0);

const numericLabelDocument = new FixtureDocument(
  path.join(root, "src", "test", "fixtures", "numeric-label-navigation.virtual.asm"),
  [
    "bits 64",
    "default rel",
    "",
    "section .text",
    "",
    "numeric_label_hover_test:",
    "    jmp 1f",
    "",
    "1:",
    "    dec rcx",
    "    jnz 1b",
    "",
    "    jmp 2f",
    "",
    "2:",
    "    cmp rax, 0",
    "    jne 2b",
    "",
    "    jmp 99f",
    "",
    "99:",
    "    jnz 99b",
    "    ret"
  ].join("\n")
);
assertDocumentLocation(definitionFor(numericLabelDocument, "1f", "jmp 1f"), numericLabelDocument, 8, 0);
assertDocumentLocation(definitionFor(numericLabelDocument, "1b", "jnz 1b"), numericLabelDocument, 8, 0);
assertDocumentLocation(definitionFor(numericLabelDocument, "2f", "jmp 2f"), numericLabelDocument, 14, 0);
assertDocumentLocation(definitionFor(numericLabelDocument, "2b", "jne 2b"), numericLabelDocument, 14, 0);
assertDocumentLocation(definitionFor(numericLabelDocument, "99f", "jmp 99f"), numericLabelDocument, 20, 0);
assertDocumentLocation(definitionFor(numericLabelDocument, "99b", "jnz 99b"), numericLabelDocument, 20, 0);

assert.strictEqual(symbolAt(mainDocument, ".loop", "jnz .loop").text, ".loop", "Expected local label token");
assert.strictEqual(symbolAt(macroLocalDocument, "%%loop", "jmp %%loop").text, "%%loop", "Expected macro-local token");
assert.strictEqual(symbolAt(mainDocument, "1f", "jmp 1f").text, "1f", "Expected numeric forward token");
assert.strictEqual(symbolAt(numericLabelDocument, "1:", "1:").kind, "numericLabelDefinition", "Expected numeric label definition token");
assert.strictEqual(symbolAt(numericLabelDocument, "1:", "1:", 1).text, "1:", "Expected numeric definition token on colon");
assert.strictEqual(symbolAt(numericLabelDocument, "99f", "jmp 99f", 2).text, "99f", "Expected numeric forward token on suffix");
assert.strictEqual(symbolAt(mainDocument, "Person.age", "at Person.age, dd 21", "Person.".length).text, "Person.age", "Expected struct field token");

const commaLine = lineContaining(mainDocument, "at Person.age, dd 21");
const commaCharacter = mainDocument.lines[commaLine].indexOf(",");
assert.strictEqual(getNasmSymbolAtPosition(mainDocument, new Position(commaLine, commaCharacter)), null, "Commas must not be part of symbol detection");

const inlineCommentDocument = new FixtureDocument(
  path.join(root, "src", "test", "fixtures", "comment-symbol.virtual.asm"),
  "mov rax, SYS_WRITE ; SYS_WRITE"
);
const commentLine = lineContaining(inlineCommentDocument, "; SYS_WRITE");
const commentCharacter = inlineCommentDocument.lines[commentLine].lastIndexOf("SYS_WRITE");
assert.strictEqual(
  getNasmSymbolAtPosition(inlineCommentDocument, new Position(commentLine, commentCharacter)),
  null,
  "Comment text should not produce definition symbols"
);

const fullCommentLine = lineContaining(commentDocument, "; print_str_macro rdi, rsi");
const fullCommentCharacter = commentDocument.lines[fullCommentLine].indexOf("print_str_macro");
assert.strictEqual(
  getNasmSymbolAtPosition(commentDocument, new Position(fullCommentLine, fullCommentCharacter)),
  null,
  "Full-line comment text should not produce definition symbols"
);

console.log("Definition provider navigation test passed.");
