"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { NasmAnalyzer } = require("../language/nasmAnalyzer");
const { createHoverProvider } = require("../language/hoverProvider");

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Hover {
  constructor(contents) {
    this.contents = contents;
  }
}

class MarkdownString {
  constructor(value = "") {
    this.value = value || "";
  }

  appendMarkdown(value) {
    this.value += value;
    return this;
  }

  appendCodeblock(value, language = "") {
    this.value += `\n\`\`\`${language}\n${value}\n\`\`\`\n\n`;
    return this;
  }
}

class FixtureDocument {
  constructor(filePath) {
    this.uri = { fsPath: filePath };
    this.lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
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
  Hover,
  MarkdownString
};

function hoverFor(document, token, lineIncludes) {
  const line = document.lines.findIndex((text) => text.includes(lineIncludes));
  assert(line >= 0, `Missing line containing ${lineIncludes}`);
  const character = document.lines[line].indexOf(token);
  assert(character >= 0, `Missing token ${token}`);
  const hover = provider.provideHover(document, new Position(line, character));
  assert(hover && hover.contents && hover.contents.value, `Expected hover for ${token}`);
  return hover.contents.value;
}

const root = path.resolve(__dirname, "..", "..");
const provider = createHoverProvider(vscodeMock, new NasmAnalyzer());
const crossFileDocument = new FixtureDocument(path.join(root, "examples", "cross-file-macro-test.asm"));
const includeDocument = new FixtureDocument(path.join(root, "examples", "PrintStr.inc"));

const macroHover = hoverFor(crossFileDocument, "print_str_macro", "print_str_macro rdi, rsi");
assert(macroHover.includes("NASM macro: print_str_macro"), "Expected included macro title");
assert(macroHover.includes("PrintStr.inc:4"), "Expected included macro source location");
assert(macroHover.includes("`%1` = `rdi`"), "Expected first argument mapping");
assert(macroHover.includes("`%2` = `rsi`"), "Expected second argument mapping");
assert(macroHover.includes("mov rsi, rdi"), "Expected substituted first macro argument");
assert(macroHover.includes("mov rdx, rsi"), "Expected substituted second macro argument");

const syscallConstantHover = hoverFor(includeDocument, "SYS_WRITE", "mov rax, SYS_WRITE");
assert(syscallConstantHover.includes("Value:"), "Expected constant value section");
assert(syscallConstantHover.includes("Linux syscall: write"), "Expected syscall detail");
assert(syscallConstantHover.includes("rdi = fd"), "Expected syscall register mapping");

const registerHover = hoverFor(includeDocument, "rdi", "mov rdi, STDOUT");
assert(registerHover.includes("System V AMD64"), "Expected function-call role");
assert(registerHover.includes("Linux syscall"), "Expected syscall role");

const syscallHover = hoverFor(includeDocument, "syscall", "syscall");
assert(syscallHover.includes("r10"), "Expected Linux syscall argument register detail");
assert(syscallHover.includes("return value"), "Expected syscall return-value detail");

console.log("Hover provider cross-file macro test passed.");
