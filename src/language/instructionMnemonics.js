"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_GRAMMAR_PATH = path.resolve(__dirname, "..", "..", "syntaxes", "nasm-x64.tmLanguage.json");

function getGrammarInstructionMnemonics(grammarPath = DEFAULT_GRAMMAR_PATH) {
  const grammar = JSON.parse(fs.readFileSync(grammarPath, "utf8"));
  return extractInstructionMnemonics(grammar);
}

function extractInstructionMnemonics(grammar) {
  const patterns =
    grammar &&
    grammar.repository &&
    grammar.repository.instructions &&
    Array.isArray(grammar.repository.instructions.patterns)
      ? grammar.repository.instructions.patterns
      : [];
  const mnemonics = new Set();

  for (const pattern of patterns) {
    if (!pattern || typeof pattern.match !== "string") {
      continue;
    }

    for (const alternative of splitTopLevelAlternatives(extractInstructionAlternation(pattern.match))) {
      for (const mnemonic of expandAlternative(alternative)) {
        mnemonics.add(mnemonic.toLowerCase());
      }
    }
  }

  return [...mnemonics].sort();
}

function extractInstructionAlternation(matchPattern) {
  const match = matchPattern.match(/^\(\?i\)\\b\(\?:(.*)\)\\b$/);
  if (!match) {
    throw new Error(`Unsupported instruction grammar pattern: ${matchPattern}`);
  }
  return match[1];
}

function splitTopLevelAlternatives(source) {
  const alternatives = [];
  let depth = 0;
  let bracketDepth = 0;
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "[" && bracketDepth === 0) {
      bracketDepth = 1;
      continue;
    }
    if (char === "]" && bracketDepth === 1) {
      bracketDepth = 0;
      continue;
    }
    if (bracketDepth) {
      continue;
    }
    if (source.startsWith("(?:", index)) {
      depth += 1;
      index += 2;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      continue;
    }
    if (char === "|" && depth === 0) {
      alternatives.push(source.slice(start, index));
      start = index + 1;
    }
  }

  alternatives.push(source.slice(start));
  return alternatives.filter(Boolean);
}

function expandAlternative(source) {
  const parser = new PatternParser(source);
  const expanded = parser.parseSequence();
  parser.assertDone();
  return expanded;
}

class PatternParser {
  constructor(source) {
    this.source = source;
    this.index = 0;
  }

  parseSequence(stopChar) {
    let variants = [""];

    while (this.index < this.source.length && this.source[this.index] !== stopChar) {
      let atom = this.parseAtom();

      if (this.source[this.index] === "?") {
        this.index += 1;
        atom = ["", ...atom];
      } else if (this.source[this.index] === "+" || this.source[this.index] === "*") {
        throw new Error(`Open-ended instruction grammar token in "${this.source}"`);
      }

      variants = combine(variants, atom);
    }

    return variants;
  }

  parseAtom() {
    if (this.source.startsWith("(?:", this.index)) {
      this.index += 3;
      const bodyStart = this.index;
      const bodyEnd = findGroupEnd(this.source, bodyStart);
      const body = this.source.slice(bodyStart, bodyEnd);
      this.index = bodyEnd + 1;
      return splitTopLevelAlternatives(body).flatMap((alternative) => expandAlternative(alternative));
    }

    const char = this.source[this.index];
    if (char === "[") {
      return this.parseCharacterClass();
    }
    if (char === "\\" || char === "(" || char === ")" || char === "|" || char === "]") {
      throw new Error(`Unsupported instruction grammar token "${char}" in "${this.source}"`);
    }

    this.index += 1;
    return [char];
  }

  parseCharacterClass() {
    const end = this.source.indexOf("]", this.index + 1);
    if (end === -1) {
      throw new Error(`Unclosed character class in "${this.source}"`);
    }

    const body = this.source.slice(this.index + 1, end);
    if (body.includes("-") || body.includes("^") || body.includes("\\")) {
      throw new Error(`Unsupported character class [${body}] in "${this.source}"`);
    }

    this.index = end + 1;
    return [...body];
  }

  assertDone() {
    if (this.index !== this.source.length) {
      throw new Error(`Unexpected instruction grammar suffix in "${this.source}"`);
    }
  }
}

function findGroupEnd(source, start) {
  let depth = 1;
  let bracketDepth = 0;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "[" && !bracketDepth) {
      bracketDepth = 1;
      continue;
    }
    if (char === "]" && bracketDepth) {
      bracketDepth = 0;
      continue;
    }
    if (bracketDepth) {
      continue;
    }
    if (source.startsWith("(?:", index)) {
      depth += 1;
      index += 2;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error(`Unclosed group in "${source}"`);
}

function combine(prefixes, suffixes) {
  const combined = [];
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      combined.push(prefix + suffix);
    }
  }
  return combined;
}

module.exports = {
  DEFAULT_GRAMMAR_PATH,
  extractInstructionMnemonics,
  getGrammarInstructionMnemonics,
  splitTopLevelAlternatives,
  expandAlternative
};
