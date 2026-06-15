"use strict";

const fs = require("fs");
const path = require("path");
const { IncludeResolver } = require("./includeResolver");
const { SymbolTable, createSymbol, normalizeName } = require("./symbolTable");

const IDENTIFIER_SOURCE = "[A-Za-z_.$?@][A-Za-z0-9_.$?@]*";
const IDENTIFIER = new RegExp(IDENTIFIER_SOURCE, "g");
const IDENTIFIER_AT_START = new RegExp(`^\\s*(${IDENTIFIER_SOURCE})`);
const NUMERIC_LABEL = /^\s*(\d+)(:)/;
const MACRO_LOCAL_LABEL = /^\s*(%%[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(:)/;
const DOT_LOCAL_LABEL = /^\s*(\.[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(:)/;
const NORMAL_LABEL = new RegExp(`^\\s*(${IDENTIFIER_SOURCE})(:)`);
const STRUCT_FIELD_LABEL = /^\s*(\.[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(:)/;

const CODE_SECTIONS = new Set([".text", ".init", ".fini", ".plt"]);
const DATA_SECTIONS = new Set([".data", ".bss", ".rodata", ".rdata", ".data.rel.ro"]);
const MACRO_CONSTANT_DIRECTIVES = new Set([
  "define",
  "xdefine",
  "idefine",
  "assign",
  "iassign",
  "defstr",
  "idefstr",
  "deftok",
  "ideftok"
]);
const DEFINE_DIRECTIVES = new Set(["define", "xdefine", "idefine", "defstr", "idefstr", "deftok", "ideftok"]);
const ASSIGN_DIRECTIVES = new Set(["assign", "iassign"]);

class NasmAnalyzer {
  constructor(options = {}) {
    this.includeResolver = options.includeResolver || new IncludeResolver({ vscode: options.vscode });
    this.fileCache = new Map();
    this.maxIncludeDepth = Number.isInteger(options.maxIncludeDepth) ? options.maxIncludeDepth : 16;
  }

  analyzeDocument(document) {
    const text = typeof document.getText === "function" ? document.getText() : readDocumentText(document);
    const filePath = document && document.uri && document.uri.fsPath ? document.uri.fsPath : null;
    const visited = new Set(filePath ? [path.resolve(filePath)] : []);
    const table = new SymbolTable();
    this.analyzeTextInto(table, text, filePath, {
      visited,
      fileUri: filePath || (document && document.uri && document.uri.toString && document.uri.toString()) || "",
      source: "current",
      includeDepth: 0
    });
    return table;
  }

  analyzeFile(filePath, visited = new Set(), includeDepth = 0) {
    const resolvedPath = path.resolve(filePath);
    if (visited.has(resolvedPath) || includeDepth > this.maxIncludeDepth) {
      return new SymbolTable();
    }

    let stat;
    try {
      stat = fs.statSync(resolvedPath);
    } catch (_error) {
      return new SymbolTable();
    }

    const cached = this.fileCache.get(resolvedPath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return cached.table;
    }

    let text;
    try {
      text = fs.readFileSync(resolvedPath, "utf8");
    } catch (_error) {
      return new SymbolTable();
    }

    const table = new SymbolTable();
    visited.add(resolvedPath);
    this.analyzeTextInto(table, text, resolvedPath, {
      visited,
      fileUri: resolvedPath,
      source: "include",
      includeDepth
    });
    visited.delete(resolvedPath);

    this.fileCache.set(resolvedPath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      table
    });
    return table;
  }

  analyzeTextInto(table, text, filePath, options = {}) {
    const lines = text.split(/\r?\n/);
    const visited = options.visited || new Set();
    const fileUri = options.fileUri || filePath || "";
    const source = options.source || "current";
    const includeDepth = options.includeDepth || 0;
    let currentSection = ".text";
    let currentSectionKind = "code";
    let currentStruct = null;
    let currentParentLabel = null;

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
      const textLine = lines[lineNumber];
      const code = codePortion(textLine);
      const lineContext = { fileUri, line: lineNumber, section: currentSection, sectionKind: currentSectionKind, source };

      const include = parseInclude(code);
      if (include && filePath) {
        const resolved = this.includeResolver.resolve(include.name, filePath);
        if (resolved) {
          table.addInclude(include.name, resolved);
          table.merge(this.analyzeFile(resolved, visited, includeDepth + 1));
        }
      }

      const section = parseSection(code);
      if (section) {
        currentSection = section.name;
        currentSectionKind = classifySection(section.name);
        table.addSection(createSymbol("section", section.name, fileUri, range(lineNumber, section.index, section.name.length), {
          section: section.name,
          sectionKind: currentSectionKind,
          attributes: section.attributes,
          source
        }));
      }

      const macroConstant = parseMacroConstant(code, lineNumber);
      if (macroConstant) {
        if (macroConstant.defineMacro) {
          macroConstant.defineMacro.fileUri = fileUri;
          macroConstant.defineMacro.source = source;
        }
        if (macroConstant.assignMacro) {
          macroConstant.assignMacro.fileUri = fileUri;
          macroConstant.assignMacro.source = source;
        }

        const symbol = createSymbol("macro", macroConstant.name, fileUri, range(lineNumber, macroConstant.nameIndex, macroConstant.name.length), {
          readonly: !macroConstant.params.length || ASSIGN_DIRECTIVES.has(macroConstant.kind),
          directive: macroConstant.kind,
          parameterCount: macroConstant.params.length,
          parameters: macroConstant.params,
          value: macroConstant.replacement,
          replacement: macroConstant.replacement,
          rawHeader: macroConstant.original,
          source,
          defineMacro: macroConstant.defineMacro,
          assignMacro: macroConstant.assignMacro
        });

        if (macroConstant.params.length) {
          table.addMacroFunction(symbol);
        } else {
          table.addMacro(symbol);
        }
      }

      const multiLineMacro = parseMultiLineMacro(lines, lineNumber);
      if (multiLineMacro) {
        multiLineMacro.fileUri = fileUri;
        multiLineMacro.source = source;
        table.addMacroFunction(createSymbol("macro", multiLineMacro.name, fileUri, range(lineNumber, multiLineMacro.nameIndex, multiLineMacro.name.length), {
          directive: multiLineMacro.kind,
          parameterCount: multiLineMacro.parameterCount,
          rawHeader: multiLineMacro.rawHeader,
          bodyLines: multiLineMacro.bodyLines,
          source,
          multiLineMacro
        }));
        for (let bodyLine = lineNumber + 1; bodyLine < multiLineMacro.endLine; bodyLine += 1) {
          const bodyLabel = parseLabel(codePortion(lines[bodyLine]), bodyLine, fileUri, currentSection, currentSectionKind);
          if (bodyLabel && bodyLabel.kind === "macroLocalLabel") {
            bodyLabel.symbol.source = source;
            bodyLabel.symbol.macro = multiLineMacro.name;
            bodyLabel.symbol.macroStartLine = multiLineMacro.startLine;
            bodyLabel.symbol.macroEndLine = multiLineMacro.endLine;
            table.addMacroLocalLabel(bodyLabel.symbol);
          }
        }
        lineNumber = multiLineMacro.endLine;
        continue;
      }

      for (const symbol of parseSymbolDirective(code, "global", lineContext)) {
        table.addGlobal(symbol);
      }

      for (const symbol of parseSymbolDirective(code, "extern", lineContext)) {
        table.addExtern(symbol);
      }

      const structStart = parseStructStart(code, lineNumber, fileUri);
      if (structStart) {
        currentStruct = structStart.name;
        structStart.symbol.source = source;
        table.addStruct(structStart.symbol);
        table.addMacro(createSymbol("macro", `${currentStruct}_size`, fileUri, range(lineNumber, structStart.nameIndex, structStart.name.length), {
          readonly: true,
          generated: true,
          struct: currentStruct,
          source
        }));
      }

      if (/^\s*endstruc\b/i.test(code)) {
        currentStruct = null;
      }

      if (currentStruct) {
        const field = parseStructField(code, lineNumber, fileUri, currentStruct);
        if (field) {
          field.source = source;
          table.addStructField(field);
        }
      }

      const equ = parseEqu(code, lineNumber, fileUri);
      if (equ) {
        table.addMacro(createSymbol("macro", equ.name, fileUri, equ.range, {
          readonly: true,
          directive: "equ",
          source
        }));
      }

      const label = parseLabel(code, lineNumber, fileUri, currentSection, currentSectionKind);
      if (label) {
        label.symbol.source = source;
        if (label.kind === "numericLabel") {
          table.addNumericLabel(label.symbol);
        } else if (label.kind === "macroLocalLabel") {
          table.addMacroLocalLabel(label.symbol);
        } else if (label.kind === "localLabel") {
          label.symbol.parent = currentParentLabel;
          table.addLocalLabel(label.symbol);
        } else {
          table.addLabel(label.symbol);
          currentParentLabel = label.symbol.name;
        }
      }
    }
  }

  clearCache() {
    this.fileCache.clear();
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

function codePortion(text) {
  return splitCodeAndComment(text).code;
}

function parseInclude(code) {
  const match = code.match(/^\s*%include\s+(?:"([^"]+)"|'([^']+)'|<([^>]+)>)/i);
  if (!match) {
    return null;
  }

  return {
    name: match[1] || match[2] || match[3],
    index: match.index + match[0].lastIndexOf(match[1] || match[2] || match[3])
  };
}

function parseSection(code) {
  const match = code.match(/\b(section|segment)\s+(\.[A-Za-z0-9_.-]+)/i);
  if (!match) {
    return null;
  }

  return {
    name: match[2],
    index: match.index + match[0].lastIndexOf(match[2]),
    attributes: parseSectionAttributes(code.slice(match.index + match[0].length))
  };
}

function parseSectionAttributes(text) {
  const attrs = [];
  scanRegex(text, /\b(?:align\s*=\s*\d+|noalloc|noexec|nowrite|progbits|alloc|exec|write|nobits)\b/gi, (match) => {
    attrs.push(match[0]);
  });
  return attrs;
}

function parseMacroConstant(code, lineNumber) {
  const directive = code.match(/^\s*%([A-Za-z][A-Za-z0-9_]*)\b/i);
  if (!directive) {
    return null;
  }

  const kind = directive[1].toLowerCase();
  if (!MACRO_CONSTANT_DIRECTIVES.has(kind)) {
    return null;
  }

  const restOffset = directive.index + directive[0].length;
  const rest = code.slice(restOffset);
  const nameMatch = rest.match(new RegExp(`^\\s+(${IDENTIFIER_SOURCE})(?:\\(([^)]*)\\))?\\s*(.*)$`));
  if (!nameMatch) {
    return null;
  }

  const name = nameMatch[1];
  const params = nameMatch[2] ? nameMatch[2].split(",").map((param) => param.trim()).filter(Boolean) : [];
  const replacement = nameMatch[3] ? nameMatch[3].trim() : "";
  const nameIndex = restOffset + nameMatch[0].lastIndexOf(name);
  const original = code.trim();

  if (DEFINE_DIRECTIVES.has(kind)) {
    return {
      kind,
      name,
      params,
      replacement,
      nameIndex,
      defineMacro: {
        kind,
        name,
        params,
        replacement,
        original,
        line: lineNumber
      }
    };
  }

  return {
    kind,
    name,
    params: [],
    replacement,
    nameIndex,
    assignMacro: {
      kind,
      name,
      expression: replacement,
      original,
      line: lineNumber
    }
  };
}

function parseMultiLineMacro(lines, lineNumber) {
  const code = codePortion(lines[lineNumber]);
  const match = code.match(/^\s*%(macro|imacro)\s+([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)\s+([^\s;]+)/i);
  if (!match) {
    return null;
  }

  const originalLines = [lines[lineNumber]];
  const bodyLines = [];
  let endLine = lineNumber;

  for (let nextLine = lineNumber + 1; nextLine < lines.length; nextLine += 1) {
    const bodyText = lines[nextLine];
    originalLines.push(bodyText);
    const bodyCode = codePortion(bodyText);
    if (/^\s*%endmacro\b/i.test(bodyCode)) {
      endLine = nextLine;
      break;
    }

    bodyLines.push(bodyText);
    endLine = nextLine;
  }

  return {
    kind: match[1].toLowerCase(),
    name: match[2],
    nameIndex: match.index + match[0].lastIndexOf(match[2]),
    argCount: match[3],
    parameterCount: parseMacroParameterCount(match[3]),
    rawHeader: code.trim(),
    body: bodyLines.map((line) => line.trim()),
    bodyLines,
    original: originalLines.join("\n"),
    startLine: lineNumber,
    endLine
  };
}

function parseMacroParameterCount(value) {
  const match = String(value || "").match(/^\d+/);
  return match ? Number(match[0]) : undefined;
}

function parseSymbolDirective(code, directive, context) {
  const match = code.match(new RegExp(`^\\s*${directive}\\b\\s+(.+)$`, "i"));
  if (!match) {
    return [];
  }

  const symbols = [];
  const baseIndex = match.index + match[0].lastIndexOf(match[1]);
  for (const part of splitCommaSeparated(match[1])) {
    const symbolMatch = part.text.match(new RegExp(`^\\s*(${IDENTIFIER_SOURCE})(?:\\s*:\\s*(function|data))?`, "i"));
    if (!symbolMatch) {
      continue;
    }

    const name = symbolMatch[1];
    const attr = symbolMatch[2] ? symbolMatch[2].toLowerCase() : undefined;
    const nameIndex = baseIndex + part.start + part.text.indexOf(name);
    symbols.push(createSymbol(directive, name, context.fileUri, range(context.line, nameIndex, name.length), {
      section: context.section,
      sectionKind: attr === "data" ? "data" : attr === "function" ? "code" : context.sectionKind,
      attribute: attr,
      exported: directive === "global",
      external: directive === "extern",
      source: context.source || "current"
    }));
  }

  return symbols;
}

function parseStructStart(code, lineNumber, fileUri) {
  const match = code.match(/^\s*struc\s+([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)/i);
  if (!match) {
    return null;
  }

  const nameIndex = match.index + match[0].lastIndexOf(match[1]);
  return {
    name: match[1],
    nameIndex,
    symbol: createSymbol("struct", match[1], fileUri, range(lineNumber, nameIndex, match[1].length))
  };
}

function parseStructField(code, lineNumber, fileUri, structName) {
  const match = code.match(STRUCT_FIELD_LABEL);
  if (!match) {
    return null;
  }

  const name = `${structName}${match[1]}`;
  const index = match.index + match[0].lastIndexOf(match[1]);
  return createSymbol("property", name, fileUri, range(lineNumber, index, match[1].length), {
    struct: structName,
    field: match[1]
  });
}

function parseEqu(code, lineNumber, fileUri) {
  const match = code.match(/^\s*([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)\s+equ\b/i);
  if (!match) {
    return null;
  }

  const nameIndex = match.index + match[0].indexOf(match[1]);
  return {
    name: match[1],
    range: range(lineNumber, nameIndex, match[1].length),
    fileUri
  };
}

function parseLabel(code, lineNumber, fileUri, section, sectionKind) {
  const numeric = code.match(NUMERIC_LABEL);
  if (numeric) {
    const index = numeric.index + numeric[0].lastIndexOf(numeric[1]);
    return {
      kind: "numericLabel",
      symbol: createSymbol("numericLabel", numeric[1], fileUri, range(lineNumber, index, numeric[1].length), {
        section,
        sectionKind
      })
    };
  }

  const macroLocal = code.match(MACRO_LOCAL_LABEL);
  if (macroLocal) {
    const index = macroLocal.index + macroLocal[0].lastIndexOf(macroLocal[1]);
    return {
      kind: "macroLocalLabel",
      symbol: createSymbol("macroLocalLabel", macroLocal[1], fileUri, range(lineNumber, index, macroLocal[1].length), {
        section,
        sectionKind
      })
    };
  }

  const dotLocal = code.match(DOT_LOCAL_LABEL);
  if (dotLocal) {
    const index = dotLocal.index + dotLocal[0].lastIndexOf(dotLocal[1]);
    return {
      kind: "localLabel",
      symbol: createSymbol("localLabel", dotLocal[1], fileUri, range(lineNumber, index, dotLocal[1].length), {
        section,
        sectionKind
      })
    };
  }

  const normal = code.match(NORMAL_LABEL);
  if (normal && !normal[1].startsWith(".")) {
    const index = normal.index + normal[0].lastIndexOf(normal[1]);
    return {
      kind: "label",
      symbol: createSymbol("label", normal[1], fileUri, range(lineNumber, index, normal[1].length), {
        section,
        sectionKind
      })
    };
  }

  return null;
}

function splitCommaSeparated(text) {
  const parts = [];
  let current = "";
  let start = 0;
  let depth = 0;
  let quote = null;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quote) {
      current += char;
      if (char === "\\" && i + 1 < text.length) {
        current += text[i + 1];
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      current += char;
    } else if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      current += char;
    } else if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (char === "," && depth === 0) {
      parts.push({ text: current, start });
      current = "";
      start = i + 1;
    } else {
      current += char;
    }
  }

  parts.push({ text: current, start });
  return parts;
}

function classifySection(sectionName) {
  const lower = normalizeName(sectionName);

  if (CODE_SECTIONS.has(lower)) {
    return "code";
  }

  if (DATA_SECTIONS.has(lower)) {
    return "data";
  }

  return /(?:^|[._-])(?:text|code|plt|init|fini)(?:$|[._-])/.test(lower) ? "code" : "data";
}

function scanLine(text) {
  const stringRanges = [];
  const split = splitCodeAndComment(text);
  let quote = null;
  let start = 0;
  const codeEnd = split.commentStart >= 0 ? split.commentStart : text.length;

  for (let i = 0; i < codeEnd; i += 1) {
    const char = text[i];

    if (quote) {
      if (char === "\\" && i + 1 < text.length) {
        i += 1;
      } else if (char === quote) {
        stringRanges.push({ start, end: i + 1 });
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      start = i;
    }
  }

  if (quote) {
    stringRanges.push({ start, end: codeEnd });
  }

  return { commentStart: codeEnd, stringRanges };
}

function splitCodeAndComment(line) {
  const text = String(line || "");
  let quote = null;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\" && quote) {
      escaped = true;
      continue;
    }

    if (quote) {
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === "\"" || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === ";") {
      return {
        code: text.slice(0, i),
        comment: text.slice(i),
        commentStart: i
      };
    }
  }

  return {
    code: text,
    comment: "",
    commentStart: -1
  };
}

function findCommentStart(line) {
  return splitCodeAndComment(line).commentStart;
}

function range(line, character, length) {
  return { line, character, length };
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

module.exports = {
  NasmAnalyzer,
  IDENTIFIER,
  IDENTIFIER_AT_START,
  IDENTIFIER_SOURCE,
  CODE_SECTIONS,
  DATA_SECTIONS,
  classifySection,
  splitCodeAndComment,
  codePortion,
  scanLine,
  findCommentStart,
  parseInclude,
  parseSection,
  parseSectionAttributes,
  parseMacroConstant,
  parseMultiLineMacro,
  parseMacroParameterCount,
  parseSymbolDirective,
  parseStructStart,
  parseStructField,
  parseEqu,
  parseLabel,
  splitCommaSeparated,
  range
};
