"use strict";

const path = require("path");
const { getLocalDoc, getSyscallDocByMacro } = require("./localDocs");
const { expandMacroPreview, parseMacroCallArguments, normalizeBodyLines } = require("./macroExpansion");
const { isInstruction } = require("./semanticTokens");
const { getNasmSymbolAtPosition, resolveNumericLabel } = require("./definitionProvider");
const { scanLine, splitCodeAndComment } = require("./nasmAnalyzer");

const HOVER_TOKEN_PATTERN = /%%[A-Za-z_.$?@][A-Za-z0-9_.$?@]*|%[A-Za-z][A-Za-z0-9_]*|\.[A-Za-z0-9_.-]+|[A-Za-z_.$?@][A-Za-z0-9_.$?@]*:?\b|\d+[fb]?\b|\$\$|\$/g;

function createHoverProvider(vscode, analyzer) {
  return {
    provideHover(document, position) {
      const symbol = getNasmSymbolAtPosition(document, position);
      if (symbol && symbol.kind === "numericLabelReference") {
        return makeNumericLabelReferenceHover(vscode, document, symbol, position);
      }

      if (symbol && symbol.kind === "numericLabelDefinition") {
        return makeNumericLabelDefinitionHover(vscode, symbol);
      }

      const hoverToken = symbol || getHoverToken(document, position);
      if (!hoverToken) {
        return null;
      }

      const table = analyzer.analyzeDocument(document);
      const info =
        getSymbolHoverInfo(hoverToken.text, table, document, position) ||
        getLocalDoc(hoverToken.text) ||
        getInstructionFallbackHoverInfo(hoverToken.text);
      if (!info) {
        return null;
      }

      return new vscode.Hover(formatHover(vscode, info));
    }
  };
}

function makeNumericLabelReferenceHover(vscode, document, symbol, position) {
  const target = resolveNumericLabel(document, symbol.name, symbol.direction, position.line);
  const directionText = symbol.direction === "forward" ? "forward" : "backward";
  const targetText = symbol.direction === "forward" ? "next" : "previous";
  const markdown = new vscode.MarkdownString("");
  markdown.supportHtml = false;
  markdown.isTrusted = false;

  markdown.appendMarkdown(`### NASM numeric label reference: \`${symbol.text}\`\n\n`);
  markdown.appendMarkdown(`\`${symbol.text}\` jumps ${directionText} to the ${targetText} \`${symbol.name}:\` label.\n\n`);
  markdown.appendMarkdown(`- \`${symbol.name}\` = numeric label name\n`);
  markdown.appendMarkdown(`- \`${symbol.text.slice(-1)}\` = ${directionText}\n\n`);

  if (target) {
    markdown.appendMarkdown(`Resolved target: \`${symbol.name}:\` at line ${target.range.line + 1}.\n\n`);
  } else {
    markdown.appendMarkdown(`No matching ${directionText} \`${symbol.name}:\` label was found in this file.\n\n`);
  }

  markdown.appendCodeblock(
    [
      "jmp 1f",
      "",
      "1:",
      "    dec rcx",
      "    jnz 1b"
    ].join("\n"),
    "asm"
  );

  return new vscode.Hover(markdown, hoverRange(vscode, symbol.range));
}

function makeNumericLabelDefinitionHover(vscode, symbol) {
  const markdown = new vscode.MarkdownString("");
  markdown.supportHtml = false;
  markdown.isTrusted = false;

  markdown.appendMarkdown(`### NASM numeric label: \`${symbol.name}:\`\n\n`);
  markdown.appendMarkdown("This is a reusable local numeric label.\n\n");
  markdown.appendMarkdown("References:\n");
  markdown.appendMarkdown(`- \`${symbol.name}f\` jumps forward to the next \`${symbol.name}:\`\n`);
  markdown.appendMarkdown(`- \`${symbol.name}b\` jumps backward to the previous \`${symbol.name}:\`\n\n`);
  markdown.appendMarkdown("Numeric labels are useful for short local jumps.\n");

  return new vscode.Hover(markdown, hoverRange(vscode, symbol.range));
}

function getInstructionFallbackHoverInfo(token) {
  const lower = String(token || "").toLowerCase();
  if (!isInstruction(lower)) {
    return null;
  }

  return {
    title: lower,
    description:
      "Recognized NASM/x86-64 instruction.\n\n" +
      "Detailed local documentation for this mnemonic is missing.\n" +
      "Please add it to:\n\n" +
      "```txt\n" +
      "data/nasm-instructions.json\n" +
      "```"
  };
}

