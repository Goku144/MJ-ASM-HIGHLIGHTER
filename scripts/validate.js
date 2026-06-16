const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "package.json",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "assets/icon.png",
  "language-configuration.json",
  "data/nasm-docs.json",
  "data/nasm-instructions.json",
  "data/nasm-registers.json",
  "data/nasm-directives.json",
  "data/linux-syscalls-x86_64.json",
  "data/calling-conventions.json",
  "docs/token-scopes.md",
  "docs/local-hover-docs.md",
  "docs/include-resolution.md",
  "docs/go-to-definition.md",
  "src/extension.js",
  "src/language/definitionProvider.js",
  "src/language/diagnostics.js",
  "src/language/grammar-support.js",
  "src/language/hoverProvider.js",
  "src/language/instructionMnemonics.js",
  "src/language/includeResolver.js",
  "src/language/localDocs.js",
  "src/language/macroExpansion.js",
  "src/language/nasmAnalyzer.js",
  "src/language/semanticTokens.js",
  "src/language/symbolTable.js",
  "src/language/tokenTypes.js",
  "src/test/analyzer.test.js",
  "src/test/definitionProvider.test.js",
  "src/test/hoverProvider.test.js",
  "src/test/semanticTokens.test.js",
  "src/test/fixtures/common.inc",
  "src/test/fixtures/semantic.asm",
  "syntaxes/nasm-x64.tmLanguage.json",
  "snippets/nasm-x64.code-snippets",
  "examples/demo.asm",
  "examples/macros.inc",
  "examples/PrintStr.inc",
  "examples/GoToDefinition.inc",
  "examples/cross-file-macro-test.asm",
  "examples/go-to-definition-test.asm",
  "examples/color-operator-number-test.asm",
  "examples/comment-ignore-test.asm",
  "examples/instruction-hover-test.asm",
  "scripts/validate.js",
  "scripts/check-instruction-docs.js",
  ".vscodeignore",
  ".gitignore"
];

function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(root, relativePath)), `Missing required file: ${relativePath}`);
}

const pkg = readJson("package.json");
const grammar = readJson("syntaxes/nasm-x64.tmLanguage.json");
const snippets = readJson("snippets/nasm-x64.code-snippets");
const languageConfig = readJson("language-configuration.json");
const nasmDocs = readJson("data/nasm-docs.json");
const localInstructionDocs = readJson("data/nasm-instructions.json");
const localRegisterDocs = readJson("data/nasm-registers.json");
const localDirectiveDocs = readJson("data/nasm-directives.json");
const syscallDocs = readJson("data/linux-syscalls-x86_64.json");
const callingConventionDocs = readJson("data/calling-conventions.json");

assert(typeof pkg.name === "string" && /^[a-z0-9][a-z0-9-]*$/.test(pkg.name), "package.json must define a valid extension name");
assert(typeof pkg.displayName === "string" && pkg.displayName.trim().length > 0, "package.json must define displayName");
assert(typeof pkg.version === "string" && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(pkg.version), "package.json must define a semver version");
assert(pkg.publisher === "agentXorion", "package.json publisher must be agentXorion");
assert(pkg.repository && pkg.repository.url.includes("agentXorion/mj-asm-highlighter"), "package.json must include repository URL");
assert(pkg.icon === "assets/icon.png", "package.json icon must be assets/icon.png");
assert(pkg.main === "./src/extension.js", "package.json must point main to ./src/extension.js");
assert(pkg.description.includes("semantic tokens"), "description should mention semantic tokens");
assert(pkg.description.includes("standard TextMate scopes"), "description should mention standard TextMate scopes");
assert(!Object.prototype.hasOwnProperty.call(pkg, "activationEvents"), "package.json should omit explicit activationEvents that VS Code can infer");
assert(pkg.contributes && Array.isArray(pkg.contributes.languages), "package.json must contribute languages");
assert(pkg.contributes.grammars && pkg.contributes.grammars[0].scopeName === "source.asm.nasmx64", "Grammar contribution must use source.asm.nasmx64");
assert(
  pkg.contributes.grammars.some((grammarContribution) => grammarContribution.language === "nasmx64"),
  "Package must contribute a grammar for nasmx64"
);
assert(pkg.contributes.snippets && pkg.contributes.snippets[0].language === "nasmx64", "Snippets contribution must target nasmx64");
assert(
  pkg.contributes.commands &&
    pkg.contributes.commands.some((command) => command.command === "mjAsmHighlighter.diagnostics"),
  "Package must contribute the diagnostics command"
);
assert(!pkg.contributes.themes, "Theme contribution must not be required for highlighting");
assert(pkg.contributes.configurationDefaults, "Minimal NASM color defaults should be contributed");
assert(
  pkg.contributes.configurationDefaults["editor.semanticTokenColorCustomizations"],
  "Semantic token color defaults should be present"
);
assert(
  pkg.contributes.configurationDefaults["editor.tokenColorCustomizations"],
  "TextMate token color defaults should be present"
);
const semanticRules =
  pkg.contributes.configurationDefaults["editor.semanticTokenColorCustomizations"].rules;
