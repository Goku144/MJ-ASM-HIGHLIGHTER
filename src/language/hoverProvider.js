"use strict";

const path = require("path");
const { getLocalDoc, getSyscallDocByMacro } = require("./localDocs");
const { expandMacroPreview, parseMacroCallArguments, normalizeBodyLines } = require("./macroExpansion");

const HOVER_TOKEN_PATTERN = /%%[A-Za-z_.$?@][A-Za-z0-9_.$?@]*|%[A-Za-z][A-Za-z0-9_]*|\.[A-Za-z0-9_.-]+|[A-Za-z_.$?@][A-Za-z0-9_.$?@]*:?\b|\d+[fb]?\b|\$\$|\$/g;

function createHoverProvider(vscode, analyzer) {
  return {
    provideHover(document, position) {
      const hoverToken = getHoverToken(document, position);
      if (!hoverToken) {
        return null;
      }

      const table = analyzer.analyzeDocument(document);
      const info = getSymbolHoverInfo(hoverToken.text, table, document, position) || getLocalDoc(hoverToken.text);
      if (!info) {
        return null;
      }

      return new vscode.Hover(formatHover(vscode, info));
    }
  };
}

function getHoverToken(document, position) {
  if (!document || typeof document.lineAt !== "function") {
    return null;
  }

  const line = document.lineAt(position.line).text;
  HOVER_TOKEN_PATTERN.lastIndex = 0;
  let match;
  while ((match = HOVER_TOKEN_PATTERN.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (position.character >= start && position.character <= end) {
      const text = match[0].replace(/:$/, "");
      return text ? { text, start, end, line: position.line } : null;
    }
  }

  return null;
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

function formatHover(vscode, info) {
  const markdown = new vscode.MarkdownString("");
  markdown.supportHtml = false;
  markdown.isTrusted = false;

  markdown.appendMarkdown(`### \`${escapeMarkdown(info.title || "")}\`\n\n`);
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

  if (info.related) {
    markdown.appendMarkdown(`**${escapeMarkdown(info.related.title)}:** ${escapeMarkdown(info.related.description)}\n\n`);
    appendCode(markdown, "Syscall registers", asBlock(info.related.syntax));
    appendCode(markdown, "Syscall example", asBlock(info.related.examples));
  }

  if (info.notes && info.notes.length) {
    markdown.appendMarkdown("**Notes:**\n");
    for (const note of info.notes) {
      markdown.appendMarkdown(note.startsWith("- ") ? `${note}\n` : `- ${escapeMarkdown(note)}\n`);
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
  getSymbolHoverInfo,
  formatHover,
  sourceLabel
};
