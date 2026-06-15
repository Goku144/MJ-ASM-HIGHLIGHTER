"use strict";

const vscode = require("vscode");
const { NasmAnalyzer } = require("./language/nasmAnalyzer");
const { createSemanticTokensProvider } = require("./language/semanticTokens");
const { createHoverProvider } = require("./language/hoverProvider");
const { createDefinitionProvider, createDeclarationProvider } = require("./language/definitionProvider");
const { NASM_DOCUMENT_SELECTOR, registerGrammarSupport } = require("./language/grammar-support");

function activate(context) {
  const analyzer = new NasmAnalyzer({ vscode });
  const semanticProvider = createSemanticTokensProvider(vscode, analyzer);
  const hoverProvider = createHoverProvider(vscode, analyzer);
  const definitionProvider = createDefinitionProvider(vscode, analyzer);
  const declarationProvider = createDeclarationProvider(vscode, analyzer);

  registerGrammarSupport(context, vscode, analyzer, semanticProvider.refresh);

  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(NASM_DOCUMENT_SELECTOR, semanticProvider, semanticProvider.legend),
    vscode.languages.registerHoverProvider(NASM_DOCUMENT_SELECTOR, hoverProvider),
    vscode.languages.registerDefinitionProvider(NASM_DOCUMENT_SELECTOR, definitionProvider),
    vscode.languages.registerDeclarationProvider(NASM_DOCUMENT_SELECTOR, declarationProvider)
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
