"use strict";

const path = require("path");

const DIAGNOSTICS_COMMAND = "mjAsmHighlighter.diagnostics";
const OUTPUT_CHANNEL = "MJ Asm Highlighter";

function registerDiagnostics(context, vscode, analyzer) {
  if (!vscode || !vscode.commands || typeof vscode.commands.registerCommand !== "function") {
    return disposable();
  }

  const output = createOutputChannel(vscode);
  const command = vscode.commands.registerCommand(DIAGNOSTICS_COMMAND, () => {
    runDiagnostics(vscode, analyzer, output);
  });

  if (context && Array.isArray(context.subscriptions)) {
    context.subscriptions.push(command);
    if (output && typeof output.dispose === "function") {
      context.subscriptions.push(output);
    }
  }

  return command;
}

function runDiagnostics(vscode, analyzer, output) {
  clearOutput(output);
  appendLine(output, "MJ Asm Highlighter diagnostics");

  const document = vscode && vscode.window && vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.document
    : null;

  if (!document) {
    appendLine(output, "No active editor.");
    showOutput(output);
    return;
  }

  appendLine(output, `Language mode: ${document.languageId || "unknown"}`);
  appendLine(output, `File: ${document.uri && document.uri.fsPath ? document.uri.fsPath : "untitled"}`);

  if (!analyzer || typeof analyzer.analyzeDocument !== "function") {
    appendLine(output, "Analyzer is unavailable.");
    showOutput(output);
    return;
  }

  const table = analyzer.analyzeDocument(document);
  appendIncludes(output, table);
  appendIncludedMacros(output, table);
  showOutput(output);
}

function appendIncludes(output, table) {
  const includes = table && table.includes instanceof Map ? [...table.includes.entries()] : [];
  if (!includes.length) {
    appendLine(output, "Resolved includes: none");
    return;
  }

  for (const [includeName, resolvedPath] of includes) {
    appendLine(output, `Resolved include: ${includeName} -> ${resolvedPath}`);
  }
}

function appendIncludedMacros(output, table) {
  const macroNames = includedMacroNames(table);
  if (!macroNames.length) {
    appendLine(output, "Collected macros from includes: none");
    return;
  }

  for (const macro of macroNames) {
    appendLine(output, `Collected macro from include: ${macro}`);
  }
}

function includedMacroNames(table) {
  const names = [];
  const seen = new Set();

  for (const mapName of ["macros", "macroFunctions"]) {
    const map = table && table[mapName] instanceof Map ? table[mapName] : null;
    if (!map) {
      continue;
    }

    for (const symbol of map.values()) {
      if (!symbol || symbol.source !== "include" || !symbol.name) {
        continue;
      }

      const key = `${path.resolve(symbol.fileUri || "")}:${symbol.name.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      names.push(symbol.name);
    }
  }

  return names.sort((left, right) => left.localeCompare(right));
}

function createOutputChannel(vscode) {
  if (vscode && vscode.window && typeof vscode.window.createOutputChannel === "function") {
    return vscode.window.createOutputChannel(OUTPUT_CHANNEL);
  }

  return {
    appendLine() {},
    clear() {},
    show() {},
    dispose() {}
  };
}

function appendLine(output, value) {
  if (output && typeof output.appendLine === "function") {
    output.appendLine(value);
  }
}

function clearOutput(output) {
  if (output && typeof output.clear === "function") {
    output.clear();
  }
}

function showOutput(output) {
  if (output && typeof output.show === "function") {
    output.show(true);
  }
}

function disposable() {
  return {
    dispose() {}
  };
}

module.exports = {
  DIAGNOSTICS_COMMAND,
  registerDiagnostics,
  runDiagnostics
};