assert(
  pkg.contributes.semanticTokenTypes &&
    ["instruction", "register", "section", "macroConstant"].every((id) =>
      pkg.contributes.semanticTokenTypes.some((tokenType) => tokenType.id === id)
    ),
  "Custom NASM semantic token types must be contributed"
);
assert(
  pkg.contributes.semanticTokenModifiers &&
    ["global", "local", "numericLabel", "macroLocal", "section", "data", "code", "external", "exported"].every((id) =>
      pkg.contributes.semanticTokenModifiers.some((modifier) => modifier.id === id)
    ),
  "Custom NASM semantic token modifiers must be contributed"
);
assert(
  pkg.contributes.configuration &&
    pkg.contributes.configuration.properties &&
    pkg.contributes.configuration.properties["mjAsmHighlighter.includePaths"],
  "Package must contribute mjAsmHighlighter.includePaths"
);
assert(
  pkg.contributes.configuration.properties["mjAsmHighlighter.includePaths"].markdownDescription.includes("${fileDirname}"),
  "Include path setting should document ${fileDirname}"
);
assert(semanticRules["instruction:nasmx64"] === "#C586C0", "Instructions must have a NASM semantic color");
assert(semanticRules["register:nasmx64"] === "#569CD6", "Registers must share the macro constant NASM semantic color");
assert(semanticRules["macro:nasmx64"] === "#569CD6", "Standard macro tokens must have a NASM semantic color");
assert(semanticRules["macro.readonly:nasmx64"] === "#569CD6", "Readonly macro tokens must have a NASM semantic color");
assert(semanticRules["namespace.section:nasmx64"] === "#4FC1FF", "Section namespaces must have a NASM semantic color");
assert(semanticRules["section:nasmx64"] === "#4FC1FF", "Section names must have a NASM semantic color");
assert(semanticRules["macroConstant:nasmx64"] === "#569CD6", "Macro constants must have a NASM semantic color");
assert(semanticRules["macroConstant.declaration:nasmx64"] === "#569CD6", "EQU declarations must have a NASM semantic color");
assert(semanticRules["keyword:nasmx64"] === "#C586C0", "Directive keywords must have a NASM semantic color");
assert(semanticRules["modifier:nasmx64"] === "#D7BA7D", "Modifiers must have a NASM semantic color");
assert(semanticRules["function.definition:nasmx64"] === "#DCDCAA", "Function definitions must have a NASM semantic color");
assert(semanticRules["variable:nasmx64"] === "#9CDCFE", "Variables must have a NASM semantic color");
assert(semanticRules["variable.declaration:nasmx64"] === "#9CDCFE", "Variable declarations must have a NASM semantic color");
assert(semanticRules["variable.definition:nasmx64"] === "#9CDCFE", "Variable definitions must have a NASM semantic color");
assert(semanticRules["variable.numericLabel:nasmx64"] === "#D7BA7D", "Numeric labels must have a NASM semantic color");
assert(semanticRules["type:nasmx64"] === "#4EC9B0", "Data/type tokens must have a NASM semantic color");
assert(semanticRules["struct:nasmx64"] === "#4EC9B0", "Struct tokens must have a NASM semantic color");
assert(semanticRules["property:nasmx64"] === "#9CDCFE", "Struct fields must have a NASM semantic color");
assert(semanticRules["string:nasmx64"] === "#CE9178", "Strings must have a NASM semantic color");

const language = pkg.contributes.languages[0];
assert(language.id === "nasmx64", "Language id must be nasmx64");
assert(language.aliases.includes("NASM x86_64"), "Language aliases must include NASM x86_64");
assert(language.aliases.includes("NASM"), "Language aliases must include NASM");
assert(language.extensions.includes(".asm"), "Language must include .asm");
assert(language.extensions.includes(".nasm"), "Language must include .nasm");
assert(language.extensions.includes(".inc"), "Language must include .inc");
assert(language.configuration === "./language-configuration.json", "Language must use language-configuration.json");
assert(!language.extensions.includes(".s"), "Language should not claim .s by default");
assert(!language.extensions.includes(".S"), "Language should not claim .S by default");

assert(grammar.scopeName === "source.asm.nasmx64", "Grammar scopeName must be source.asm.nasmx64");
assert(Array.isArray(grammar.patterns) && grammar.patterns.length > 0, "Grammar must contain top-level patterns");

const requiredRepositories = [
  "comments",
  "strings",
  "numbers",
  "labels",
  "dataSections",
  "dataLabels",
  "equDefinitions",
  "preprocessor",
  "macroDefinitions",
  "macroDefinedNames",
  "macroParameters",
  "globalDeclarations",
  "registers",
  "instructions",
  "directives",
  "sectionDeclarations",
  "sectionAttributes",
  "sectionNames",
  "dataDeclarations",
  "sizeSpecifiers",
  "brackets",
  "operators"
];

for (const key of requiredRepositories) {
  assert(grammar.repository && grammar.repository[key], `Grammar must contain repository: ${key}`);
}

