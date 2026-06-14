"use strict";

const tokenTypes = [
  "namespace",
  "type",
  "struct",
  "parameter",
  "variable",
  "property",
  "function",
  "macro",
  "keyword",
  "modifier",
  "number",
  "string",
  "operator",
  "instruction",
  "register",
  "section",
  "macroConstant"
];

const tokenModifiers = [
  "declaration",
  "definition",
  "readonly",
  "static",
  "global",
  "local",
  "numericLabel",
  "macroLocal",
  "section",
  "data",
  "code",
  "external",
  "exported"
];

const tokenTypeIndex = new Map(tokenTypes.map((type, index) => [type, index]));
const tokenModifierIndex = new Map(tokenModifiers.map((modifier, index) => [modifier, index]));

function encodeTokenModifiers(modifiers) {
  return modifiers.reduce((bits, modifier) => {
    const index = tokenModifierIndex.get(modifier);
    return index === undefined ? bits : bits | (1 << index);
  }, 0);
}

module.exports = {
  tokenTypes,
  tokenModifiers,
  tokenTypeIndex,
  tokenModifierIndex,
  encodeTokenModifiers
};
