"use strict";

const {
  tokenTypes,
  tokenModifiers,
  tokenTypeIndex,
  encodeTokenModifiers
} = require("./tokenTypes");
const {
  IDENTIFIER,
  IDENTIFIER_SOURCE,
  classifySection,
  parseMacroConstant,
  parseMultiLineMacro,
  parseSection,
  parseStructStart,
  parseSymbolDirective,
  scanLine
} = require("./nasmAnalyzer");
const { getGrammarInstructionMnemonics } = require("./instructionMnemonics");

const numberPattern =
  /(?<![A-Za-z0-9_$?@])-?(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?\b|(?<![A-Za-z0-9_$?@])-?\d+[eE][+-]?\d+\b|(?<![A-Za-z0-9_$?@])-?(?:0x[0-9A-Fa-f]+|\$[0-9A-Fa-f]+|[0-9][0-9A-Fa-f]*h)\b|(?<![A-Za-z0-9_$?@])-?(?:0b[01]+|[01]+b)\b|(?<![A-Za-z0-9_$?@])-?(?:0o[0-7]+|[0-7]+o|[0-7]+q|0[0-7]+)\b|(?<![A-Za-z0-9_$?@])-?\d+\b/g;

const PREPROCESSOR_DIRECTIVES = new Set([
  "define",
  "xdefine",
  "idefine",
  "assign",
  "iassign",
  "defstr",
  "idefstr",
  "deftok",
  "ideftok",
  "undef",
  "macro",
  "imacro",
  "endmacro",
  "exitmacro",
  "rep",
  "endrep",
  "if",
  "ifn",
  "ifdef",
  "ifndef",
  "ifmacro",
  "ifnmacro",
  "ifctx",
  "ifnctx",
  "ifidn",
  "ifnidn",
  "ifidni",
  "ifnidni",
  "ifid",
  "ifnid",
  "ifnum",
  "ifnnum",
  "ifstr",
  "ifnstr",
  "iftoken",
  "ifntoken",
  "ifempty",
  "ifnempty",
  "elif",
  "elifn",
  "elifdef",
  "elifndef",
  "elifmacro",
  "elifnmacro",
  "elifctx",
  "elifnctx",
  "elifidn",
  "elifnidn",
  "elifidni",
  "elifnidni",
  "elifid",
  "elifnid",
  "elifnum",
  "elifnnum",
  "elifstr",
  "elifnstr",
  "eliftoken",
  "elifntoken",
  "elifempty",
  "elifnempty",
  "else",
  "endif",
  "include",
  "use",
  "error",
  "warning",
  "fatal",
  "push",
  "pop",
  "rotate",
  "strlen",
  "substr",
  "local",
  "line"
]);

const DIRECTIVES = new Set([
  "section",
  "segment",
  "global",
  "extern",
  "default",
  "bits",
  "cpu",
  "org",
  "absolute",
  "common",
  "group",
  "import",
  "export",
  "library",
  "module",
  "safeseh",
  "debug",
  "warning",
  "list",
  "nolist"
]);

const DATA_DECLARATIONS = new Set([
  "db",
  "dw",
  "dd",
  "dq",
  "dt",
  "do",
  "dy",
  "dz",
  "resb",
  "resw",
  "resd",
  "resq",
  "rest",
  "reso",
  "resy",
  "resz",
  "equ",
  "times",
  "struc",
  "endstruc",
  "istruc",
  "iend",
  "at",
  "align",
  "alignb"
]);

const SIZE_SPECIFIERS = new Set(["byte", "word", "dword", "qword", "tword", "oword", "yword", "zword"]);
const ADDRESSING_MODIFIERS = new Set(["ptr", "short", "near", "far", "rel", "abs", "strict", "nosplit", "wrt"]);
const INSTRUCTION_PREFIXES = new Set(["lock", "rep", "repe", "repne", "repz", "repnz"]);
const SECTION_ALIGN_ATTRIBUTE = /\b(align)(\s*)(=)(\s*)(\d+)\b/gi;
const SECTION_ATTRIBUTE = /\b(?:noalloc|noexec|nowrite|progbits|alloc|exec|write|nobits)\b/gi;

const REGISTERS =
  /^(?:r(?:ax|bx|cx|dx|si|di|bp|sp|ip)|e(?:ax|bx|cx|dx|si|di|bp|sp|ip)|[abcd][hl]|[abcd]x|[sb]p|[sd]i|ip|spl|bpl|sil|dil|r(?:[8-9]|1[0-5])(?:d|w|b)?|cs|ds|es|fs|gs|ss|cr[02348]|dr[0-3]|dr6|dr7|mm[0-7]|(?:xmm|ymm|zmm)(?:[0-9]|[12][0-9]|3[01])|st[0-7]|k[0-7]|bnd[0-3])$/i;

const INSTRUCTIONS = new Set(getGrammarInstructionMnemonics());

function createSemanticTokensProvider(vscode, analyzer) {
  const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
  const emitter = typeof vscode.EventEmitter === "function" ? new vscode.EventEmitter() : null;

  const provider = {
    legend,
    onDidChangeSemanticTokens: emitter ? emitter.event : undefined,
    refresh() {
      if (emitter) {
        emitter.fire();
      }
    },
    provideDocumentSemanticTokens(document) {
      const table = analyzer.analyzeDocument(document);
      const builder = new vscode.SemanticTokensBuilder(legend);
      const allTokens = collectSemanticTokens(document, table);

      allTokens
        .sort((left, right) => left.line - right.line || left.start - right.start || left.length - right.length)
        .forEach((token) => {
          const tokenType = tokenTypeIndex.get(token.type);
          if (tokenType !== undefined) {
            builder.push(token.line, token.start, token.length, tokenType, encodeTokenModifiers(token.modifiers || []));
          }
        });

      return builder.build();
    }
  };

  return provider;
}

function collectSemanticTokens(document, table) {
  const text = typeof document.getText === "function" ? document.getText() : readDocumentText(document);
  const lines = text.split(/\r?\n/);
  const allTokens = [];
  let currentSection = ".text";
  let currentSectionKind = "code";
  let currentStruct = null;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const textLine = lines[lineNumber];
    const lineTokens = [];
    const occupied = [];
    const state = scanLine(textLine);
    const code = textLine.slice(0, state.commentStart);

    const add = (start, length, type, modifiers = []) => {
      if (start >= state.commentStart || length <= 0 || intersectsRanges(start, start + length, state.stringRanges)) {
        return false;
      }
      return addToken(lineTokens, occupied, lineNumber, start, length, type, modifiers);
    };

    for (const stringRange of state.stringRanges) {
      if (stringRange.start < state.commentStart) {
        addToken(
          lineTokens,
          occupied,
          lineNumber,
          stringRange.start,
          Math.min(stringRange.end, state.commentStart) - stringRange.start,
          "string"
        );
      }
    }

    const section = parseSection(code);
    if (section) {
      const directive = code.slice(0, section.index).match(/\b(section|segment)\b/i);
      if (directive) {
        add(directive.index, directive[1].length, "keyword");
      }
      add(section.index, section.name.length, "namespace", ["section", classifySection(section.name)]);
      currentSection = section.name;
      currentSectionKind = classifySection(section.name);
      addSectionAttributes(code, add);
    }

    const directive = code.match(/^\s*%([A-Za-z][A-Za-z0-9_]*)\b/i);
    if (directive && PREPROCESSOR_DIRECTIVES.has(directive[1].toLowerCase())) {
      const percentIndex = directive.index + directive[0].indexOf("%");
      add(percentIndex, 1, "operator");
      add(percentIndex + 1, directive[1].length, "keyword");
    }

    const macroConstant = parseMacroConstant(code, lineNumber);
    if (macroConstant) {
      add(macroConstant.nameIndex, macroConstant.name.length, "macro", macroConstant.params.length ? ["declaration"] : ["declaration", "readonly"]);
    }

    const macroBlock = parseMultiLineMacro(lines, lineNumber);
    if (macroBlock) {
      add(macroBlock.nameIndex, macroBlock.name.length, "macro", ["declaration"]);
    }

    addSymbolDirectiveTokens(code, lineNumber, "global", currentSection, currentSectionKind, add);
    addSymbolDirectiveTokens(code, lineNumber, "extern", currentSection, currentSectionKind, add);

    const structStart = parseStructStart(code, lineNumber, "");
    if (structStart) {
      currentStruct = structStart.name;
      const keyword = code.match(/\bstruc\b/i);
      if (keyword) {
        add(keyword.index, keyword[0].length, "type");
      }
      add(structStart.nameIndex, structStart.name.length, "struct", ["declaration"]);
    }

    if (/^\s*endstruc\b/i.test(code)) {
      const keyword = code.match(/\bendstruc\b/i);
      if (keyword) {
        add(keyword.index, keyword[0].length, "type");
      }
      currentStruct = null;
    }

    addEquDeclaration(code, add);
    addLabelDeclaration(code, currentSectionKind, currentStruct, add);
    addStructReferences(code, table, add);
    addMacroParameters(code, add);
    addNumericLabelReferences(code, table, add);
    addMacroLocalReferences(code, table, add);
    addLocalLabelReferences(code, table, add);

    scanRegex(code, numberPattern, (match) => {
      add(match.index, match[0].length, "number");
    });

    scanRegex(code, IDENTIFIER, (match) => {
      const word = match[0];
      const semantic = classifyIdentifier(word, table);
      if (semantic) {
        add(match.index, word.length, semantic.type, semantic.modifiers);
      }
    });

    allTokens.push(...lineTokens);
  }

  return allTokens;
}