const grammarText = fs.readFileSync(path.join(root, "syntaxes/nasm-x64.tmLanguage.json"), "utf8");
const extensionText = fs.readFileSync(path.join(root, "src/extension.js"), "utf8");
const diagnosticsText = fs.readFileSync(path.join(root, "src/language/diagnostics.js"), "utf8");
const definitionProviderText = fs.readFileSync(path.join(root, "src/language/definitionProvider.js"), "utf8");
const analyzerText = fs.readFileSync(path.join(root, "src/language/nasmAnalyzer.js"), "utf8");
const semanticText = fs.readFileSync(path.join(root, "src/language/semanticTokens.js"), "utf8");
const symbolTableText = fs.readFileSync(path.join(root, "src/language/symbolTable.js"), "utf8");
const includeResolverText = fs.readFileSync(path.join(root, "src/language/includeResolver.js"), "utf8");
const hoverProviderText = fs.readFileSync(path.join(root, "src/language/hoverProvider.js"), "utf8");
const localDocsText = fs.readFileSync(path.join(root, "src/language/localDocs.js"), "utf8");
const macroExpansionText = fs.readFileSync(path.join(root, "src/language/macroExpansion.js"), "utf8");
const tokenTypesText = fs.readFileSync(path.join(root, "src/language/tokenTypes.js"), "utf8");
const grammarSupportText = fs.readFileSync(path.join(root, "src/language/grammar-support.js"), "utf8");
const instructionMnemonicsText = fs.readFileSync(path.join(root, "src/language/instructionMnemonics.js"), "utf8");
const languageText = [
  extensionText,
  diagnosticsText,
  definitionProviderText,
  analyzerText,
  semanticText,
  symbolTableText,
  includeResolverText,
  hoverProviderText,
  localDocsText,
  macroExpansionText,
  tokenTypesText,
  grammarSupportText,
  instructionMnemonicsText
].join("\n");

for (const scope of [
  "keyword.mnemonic.instruction.asm.nasm",
  "keyword.mnemonic.asm.nasm",
  "keyword.other.instruction.asm.nasm",
  "variable.language.asm.nasm",
  "variable.language.register.asm.nasm",
  "variable.language.register.general.asm.nasm",
  "variable.language.register.simd.asm.nasm",
  "variable.language.register.fpu.asm.nasm",
  "variable.language.register.segment.asm.nasm",
  "support.variable.register.asm.nasm",
  "constant.numeric.asm.nasm",
  "constant.numeric.integer.asm.nasm",
  "constant.numeric.hex.asm.nasm",
  "constant.numeric.binary.asm.nasm",
  "constant.numeric.octal.asm.nasm",
  "constant.numeric.float.asm.nasm",
  "keyword.control.directive.preprocessor.asm.nasm",
  "keyword.control.conditional.preprocessor.asm.nasm",
  "keyword.control.include.preprocessor.asm.nasm",
  "keyword.directive.section.asm.nasm",
  "keyword.control.directive.asm.nasm",
  "comment.line.semicolon.asm.nasm",
  "punctuation.definition.comment.asm.nasm",
  "punctuation.definition.directive.asm.nasm",
  "punctuation.definition.macro.asm.nasm",
  "punctuation.definition.preprocessor.asm.nasm",
  "entity.name.constant.preprocessor.asm.nasm",
  "constant.other.preprocessor.asm.nasm",
  "entity.name.function.asm.nasm",
  "entity.name.function.macro.asm.nasm",
  "entity.name.section.asm.nasm",
  "entity.name.constant.asm.nasm",
  "constant.other.asm.nasm",
  "variable.other.declaration.asm.nasm",
  "variable.parameter.macro.asm.nasm",
  "variable.parameter.macro.nasm",
  "storage.modifier.global.asm.nasm",
  "storage.modifier.extern.asm.nasm",
  "entity.name.symbol.asm.nasm",
  "entity.name.label.numeric.nasm",
  "entity.name.label.numeric.asm.nasm",
  "variable.other.label.numeric.reference.nasm",
  "variable.other.label.numeric.reference.asm.nasm",
  "entity.name.label.local.macro.nasm",
  "entity.name.label.local.macro.asm.nasm",
  "variable.other.label.local.macro.nasm",
  "variable.other.label.local.reference.asm.nasm",
  "variable.other.label.local.macro.reference.asm.nasm",
  "entity.name.label.local.asm.nasm",
  "storage.modifier.symbol-attribute.nasm",
  "storage.modifier.symbol-attribute.function.asm.nasm",
  "storage.modifier.symbol-attribute.data.asm.nasm",
  "storage.modifier.section.attribute.nasm",
  "storage.modifier.section.attribute.asm.nasm",
  "entity.name.label.asm.nasm",
  "variable.other.asm.nasm",
  "entity.name.variable.asm.nasm",
  "storage.type.data.asm.nasm",
  "keyword.directive.storage.asm.nasm",
  "storage.type.size.asm.nasm",
  "storage.modifier.addressing.asm.nasm",
  "storage.type.asm.nasm",
  "support.type.asm.nasm",
  "storage.modifier.asm.nasm",
  "keyword.operator.asm.nasm",
  "keyword.operator.arithmetic.asm.nasm",
  "keyword.operator.assignment.asm.nasm",
  "punctuation.separator.comma.asm.nasm",
  "punctuation.separator.segment.asm.nasm",
  "punctuation.section.brackets.begin.asm.nasm",
  "punctuation.section.brackets.end.asm.nasm"
]) {
  assert(grammarText.includes(scope), `Grammar should include scope: ${scope}`);
}