function getHoverToken(document, position) {
  if (!document || typeof document.lineAt !== "function") {
    return null;
  }

  const line = document.lineAt(position.line).text;
  const { code, commentStart } = splitCodeAndComment(line);
  if (commentStart !== -1 && position.character >= commentStart) {
    return null;
  }

  const state = scanLine(line);
  if (isInsideRanges(position.character, state.stringRanges)) {
    return null;
  }

  HOVER_TOKEN_PATTERN.lastIndex = 0;
  let match;
  while ((match = HOVER_TOKEN_PATTERN.exec(code)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (position.character >= start && position.character <= end) {
      const text = match[0].replace(/:$/, "");
      return text ? { text, start, end, line: position.line } : null;
    }
  }

  return null;
}

function isInsideRanges(character, ranges) {
  return ranges.some((range) => character >= range.start && character < range.end);
}

function getSymbolHoverInfo(token, table, document, position) {
  const macroFunction = table.lookup("macroFunctions", token);
  if (macroFunction) {
    return getMacroFunctionHoverInfo(macroFunction, document, position);
  }

  const macro = table.lookup("macros", token);
  if (macro) {
    return getMacroConstantHoverInfo(macro);
  }

  const label =
    table.lookup("labels", token) ||
    table.lookup("localLabels", token) ||
    table.lookup("macroLocalLabels", token) ||
    table.lookup("dataSymbols", token) ||
    table.lookup("textSymbols", token);
  if (label) {
    return getLabelHoverInfo(label);
  }

  const extern = table.lookup("externs", token);
  if (extern) {
    return {
      title: extern.name,
      category: "External symbol",
      description: "Declared with `extern`; the definition is expected from another object file or library.",
      source: sourceLabel(extern)
    };
  }

  const global = table.lookup("globals", token);
  if (global) {
    return {
      title: global.name,
      category: "Global symbol",
      description: "Declared with `global`; this symbol is exported for the linker.",
      source: sourceLabel(global)
    };
  }

  const section = table.lookup("sections", token);
  if (section) {
    return getLocalDoc(section.name);
  }

  return null;
}

function getMacroFunctionHoverInfo(symbol, document, position) {
  if (symbol.defineMacro) {
    return {
      title: `NASM macro: ${symbol.name}`,
      category: "NASM preprocessor macro",
      description: "Function-like single-line macro defined with `%define` or a related directive.",
      source: sourceLabel(symbol),
      definedBy: symbol.defineMacro.original,
      expansionPattern: symbol.defineMacro.replacement || "; empty replacement"
    };
  }

  const macro = symbol.multiLineMacro || symbol;
  const lineText = document.lineAt(position.line).text;
  const args = parseMacroCallArguments(lineText, symbol.name);
  const expansion = expandMacroPreview(symbol, args);
  const info = {
    title: `NASM macro: ${symbol.name}`,
    category: "NASM multi-line macro",
    description: "Multi-line NASM macro. The preview below is a simple argument substitution, not a full NASM preprocessing pass.",
    source: sourceLabel(symbol),
    parameterCount: symbol.parameterCount !== undefined ? symbol.parameterCount : macro.parameterCount,
    parameters: args.map((arg, index) => ({ name: `%${index + 1}`, value: arg })),
    body: expansion.rawBody || normalizeBodyLines(symbol).join("\n")
  };

  if (expansion.complex) {
    info.notes = [expansion.message];
  } else {
    info.expansionPreview = expansion.preview;
    if (expansion.truncated || expansion.message) {
      info.notes = [expansion.message];
    }
  }

  return info;
}

function getMacroConstantHoverInfo(symbol) {
  const value = symbol.value || (symbol.defineMacro && symbol.defineMacro.replacement) || (symbol.assignMacro && symbol.assignMacro.expression);
  const syscallDoc = getSyscallDocByMacro(symbol.name, value);
  const info = {
    title: `NASM constant: ${symbol.name}`,
    category: "NASM macro constant",
    description: symbol.generated ? "Generated NASM structure constant." : "Single-line NASM preprocessor constant.",
    source: sourceLabel(symbol),
    value
  };

  if (syscallDoc) {
    info.related = syscallDoc;
  }

  return info;
}

function getLabelHoverInfo(symbol) {
  const kind = symbol.sectionKind === "data" ? "Data label" : "Code label";
  return {
    title: symbol.name,
    category: kind,
    description: symbol.sectionKind === "data" ? "Label in a data-like section." : "Label in a code-like section.",
    source: sourceLabel(symbol),
    notes: symbol.section ? [`Section: \`${symbol.section}\``] : []
  };
}

function sourceLabel(symbol) {
  if (!symbol || !symbol.fileUri) {
    return "";
  }

  const line = symbol.range && Number.isInteger(symbol.range.line) ? symbol.range.line + 1 : undefined;
  const filename = path.basename(symbol.fileUri);
  return line ? `${filename}:${line}` : filename;
}

function hoverRange(vscode, range) {
  if (!range || !Number.isInteger(range.line) || !Number.isInteger(range.character)) {
    return undefined;
  }

  const length = Number.isInteger(range.length) ? range.length : 1;
  if (typeof vscode.Range === "function") {
    return new vscode.Range(range.line, range.character, range.line, range.character + length);
  }

  return {
    start: { line: range.line, character: range.character },
    end: { line: range.line, character: range.character + length }
  };
}

function formatHover(vscode, info) {
  const markdown = new vscode.MarkdownString("");
  markdown.supportHtml = false;
  markdown.isTrusted = false;

  const subtitle = info.subtitle ? ` — ${escapeMarkdown(info.subtitle)}` : "";
  markdown.appendMarkdown(`### \`${escapeMarkdown(info.title || "")}\`${subtitle}\n\n`);
  appendField(markdown, "Category", info.category);
  if (info.description) {
    markdown.appendMarkdown(`${info.description}\n\n`);
  }
  appendField(markdown, "Defined in", info.source);

  if (info.parameterCount !== undefined) {
    appendField(markdown, "Parameter count", String(info.parameterCount));
  }

  if (info.parameters && info.parameters.length) {
    markdown.appendMarkdown("**Parameters:**\n");
    for (const parameter of info.parameters) {
      markdown.appendMarkdown(`- \`${escapeMarkdown(parameter.name)}\` = \`${escapeMarkdown(parameter.value)}\`\n`);
    }
    markdown.appendMarkdown("\n");
  }

  if (info.value !== undefined && info.value !== "") {
    markdown.appendMarkdown("**Value:**\n");
    markdown.appendCodeblock(String(info.value), "asm");
  }

  appendCode(markdown, "Defined by", info.definedBy);
  appendCode(markdown, "Expansion pattern", info.expansionPattern);
  appendCode(markdown, "Body", info.body);
  appendCode(markdown, "Preview with arguments", info.expansionPreview);
  appendCode(markdown, "Syntax", asBlock(info.syntax));
  appendCode(markdown, "Examples", asBlock(info.examples));
  appendFlags(markdown, info.flags);

  if (info.related) {
    markdown.appendMarkdown(`**${escapeMarkdown(info.related.title)}:** ${escapeMarkdown(info.related.description)}\n\n`);
    appendCode(markdown, "Syscall registers", asBlock(info.related.syntax));
    appendCode(markdown, "Syscall example", asBlock(info.related.examples));
  }

  if (info.notes && info.notes.length) {
    markdown.appendMarkdown("**Notes:**\n");
    for (const note of info.notes) {
      markdown.appendMarkdown(note.startsWith("- ") ? `${note}\n` : `- ${note}\n`);
    }
    markdown.appendMarkdown("\n");
  }

  return markdown;
}

function appendField(markdown, label, value) {
  if (value) {
    markdown.appendMarkdown(`**${label}:** ${escapeMarkdown(value)}\n\n`);
  }
}

function appendCode(markdown, label, value) {
  if (value) {
    markdown.appendMarkdown(`**${label}:**\n`);
    markdown.appendCodeblock(value, "asm");
  }
}

function appendFlags(markdown, flags) {
  if (!flags) {
    return;
  }

  const rows = [];
  addFlagRow(rows, "Reads", flags.reads);
  addFlagRow(rows, "Updates", flags.writes || flags.updates);
  addFlagRow(rows, "Sets", flags.sets);
  addFlagRow(rows, "Clears", flags.clears);
  addFlagRow(rows, "Leaves undefined", flags.undefined);

  if (!rows.length) {
    return;
  }

  markdown.appendMarkdown("**Flags:**\n");
  for (const row of rows) {
    markdown.appendMarkdown(`- ${row}\n`);
  }
  markdown.appendMarkdown("\n");
}

function addFlagRow(rows, label, values) {
  if (Array.isArray(values) && values.length) {
    rows.push(`${label} ${values.map((flag) => `\`${escapeMarkdown(flag)}\``).join(", ")}.`);
  }
}

function asBlock(value) {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value.join("\n") : String(value);
}

function escapeMarkdown(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

module.exports = {
  createHoverProvider,
  getHoverToken,
  makeNumericLabelReferenceHover,
  makeNumericLabelDefinitionHover,
  getSymbolHoverInfo,
  getInstructionFallbackHoverInfo,
  formatHover,
  appendFlags,
  sourceLabel
};
