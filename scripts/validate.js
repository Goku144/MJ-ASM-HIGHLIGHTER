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
  "src/extension.js",
  "syntaxes/nasm-x64.tmLanguage.json",
  "snippets/nasm-x64.code-snippets",
  "examples/demo.asm",
  "examples/macros.inc",
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

assert(pkg.name === "mj-asm-highlighter", "package.json name must be mj-asm-highlighter");
assert(pkg.displayName === "MJ Asm Highlighter", "package.json displayName must be MJ Asm Highlighter");
assert(pkg.version === "0.1.0", "package.json version must be 0.1.0");
assert(pkg.publisher === "mj", "package.json publisher must be mj");
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
assert(semanticRules["instruction:nasmx64"] === "#C586C0", "Instructions must have a NASM semantic color");
assert(semanticRules["register:nasmx64"] === "#569CD6", "Registers must share the macro constant NASM semantic color");
assert(semanticRules["section:nasmx64"] === "#4FC1FF", "Section names must have a NASM semantic color");
assert(semanticRules["macroConstant:nasmx64"] === "#569CD6", "Macro constants must have a NASM semantic color");
assert(semanticRules["macroConstant.declaration:nasmx64"] === "#569CD6", "EQU declarations must have a NASM semantic color");
assert(semanticRules["keyword:nasmx64"] === "#C586C0", "Directive keywords must have a NASM semantic color");
assert(semanticRules["variable:nasmx64"] === "#9CDCFE", "Variables must have a NASM semantic color");
assert(semanticRules["variable.declaration:nasmx64"] === "#9CDCFE", "Variable declarations must have a NASM semantic color");
assert(semanticRules["type:nasmx64"] === "#4EC9B0", "Data/type tokens must have a NASM semantic color");
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
  "registers",
  "instructions",
  "directives",
  "sectionDeclarations",
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

for (const scope of [
  "keyword.mnemonic.asm.nasm",
  "keyword.other.instruction.asm.nasm",
  "variable.language.asm.nasm",
  "variable.language.register.asm.nasm",
  "support.variable.register.asm.nasm",
  "constant.numeric.asm.nasm",
  "keyword.control.directive.asm.nasm",
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
  "entity.name.label.asm.nasm",
  "variable.other.asm.nasm",
  "entity.name.variable.asm.nasm",
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
  "{ language: \"nasmx64\" }",
  "{ language: \"asm\" }",
  "{ pattern: \"**/*.asm\" }",
  "MarkdownString",
  "require(\"../data/nasm-docs.json\")",
  "getDocumentationHoverInfo",
  "References:",
  "Opcode: varies by operand form.",
  "Opcode: not applicable. This is an assembler directive, not a CPU instruction.",
  "SemanticTokensLegend",
  "tokenModifiers",
  "declaration",
  "definition",
  "readonly",
  "instruction",
  "register",
  "section",
  "macroConstant",
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
  assert(extensionText.includes(source), `Semantic token provider should include: ${source}`);
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
  assert(extensionText.includes(`"${instruction}"`), `Semantic instruction set should include: ${instruction}`);
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
  "knownSymbols.macroConstants.has(word)",
  "knownSymbols.knownMacros.has(word)",
  "knownSymbols.dataSymbols.has(word)",
  "\"section\", [\"declaration\"]",
  "\"register\"",
  "\"instruction\"",
  "\"macroConstant\", [\"declaration\"]",
  "currentSectionKind === \"data\" ? [\"declaration\"]",
  "\"macroConstant\", [\"definition\", \"readonly\"]"
]) {
  assert(extensionText.includes(symbol), `Semantic provider should enforce: ${symbol}`);
}

for (const source of [
  "const defineMacros = new Map()",
  "const assignMacros = new Map()",
  "const multiLineMacros = new Map()",
  "parseDefineMacro",
  "parseAssignMacro",
  "parseMultiLineMacro",
  "getMacroHoverInfo",
  "getMultiLineMacroPreview",
  "parseMacroCallArguments",
  "Expansion preview",
  "COMPLEX_MACRO_DIRECTIVES"
]) {
  assert(extensionText.includes(source), `Macro hover support should include: ${source}`);
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

const readmeText = fs.readFileSync(path.join(root, "README.md"), "utf8");
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
  "`SYS_EXIT` shows expands to `60`"
]) {
  assert(readmeText.includes(source), `README should document hover testing: ${source}`);
}

assert(
  extensionText.includes("provideDocumentSemanticTokens"),
  "src/extension.js must implement provideDocumentSemanticTokens"
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

const labelPattern = grammar.repository.labels.patterns[0];
assert(
  labelPattern.captures["1"].name.startsWith("entity.name.function.asm.nasm"),
  "Code label fallback must use entity.name.function.asm.nasm first"
);
assert(
  labelPattern.captures["2"].name === "punctuation.separator.label.asm.nasm",
  "Label colons must use punctuation.separator.label.asm.nasm"
);

const dataLabelPattern = grammar.repository.dataLabels.patterns[0];
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
  sectionPattern.captures["2"].name === "entity.name.section.asm.nasm",
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

const symbolPattern = grammar.repository.symbols.patterns[0];
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