for (const source of [
  "registerDocumentSemanticTokensProvider",
  "registerHoverProvider",
  "registerDefinitionProvider",
  "registerDeclarationProvider",
  "registerDiagnostics",
  "registerCommand",
  "mjAsmHighlighter.diagnostics",
  "provideHover",
  "provideDefinition",
  "provideDeclaration",
  "NASM_DOCUMENT_SELECTOR",
  "NASM_LANGUAGE_ID",
  "{ language: \"asm\" }",
  "{ pattern: \"**/*.asm\" }",
  "MarkdownString",
  "createHoverProvider",
  "createDefinitionProvider",
  "createDeclarationProvider",
  "getNasmSymbolAtPosition",
  "getLocalDoc",
  "getSyscallDocByMacro",
  "expandMacroPreview",
  "Preview with arguments",
  "onDidChangeSemanticTokens",
  "refreshSemanticTokens",
  "SemanticTokensLegend",
  "tokenModifiers",
  "tokenTypes",
  "NasmAnalyzer",
  "createSemanticTokensProvider",
  "collectSemanticTokens",
  "SymbolTable",
  "IncludeResolver",
  "COMMON_INCLUDE_FOLDERS",
  "includePaths",
  "analyzeDocument",
  "analyzeFile",
  "clearCache",
  "maxIncludeDepth",
  "parseSection",
  "parseSymbolDirective",
  "parseStructStart",
  "parseStructField",
  "numericLabels",
  "macroLocalLabels",
  "localLabelDefinitions",
  "macroLocalLabelDefinitions",
  "structFields",
  "declaration",
  "definition",
  "readonly",
  "global",
  "local",
  "numericLabel",
  "macroLocal",
  "external",
  "exported",
  "instruction",
  "register",
  "section",
  "macro",
  "namespace",
  "modifier",
  "struct",
  "property",
  "function",
  "variable",
  "keyword",
  "type",
  "number",
  "string",
  "operator",
  "parameter",
  "nasmx64"
]) {
  assert(languageText.includes(source), `Semantic architecture should include: ${source}`);
}

for (const instruction of [
  "finit",
  "fld",
  "fadd",
  "fstp",
  "emms",
  "movq",
  "movdqa",
  "addps",
  "movapd",
  "vpxor",
  "vaddps",
  "kmovw",
  "ktestw",
  "bndcl",
  "lock",
  "repne",
  "xadd",
  "sha256rnds2"
]) {
  assert(languageText.includes(`"${instruction}"`) || localInstructionDocs[instruction], `Semantic instruction set should include: ${instruction}`);
}

for (const symbol of [
  "const INSTRUCTIONS = new Set",
  "const REGISTERS =",
  "const DIRECTIVES = new Set",
  "const DATA_DECLARATIONS = new Set",
  "const SIZE_SPECIFIERS = new Set",
  "const CODE_SECTIONS = new Set",
  "const DATA_SECTIONS = new Set",
  "INSTRUCTIONS.has(word)",
  "table.lookup(\"macros\", word)",
  "table.lookup(\"macroFunctions\", word)",
  "table.lookup(\"dataSymbols\", word)",
  "table.lookup(\"textSymbols\", word)",
  "table.lookup(\"externs\", word)",
  "table.lookup(\"globals\", word)",
  "table.lookup(\"structs\", word)",
  "table.lookup(\"structFields\", fullName)",
  "\"namespace\", [\"section\"",
  "\"register\"",
  "\"instruction\"",
  "\"macro\", [\"declaration\", \"readonly\"]",
  "\"variable\", [\"definition\", \"numericLabel\"]",
  "\"variable\", [\"definition\", \"macroLocal\"]",
  "directiveName === \"global\" ? \"exported\"",
  "symbol.attribute === \"data\" ? \"variable\" : \"function\""
]) {
  assert(languageText.includes(symbol), `Semantic provider should enforce: ${symbol}`);
}

for (const source of [
  "this.defineMacros = new Map()",
  "this.assignMacros = new Map()",
  "this.multiLineMacros = new Map()",
  "parseMacroConstant",
  "parseMultiLineMacro",
  "getMacroFunctionHoverInfo",
  "expandMacroPreview",
  "parseMacroCallArguments",
  "Preview with arguments",
  "COMPLEX_MACRO_DIRECTIVES"
]) {
  assert(languageText.includes(source), `Macro hover support should include: ${source}`);
}

