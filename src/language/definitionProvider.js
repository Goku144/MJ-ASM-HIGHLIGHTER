"use strict";

const path = require("path");
const { fileURLToPath } = require("url");
const { scanLine } = require("./nasmAnalyzer");
const { normalizeName } = require("./symbolTable");

const NASM_SYMBOL_PATTERN =
  /%%[A-Za-z_.$?@][A-Za-z0-9_.$?@]*|(?<![A-Za-z0-9_$?@])\.[A-Za-z_.$?@][A-Za-z0-9_.$?@]*|[A-Za-z_$?@][A-Za-z0-9_.$?@]*/g;
const NUMERIC_LABEL_REFERENCE_PATTERN = /(?<![A-Za-z0-9_$?@])\d{1,3}[fb]\b/gi;
const NUMERIC_LABEL_DEFINITION_PATTERN = /^\s*(\d{1,3})(:)/;

function createDefinitionProvider(vscode, analyzer) {
  return {
    provideDefinition(document, position) {
      return provideLocation(vscode, analyzer, document, position);
    }
  };
}

function createDeclarationProvider(vscode, analyzer) {
  return {
    provideDeclaration(document, position) {
      return provideLocation(vscode, analyzer, document, position);
    }
  };
}

function provideLocation(vscode, analyzer, document, position) {
  const token = getNasmSymbolAtPosition(document, position);
  if (!token) {
    return undefined;
  }

  const table = analyzer.analyzeDocument(document);
  const symbol = resolveDefinitionSymbol(token.text, table, document, position);
  return symbol ? symbolToLocation(vscode, symbol, document) : undefined;
}

