"use strict";

const fs = require("fs");
const path = require("path");
const { getGrammarInstructionMnemonics } = require("../src/language/instructionMnemonics");

const root = path.resolve(__dirname, "..");
const docsPath = path.join(root, "data", "nasm-instructions.json");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${path.relative(root, filePath)} is not valid JSON: ${error.message}`);
  }
}

function main() {
  const grammarMnemonics = getGrammarInstructionMnemonics();
  const grammarSet = new Set(grammarMnemonics);
  const docs = readJson(docsPath);
  const documented = Object.keys(docs).sort();
  const documentedSet = new Set(documented);
  const missing = grammarMnemonics.filter((mnemonic) => !documentedSet.has(mnemonic));
  const extra = documented.filter((mnemonic) => !grammarSet.has(mnemonic));
  const aliasErrors = findAliasErrors(docs);

  console.log(`Total mnemonics in grammar: ${grammarMnemonics.length}`);
  console.log(`Total mnemonics documented: ${documented.length}`);
  printList("Missing documentation entries", missing);
  printList("Documentation entries without a grammar mnemonic", extra);
  printList("Invalid alias entries", aliasErrors);

  if (missing.length || aliasErrors.length) {
    process.exitCode = 1;
  }
}

function findAliasErrors(docs) {
  const errors = [];
  for (const [name, doc] of Object.entries(docs)) {
    if (!doc || !doc.aliasOf) {
      continue;
    }

    const target = String(doc.aliasOf).toLowerCase();
    if (target === name) {
      errors.push(`${name} aliases itself`);
    } else if (!docs[target]) {
      errors.push(`${name} aliases missing target ${target}`);
    }
  }

  return errors;
}

function printList(label, values) {
  console.log(`${label}: ${values.length}`);
  if (!values.length) {
    console.log("  none");
    return;
  }

  for (const value of values) {
    console.log(`  ${value}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