const requiredDocKeys = [
  "mov", "lea", "push", "pop", "add", "sub", "xor", "or", "and", "cmp", "test", "inc", "dec",
  "jmp", "je", "jne", "call", "ret", "syscall", "int", "enter", "leave", "nop", "cpuid",
  "rdtsc", "lfence", "sfence", "mfence", "pause", "ud2", "lock", "rep", "movsb", "stosb",
  "lodsb", "scasb", "finit", "fld", "fstp", "fadd", "movq", "movdqa", "addps", "vpxor",
  "vaddps", "kmovw", "ktestw", "xadd", "bts", "aesenc",
  "rax", "rbx", "rcx", "rdx", "rsi", "rdi", "rbp", "rsp", "rip", "eax", "ebx", "ecx", "edx",
  "ax", "bx", "cx", "dx", "al", "bl", "cl", "dl", "cs", "ds", "es", "fs", "gs", "ss",
  "cr0", "cr2", "cr3", "cr4", "cr8", "dr0", "dr1", "dr2", "dr3", "dr6", "dr7",
  "bits", "default", "cpu", "section", "segment", "global", "extern", "org", "absolute",
  "common", "group", "align", "alignb", "struc", "endstruc", "istruc", "iend", "at",
  "%define", "%xdefine", "%idefine", "%assign", "%iassign", "%undef", "%macro", "%imacro",
  "%endmacro", "%rep", "%endrep", "%if", "%ifdef", "%ifndef", "%elif", "%elifdef",
  "%elifndef", "%else", "%endif", "%include", "%error", "%warning", "%fatal", "%push",
  "%pop", "%rotate", "%strlen", "%substr", "%local", "%line",
  "db", "dw", "dd", "dq", "dt", "do", "dy", "dz", "resb", "resw", "resd", "resq",
  "resy", "resz", "equ", "times",
  "byte", "word", "dword", "qword", "tword", "oword", "yword", "zword", "ptr", "rel",
  "abs", "strict", "short", "near", "far", "wrt",
  ".text", ".data", ".bss", ".rodata", ".rdata", ".init", ".fini", ".note.gnu-stack"
];

for (const key of requiredDocKeys) {
  assert(nasmDocs[key], `data/nasm-docs.json must include documentation key: ${key}`);
  assert(nasmDocs[key].kind, `${key} documentation must include kind`);
  assert(nasmDocs[key].title, `${key} documentation must include title`);
  assert(nasmDocs[key].category, `${key} documentation must include category`);
  assert(nasmDocs[key].description, `${key} documentation must include description`);
  assert(Array.isArray(nasmDocs[key].syntax), `${key} documentation must include syntax array`);
  assert(Array.isArray(nasmDocs[key].examples), `${key} documentation must include examples array`);
  assert(nasmDocs[key].opcode, `${key} documentation must include opcode`);
  assert(Array.isArray(nasmDocs[key].references) && nasmDocs[key].references.length > 0, `${key} documentation must include references`);
}

assert(
  nasmDocs.mov.opcode.includes("88 /r") && nasmDocs.mov.references.some((reference) => reference.url.includes("/x86/mov")),
  "mov documentation should include real opcode forms and an instruction reference"
);
assert(
  nasmDocs.section.opcode === "Not applicable. This is an assembler directive.",
  "NASM directives must use the required directive opcode note"
);
assert(
  nasmDocs.rax.opcode === "Not applicable. Registers are operands, not instructions.",
  "Registers must use the required register opcode note"
);
assert(
  nasmDocs.qword.opcode === "Not applicable. Size specifiers guide assembly.",
  "Size specifiers must use the required size-specifier opcode note"
);

for (const key of [
  "mov", "lea", "push", "pop", "call", "ret", "syscall", "xor", "add", "sub", "imul", "div",
  "cmp", "test", "je", "jne", "ja", "jb", "jg", "jl", "jmp", "loop", "loope", "loopne",
  "inc", "dec", "and", "or", "not", "neg", "adc", "sbb", "mul", "idiv", "cdq", "cqo",
  "movzx", "movsx", "xchg", "int", "enter", "leave", "hlt", "cpuid", "rdtsc",
  "shl", "shr", "sar", "rol", "ror", "cmove", "cmovne", "sete", "setne", "cld", "rep",
  "movsb", "lock", "nop", "pxor", "movdqa", "paddd", "movups", "vmovups", "vaddps",
  "finit", "fld", "fld1", "faddp", "fstp"
]) {
  const doc = localInstructionDocs[key];
  assert(doc, `data/nasm-instructions.json must include ${key}`);
  if (doc.aliasOf) {
    assert(localInstructionDocs[doc.aliasOf], `${key} local instruction alias target must exist`);
  } else {
    assert(doc.summary, `${key} local instruction doc must include summary`);
    assert(Array.isArray(doc.examples), `${key} local instruction doc must include examples`);
  }
}

for (const key of ["rax", "rdi", "rsi", "rdx", "r8", "r9", "r10", "fs", "gs", "cs", "ds", "es", "ss"]) {
  assert(localRegisterDocs[key], `data/nasm-registers.json must include ${key}`);
}
assert(localRegisterDocs.familyTemplates.xmm, "Register docs must include xmm family template");
assert(localRegisterDocs.familyTemplates.ymm, "Register docs must include ymm family template");
assert(localRegisterDocs.familyTemplates.zmm, "Register docs must include zmm family template");
assert(localRegisterDocs.familyTemplates.st, "Register docs must include x87 stack template");

