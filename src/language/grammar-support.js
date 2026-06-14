"use strict";

const NASM_LANGUAGE_ID = "nasmx64";
const NASM_DOCUMENT_SELECTOR = [
  { language: NASM_LANGUAGE_ID },
  { language: "asm" },
  { pattern: "**/*.asm" },
  { pattern: "**/*.nasm" },
  { pattern: "**/*.inc" }
];

function registerGrammarSupport(context, vscode, analyzer, refreshSemanticTokens) {
  const workspace = vscode && vscode.workspace;
  const refresh = () => {
    analyzer.clearCache();
    if (typeof refreshSemanticTokens === "function") {
      refreshSemanticTokens();
    }
  };

  if (!workspace || typeof workspace.createFileSystemWatcher !== "function") {
    return;
  }

  for (const pattern of ["**/*.asm", "**/*.nasm", "**/*.inc"]) {
    const watcher = workspace.createFileSystemWatcher(pattern);
    watcher.onDidChange(refresh);
    watcher.onDidCreate(refresh);
    watcher.onDidDelete(refresh);
    context.subscriptions.push(watcher);
  }

  if (typeof workspace.onDidChangeConfiguration === "function") {
    context.subscriptions.push(
      workspace.onDidChangeConfiguration((event) => {
        if (!event || typeof event.affectsConfiguration !== "function" || event.affectsConfiguration("mjAsmHighlighter.includePaths")) {
          refresh();
        }
      })
    );
  }
}

module.exports = {
  NASM_LANGUAGE_ID,
  NASM_DOCUMENT_SELECTOR,
  registerGrammarSupport
};