function getNasmSymbolAtPosition(document, position) {
  if (!document || typeof document.lineAt !== "function" || !position) {
    return null;
  }

  const text = document.lineAt(position.line).text;
  const state = scanLine(text);
  if (position.character >= state.commentStart || isInsideRanges(position.character, state.stringRanges)) {
    return null;
  }

  const code = text.slice(0, state.commentStart);

  const numericReference = numericLabelReferenceAtPosition(code, position);
  if (numericReference) {
    return numericReference;
  }

  const numericDefinition = numericLabelDefinitionAtPosition(code, position);
  if (numericDefinition) {
    return numericDefinition;
  }

  NASM_SYMBOL_PATTERN.lastIndex = 0;
  let match;
  while ((match = NASM_SYMBOL_PATTERN.exec(code)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (position.character >= start && position.character < end) {
      return {
        text: match[0],
        range: { line: position.line, character: start, length: match[0].length },
        kind: symbolKind(match[0])
      };
    }
  }

  return null;
}

function numericLabelReferenceAtPosition(code, position) {
  NUMERIC_LABEL_REFERENCE_PATTERN.lastIndex = 0;
  let match;
  while ((match = NUMERIC_LABEL_REFERENCE_PATTERN.exec(code)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (position.character >= start && position.character < end) {
      const suffix = match[0].slice(-1).toLowerCase();
      const name = match[0].slice(0, -1);
      return {
        text: match[0],
        name,
        direction: suffix === "f" ? "forward" : "backward",
        range: { line: position.line, character: start, length: match[0].length },
        kind: "numericLabelReference"
      };
    }
  }

  return null;
}

function numericLabelDefinitionAtPosition(code, position) {
  const match = code.match(NUMERIC_LABEL_DEFINITION_PATTERN);
  if (!match) {
    return null;
  }

  const start = code.indexOf(match[1]);
  const end = start + match[1].length + match[2].length;
  if (position.character < start || position.character >= end) {
    return null;
  }

  return {
    text: `${match[1]}:`,
    name: match[1],
    range: { line: position.line, character: start, length: end - start },
    kind: "numericLabelDefinition"
  };
}

function resolveDefinitionSymbol(name, table, document, position) {
  if (!name || !table) {
    return undefined;
  }

  const numericReference = parseNumericLabelReference(name);
  if (numericReference) {
    return resolveNumericLabel(document, numericReference.name, numericReference.direction, position.line);
  }

  if (name.startsWith("%%")) {
    return resolveMacroLocalLabel(name, table, document, position);
  }

  if (name.startsWith(".")) {
    return resolveDotLocalLabel(name, table, document, position);
  }

  if (name.includes(".")) {
    const structField = table.lookup("structFields", name);
    if (structField) {
      return structField;
    }
  }

  const exact =
    table.lookup("macroFunctions", name) ||
    table.lookup("macros", name) ||
    table.lookup("structs", name) ||
    table.lookup("structFields", name) ||
    table.lookup("labels", name) ||
    table.lookup("dataSymbols", name) ||
    table.lookup("textSymbols", name) ||
    table.lookup("externs", name) ||
    table.lookup("globals", name) ||
    table.lookup("sections", name);
  if (exact) {
    return preferLocalDefinitionForGlobal(name, exact, table) || exact;
  }

  const generatedStruct = generatedStructName(name);
  return generatedStruct ? table.lookup("structs", generatedStruct) : undefined;
}

function parseNumericLabelReference(text) {
  const match = String(text || "").match(/^(\d{1,3})([fb])$/i);
  if (!match) {
    return null;
  }

  return {
    name: match[1],
    direction: match[2].toLowerCase() === "f" ? "forward" : "backward"
  };
}

function preferLocalDefinitionForGlobal(name, symbol, table) {
  if (!symbol || (symbol.kind !== "global" && symbol.kind !== "extern")) {
    return null;
  }
  return table.lookup("labels", name) || table.lookup("dataSymbols", name) || table.lookup("textSymbols", name) || null;
}

function collectNumericLabels(document) {
  const labels = new Map();
  if (!document || typeof document.lineAt !== "function" || !Number.isInteger(document.lineCount)) {
    return labels;
  }

  const fileUri = documentFileUri(document);
  for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber += 1) {
    const text = document.lineAt(lineNumber).text;
    const state = scanLine(text);
    const code = text.slice(0, state.commentStart);
    const match = code.match(NUMERIC_LABEL_DEFINITION_PATTERN);
    if (!match) {
      continue;
    }

    const name = match[1];
    const character = code.indexOf(name);
    if (!labels.has(name)) {
      labels.set(name, []);
    }
    labels.get(name).push({
      kind: "numericLabel",
      name,
      fileUri,
      range: { line: lineNumber, character, length: name.length },
      declarationLine: lineNumber
    });
  }

  return labels;
}

function resolveNumericLabel(document, name, direction, currentLine) {
  const labels = collectNumericLabels(document).get(String(name || "")) || [];

  if (direction === "forward") {
    return labels.find((label) => label.range.line > currentLine);
  }

  if (direction === "backward") {
    return labels.filter((label) => label.range.line < currentLine).at(-1);
  }

  return undefined;
}

function resolveDotLocalLabel(name, table, document, position) {
  const fileUri = documentFileUri(document);
  const parent = currentParentLabel(table, fileUri, position);
  const sameFile = table.lookupAll("localLabelDefinitions", name).filter((symbol) => sameFileUri(symbol, fileUri));
  const sameScope = sameFile.filter((symbol) => normalizeOptional(symbol.parent) === normalizeOptional(parent));
  return nearestDefinition(sameScope.length ? sameScope : sameFile, position);
}

function resolveMacroLocalLabel(name, table, document, position) {
  const fileUri = documentFileUri(document);
  const sameFile = table.lookupAll("macroLocalLabelDefinitions", name).filter((symbol) => sameFileUri(symbol, fileUri));
  const sameMacro = sameFile.filter(
    (symbol) =>
      Number.isInteger(symbol.macroStartLine) &&
      Number.isInteger(symbol.macroEndLine) &&
      position.line >= symbol.macroStartLine &&
      position.line <= symbol.macroEndLine
  );
  return nearestDefinition(sameMacro.length ? sameMacro : sameFile, position);
}

function nearestDefinition(candidates, position) {
  if (!candidates.length) {
    return undefined;
  }

  const before = candidates
    .filter((symbol) => isBeforeOrAt(symbol, position))
    .sort((left, right) => right.range.line - left.range.line || right.range.character - left.range.character);
  if (before.length) {
    return before[0];
  }

  return [...candidates].sort((left, right) => left.range.line - right.range.line || left.range.character - right.range.character)[0];
}

function currentParentLabel(table, fileUri, position) {
  const labels = uniqueSymbols([...table.labels.values()])
    .filter((symbol) => sameFile(symbol.fileUri, fileUri))
    .filter((symbol) => isBeforeOrAt(symbol, position))
    .sort((left, right) => right.range.line - left.range.line || right.range.character - left.range.character);
  return labels.length ? labels[0].name : null;
}

function symbolToLocation(vscode, symbol, document) {
  const uri = symbolUri(vscode, symbol, document);
  const range = symbolRange(vscode, symbol);
  if (typeof vscode.Location === "function") {
    return new vscode.Location(uri, range);
  }
  return { uri, range };
}

function symbolUri(vscode, symbol, document) {
  const fileUri = symbol && symbol.fileUri;
  if (!fileUri) {
    return document.uri;
  }

  if (sameFile(fileUri, documentFileUri(document))) {
    return document.uri;
  }

  if (path.isAbsolute(fileUri) && vscode.Uri && typeof vscode.Uri.file === "function") {
    return vscode.Uri.file(fileUri);
  }

  if (vscode.Uri && typeof vscode.Uri.parse === "function") {
    return vscode.Uri.parse(fileUri);
  }

  return {
    fsPath: fileUri,
    toString() {
      return fileUri;
    }
  };
}

function symbolRange(vscode, symbol) {
  const compact = symbol.range || {};
  const line = Number.isInteger(compact.line) ? compact.line : Number.isInteger(symbol.declarationLine) ? symbol.declarationLine : 0;
  const character = Number.isInteger(compact.character) ? compact.character : Number.isInteger(symbol.column) ? symbol.column : 0;
  const length = Number.isInteger(compact.length) ? compact.length : String(symbol.name || "").length || 1;

  if (typeof vscode.Range === "function") {
    return new vscode.Range(line, character, line, character + length);
  }

  return {
    start: { line, character },
    end: { line, character: character + length }
  };
}

function sameFileUri(symbol, fileUri) {
  return sameFile(symbol.fileUri, fileUri);
}

function sameFile(left, right) {
  const normalizedLeft = normalizeFileIdentity(left);
  const normalizedRight = normalizeFileIdentity(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function normalizeFileIdentity(value) {
  if (!value) {
    return "";
  }

  const text = typeof value === "string" ? value : value.fsPath || (value.toString && value.toString()) || "";
  if (!text) {
    return "";
  }

  if (path.isAbsolute(text)) {
    return path.resolve(text);
  }

  if (text.startsWith("file:")) {
    try {
      return path.resolve(fileURLToPath(text));
    } catch (_error) {
      return text;
    }
  }

  return text;
}

function documentFileUri(document) {
  if (!document || !document.uri) {
    return "";
  }
  return document.uri.fsPath || (document.uri.toString && document.uri.toString()) || "";
}

function isBeforeOrAt(symbol, position) {
  return symbol.range.line < position.line || (symbol.range.line === position.line && symbol.range.character <= position.character);
}

function isInsideRanges(character, ranges) {
  return ranges.some((range) => character >= range.start && character < range.end);
}

function uniqueSymbols(symbols) {
  return [...new Set(symbols.filter(Boolean))];
}

function generatedStructName(name) {
  const match = String(name || "").match(/^(.+)_size$/i);
  return match ? match[1] : null;
}

function normalizeOptional(value) {
  return value ? normalizeName(value) : "";
}

function symbolKind(text) {
  if (/^\d{1,3}[fb]$/i.test(text)) {
    return "numericLabelReference";
  }
  if (/^\d{1,3}:$/.test(text)) {
    return "numericLabelDefinition";
  }
  if (text.startsWith("%%")) {
    return "macroLocalLabel";
  }
  if (text.startsWith(".")) {
    return "localLabel";
  }
  if (text.includes(".")) {
    return "compoundSymbol";
  }
  return "symbol";
}

module.exports = {
  createDefinitionProvider,
  createDeclarationProvider,
  getNasmSymbolAtPosition,
  collectNumericLabels,
  resolveNumericLabel,
  resolveDefinitionSymbol,
  symbolToLocation
};