for (const key of ["bits", "default", "cpu", "global", "extern", "section", "db", "dw", "dd", "dq", "resb", "resw", "resd", "resq", "equ", "times", "align", "noalloc", "noexec", "nowrite", "progbits", "struc", "endstruc", "istruc", "at", "iend", "%include", "%define", "%assign", "%macro", "%imacro", "%endmacro", "%ifdef", "%else", "%endif", "%rep", "%endrep", "%warning"]) {
  assert(localDirectiveDocs[key], `data/nasm-directives.json must include ${key}`);
}

for (const [name, number] of Object.entries({ read: 0, write: 1, open: 2, close: 3, mmap: 9, munmap: 11, exit: 60, exit_group: 231 })) {
  assert(syscallDocs.syscalls[name] && syscallDocs.syscalls[name].number === number, `Syscall docs must include ${name}`);
}
assert(callingConventionDocs.systemVAMD64.integerArguments.join(",") === "rdi,rsi,rdx,rcx,r8,r9", "Calling convention docs must include System V argument registers");
assert(callingConventionDocs.linuxSyscallX86_64.arguments.join(",") === "rdi,rsi,rdx,r10,r8,r9", "Calling convention docs must include Linux syscall argument registers");

const demoText = fs.readFileSync(path.join(root, "examples/demo.asm"), "utf8");
for (const source of [
  "%define SYS_EXIT",
  "%define BUFFER_SIZE",
  "%define BIT(x)",
  "%assign LOCAL_COUNT",
  "%macro prologue",
  "prologue 32",
  "repeat_store buffer, 1, LOCAL_COUNT"
]) {
  assert(demoText.includes(source), `Demo should include macro hover example: ${source}`);
}

const printStrText = fs.readFileSync(path.join(root, "examples/PrintStr.inc"), "utf8");
const crossFileText = fs.readFileSync(path.join(root, "examples/cross-file-macro-test.asm"), "utf8");
const goToDefinitionIncludeText = fs.readFileSync(path.join(root, "examples/GoToDefinition.inc"), "utf8");
const goToDefinitionText = fs.readFileSync(path.join(root, "examples/go-to-definition-test.asm"), "utf8");
const operatorNumberText = fs.readFileSync(path.join(root, "examples/color-operator-number-test.asm"), "utf8");
const commentIgnoreText = fs.readFileSync(path.join(root, "examples/comment-ignore-test.asm"), "utf8");
const instructionHoverText = fs.readFileSync(path.join(root, "examples/instruction-hover-test.asm"), "utf8");
assert(/^\s*%macro\s+print_str_macro\b(?:\s+2\b)?/im.test(printStrText), "PrintStr.inc must define print_str_macro");
assert(crossFileText.includes("%include \"PrintStr.inc\""), "Cross-file example must include PrintStr.inc");
assert(crossFileText.includes("print_str_macro rdi, rsi"), "Cross-file example must call included macro");
assert(goToDefinitionIncludeText.includes("%define SYS_WRITE 1"), "GoToDefinition.inc must define SYS_WRITE");
assert(goToDefinitionIncludeText.includes("%macro print_str_macro 2"), "GoToDefinition.inc must define print_str_macro");
assert(goToDefinitionIncludeText.includes("struc Person"), "GoToDefinition.inc must define Person");
assert(goToDefinitionText.includes("%include \"GoToDefinition.inc\""), "Go-to-definition example must include GoToDefinition.inc");
assert(goToDefinitionText.includes("call local_function"), "Go-to-definition example must call local_function");
assert(goToDefinitionText.includes("jnz .loop"), "Go-to-definition example must reference .loop");
assert(goToDefinitionText.includes("jnz 1b"), "Go-to-definition example must reference numeric label 1b");
assert(goToDefinitionText.includes("at Person.age, dd 21"), "Go-to-definition example must reference Person.age");
assert(operatorNumberText.includes("section .rodata align=16"), "Operator/number example must include align attribute");
assert(operatorNumberText.includes("vector_a: dd 1.0, 2.0, 3.0, 4.0"), "Operator/number example must include float array");
assert(operatorNumberText.includes("qword [fs:0x28]"), "Operator/number example must include segment override");
assert(commentIgnoreText.includes("%include \"PrintStr.inc\""), "Comment-ignore example must include PrintStr.inc");
assert(commentIgnoreText.includes("; print_str_macro rdi, rsi"), "Comment-ignore example must include commented macro call");
assert(commentIgnoreText.includes("; SYS_WRITE"), "Comment-ignore example must include commented constant");
assert(commentIgnoreText.includes("mov rax, SYS_WRITE ; SYS_WRITE"), "Comment-ignore example must include inline commented constant");
assert(commentIgnoreText.includes("jmp 1f ; 1f"), "Comment-ignore example must include inline commented numeric forward reference");
assert(commentIgnoreText.includes("jnz 1b ; 1b"), "Comment-ignore example must include inline commented numeric backward reference");
for (const source of ["push rbp", "rep movsb", "lock inc qword [counter]", "vaddps ymm1", "fstp qword [float_value]", "leave"]) {
  assert(instructionHoverText.includes(source), `Instruction hover example must include: ${source}`);
}

