const fs = require("fs");
const Module = require("module");
const path = require("path");

const root = path.resolve(__dirname, "..");
const fixturePath = path.resolve(root, "..", "test.asm");
const fixtureText = fs.readFileSync(fixturePath, "utf8");
const registeredHoverProviders = [];

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

class SemanticTokensLegend {
  constructor(tokenTypes, tokenModifiers) {
    this.tokenTypes = tokenTypes;
    this.tokenModifiers = tokenModifiers;
  }
}

class SemanticTokensBuilder {
  push() {}

  build() {
    return {};
  }
}

class FixtureDocument {
  constructor(text) {
    this.lines = text.split(/\r?\n/);
    this.lineCount = this.lines.length;
    this.languageId = "asm";
  }

  lineAt(line) {
    return { text: this.lines[line] };
  }

  getText(range) {
    if (!range) {
      return this.lines.join("\n");
    }

    if (range.start.line !== range.end.line) {
      throw new Error("FixtureDocument only supports single-line ranges");
    }

    return this.lines[range.start.line].slice(range.start.character, range.end.character);
  }

  getWordRangeAtPosition(position, pattern) {
    const line = this.lines[position.line];
    const regex = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let match;

    while ((match = regex.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (position.character >= start && position.character <= end) {
        return new Range(position.line, start, position.line, end);
      }

      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
    }

    return null;
  }
}

const vscodeMock = {
  Hover,
  MarkdownString,
  Position,
  Range,
  SemanticTokensBuilder,
  SemanticTokensLegend,
  languages: {
    registerDocumentSemanticTokensProvider(selector) {
      return { dispose() {}, selector };
    },
    registerHoverProvider(selector, provider) {
      registeredHoverProviders.push({ selector, provider });
      return { dispose() {} };
    }
  }
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "vscode") {
    return vscodeMock;
  }

  return originalLoad.call(this, request, parent, isMain);
};

const extension = require(path.join(root, "src/extension.js"));
extension.activate({ subscriptions: [] });

if (registeredHoverProviders.length !== 1) {
  throw new Error(`Expected exactly one hover provider, got ${registeredHoverProviders.length}`);
}

const { selector, provider } = registeredHoverProviders[0];
const selectorText = JSON.stringify(selector);
for (const expected of ["nasmx64", "asm", "**/*.asm"]) {
  if (!selectorText.includes(expected)) {
    throw new Error(`Hover selector should include ${expected}`);
  }
}

const document = new FixtureDocument(fixtureText);
const cases = [
  { token: "mov", lineIncludes: "mov rax, SYS_WRITE" },
  { token: "rax", lineIncludes: "mov rax, SYS_WRITE" },
  { token: "%define", lineIncludes: "%define SYS_WRITE" },
  { token: "SYS_WRITE", lineIncludes: "mov rax, SYS_WRITE" },
  { token: "BUFFER_SIZE", lineIncludes: "resb BUFFER_SIZE" },
  { token: "prologue", lineIncludes: "prologue 32" },
  { token: ".data", lineIncludes: "section .data" },
  { token: "db", lineIncludes: "message:" },
  { token: "qword", lineIncludes: "mov qword [counter]" }
];

for (const testCase of cases) {
  const line = document.lines.findIndex((text) => text.includes(testCase.lineIncludes));
  if (line === -1) {
    throw new Error(`Missing fixture line containing ${testCase.lineIncludes}`);
  }

  const character = document.lines[line].indexOf(testCase.token);
  if (character === -1) {
    throw new Error(`Missing token ${testCase.token} on fixture line ${line + 1}`);
  }

  const hover = provider.provideHover(document, new Position(line, character));
  const value = hover && hover.contents && hover.contents.value;
  if (!value || !value.includes("Category")) {
    throw new Error(`Expected hover Markdown for ${testCase.token}`);
  }
}

console.log("Runtime hover smoke test passed.");
