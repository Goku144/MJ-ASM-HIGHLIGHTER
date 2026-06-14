"use strict";

const COMPLEX_MACRO_DIRECTIVES = /^\s*%(?:rep|endrep|if|ifn|ifdef|ifndef|ifmacro|ifnmacro|ifctx|ifnctx|ifidn|ifnidn|ifidni|ifnidni|ifid|ifnid|ifnum|ifnnum|ifstr|ifnstr|iftoken|ifntoken|ifempty|ifnempty|elif|elifn|elifdef|elifndef|elifmacro|elifnmacro|elifctx|elifnctx|elifidn|elifnidn|elifidni|elifnidni|elifid|elifnid|elifnum|elifnnum|elifstr|elifnstr|eliftoken|elifntoken|elifempty|elifnempty|else|endif|assign|iassign|rotate|macro|imacro|endmacro)\b/i;

function expandMacroPreview(macroSymbol, callArguments, options = {}) {
  const maxLines = options.maxLines || 30;
  const bodyLines = normalizeBodyLines(macroSymbol);
  const rawBody = trimCommonIndent(bodyLines).join("\n");

  if (bodyLines.some((line) => COMPLEX_MACRO_DIRECTIVES.test(line))) {
    return {
      complex: true,
      rawBody,
      preview: null,
      truncated: false,
      message: "Complex macro body; showing raw macro body only."
    };
  }

  const expandedLines = trimCommonIndent(bodyLines).map((line) =>
    line.replace(/%([1-9][0-9]*)/g, (match, indexText) => {
      const replacement = callArguments[Number(indexText) - 1];
      return replacement === undefined ? match : replacement;
    })
  );

  const visibleLines = expandedLines.slice(0, maxLines);
  return {
    complex: false,
    rawBody,
    preview: visibleLines.join("\n"),
    truncated: expandedLines.length > maxLines,
    message: expandedLines.length > maxLines ? `Preview truncated to ${maxLines} lines.` : ""
  };
}

function splitMacroArguments(text) {
  const args = [];
  let current = "";
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
      args.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim() !== "") {
    args.push(current.trim());
  }

  return args;
}

function parseMacroCallArguments(lineText, token) {
  const commentStart = findCommentStart(lineText);
  const code = lineText.slice(0, commentStart);
  const tokenIndex = findTokenIndex(code, token);
  if (tokenIndex < 0) {
    return [];
  }

  return splitMacroArguments(code.slice(tokenIndex + token.length).trim());
}

function normalizeBodyLines(macroSymbol) {
  if (!macroSymbol) {
    return [];
  }

  if (Array.isArray(macroSymbol.bodyLines)) {
    return macroSymbol.bodyLines;
  }

  if (macroSymbol.multiLineMacro) {
    return normalizeBodyLines(macroSymbol.multiLineMacro);
  }

  if (Array.isArray(macroSymbol.body)) {
    return macroSymbol.body;
  }

  return [];
}

function trimCommonIndent(lines) {
  const nonEmpty = lines.filter((line) => line.trim() !== "");
  const commonIndent = nonEmpty.reduce((indent, line) => {
    const match = line.match(/^\s*/);
    const length = match ? match[0].length : 0;
    return indent === null ? length : Math.min(indent, length);
  }, null);

  if (!commonIndent) {
    return lines.map((line) => line.trimEnd());
  }

  return lines.map((line) => line.slice(commonIndent).trimEnd());
}

function findTokenIndex(code, token) {
  const escaped = escapeRegExp(token);
  const regex = new RegExp(`(^|\\s)(${escaped})(?=\\s|$)`, "i");
  const match = code.match(regex);
  return match ? match.index + match[0].lastIndexOf(match[2]) : -1;
}

function findCommentStart(line) {
  let quote = null;
  let escaped = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === ";") {
      return i;
    }
  }

  return line.length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  COMPLEX_MACRO_DIRECTIVES,
  expandMacroPreview,
  splitMacroArguments,
  parseMacroCallArguments,
  normalizeBodyLines,
  trimCommonIndent
};