const readmeText = fs.readFileSync(path.join(root, "README.md"), "utf8");
const tokenScopesText = fs.readFileSync(path.join(root, "docs/token-scopes.md"), "utf8");
const goToDefinitionDocsText = fs.readFileSync(path.join(root, "docs/go-to-definition.md"), "utf8");
for (const source of [
  "## Go to Definition",
  "Ctrl+Click / F12",
  "included macros/constants",
  "## Cross-file macro test",
  "The extension supports macros declared in included `.inc` files.",
  "print_str_macro` is highlighted as a macro/function call",
  "Ctrl+Click / Go to Definition should jump to `PrintStr.inc`",
  "MJ Asm Highlighter: Diagnostics",
  "Output -> `MJ Asm Highlighter`",
  "NASM x86_64",
  "## Hover documentation",
  "Hover over `mov`",
  "Hover over `rax`",
  "Hover over `%define`",
  "Hover over `.data`",
  "Hover over `db`",
  "Hover over `qword`",
  "## Macro expansion hover",
  "Hover over `SYS_EXIT`",
  "Hover over `BUFFER_SIZE`",
  "Hover over `BIT`",
  "Hover over `LOCAL_COUNT`",
  "Hover over `prologue`",
  "Hover over `repeat_store`",
  "`SYS_EXIT` shows expands to `60`",
  "docs/token-scopes.md",
  "docs/local-hover-docs.md",
  "docs/include-resolution.md",
  "docs/go-to-definition.md",
  "mjAsmHighlighter.includePaths",
  "semantic token type `macro`"
]) {
  assert(readmeText.includes(source), `README should document hover testing: ${source}`);
}

for (const source of [
  "Ctrl+Click",
  "F12",
  "Right click -> `Go to Definition`",
  "Numeric labels",
  "Macro-local labels",
  "Person.age",
  "Person_size",
  "extern",
  "not a full NASM assembler",
  "simple quoted `%include`"
]) {
  assert(goToDefinitionDocsText.includes(source), `docs/go-to-definition.md should document: ${source}`);
}

for (const source of [
  "macro.declaration.readonly",
  "variable.numericLabel",
  "variable.macroLocal",
  "namespace.section",
  "function.global.exported",
  "function.global.external",
  "struct.declaration",
  "property",
  "constant.numeric.hex.asm.nasm",
  "entity.name.label.local.macro.asm.nasm"
]) {
  assert(tokenScopesText.includes(source), `docs/token-scopes.md should document: ${source}`);
}

assert(pkg.scripts && pkg.scripts.test && pkg.scripts.test.includes("semanticTokens.test.js"), "package.json should run semantic token tests");
assert(pkg.scripts && pkg.scripts.test && pkg.scripts.test.includes("definitionProvider.test.js"), "package.json should run definition provider tests");
assert(pkg.scripts && pkg.scripts["check:instruction-docs"] === "node scripts/check-instruction-docs.js", "package.json should define check:instruction-docs");
assert(pkg.scripts.validate && pkg.scripts.validate.includes("npm run check:instruction-docs"), "package.json validate should run instruction doc coverage");
assert(pkg.scripts.package && pkg.scripts.package.includes("--out dist"), "package.json package script should write the VSIX to dist");

assert(
  languageText.includes("provideDocumentSemanticTokens"),
  "Semantic token module must implement provideDocumentSemanticTokens"
);
assert(
  extensionText.includes("registerDiagnostics(context, vscode, analyzer)"),
  "Extension must register diagnostics command support"
);
assert(
  diagnosticsText.includes("commands.registerCommand(DIAGNOSTICS_COMMAND"),
  "Diagnostics module must register a VS Code command"
);
assert(
  diagnosticsText.includes("Resolved include:") && diagnosticsText.includes("Collected macro from include:"),
  "Diagnostics output must include resolved includes and collected include macros"
);
assert(
  extensionText.includes("registerDocumentSemanticTokensProvider(NASM_DOCUMENT_SELECTOR"),
  "Semantic token provider must register with the NASM document selector"
);
assert(
  extensionText.includes("registerHoverProvider(NASM_DOCUMENT_SELECTOR"),
  "Hover provider must register with the NASM document selector"
);
assert(
  extensionText.includes("registerDefinitionProvider(NASM_DOCUMENT_SELECTOR"),
  "Definition provider must register with the NASM document selector"
);
assert(
  extensionText.includes("registerDeclarationProvider(NASM_DOCUMENT_SELECTOR"),
  "Declaration provider must register with the NASM document selector"
);
if (languageText.includes("createReferenceProvider") || extensionText.includes("registerReferenceProvider")) {
  assert(
    extensionText.includes("registerReferenceProvider(NASM_DOCUMENT_SELECTOR"),
    "Reference provider must register with the NASM document selector when implemented"
  );
}
if (languageText.includes("createDocumentLinkProvider") || extensionText.includes("registerDocumentLinkProvider")) {
  assert(
    extensionText.includes("registerDocumentLinkProvider(NASM_DOCUMENT_SELECTOR"),
    "Document link provider must register with the NASM document selector when implemented"
  );
}

