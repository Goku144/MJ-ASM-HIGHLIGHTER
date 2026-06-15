"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { NasmAnalyzer } = require("../language/nasmAnalyzer");
const { createHoverProvider, getInstructionFallbackHoverInfo } = require("../language/hoverProvider");

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Hover {
  constructor(contents, range) {
    this.contents = contents;
    this.range = range;
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
  constructor(filePath, text) {
    this.uri = { fsPath: filePath };
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
  Hover,
  MarkdownString
};

function hoverFor(document, token, lineIncludes, offset = 0) {
  const line = document.lines.findIndex((text) => text.includes(lineIncludes));
  assert(line >= 0, `Missing line containing ${lineIncludes}`);
  const start = document.lines[line].indexOf(token);
  assert(start >= 0, `Missing token ${token}`);
  const character = start + offset;
  const hover = provider.provideHover(document, new Position(line, character));
  assert(hover && hover.contents && hover.contents.value, `Expected hover for ${token}`);
  return hover.contents.value;
}

function hoverAt(document, token, lineIncludes, occurrence = 0, offset = 0) {
  const line = document.lines.findIndex((text) => text.includes(lineIncludes));
  assert(line >= 0, `Missing line containing ${lineIncludes}`);
  const start = nthIndexOf(document.lines[line], token, occurrence);
  assert(start >= 0, `Missing token ${token} occurrence ${occurrence}`);
  return provider.provideHover(document, new Position(line, start + offset));
}

function assertNoHover(document, token, lineIncludes, occurrence = 0, offset = 0) {
  const hover = hoverAt(document, token, lineIncludes, occurrence, offset);
  assert(!hover || !hover.contents || !hover.contents.value, `Did not expect hover for commented ${token}`);
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

const root = path.resolve(__dirname, "..", "..");
const provider = createHoverProvider(vscodeMock, new NasmAnalyzer());
const crossFileDocument = new FixtureDocument(path.join(root, "examples", "cross-file-macro-test.asm"));
const includeDocument = new FixtureDocument(path.join(root, "examples", "PrintStr.inc"));
const operatorNumberDocument = new FixtureDocument(path.join(root, "examples", "color-operator-number-test.asm"));
const commentDocument = new FixtureDocument(path.join(root, "examples", "comment-ignore-test.asm"));
const numericLabelDocument = new FixtureDocument(
  path.join(root, "src", "test", "fixtures", "numeric-label-hover.virtual.asm"),
  [
    "bits 64",
    "default rel",
    "",
    "section .text",
    "",
    "global numeric_label_hover_test:function",
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

const liveCommentSyscallHover = hoverFor(commentDocument, "SYS_WRITE", "mov rax, SYS_WRITE ;");
assert(liveCommentSyscallHover.includes("NASM constant: SYS_WRITE"), "Expected real SYS_WRITE hover before inline comment");

const liveCommentMacroHover = hoverFor(commentDocument, "print_str_macro", "print_str_macro rdi, rsi ;");
assert(liveCommentMacroHover.includes("NASM macro: print_str_macro"), "Expected real macro hover before inline comment");

const liveCommentNumericHover = hoverFor(commentDocument, "1b", "jnz 1b ;");
assert(liveCommentNumericHover.includes("NASM numeric label reference: `1b`"), "Expected real numeric label hover before inline comment");

assertNoHover(commentDocument, "print_str_macro", "; print_str_macro rdi, rsi");
assertNoHover(commentDocument, "SYS_WRITE", "; SYS_WRITE");
assertNoHover(commentDocument, "mov", "; mov rax, 1");
assertNoHover(commentDocument, "rax", "; mov rax, 1");
assertNoHover(commentDocument, "syscall", "; syscall");
assertNoHover(commentDocument, "1b", "; jnz 1b");
assertNoHover(commentDocument, "SYS_WRITE", "mov rax, SYS_WRITE ;", 1);
assertNoHover(commentDocument, "print_str_macro", "print_str_macro rdi, rsi ;", 1);
assertNoHover(commentDocument, "1f", "jmp 1f ;", 1);
assertNoHover(commentDocument, "1b", "jnz 1b ;", 1);

const leaveHover = hoverFor(operatorNumberDocument, "leave", "leave");
assert(leaveHover.includes("`leave` — Destroy stack frame"), "Expected leave hover title");
assert(leaveHover.includes("mov rsp, rbp"), "Expected leave equivalent code");
assert(leaveHover.includes("Usually followed by `ret`"), "Expected leave local notes");

const alignHover = hoverFor(operatorNumberDocument, "align", "section .rodata align=16");
assert(alignHover.includes("Alignment directive / section attribute"), "Expected align section-attribute hover");
assert(alignHover.includes("section .data align=16"), "Expected align section declaration example");
assert(alignHover.includes("align 16"), "Expected align standalone directive example");

const numericDefinitionHover = hoverFor(numericLabelDocument, "1:", "1:");
assert(numericDefinitionHover.includes("NASM numeric label: `1:`"), "Expected numeric label definition hover");
assert(numericDefinitionHover.includes("`1f` jumps forward"), "Expected forward reference explanation");
assert(numericDefinitionHover.includes("`1b` jumps backward"), "Expected backward reference explanation");

const numericDefinitionColonHover = hoverFor(numericLabelDocument, "1:", "1:", 1);
assert(numericDefinitionColonHover.includes("NASM numeric label: `1:`"), "Expected hover on numeric label colon");

const numericForwardHover = hoverFor(numericLabelDocument, "1f", "jmp 1f");
assert(numericForwardHover.includes("NASM numeric label reference: `1f`"), "Expected numeric forward reference hover");
assert(numericForwardHover.includes("Resolved target: `1:`"), "Expected 1f resolved target");

const numericForwardSuffixHover = hoverFor(numericLabelDocument, "1f", "jmp 1f", 1);
assert(numericForwardSuffixHover.includes("NASM numeric label reference: `1f`"), "Expected hover on f in 1f");

const numericBackwardHover = hoverFor(numericLabelDocument, "1b", "jnz 1b");
assert(numericBackwardHover.includes("NASM numeric label reference: `1b`"), "Expected numeric backward reference hover");
assert(numericBackwardHover.includes("Resolved target: `1:`"), "Expected 1b resolved target");

const numericBackwardSuffixHover = hoverFor(numericLabelDocument, "1b", "jnz 1b", 1);
assert(numericBackwardSuffixHover.includes("NASM numeric label reference: `1b`"), "Expected hover on b in 1b");

const numericTwoForwardHover = hoverFor(numericLabelDocument, "2f", "jmp 2f");
assert(numericTwoForwardHover.includes("Resolved target: `2:`"), "Expected 2f resolved target");

const numericTwoBackwardHover = hoverFor(numericLabelDocument, "2b", "jne 2b");
assert(numericTwoBackwardHover.includes("Resolved target: `2:`"), "Expected 2b resolved target");

const numericNinetyNineForwardHover = hoverFor(numericLabelDocument, "99f", "jmp 99f");
assert(numericNinetyNineForwardHover.includes("Resolved target: `99:`"), "Expected 99f resolved target");

const numericNinetyNineBackwardHover = hoverFor(numericLabelDocument, "99b", "jnz 99b");
assert(numericNinetyNineBackwardHover.includes("Resolved target: `99:`"), "Expected 99b resolved target");

for (const attribute of ["noalloc", "noexec", "nowrite", "progbits"]) {
  const attributeHover = hoverFor(operatorNumberDocument, attribute, ".note.GNU-stack");
  assert(attributeHover.includes("Section Attribute"), `Expected ${attribute} section attribute category`);
}

const fallbackHover = hoverFor(operatorNumberDocument, "qword", "mov rax, qword [fs:0x28]");
assert(!fallbackHover.includes("Local detailed documentation for this instruction has not been added yet."), "Expected qword to use size docs, not instruction fallback");

const localInstructionDocument = new FixtureDocument(path.join(root, "examples", "demo.asm"));
const movapsHover = hoverFor(localInstructionDocument, "movaps", "movaps xmm0");
assert(movapsHover.includes("Moves aligned packed single-precision"), "Expected movaps local instruction hover");
assert(
  !movapsHover.includes("Detailed local documentation for this mnemonic is missing."),
  "Expected movaps to avoid instruction fallback"
);

const fallbackInfo = getInstructionFallbackHoverInfo("movaps");
assert(fallbackInfo.description.includes("Recognized NASM/x86-64 instruction."), "Expected fallback wording");
assert(fallbackInfo.description.includes("data/nasm-instructions.json"), "Expected fallback docs path");

console.log("Hover provider cross-file macro test passed.");