function addSectionAttributes(code, add) {
  scanRegex(code, SECTION_ALIGN_ATTRIBUTE, (match) => {
    add(match.index, match[1].length, "modifier");
    add(match.index + match[1].length + match[2].length, match[3].length, "operator");
  });

  scanRegex(code, SECTION_ATTRIBUTE, (match) => {
    add(match.index, match[0].length, "modifier");
  });
}

function addSymbolDirectiveTokens(code, lineNumber, directiveName, currentSection, currentSectionKind, add) {
  const directive = code.match(new RegExp(`^\\s*(${directiveName})\\b`, "i"));
  if (!directive) {
    return;
  }

  add(directive.index + directive[0].lastIndexOf(directive[1]), directive[1].length, "keyword");

  for (const symbol of parseSymbolDirective(code, directiveName, {
    fileUri: "",
    line: lineNumber,
    section: currentSection,
    sectionKind: currentSectionKind
  })) {
    const isData = symbol.attribute === "data";
    const type = isData ? "variable" : "function";
    const modifiers = [directiveName === "global" ? "exported" : "external", "global"];
    add(symbol.range.character, symbol.name.length, type, modifiers);
  }

  scanRegex(code, /:(function|data)\b/gi, (match) => {
    add(match.index, match[0].length, "modifier", [match[1].toLowerCase() === "function" ? "code" : "data"]);
  });
}