const topLevelIncludes = grammar.patterns.map((pattern) => pattern.include);
const expectedOrder = [
  "#comments",
  "#strings",
  "#preprocessor",
  "#macroDefinitions",
  "#macroParameters",
  "#globalDeclarations",
  "#dataSections",
  "#equDefinitions",
  "#labels",
  "#sectionDeclarations",
  "#sectionNames",
  "#numbers",
  "#registers",
  "#instructions",
  "#directives",
  "#dataDeclarations",
  "#sizeSpecifiers",
  "#brackets",
  "#operators",
  "#symbols"
];

assert(
  JSON.stringify(topLevelIncludes) === JSON.stringify(expectedOrder),
  "Grammar top-level patterns must preserve the requested priority order"
);

const labelPattern = grammar.repository.labels.patterns[3];
assert(
  labelPattern.captures["1"].name.startsWith("entity.name.function.asm.nasm"),
  "Code label fallback must use entity.name.function.asm.nasm first"
);
assert(
  labelPattern.captures["2"].name === "punctuation.separator.label.asm.nasm",
  "Label colons must use punctuation.separator.label.asm.nasm"
);

const dataLabelPattern = grammar.repository.dataLabels.patterns[3];
assert(
  dataLabelPattern.captures["1"].name.startsWith("entity.name.variable.asm.nasm"),
  "Data label fallback must use entity.name.variable.asm.nasm first"
);
assert(
  dataLabelPattern.captures["2"].name === "punctuation.separator.label.asm.nasm",
  "Data label colons must use punctuation.separator.label.asm.nasm"
);

const equPattern = grammar.repository.equDefinitions.patterns[0];
assert(
  equPattern.captures["1"].name.includes("entity.name.constant.asm.nasm"),
  "EQU definitions must use constant-compatible scopes"
);

const sectionPattern = grammar.repository.sectionDeclarations.patterns[0];
assert(
  sectionPattern.beginCaptures["2"].name === "entity.name.section.asm.nasm",
  "Section names must use entity.name.section.asm.nasm without function scopes"
);

const sectionNamePattern = grammar.repository.sectionNames.patterns[0];
assert(
  sectionNamePattern.name === "entity.name.section.asm.nasm",
  "Standalone section names must use entity.name.section.asm.nasm without function scopes"
);

const sectionAlignAttributePattern = grammar.repository.sectionAttributes.patterns[0];
assert(
  sectionAlignAttributePattern.captures["1"].name.includes("storage.modifier.section.attribute.asm.nasm"),
  "Section align attribute name must use the section attribute scope"
);
assert(
  sectionAlignAttributePattern.captures["3"].name.includes("keyword.operator.assignment.asm.nasm"),
  "Section align assignment must use the assignment operator scope"
);
assert(
  sectionAlignAttributePattern.captures["5"].name.includes("constant.numeric.integer.asm.nasm"),
  "Section align value must use the integer numeric scope"
);

const bracketScopeText = JSON.stringify(grammar.repository.brackets);
assert(bracketScopeText.includes("punctuation.section.brackets.begin.asm.nasm"), "Bracket begin scope must be present");
assert(bracketScopeText.includes("punctuation.section.brackets.end.asm.nasm"), "Bracket end scope must be present");

const operatorScopeText = JSON.stringify(grammar.repository.operators);
for (const scope of [
  "keyword.operator.arithmetic.asm.nasm",
  "keyword.operator.assignment.asm.nasm",
  "punctuation.separator.comma.asm.nasm",
  "punctuation.separator.segment.asm.nasm"
]) {
  assert(operatorScopeText.includes(scope), `Operator grammar must include ${scope}`);
}

const macroPattern = grammar.repository.macroDefinitions.patterns[0];
assert(
  macroPattern.captures["2"].name.includes("punctuation.definition.directive.asm.nasm"),
  "Macro definition percent must use punctuation.definition.directive.asm.nasm"
);
assert(
  macroPattern.captures["2"].name.includes("punctuation.definition.macro.asm.nasm"),
  "Macro definition percent must use punctuation.definition.macro.asm.nasm"
);
assert(
  macroPattern.captures["4"].name === "entity.name.function.asm.nasm entity.name.function.macro.asm.nasm",
  "Macro names must use function-compatible scopes"
);

const symbolPattern = grammar.repository.symbols.patterns[3];
assert(
  symbolPattern.name.startsWith("variable.other.asm.nasm"),
  "Generic symbols must use variable.other.asm.nasm first"
);

assert(languageConfig.comments && languageConfig.comments.lineComment === ";", "Line comment must be semicolon");
assert(Array.isArray(languageConfig.brackets), "Language config must define brackets");
assert(Array.isArray(languageConfig.autoClosingPairs), "Language config must define auto closing pairs");
assert(Object.keys(snippets).length >= 11, "Expected at least 11 snippets");
assert(snippets.Define, "Expected define snippet");

console.log("MJ Asm Highlighter validation passed.");
