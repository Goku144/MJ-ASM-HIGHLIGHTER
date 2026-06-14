"use strict";

const vscode = require("vscode");
const { NasmAnalyzer } = require("./language/nasmAnalyzer");
const { createSemanticTokensProvider } = require("./language/semanticTokens");
const { createHoverProvider } = require("./language/hoverProvider");
const { NASM_DOCUMENT_SELECTOR, registerGrammarSupport } = require("./language/grammar-support");

function activate(context) {
  const analyzer = new NasmAnalyzer({ vscode });
  const semanticProvider = createSemanticTokensProvider(vscode, analyzer);
  const hoverProvider = createHoverProvider(vscode, analyzer);

  registerGrammarSupport(context, vscode, analyzer, semanticProvider.refresh);

  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(NASM_DOCUMENT_SELECTOR, semanticProvider, semanticProvider.legend),
    vscode.languages.registerHoverProvider(NASM_DOCUMENT_SELECTOR, hoverProvider)
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
