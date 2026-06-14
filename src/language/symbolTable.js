"use strict";

function normalizeName(name) {
  return String(name || "").toLowerCase();
}

function createSymbol(kind, name, fileUri, range, extra = {}) {
  return {
    kind,
    name,
    fileUri,
    range,
    declarationLine: range ? range.line : undefined,
    ...extra
  };
}

function storeCaseInsensitive(map, name, symbol) {
  if (!name) {
    return;
  }

  map.set(name, symbol);
  map.set(normalizeName(name), symbol);
}

function storeList(map, name, symbol) {
  if (!name) {
    return;
  }

  const lower = normalizeName(name);
  if (!map.has(lower)) {
    map.set(lower, []);
  }
  map.get(lower).push(symbol);
}

class SymbolTable {
  constructor() {
    this.macros = new Map();
    this.macroFunctions = new Map();
    this.defineMacros = new Map();
    this.assignMacros = new Map();
    this.multiLineMacros = new Map();
    this.labels = new Map();
    this.localLabels = new Map();
    this.macroLocalLabels = new Map();
    this.numericLabels = new Map();
    this.externs = new Map();
    this.globals = new Map();
    this.sections = new Map();
    this.structs = new Map();
    this.structFields = new Map();
    this.dataSymbols = new Map();
    this.textSymbols = new Map();
    this.includes = new Map();
  }

  merge(other) {
    for (const key of [
      "macros",
      "macroFunctions",
      "defineMacros",
      "assignMacros",
      "multiLineMacros",
      "labels",
      "localLabels",
      "macroLocalLabels",
      "externs",
      "globals",
      "sections",
      "structs",
      "structFields",
      "dataSymbols",
      "textSymbols",
      "includes"
    ]) {
      for (const [name, symbol] of other[key]) {
        setWithCurrentSourcePrecedence(this[key], name, symbol);
      }
    }

    for (const [name, symbols] of other.numericLabels) {
      if (!this.numericLabels.has(name)) {
        this.numericLabels.set(name, []);
      }
      this.numericLabels.get(name).push(...symbols);
    }
  }

  addMacro(symbol) {
    storeCaseInsensitive(this.macros, symbol.name, symbol);
    if (symbol.defineMacro) {
      storeCaseInsensitive(this.defineMacros, symbol.name, symbol.defineMacro);
    }
    if (symbol.assignMacro) {
      storeCaseInsensitive(this.assignMacros, symbol.name, symbol.assignMacro);
    }
  }

  addMacroFunction(symbol) {
    storeCaseInsensitive(this.macroFunctions, symbol.name, symbol);
    if (symbol.defineMacro) {
      storeCaseInsensitive(this.defineMacros, symbol.name, symbol.defineMacro);
    }
    if (symbol.multiLineMacro) {
      storeCaseInsensitive(this.multiLineMacros, symbol.name, symbol.multiLineMacro);
    }
  }

  addLabel(symbol) {
    storeCaseInsensitive(this.labels, symbol.name, symbol);
    if (symbol.sectionKind === "data") {
      storeCaseInsensitive(this.dataSymbols, symbol.name, symbol);
    } else {
      storeCaseInsensitive(this.textSymbols, symbol.name, symbol);
    }
  }

  addLocalLabel(symbol) {
    storeCaseInsensitive(this.localLabels, symbol.name, symbol);
  }

  addMacroLocalLabel(symbol) {
    storeCaseInsensitive(this.macroLocalLabels, symbol.name, symbol);
  }

  addNumericLabel(symbol) {
    storeList(this.numericLabels, symbol.name, symbol);
  }

  addGlobal(symbol) {
    storeCaseInsensitive(this.globals, symbol.name, symbol);
  }

  addExtern(symbol) {
    storeCaseInsensitive(this.externs, symbol.name, symbol);
  }

  addSection(symbol) {
    storeCaseInsensitive(this.sections, symbol.name, symbol);
  }

  addStruct(symbol) {
    storeCaseInsensitive(this.structs, symbol.name, symbol);
  }

  addStructField(symbol) {
    storeCaseInsensitive(this.structFields, symbol.name, symbol);
  }

  addInclude(source, resolvedPath) {
    if (source && resolvedPath) {
      this.includes.set(source, resolvedPath);
    }
  }

  lookup(mapName, name) {
    const map = this[mapName];
    return map ? map.get(name) || map.get(normalizeName(name)) : undefined;
  }

  lookupSymbol(name) {
    return (
      this.lookup("macros", name) ||
      this.lookup("macroFunctions", name) ||
      this.lookup("structs", name) ||
      this.lookup("structFields", name) ||
      this.lookup("labels", name) ||
      this.lookup("localLabels", name) ||
      this.lookup("macroLocalLabels", name) ||
      this.lookup("externs", name) ||
      this.lookup("globals", name) ||
      this.lookup("dataSymbols", name) ||
      this.lookup("textSymbols", name)
    );
  }

  toHoverSymbols() {
    return {
      macroConstants: caseInsensitiveNameSet(this.macros),
      dataSymbols: caseInsensitiveNameSet(this.dataSymbols),
      knownMacros: caseInsensitiveNameSet(this.macroFunctions),
      defineMacros: this.defineMacros,
      assignMacros: this.assignMacros,
      multiLineMacros: this.multiLineMacros
    };
  }
}

function setWithCurrentSourcePrecedence(map, name, symbol) {
  const existing = map.get(name);
  if (existing && existing.source === "current" && symbol && symbol.source !== "current") {
    return;
  }
  map.set(name, symbol);
}

function caseInsensitiveNameSet(map) {
  const names = new Set();
  for (const symbol of map.values()) {
    if (symbol && symbol.name) {
      names.add(symbol.name);
      names.add(normalizeName(symbol.name));
    }
  }
  return names;
}

module.exports = {
  SymbolTable,
  createSymbol,
  normalizeName,
  storeCaseInsensitive
};
