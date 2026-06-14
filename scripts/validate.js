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
  "src/extension.js",
  "src/language/diagnostics.js",
  "src/language/grammar-support.js",
  "src/language/hoverProvider.js",
  "src/language/includeResolver.js",
  "src/language/localDocs.js",
  "src/language/macroExpansion.js",
  "src/language/nasmAnalyzer.js",
  "src/language/semanticTokens.js",
  "src/language/symbolTable.js",
  "src/language/tokenTypes.js",
  "src/test/analyzer.test.js",
  "src/test/hoverProvider.test.js",
  "src/test/semanticTokens.test.js",
  "src/test/fixtures/common.inc",
  "src/test/fixtures/semantic.asm",
  "syntaxes/nasm-x64.tmLanguage.json",
  "snippets/nasm-x64.code-snippets",
  "examples/demo.asm",
  "examples/macros.inc",
  "examples/PrintStr.inc",
  "examples/cross-file-macro-test.asm",
  "scripts/validate.js",
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

assert(pkg.name === "mj-asm-highlighter", "package.json name must be mj-asm-highlighter");
assert(pkg.displayName === "MJ Asm Highlighter", "package.json displayName must be MJ Asm Highlighter");
assert(pkg.version === "0.1.3", "package.json version must be 0.1.3");
assert(pkg.publisher === "agentXorion", "package.json publisher must be agentXorion");
assert(pkg.repository && pkg.repository.url.includes("agentXorion/mj-asm-highlighter"), "package.json must include repository URL");
assert(pkg.icon === "assets/icon.png", "package.json icon must be assets/icon.png");
assert(pkg.main === "./src/extension.js", "package.json must point main to ./src/extension.js");
assert(pkg.description.includes("semantic tokens"), "description should mention semantic tokens");
assert(pkg.description.includes("standard TextMate scopes"), "description should mention standard TextMate scopes");
assert(Array.isArray(pkg.activationEvents), "package.json must define activationEvents");
assert(pkg.activationEvents.includes("onLanguage:nasmx64"), "Extension must activate for nasmx64 files");
assert(pkg.activationEvents.includes("onLanguage:asm"), "Extension must activate when VS Code opens .asm files as asm");
assert(pkg.activationEvents.includes("onStartupFinished"), "Extension should activate even when another extension owns the .asm language id");
assert(pkg.contributes && Array.isArray(pkg.contributes.languages), "package.json must contribute languages");
assert(pkg.contributes.grammars && pkg.contributes.grammars[0].scopeName === "source.asm.nasmx64", "Grammar contribution must use source.asm.nasmx64");
assert(pkg.contributes.snippets && pkg.contributes.snippets[0].language === "nasmx64", "Snippets contribution must target nasmx64");
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
assert(language.extensions.includes(".asm"), "Language must include .asm");
assert(language.extensions.includes(".nasm"), "Language must include .nasm");
assert(language.extensions.includes(".inc"), "Language must include .inc");
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
const analyzerText = fs.readFileSync(path.join(root, "src/language/nasmAnalyzer.js"), "utf8");
const semanticText = fs.readFileSync(path.join(root, "src/language/semanticTokens.js"), "utf8");
const symbolTableText = fs.readFileSync(path.join(root, "src/language/symbolTable.js"), "utf8");
const includeResolverText = fs.readFileSync(path.join(root, "src/language/includeResolver.js"), "utf8");
const hoverProviderText = fs.readFileSync(path.join(root, "src/language/hoverProvider.js"), "utf8");
const localDocsText = fs.readFileSync(path.join(root, "src/language/localDocs.js"), "utf8");
const macroExpansionText = fs.readFileSync(path.join(root, "src/language/macroExpansion.js"), "utf8");
const tokenTypesText = fs.readFileSync(path.join(root, "src/language/tokenTypes.js"), "utf8");
const grammarSupportText = fs.readFileSync(path.join(root, "src/language/grammar-support.js"), "utf8");
const languageText = [
  extensionText,
  analyzerText,
  semanticText,
  symbolTableText,
  includeResolverText,
  hoverProviderText,
  localDocsText,
  macroExpansionText,
  tokenTypesText,
  grammarSupportText
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
  "keyword.operator.asm.nasm"
]) {
  assert(grammarText.includes(scope), `Grammar should include scope: ${scope}`);
}

for (const source of [
  "registerDocumentSemanticTokensProvider",
  "registerHoverProvider",
  "provideHover",
  "NASM_DOCUMENT_SELECTOR",
  "NASM_LANGUAGE_ID",
  "{ language: \"asm\" }",
  "{ pattern: \"**/*.asm\" }",
  "MarkdownString",
  "createHoverProvider",
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
  "cmp", "je", "jne", "ja", "jb", "jg", "jl", "jmp", "inc", "dec", "and", "or", "not",
  "shl", "shr", "sar", "rol", "ror", "cmove", "cmovne", "sete", "setne", "cld", "rep",
  "movsb", "lock", "nop", "pxor", "movdqa", "paddd", "movups", "vmovups", "vaddps",
  "finit", "fld", "fld1", "faddp", "fstp"
]) {
  assert(localInstructionDocs[key], `data/nasm-instructions.json must include ${key}`);
  assert(localInstructionDocs[key].summary, `${key} local instruction doc must include summary`);
  assert(Array.isArray(localInstructionDocs[key].examples), `${key} local instruction doc must include examples`);
}

for (const key of ["rax", "rdi", "rsi", "rdx", "r8", "r9", "r10", "fs", "gs", "cs", "ds", "es", "ss"]) {
  assert(localRegisterDocs[key], `data/nasm-registers.json must include ${key}`);
}
assert(localRegisterDocs.familyTemplates.xmm, "Register docs must include xmm family template");
assert(localRegisterDocs.familyTemplates.ymm, "Register docs must include ymm family template");
assert(localRegisterDocs.familyTemplates.zmm, "Register docs must include zmm family template");
assert(localRegisterDocs.familyTemplates.st, "Register docs must include x87 stack template");

for (const key of ["bits", "default", "cpu", "global", "extern", "section", "db", "dw", "dd", "dq", "resb", "resw", "resd", "resq", "equ", "times", "align", "struc", "endstruc", "istruc", "at", "iend", "%include", "%define", "%assign", "%macro", "%imacro", "%endmacro", "%ifdef", "%else", "%endif", "%rep", "%endrep", "%warning"]) {
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
assert(printStrText.includes("%macro print_str_macro 2"), "PrintStr.inc must define print_str_macro");
assert(crossFileText.includes("%include \"PrintStr.inc\""), "Cross-file example must include PrintStr.inc");
assert(crossFileText.includes("print_str_macro rdi, rsi"), "Cross-file example must call included macro");

const readmeText = fs.readFileSync(path.join(root, "README.md"), "utf8");
const tokenScopesText = fs.readFileSync(path.join(root, "docs/token-scopes.md"), "utf8");
for (const source of [
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
  "mjAsmHighlighter.includePaths",
  "semantic token type `macro`"
]) {
  assert(readmeText.includes(source), `README should document hover testing: ${source}`);
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

assert(
  languageText.includes("provideDocumentSemanticTokens"),
  "Semantic token module must implement provideDocumentSemanticTokens"
);
assert(
  extensionText.includes("registerDocumentSemanticTokensProvider(NASM_DOCUMENT_SELECTOR"),
  "Semantic token provider must register with the NASM document selector"
);
assert(
  extensionText.includes("registerHoverProvider(NASM_DOCUMENT_SELECTOR"),
  "Hover provider must register with the NASM document selector"
);

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