function addEquDeclaration(code, add) {
  const match = code.match(/^\s*([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)\s+equ\b/i);
  if (match) {
    add(match.index + match[0].indexOf(match[1]), match[1].length, "macro", ["declaration", "readonly"]);
  }
}

function addLabelDeclaration(code, currentSectionKind, currentStruct, add) {
  const numeric = code.match(/^\s*(\d+)(:)/);
  if (numeric) {
    add(numeric.index + numeric[0].lastIndexOf(numeric[1]), numeric[1].length, "variable", ["definition", "numericLabel"]);
    return;
  }

  const macroLocal = code.match(/^\s*(%%[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(:)/);
  if (macroLocal) {
    add(macroLocal.index + macroLocal[0].lastIndexOf(macroLocal[1]), macroLocal[1].length, "variable", ["definition", "macroLocal"]);
    return;
  }

  const local = code.match(/^\s*(\.[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(:)/);
  if (local) {
    const index = local.index + local[0].lastIndexOf(local[1]);
    if (currentStruct) {
      add(index, local[1].length, "property", ["definition"]);
    } else {
      add(index, local[1].length, currentSectionKind === "data" ? "variable" : "function", ["definition", "local", currentSectionKind]);
    }
    return;
  }

  const normal = code.match(new RegExp(`^\\s*(${IDENTIFIER_SOURCE})(:)`));
  if (normal) {
    add(
      normal.index + normal[0].lastIndexOf(normal[1]),
      normal[1].length,
      currentSectionKind === "data" ? "variable" : "function",
      ["definition", currentSectionKind]
    );
  }
}

function addStructReferences(code, table, add) {
  scanRegex(code, new RegExp(`\\b(${IDENTIFIER_SOURCE})(\\.[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)\\b`, "g"), (match) => {
    const structName = match[1];
    const fieldName = match[2];
    const fullName = `${structName}${fieldName}`;
    if (!table.lookup("structFields", fullName)) {
      return;
    }

    add(match.index, structName.length, "struct");
    add(match.index + structName.length, fieldName.length, "property");
  });
}

function addMacroParameters(code, add) {
  scanRegex(code, /(?:%%)([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)|%(?:\*|[+-]?\d+)/g, (match) => {
    if (match[0].startsWith("%%")) {
      add(match.index, match[0].length, "variable", ["macroLocal"]);
      return;
    }

    if (add(match.index, 1, "operator")) {
      add(match.index + 1, match[0].length - 1, "parameter");
    }
  });
}

function addNumericLabelReferences(code, table, add) {
  scanRegex(code, /(?<![A-Za-z0-9_$?@])(\d+)([fb])\b/g, (match) => {
    if (table.numericLabels.has(match[1])) {
      add(match.index, match[0].length, "variable", ["numericLabel"]);
    }
  });
}

function addMacroLocalReferences(code, table, add) {
  scanRegex(code, /(%%[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(?!:)/g, (match) => {
    if (table.lookup("macroLocalLabels", match[1])) {
      add(match.index, match[1].length, "variable", ["macroLocal"]);
    }
  });
}

function addLocalLabelReferences(code, table, add) {
  scanRegex(code, /(?<![A-Za-z0-9_$?@])(\.[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(?!:)/g, (match) => {
    if (table.lookup("sections", match[1]) || table.lookup("structFields", match[1]) || !table.lookup("localLabels", match[1])) {
      return;
    }

    const symbol = table.lookup("localLabels", match[1]);
    add(match.index, match[1].length, symbol.sectionKind === "data" ? "variable" : "function", ["local", symbol.sectionKind || "code"]);
  });
}

function classifyIdentifier(word, table) {
  const lower = word.toLowerCase();

  if (REGISTERS.test(word)) {
    return { type: "register", modifiers: registerModifiers(lower) };
  }

  if (isInstruction(lower)) {
    return { type: "instruction", modifiers: INSTRUCTION_PREFIXES.has(lower) ? ["static"] : [] };
  }

  if (PREPROCESSOR_DIRECTIVES.has(lower) || DIRECTIVES.has(lower)) {
    return { type: "keyword", modifiers: [] };
  }

  if (DATA_DECLARATIONS.has(lower) || SIZE_SPECIFIERS.has(lower)) {
    return { type: "type", modifiers: [] };
  }

  if (ADDRESSING_MODIFIERS.has(lower)) {
    return { type: "modifier", modifiers: [] };
  }

  if (table.lookup("macros", word)) {
    return { type: "macro", modifiers: ["readonly"] };
  }

  if (table.lookup("macroFunctions", word)) {
    return { type: "macro", modifiers: [] };
  }

  if (table.lookup("structs", word)) {
    return { type: "struct", modifiers: [] };
  }

  if (table.lookup("dataSymbols", word)) {
    return symbolToken(table.lookup("dataSymbols", word), table);
  }

  if (table.lookup("textSymbols", word)) {
    return symbolToken(table.lookup("textSymbols", word), table);
  }

  if (table.lookup("externs", word)) {
    const symbol = table.lookup("externs", word);
    return {
      type: symbol.attribute === "data" ? "variable" : "function",
      modifiers: ["external", "global"]
    };
  }

  if (table.lookup("globals", word)) {
    const symbol = table.lookup("globals", word);
    return {
      type: symbol.attribute === "data" ? "variable" : "function",
      modifiers: ["exported", "global"]
    };
  }

  return null;
}

function symbolToken(symbol, table) {
  const global = table.lookup("globals", symbol.name);
  const external = table.lookup("externs", symbol.name);
  const modifiers = [symbol.sectionKind || "code"];
  if (global) {
    modifiers.push("global", "exported");
  }
  if (external) {
    modifiers.push("global", "external");
  }

  return {
    type: symbol.sectionKind === "data" ? "variable" : "function",
    modifiers
  };
}

function registerModifiers(lower) {
  if (/^(?:xmm|ymm|zmm|mm|k|bnd)/.test(lower)) {
    return ["static"];
  }
  if (/^st[0-7]$/.test(lower)) {
    return ["static"];
  }
  return [];
}

function isInstruction(word) {
  return INSTRUCTIONS.has(word);
}

function addToken(tokens, occupied, line, start, length, type, modifiers = []) {
  const end = start + length;
  if (intersectsRanges(start, end, occupied)) {
    return false;
  }

  occupied.push({ start, end });
  tokens.push({ line, start, length, type, modifiers: modifiers.filter(Boolean) });
  return true;
}

function intersectsRanges(start, end, ranges) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function scanRegex(text, regex, callback) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    callback(match);
    if (match[0].length === 0) {
      regex.lastIndex += 1;
    }
  }
}

function readDocumentText(document) {
  if (!document || typeof document.lineAt !== "function" || typeof document.lineCount !== "number") {
    return "";
  }

  const lines = [];
  for (let line = 0; line < document.lineCount; line += 1) {
    lines.push(document.lineAt(line).text);
  }
  return lines.join("\n");
}

module.exports = {
  createSemanticTokensProvider,
  collectSemanticTokens,
  tokenTypes,
  tokenModifiers,
  isInstruction,
  REGISTERS,
  PREPROCESSOR_DIRECTIVES,
  DIRECTIVES,
  DATA_DECLARATIONS,
  SIZE_SPECIFIERS,
  ADDRESSING_MODIFIERS
};
