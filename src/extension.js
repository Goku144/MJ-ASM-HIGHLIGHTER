const vscode = require("vscode");
const NASM_DOCS = require("../data/nasm-docs.json");

const tokenTypes = [
  "instruction",
  "register",
  "section",
  "macroConstant",
  "function",
  "variable",
  "operator",
  "keyword",
  "type",
  "number",
  "string",
  "parameter"
];

const tokenModifiers = ["declaration", "definition", "readonly"];
const tokenTypeIndex = new Map(tokenTypes.map((type, index) => [type, index]));
const tokenModifierIndex = new Map(tokenModifiers.map((modifier, index) => [modifier, index]));
const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
const NASM_DOCUMENT_SELECTOR = [
  { language: "nasmx64" },
  { language: "asm" },
  { pattern: "**/*.asm" },
  { pattern: "**/*.nasm" },
  { pattern: "**/*.inc" }
];

const identifierPattern = /[A-Za-z_.$?@][A-Za-z0-9_.$?@]*/g;
const numberPattern =
  /(?<![A-Za-z0-9_$?@])-?(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?\b|(?<![A-Za-z0-9_$?@])-?\d+[eE][+-]?\d+\b|(?<![A-Za-z0-9_$?@])-?(?:0x[0-9A-Fa-f]+|[0-9][0-9A-Fa-f]*h)\b|(?<![A-Za-z0-9_$?@])-?(?:0b[01]+|[01]+b)\b|(?<![A-Za-z0-9_$?@])-?(?:0o[0-7]+|[0-7]+o|[0-7]+q|0[0-7]+)\b|(?<![A-Za-z0-9_$?@])-?\d+\b/g;

const SECTION_NAMES = new Set([
  ".text",
  ".data",
  ".bss",
  ".rodata",
  ".rdata",
  ".init",
  ".fini",
  ".note.gnu-stack"
]);

const CODE_SECTIONS = new Set([".text", ".init", ".fini"]);
const DATA_SECTIONS = new Set([".data", ".bss", ".rodata", ".rdata"]);

const PREPROCESSOR_DIRECTIVES = new Set([
  "define",
  "xdefine",
  "idefine",
  "assign",
  "iassign",
  "defstr",
  "idefstr",
  "deftok",
  "ideftok",
  "undef",
  "macro",
  "imacro",
  "endmacro",
  "rep",
  "endrep",
  "if",
  "ifn",
  "ifdef",
  "ifndef",
  "ifmacro",
  "ifnmacro",
  "ifctx",
  "ifnctx",
  "ifidn",
  "ifnidn",
  "ifidni",
  "ifnidni",
  "ifid",
  "ifnid",
  "ifnum",
  "ifnnum",
  "ifstr",
  "ifnstr",
  "iftoken",
  "ifntoken",
  "ifempty",
  "ifnempty",
  "elif",
  "elifn",
  "elifdef",
  "elifndef",
  "elifmacro",
  "elifnmacro",
  "elifctx",
  "elifnctx",
  "elifidn",
  "elifnidn",
  "elifidni",
  "elifnidni",
  "elifid",
  "elifnid",
  "elifnum",
  "elifnnum",
  "elifstr",
  "elifnstr",
  "eliftoken",
  "elifntoken",
  "elifempty",
  "elifnempty",
  "else",
  "endif",
  "include",
  "error",
  "warning",
  "fatal",
  "push",
  "pop",
  "rotate",
  "strlen",
  "substr",
  "use",
  "line",
  "local"
]);

const DEFINITION_DIRECTIVES = new Set([
  "define",
  "xdefine",
  "idefine",
  "assign",
  "iassign",
  "defstr",
  "idefstr",
  "deftok",
  "ideftok",
  "undef"
]);
const MACRO_DEFINITION_DIRECTIVES = new Set(["macro", "imacro"]);
const CONDITIONAL_SYMBOL_DIRECTIVES = new Set([
  "if",
  "ifn",
  "ifdef",
  "ifndef",
  "ifmacro",
  "ifnmacro",
  "ifctx",
  "ifnctx",
  "ifidn",
  "ifnidn",
  "ifidni",
  "ifnidni",
  "ifid",
  "ifnid",
  "ifnum",
  "ifnnum",
  "ifstr",
  "ifnstr",
  "iftoken",
  "ifntoken",
  "ifempty",
  "ifnempty",
  "elif",
  "elifn",
  "elifdef",
  "elifndef",
  "elifmacro",
  "elifnmacro",
  "elifctx",
  "elifnctx",
  "elifidn",
  "elifnidn",
  "elifidni",
  "elifnidni",
  "elifid",
  "elifnid",
  "elifnum",
  "elifnnum",
  "elifstr",
  "elifnstr",
  "eliftoken",
  "elifntoken",
  "elifempty",
  "elifnempty"
]);

const DIRECTIVES = new Set([
  "section",
  "segment",
  "global",
  "extern",
  "default",
  "bits",
  "cpu",
  "org",
  "absolute",
  "common",
  "group",
  "import",
  "export",
  "library",
  "module",
  "safeseh",
  "debug",
  "warning",
  "list",
  "nolist"
]);

const DATA_DECLARATIONS = new Set([
  "db",
  "dw",
  "dd",
  "dq",
  "dt",
  "do",
  "dy",
  "dz",
  "resb",
  "resw",
  "resd",
  "resq",
  "rest",
  "reso",
  "resy",
  "resz",
  "equ",
  "times",
  "struc",
  "endstruc",
  "istruc",
  "iend",
  "at",
  "align",
  "alignb"
]);

const SIZE_SPECIFIERS = new Set([
  "byte",
  "word",
  "dword",
  "qword",
  "tword",
  "oword",
  "yword",
  "zword",
  "ptr",
  "short",
  "near",
  "far",
  "rel",
  "abs",
  "strict",
  "nosplit",
  "wrt"
]);

const INSTRUCTIONS = new Set([
  "adc",
  "add",
  "and",
  "bt",
  "btc",
  "btr",
  "bts",
  "bsf",
  "bsr",
  "bndcl",
  "bndcn",
  "bndcu",
  "bndmk",
  "bndmov",
  "call",
  "cbw",
  "cdq",
  "cdqe",
  "clc",
  "cld",
  "cli",
  "cmc",
  "cmp",
  "cmpxchg",
  "cmpxchg8b",
  "cmpxchg16b",
  "cpuid",
  "cqo",
  "cwd",
  "cwde",
  "dec",
  "div",
  "enter",
  "hlt",
  "idiv",
  "imul",
  "inc",
  "int",
  "iret",
  "iretq",
  "ja",
  "jae",
  "jb",
  "jbe",
  "jc",
  "je",
  "jg",
  "jge",
  "jl",
  "jle",
  "jmp",
  "jne",
  "jnz",
  "jz",
  "lea",
  "leave",
  "lock",
  "loop",
  "loope",
  "loopne",
  "loopnz",
  "loopz",
  "mov",
  "movsx",
  "movsxd",
  "movzx",
  "mul",
  "neg",
  "nop",
  "not",
  "or",
  "out",
  "pop",
  "popf",
  "popfq",
  "push",
  "pushf",
  "pushfq",
  "rcl",
  "rcr",
  "ret",
  "retn",
  "rol",
  "ror",
  "sal",
  "sar",
  "sbb",
  "shl",
  "shr",
  "sub",
  "syscall",
  "sysenter",
  "sysexit",
  "sysret",
  "test",
  "ud2",
  "wait",
  "xadd",
  "xchg",
  "xor",
  "rdtsc",
  "rdtscp",
  "rdmsr",
  "wrmsr",
  "lfence",
  "mfence",
  "sfence",
  "pause",
  "clflush",
  "clflushopt",
  "clwb",
  "invlpg",
  "lgdt",
  "lidt",
  "sgdt",
  "sidt",
  "ltr",
  "str",
  "swapgs",
  "aesenc",
  "aesenclast",
  "aesdec",
  "aesdeclast",
  "aesimc",
  "aeskeygenassist",
  "sha1msg1",
  "sha1msg2",
  "sha1nexte",
  "sha1rnds4",
  "sha256rnds2",
  "sha256msg1",
  "sha256msg2",
  "adcx",
  "adox",
  "andn",
  "bextr",
  "blsi",
  "blsmsk",
  "blsr",
  "bzhi",
  "lzcnt",
  "mulx",
  "pdep",
  "pext",
  "popcnt",
  "rorx",
  "sarx",
  "shlx",
  "shrx",
  "tzcnt",
  "rdrand",
  "rdseed",
  "rep",
  "repe",
  "repne",
  "repz",
  "repnz",
  "finit",
  "fninit",
  "fld",
  "fst",
  "fstp",
  "fadd",
  "fsub",
  "fmul",
  "fdiv",
  "fild",
  "fist",
  "fistp",
  "fcom",
  "fcomp",
  "fcompp",
  "fucom",
  "fucomp",
  "fucompp",
  "emms",
  "movq",
  "movd",
  "movdqa",
  "movdqu",
  "movaps",
  "movups",
  "movapd",
  "movupd",
  "addps",
  "addpd",
  "addss",
  "addsd",
  "subps",
  "subpd",
  "subss",
  "subsd",
  "mulps",
  "mulpd",
  "mulss",
  "mulsd",
  "divps",
  "divpd",
  "divss",
  "divsd",
  "sqrtps",
  "sqrtpd",
  "sqrtss",
  "sqrtsd",
  "maxps",
  "maxpd",
  "maxss",
  "maxsd",
  "minps",
  "minpd",
  "minss",
  "minsd",
  "pxor",
  "pand",
  "por",
  "paddb",
  "paddw",
  "paddd",
  "paddq",
  "psubb",
  "psubw",
  "psubd",
  "psubq",
  "vpxor",
  "vpand",
  "vpor",
  "vaddps",
  "vaddpd",
  "vaddss",
  "vaddsd",
  "vsubps",
  "vsubpd",
  "vsubss",
  "vsubsd",
  "vmulps",
  "vmulpd",
  "vmulss",
  "vmulsd",
  "vdivps",
  "vdivpd",
  "vdivss",
  "vdivsd",
  "vmovaps",
  "vmovups",
  "vmovapd",
  "vmovupd",
  "vmovdqa",
  "vmovdqu",
  "vmovdqa32",
  "vmovdqa64",
  "vmovdqu8",
  "vmovdqu16",
  "vmovdqu32",
  "vmovdqu64",
  "kmovw",
  "kmovb",
  "kmovd",
  "kmovq",
  "ktestw",
  "ktestb",
  "ktestd",
  "ktestq"
]);

const REGISTERS = /^(?:r(?:ax|bx|cx|dx|si|di|bp|sp|ip)|e(?:ax|bx|cx|dx|si|di|bp|sp|ip)|[abcd][hl]|[abcd]x|[sb]p|[sd]i|ip|spl|bpl|sil|dil|r(?:[8-9]|1[0-5])(?:d|w|b)?|cs|ds|es|fs|gs|ss|cr[02348]|dr[0-3]|dr6|dr7|mm[0-7]|(?:xmm|ymm|zmm)(?:[0-9]|[12][0-9]|3[01])|st[0-7]|k[0-7]|bnd[0-3])$/i;

const HOVER_WORD_PATTERN = /%?[A-Za-z_.$?@][A-Za-z0-9_.$?@]*|\$\$|\$|%%/;
const DIRECTIVE_OPCODE_NOTE = "Opcode: not applicable. This is an assembler directive, not a CPU instruction.";
const COMPLEX_MACRO_DIRECTIVES = /(^|\s)%(?:rep|endrep|if|ifn|ifdef|ifndef|ifmacro|ifnmacro|ifctx|ifnctx|ifidn|ifnidn|ifidni|ifnidni|ifid|ifnid|ifnum|ifnnum|ifstr|ifnstr|iftoken|ifntoken|ifempty|ifnempty|elif|else|endif|assign|iassign|rotate)\b/i;

const SECTION_HOVERS = {
  ".text": {
    category: "Section",
    description: "Code section used for executable instructions and labels that represent code entry points.",
    syntax: "section .text",
    example: "section .text\n_start:\n    mov rax, 60"
  },
  ".data": {
    category: "Section",
    description: "Initialized data section. Values declared here are emitted into the output file.",
    syntax: "section .data",
    example: "section .data\nmessage: db \"Hello\", 10, 0"
  },
  ".bss": {
    category: "Section",
    description: "Uninitialized data section. NASM `RES*` declarations are commonly placed here.",
    syntax: "section .bss",
    example: "section .bss\nbuffer: resb 64"
  },
  ".rodata": {
    category: "Section",
    description: "Read-only data section used by many object formats for constants and string literals.",
    syntax: "section .rodata",
    example: "section .rodata\nprompt: db \"name: \", 0"
  },
  ".rdata": {
    category: "Section",
    description: "Read-only data section name commonly used by PE/COFF targets.",
    syntax: "section .rdata",
    example: "section .rdata\nvalue: dq 42"
  },
  ".init": {
    category: "Section",
    description: "Initialization code section used by some linkers and runtimes.",
    syntax: "section .init",
    example: "section .init\n    ret"
  },
  ".fini": {
    category: "Section",
    description: "Finalization code section used by some linkers and runtimes.",
    syntax: "section .fini",
    example: "section .fini\n    ret"
  },
  ".note.gnu-stack": {
    category: "Section",
    description: "ELF note section used to mark stack executable/non-executable intent.",
    syntax: "section .note.GNU-stack",
    example: "section .note.GNU-stack"
  }
};

const DIRECTIVE_HOVERS = {
  bits: {
    category: "Assembler directive",
    description: "`BITS` selects the default code generation mode for subsequent instructions.",
    syntax: "bits 16 | bits 32 | bits 64",
    example: "bits 64",
    notes: "For NASM x86-64 files, `bits 64` is the usual setting."
  },
  default: {
    category: "Assembler directive",
    description: "`DEFAULT` changes NASM defaults such as whether registerless memory references in 64-bit mode are RIP-relative.",
    syntax: "default rel | default abs",
    example: "default rel\nmov rax, [message]",
    notes: "`default rel` is common for position-independent x86-64 code."
  },
  global: {
    category: "Assembler directive",
    description: "`GLOBAL` exports a symbol so the linker can resolve references to it from other object files.",
    syntax: "global symbol [, symbol ...]",
    example: "global _start"
  },
  extern: {
    category: "Assembler directive",
    description: "`EXTERN` declares a symbol that is defined in another object file or library.",
    syntax: "extern symbol [, symbol ...]",
    example: "extern printf"
  },
  section: {
    category: "Assembler directive",
    description: "`SECTION` switches assembly output to a named section.",
    syntax: "section name [attributes]",
    example: "section .data align=16"
  },
  segment: {
    category: "Assembler directive",
    description: "`SEGMENT` is accepted as a synonym for `SECTION` in NASM.",
    syntax: "segment name [attributes]",
    example: "segment .text"
  },
  cpu: {
    category: "Assembler directive",
    description: "`CPU` restricts accepted instructions to a selected CPU or feature level.",
    syntax: "cpu feature",
    example: "cpu x64"
  },
  org: {
    category: "Assembler directive",
    description: "`ORG` sets the origin address used for address calculations in flat binary output.",
    syntax: "org address",
    example: "org 0x7c00",
    notes: "`ORG` is mainly useful for `-f bin`; object formats normally use relocations instead."
  },
  absolute: {
    category: "Assembler directive",
    description: "`ABSOLUTE` assembles following declarations as absolute addresses instead of emitted output.",
    syntax: "absolute expression",
    example: "absolute 0x400000"
  },
  common: {
    category: "Assembler directive",
    description: "`COMMON` declares a common symbol that the linker allocates, often for tentative global storage.",
    syntax: "common symbol size [alignment]",
    example: "common shared_buffer 4096 16"
  },
  group: {
    category: "Assembler directive",
    description: "`GROUP` groups segments for object formats that support grouped segments.",
    syntax: "group name segment [, segment ...]",
    example: "group dgroup .data .bss"
  },
  import: {
    category: "Assembler directive",
    description: "`IMPORT` declares an imported symbol for object formats that support import records.",
    syntax: "import symbol library",
    example: "import MessageBoxA user32.dll"
  },
  export: {
    category: "Assembler directive",
    description: "`EXPORT` marks a symbol for export in object formats that support export records.",
    syntax: "export symbol",
    example: "export my_function"
  },
  library: {
    category: "Assembler directive",
    description: "`LIBRARY` names a required import library for formats that support library records.",
    syntax: "library name",
    example: "library kernel32.dll"
  },
  module: {
    category: "Assembler directive",
    description: "`MODULE` sets a module name for object formats that use module records.",
    syntax: "module name",
    example: "module demo"
  },
  safeseh: {
    category: "Assembler directive",
    description: "`SAFESEH` records a safe exception handler for supported Windows object formats.",
    syntax: "safeseh handler",
    example: "safeseh exception_handler"
  },
  debug: {
    category: "Assembler directive",
    description: "`DEBUG` controls debug-information generation for supported output formats.",
    syntax: "debug format",
    example: "debug dwarf"
  },
  warning: {
    category: "Assembler directive",
    description: "`WARNING` controls NASM warning classes.",
    syntax: "warning +class | warning -class",
    example: "warning +orphan-labels"
  },
  list: {
    category: "Assembler directive",
    description: "`LIST` enables listing output for following source.",
    syntax: "list"
  },
  nolist: {
    category: "Assembler directive",
    description: "`NOLIST` disables listing output for following source.",
    syntax: "nolist"
  }
};

const DATA_HOVERS = {
  db: ["Data declaration", "Declares initialized bytes in the output.", "db value [, value ...]", "message: db \"Hello\", 10, 0"],
  dw: ["Data declaration", "Declares initialized 16-bit words in the output.", "dw value [, value ...]", "word_value: dw 0x1234"],
  dd: ["Data declaration", "Declares initialized 32-bit doublewords or single-precision floating-point values.", "dd value [, value ...]", "dword_value: dd 0x7fffffff"],
  dq: ["Data declaration", "Declares initialized 64-bit quadwords or double-precision floating-point values.", "dq value [, value ...]", "qword_value: dq 0x123456789abcdef0"],
  dt: ["Data declaration", "Declares initialized 80-bit extended-precision floating-point values.", "dt float-value", "extended_value: dt 1.0"],
  do: ["Data declaration", "Declares initialized 128-bit octoword data.", "do value [, value ...]", "xmm_value: do 0"],
  dy: ["Data declaration", "Declares initialized 256-bit YMM-sized data.", "dy value [, value ...]", "ymm_value: dy 0"],
  dz: ["Data declaration", "Declares initialized 512-bit ZMM-sized data.", "dz value [, value ...]", "zmm_value: dz 0"],
  resb: ["Data declaration", "Reserves uninitialized byte storage, normally in `.bss`.", "resb count", "buffer: resb 64"],
  resw: ["Data declaration", "Reserves uninitialized 16-bit word storage, normally in `.bss`.", "resw count", "words: resw 8"],
  resd: ["Data declaration", "Reserves uninitialized 32-bit doubleword storage, normally in `.bss`.", "resd count", "items: resd 16"],
  resq: ["Data declaration", "Reserves uninitialized 64-bit quadword storage, normally in `.bss`.", "resq count", "pointers: resq 4"],
  rest: ["Data declaration", "Reserves uninitialized 80-bit storage units.", "rest count", "fp_values: rest 2"],
  reso: ["Data declaration", "Reserves uninitialized 128-bit storage units.", "reso count", "xmm_slots: reso 4"],
  resy: ["Data declaration", "Reserves uninitialized 256-bit storage units.", "resy count", "ymm_slots: resy 4"],
  resz: ["Data declaration", "Reserves uninitialized 512-bit storage units.", "resz count", "zmm_slots: resz 4"],
  equ: ["Data declaration", "`EQU` defines the preceding label as an absolute constant value that cannot be redefined later.", "label equ expression", "message_len equ $ - message"],
  times: ["Data declaration", "`TIMES` repeats the following instruction or data declaration a computed number of times.", "times count instruction-or-data", "padding: times 16 db 0"],
  struc: ["Structure directive", "`STRUC` starts a NASM structure layout definition.", "struc name", "struc point"],
  endstruc: ["Structure directive", "`ENDSTRUC` ends a NASM structure layout definition.", "endstruc", "endstruc"],
  istruc: ["Structure directive", "`ISTRUC` starts initialized data using a structure layout.", "istruc name", "istruc point"],
  iend: ["Structure directive", "`IEND` ends an initialized structure block.", "iend", "iend"],
  at: ["Structure directive", "`AT` selects a structure field while using `ISTRUC`.", "at field, value", "at point.x, dd 10"],
  align: ["Alignment directive", "`ALIGN` advances output to the requested alignment, usually by emitting padding.", "align boundary", "align 16"],
  alignb: ["Alignment directive", "`ALIGNB` reserves padding to align uninitialized storage.", "alignb boundary", "alignb 16"]
};

const SIZE_HOVERS = {
  byte: ["Size specifier", "Selects an 8-bit memory operand or data element.", "byte [address]", "mov byte [buffer], 1"],
  word: ["Size specifier", "Selects a 16-bit memory operand or data element.", "word [address]", "mov word [value], ax"],
  dword: ["Size specifier", "Selects a 32-bit memory operand or data element.", "dword [address]", "mov dword [value], eax"],
  qword: ["Size specifier", "Selects a 64-bit memory operand or data element.", "qword [address]", "mov rax, qword [value]"],
  tword: ["Size specifier", "Selects an 80-bit memory operand, commonly for x87 extended precision.", "tword [address]", "fld tword [extended_value]"],
  oword: ["Size specifier", "Selects a 128-bit memory operand.", "oword [address]", "movdqa xmm0, oword [vector]"],
  yword: ["Size specifier", "Selects a 256-bit memory operand.", "yword [address]", "vmovdqa ymm0, yword [vector]"],
  zword: ["Size specifier", "Selects a 512-bit memory operand.", "zword [address]", "vmovdqa64 zmm0, zword [vector]"],
  ptr: ["Size specifier", "`PTR` is accepted in MASM-like memory type syntax.", "qword ptr [address]", "mov rax, qword ptr [value]"],
  short: ["Jump size specifier", "Requests a short branch encoding when the target is in 8-bit relative range.", "short label", "jmp short .done"],
  near: ["Branch size specifier", "Requests a near branch or call within the current code segment.", "near label", "call near helper"],
  far: ["Branch size specifier", "Requests or describes a far branch pointer including a segment selector.", "far target", "jmp far [pointer]"],
  rel: ["Addressing specifier", "Requests RIP-relative addressing for a memory reference in 64-bit mode.", "rel symbol", "mov rax, [rel qword_value]"],
  abs: ["Addressing specifier", "Requests absolute addressing, overriding `REL` behavior.", "abs symbol", "mov rax, [abs address]"],
  strict: ["Encoding specifier", "Prevents NASM from optimizing an immediate or displacement to a smaller size.", "strict size expression", "push strict dword 1"],
  nosplit: ["Addressing specifier", "Prevents NASM from rewriting some effective-address forms into split equivalents.", "nosplit expression", "mov eax, [nosplit eax*2]"],
  wrt: ["Relocation specifier", "`WRT` requests relocation with respect to another symbol or base where supported by the object format.", "symbol wrt base", "mov rax, symbol wrt ..gotpc"]
};

const PREPROCESSOR_HOVERS = {
  define: ["Preprocessor directive", "Defines a single-line macro expanded by the NASM preprocessor.", "%define name replacement", "%define SYS_EXIT 60"],
  xdefine: ["Preprocessor directive", "Defines a single-line macro whose replacement is expanded immediately at definition time.", "%xdefine name replacement", "%xdefine SIZE 8 * 4"],
  idefine: ["Preprocessor directive", "Case-insensitive form of `%define`.", "%idefine name replacement", "%idefine true 1"],
  assign: ["Preprocessor directive", "Defines or redefines a numeric preprocessor variable.", "%assign name expression", "%assign i i + 1"],
  iassign: ["Preprocessor directive", "Case-insensitive form of `%assign`.", "%iassign name expression", "%iassign COUNT 4"],
  undef: ["Preprocessor directive", "Removes a single-line macro definition.", "%undef name", "%undef DEBUG"],
  macro: ["Macro directive", "Begins a multi-line macro definition.", "%macro name parameter-count", "%macro prologue 1"],
  imacro: ["Macro directive", "Case-insensitive form of `%macro`.", "%imacro name parameter-count", "%imacro log 1"],
  endmacro: ["Macro directive", "Ends a multi-line macro definition.", "%endmacro", "%endmacro"],
  rep: ["Macro directive", "Repeats a preprocessor block a specified number of times.", "%rep count", "%rep 4\n    nop\n%endrep"],
  endrep: ["Macro directive", "Ends a `%rep` block.", "%endrep", "%endrep"],
  include: ["Preprocessor directive", "Includes another source file before assembly continues.", "%include \"file.inc\"", "%include \"macros.inc\""],
  ifdef: ["Conditional directive", "Assembles following preprocessor lines when a macro is defined.", "%ifdef name", "%ifdef DEBUG"],
  ifndef: ["Conditional directive", "Assembles following preprocessor lines when a macro is not defined.", "%ifndef name", "%ifndef RELEASE"],
  elifndef: ["Conditional directive", "Else-if branch for a macro that is not defined.", "%elifndef name", "%elifndef RELEASE"],
  else: ["Conditional directive", "Starts the fallback branch of a preprocessor conditional.", "%else", "%else"],
  endif: ["Conditional directive", "Ends a preprocessor conditional block.", "%endif", "%endif"],
  error: ["Preprocessor directive", "Emits an assembly error with the given message.", "%error message", "%error unsupported platform"],
  warning: ["Preprocessor directive", "Emits an assembly warning with the given message.", "%warning message", "%warning check alignment"],
  fatal: ["Preprocessor directive", "Emits a fatal assembly error.", "%fatal message", "%fatal configuration required"],
  local: ["Macro directive", "Declares local labels inside a macro body.", "%local name", "%local temp"]
};

const INSTRUCTION_HOVERS = {
  mov: ["Instruction", "Copies data from a source operand to a destination operand.", "mov destination, source", "mov rax, [rel value]", "Opcode: varies by operand form."],
  lea: ["Instruction", "Loads an effective address into a general-purpose register without reading memory.", "lea register, [address-expression]", "lea rdi, [rel message]", "Opcode: 8D /r."],
  add: ["Instruction", "Adds the source operand to the destination operand and stores the result in the destination.", "add destination, source", "add rsp, 8", "Opcode: varies by operand form."],
  sub: ["Instruction", "Subtracts the source operand from the destination operand and stores the result in the destination.", "sub destination, source", "sub rsp, 16", "Opcode: varies by operand form."],
  xor: ["Instruction", "Computes bitwise exclusive OR. `xor reg, reg` is commonly used to zero a register.", "xor destination, source", "xor rdi, rdi", "Opcode: varies by operand form."],
  and: ["Instruction", "Computes bitwise AND.", "and destination, source", "and rsp, -16", "Opcode: varies by operand form."],
  or: ["Instruction", "Computes bitwise OR.", "or destination, source", "or rax, 1", "Opcode: varies by operand form."],
  cmp: ["Instruction", "Compares operands by subtracting the source from the destination and setting flags without storing the result.", "cmp left, right", "cmp rax, 0", "Opcode: varies by operand form."],
  test: ["Instruction", "Computes bitwise AND for flags only; the operands are not modified.", "test left, right", "test rax, rax", "Opcode: varies by operand form."],
  push: ["Instruction", "Pushes an operand onto the stack.", "push source", "push rbp", "Opcode: varies by operand form."],
  pop: ["Instruction", "Pops a value from the stack into the destination operand.", "pop destination", "pop rbp", "Opcode: varies by operand form."],
  call: ["Instruction", "Calls a procedure, saving a return address for `ret`.", "call target", "call helper_function", "Opcode: varies by operand form."],
  ret: ["Instruction", "Returns from a procedure by popping the return address from the stack.", "ret [imm16]", "ret", "Opcode: C3 for near return; other forms vary."],
  retn: ["Instruction", "Near return from procedure.", "retn [imm16]", "retn", "Opcode: C3 for near return; other forms vary."],
  jmp: ["Instruction", "Transfers control unconditionally to the target.", "jmp target", "jmp .done", "Opcode: varies by operand form."],
  je: ["Instruction", "Jumps when the zero flag is set; alias of `jz`.", "je target", "je .equal", "Opcode: varies by short or near form."],
  jz: ["Instruction", "Jumps when the zero flag is set; alias of `je`.", "jz target", "jz .zero", "Opcode: varies by short or near form."],
  jne: ["Instruction", "Jumps when the zero flag is clear; alias of `jnz`.", "jne target", "jne .not_equal", "Opcode: varies by short or near form."],
  jnz: ["Instruction", "Jumps when the zero flag is clear; alias of `jne`.", "jnz target", "jnz .not_zero", "Opcode: varies by short or near form."],
  syscall: ["Instruction", "Performs a fast system call transition using the x86-64 syscall mechanism.", "syscall", "mov rax, 60\nxor rdi, rdi\nsyscall", "Opcode: 0F 05.", "In 64-bit mode, Linux uses `rax` for the syscall number and returns the result in `rax`."],
  sysret: ["Instruction", "Returns from a fast system call entered by `syscall`.", "sysret", "sysret", "Opcode: 0F 07."],
  sysenter: ["Instruction", "Performs a fast system call using the SYSENTER mechanism.", "sysenter", "sysenter", "Opcode: 0F 34.", "On AMD64 long mode this instruction is not the normal Linux syscall path."],
  sysexit: ["Instruction", "Returns from a fast system call entered by `sysenter`.", "sysexit", "sysexit", "Opcode: 0F 35."],
  cpuid: ["Instruction", "Returns processor identification and feature information selected by `eax` and sometimes `ecx`.", "cpuid", "mov eax, 1\ncpuid", "Opcode: 0F A2."],
  nop: ["Instruction", "No operation. Used for alignment, patch space, or timing padding.", "nop", "nop", "Opcode: 90 for the one-byte form; multi-byte NOP forms vary."],
  leave: ["Instruction", "Releases a stack frame by copying the frame pointer to the stack pointer and popping the old frame pointer.", "leave", "leave\nret", "Opcode: C9."],
  enter: ["Instruction", "Creates a stack frame for a procedure.", "enter size, nesting-level", "enter 16, 0", "Opcode: C8 iw ib."],
  int: ["Instruction", "Calls a software interrupt handler.", "int imm8", "int 0x80", "Opcode: CD ib."],
  hlt: ["Instruction", "Halts instruction execution until an enabled interrupt, NMI, reset, or similar event.", "hlt", "hlt", "Opcode: F4.", "Privileged in protected/long mode."],
  ud2: ["Instruction", "Guaranteed undefined instruction, commonly used to mark unreachable code or traps.", "ud2", "ud2", "Opcode: 0F 0B."],
  rdtsc: ["Instruction", "Reads the processor time-stamp counter into `edx:eax`.", "rdtsc", "rdtsc", "Opcode: 0F 31."],
  rdtscp: ["Instruction", "Reads the time-stamp counter and processor ID information serializing later instructions.", "rdtscp", "rdtscp", "Opcode: 0F 01 F9."],
  rdmsr: ["Instruction", "Reads a model-specific register selected by `ecx` into `edx:eax`.", "rdmsr", "rdmsr", "Opcode: 0F 32.", "Privileged instruction."],
  wrmsr: ["Instruction", "Writes `edx:eax` to the model-specific register selected by `ecx`.", "wrmsr", "wrmsr", "Opcode: 0F 30.", "Privileged instruction."],
  lfence: ["Instruction", "Serializes load operations.", "lfence", "lfence", "Opcode: 0F AE E8."],
  mfence: ["Instruction", "Serializes load and store memory operations.", "mfence", "mfence", "Opcode: 0F AE F0."],
  sfence: ["Instruction", "Serializes store operations.", "sfence", "sfence", "Opcode: 0F AE F8."],
  pause: ["Instruction", "Hint used in spin-wait loops.", "pause", "pause", "Opcode: F3 90."],
  lock: ["Instruction prefix", "Asserts an atomic read-modify-write operation for supported memory instructions.", "lock instruction", "lock inc qword [counter]", "Opcode: F0 prefix."],
  rep: ["Instruction prefix", "Repeats a string instruction while `rcx/ecx/cx` is nonzero.", "rep string-instruction", "rep movsb", "Opcode: F3 prefix."],
  repe: ["Instruction prefix", "Repeats a string comparison/scan while equal and count remains; alias of `repz`.", "repe string-instruction", "repe cmpsb", "Opcode: F3 prefix."],
  repz: ["Instruction prefix", "Repeats a string comparison/scan while zero/equal and count remains; alias of `repe`.", "repz string-instruction", "repz scasb", "Opcode: F3 prefix."],
  repne: ["Instruction prefix", "Repeats a string comparison/scan while not equal and count remains; alias of `repnz`.", "repne string-instruction", "repne scasb", "Opcode: F2 prefix."],
  repnz: ["Instruction prefix", "Repeats a string comparison/scan while not zero/not equal and count remains; alias of `repne`.", "repnz string-instruction", "repnz scasb", "Opcode: F2 prefix."],
  swapgs: ["Instruction", "Swaps the current GS base with the kernel GS base MSR.", "swapgs", "swapgs", "Opcode: 0F 01 F8.", "Privileged/system-level instruction used by kernels."]
};

function activate(context) {
  const provider = {
    provideDocumentSemanticTokens(document) {
      const builder = new vscode.SemanticTokensBuilder(legend);
      const knownSymbols = collectKnownSymbols(document);
      let currentSectionKind = "code";

      for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber += 1) {
        const text = document.lineAt(lineNumber).text;
        const sectionKind = getSectionKindFromLine(text);
        if (sectionKind) {
          currentSectionKind = sectionKind;
        }

        tokenizeLine(text, lineNumber, builder, knownSymbols, currentSectionKind);
      }

      return builder.build();
    }
  };

  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(NASM_DOCUMENT_SELECTOR, provider, legend),
    vscode.languages.registerHoverProvider(NASM_DOCUMENT_SELECTOR, {
      provideHover(document, position) {
        const hoverToken = getHoverToken(document, position);
        if (!hoverToken) {
          return null;
        }

        const knownSymbols = collectKnownSymbols(document);
        const info = getHoverInfo(hoverToken.text, document, position, knownSymbols);
        if (!info) {
          return null;
        }

        return new vscode.Hover(formatHover(hoverToken.text, info));
      }
    })
  );
}

function deactivate() {}

function tokenizeLine(text, lineNumber, builder, knownSymbols, currentSectionKind) {
  const state = scanLine(text);
  const code = text.slice(0, state.commentStart);
  const occupied = [];
  const tokens = [];

  for (const range of state.stringRanges) {
    if (range.start < state.commentStart) {
      addToken(tokens, occupied, lineNumber, range.start, Math.min(range.end, state.commentStart) - range.start, "string");
    }
  }

  const add = (start, length, type, modifiers = []) => {
    if (start >= state.commentStart || length <= 0 || intersectsRanges(start, start + length, state.stringRanges)) {
      return false;
    }
    return addToken(tokens, occupied, lineNumber, start, length, type, modifiers);
  };

  const labelMatch = code.match(/^\s*((?:%%|\.)?[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(:)/);
  if (labelMatch) {
    add(
      labelMatch.index + labelMatch[0].indexOf(labelMatch[1]),
      labelMatch[1].length,
      currentSectionKind === "data" ? "variable" : "function",
      currentSectionKind === "data" ? ["declaration"] : []
    );
  }

  const equMatch = code.match(/^\s*([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)\s+equ\b/i);
  if (equMatch) {
    add(equMatch.index + equMatch[0].indexOf(equMatch[1]), equMatch[1].length, "macroConstant", ["declaration"]);
  }

  scanRegex(code, /\b(section|segment)\s+(\.[A-Za-z0-9_.-]+)/gi, (match) => {
    add(match.index, match[1].length, "keyword");
    add(match.index + match[0].lastIndexOf(match[2]), match[2].length, "section", ["declaration"]);
  });

  scanRegex(code, /\.[A-Za-z][A-Za-z0-9_.-]*/g, (match) => {
    if (SECTION_NAMES.has(match[0].toLowerCase())) {
      add(match.index, match[0].length, "section", ["declaration"]);
    }
  });

  scanRegex(code, /%([A-Za-z][A-Za-z0-9_]*)\b/g, (match) => {
    const directive = match[1].toLowerCase();
    if (!PREPROCESSOR_DIRECTIVES.has(directive)) {
      return;
    }

    add(match.index, 1, "operator");
    add(match.index + 1, match[1].length, "instruction");

    if (DEFINITION_DIRECTIVES.has(directive)) {
      const name = nextIdentifier(code, match.index + match[0].length);
      if (name) {
        add(name.index, name.text.length, "macroConstant", ["definition", "readonly"]);
      }
    } else if (MACRO_DEFINITION_DIRECTIVES.has(directive)) {
      const name = nextIdentifier(code, match.index + match[0].length);
      if (name) {
        add(name.index, name.text.length, "function");
      }
    } else if (CONDITIONAL_SYMBOL_DIRECTIVES.has(directive)) {
      const name = nextIdentifier(code, match.index + match[0].length);
      if (name) {
        add(name.index, name.text.length, "macroConstant", ["readonly"]);
      }
    }
  });

  scanRegex(code, /(?:%%)([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)|%(?:\*|[+-]?\d+)/g, (match) => {
    if (match[0].startsWith("%%")) {
      if (add(match.index, 2, "operator")) {
        add(match.index + 2, match[0].length - 2, "parameter");
      }
      return;
    }

    if (add(match.index, 1, "operator")) {
      add(match.index + 1, match[0].length - 1, "parameter");
    }
  });

  scanRegex(code, numberPattern, (match) => {
    add(match.index, match[0].length, "number");
  });

  scanRegex(code, identifierPattern, (match) => {
    const word = match[0];
    const lower = word.toLowerCase();

    if (REGISTERS.test(word)) {
      add(match.index, word.length, "register");
    } else if (isInstruction(lower)) {
      add(match.index, word.length, "instruction");
    } else if (DIRECTIVES.has(lower)) {
      add(match.index, word.length, "keyword");
    } else if (DATA_DECLARATIONS.has(lower) || SIZE_SPECIFIERS.has(lower)) {
      add(match.index, word.length, "type");
    } else if (knownSymbols.knownMacros.has(word) || knownSymbols.knownMacros.has(lower)) {
      add(match.index, word.length, "function");
    } else if (knownSymbols.macroConstants.has(word) || knownSymbols.macroConstants.has(lower)) {
      add(match.index, word.length, "macroConstant", ["readonly"]);
    } else if (knownSymbols.dataSymbols.has(word) || knownSymbols.dataSymbols.has(lower)) {
      add(match.index, word.length, "variable");
    } else if (!isInsideRange(match.index, match.index + word.length, occupied)) {
      add(match.index, word.length, "variable");
    }
  });

  tokens
    .sort((left, right) => left.start - right.start || left.length - right.length)
    .forEach((token) => {
      builder.push(token.line, token.start, token.length, tokenTypeIndex.get(token.type), token.modifierBits);
    });
}

function collectKnownSymbols(document) {
  const macroConstants = new Set();
  const dataSymbols = new Set();
  const knownMacros = new Set();
  const defineMacros = new Map();
  const assignMacros = new Map();
  const multiLineMacros = new Map();
  let currentSectionKind = "code";

  for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber += 1) {
    const text = document.lineAt(lineNumber).text;
    const sectionKind = getSectionKindFromLine(text);
    if (sectionKind) {
      currentSectionKind = sectionKind;
    }

    const state = scanLine(text);
    const code = text.slice(0, state.commentStart);
    const defineMacro = parseDefineMacro(code, lineNumber);
    const assignMacro = parseAssignMacro(code, lineNumber);
    const macroBlock = parseMultiLineMacro(document, lineNumber);
    const equMatch = code.match(/^\s*([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)\s+equ\b/i);
    const labelMatch = code.match(/^\s*((?:%%|\.)?[A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(:)/);

    if (defineMacro) {
      storeSymbol(defineMacros, defineMacro.name, defineMacro);
      addKnownSymbol(macroConstants, defineMacro.name);
    }

    if (assignMacro) {
      storeSymbol(assignMacros, assignMacro.name, assignMacro);
      addKnownSymbol(macroConstants, assignMacro.name);
    }

    if (macroBlock) {
      storeSymbol(multiLineMacros, macroBlock.name, macroBlock);
      addKnownSymbol(knownMacros, macroBlock.name);
      lineNumber = macroBlock.endLine;
      continue;
    }

    if (equMatch) {
      addKnownSymbol(macroConstants, equMatch[1]);
    }

    if (labelMatch && currentSectionKind === "data") {
      addKnownSymbol(dataSymbols, labelMatch[1]);
    }
  }

  return { macroConstants, dataSymbols, knownMacros, defineMacros, assignMacros, multiLineMacros };
}

function addKnownSymbol(symbols, symbol) {
  symbols.add(symbol);
  symbols.add(symbol.toLowerCase());
}

function storeSymbol(symbols, name, value) {
  symbols.set(name, value);
  symbols.set(name.toLowerCase(), value);
}

function parseDefineMacro(code, lineNumber) {
  const match = code.match(/^\s*%(define|xdefine|idefine)\s+([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)(?:\(([^)]*)\))?\s*(.*)$/i);
  if (!match) {
    return null;
  }

  const params = match[3] ? match[3].split(",").map((param) => param.trim()).filter(Boolean) : [];

  return {
    kind: match[1].toLowerCase(),
    name: match[2],
    params,
    replacement: match[4].trim(),
    original: code.trim(),
    line: lineNumber
  };
}

function parseAssignMacro(code, lineNumber) {
  const match = code.match(/^\s*%(assign|iassign)\s+([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    kind: match[1].toLowerCase(),
    name: match[2],
    expression: match[3].trim(),
    original: code.trim(),
    line: lineNumber
  };
}

function parseMultiLineMacro(document, lineNumber) {
  const text = document.lineAt(lineNumber).text;
  const state = scanLine(text);
  const code = text.slice(0, state.commentStart);
  const match = code.match(/^\s*%(macro|imacro)\s+([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)\s+([^\s;]+)/i);
  if (!match) {
    return null;
  }

  const originalLines = [text];
  const body = [];
  let endLine = lineNumber;

  for (let nextLine = lineNumber + 1; nextLine < document.lineCount; nextLine += 1) {
    const bodyText = document.lineAt(nextLine).text;
    originalLines.push(bodyText);

    const bodyState = scanLine(bodyText);
    const bodyCode = bodyText.slice(0, bodyState.commentStart);
    if (/^\s*%endmacro\b/i.test(bodyCode)) {
      endLine = nextLine;
      break;
    }

    body.push(bodyText.trim());
    endLine = nextLine;
  }

  return {
    kind: match[1].toLowerCase(),
    name: match[2],
    argCount: match[3],
    body,
    original: originalLines.join("\n"),
    startLine: lineNumber,
    endLine
  };
}

function getSectionKindFromLine(text) {
  const state = scanLine(text);
  const code = text.slice(0, state.commentStart);
  const match = code.match(/\b(?:section|segment)\s+(\.[A-Za-z0-9_.-]+)/i);
  return match ? classifySection(match[1]) : null;
}

function classifySection(sectionName) {
  const lower = sectionName.toLowerCase();

  if (CODE_SECTIONS.has(lower)) {
    return "code";
  }

  if (DATA_SECTIONS.has(lower)) {
    return "data";
  }

  return /(?:^|[._-])(?:text|code|plt)(?:$|[._-])/.test(lower) ? "code" : "data";
}

function scanLine(text) {
  const stringRanges = [];
  const commentStart = findCommentStart(text);
  let quote = null;
  let start = 0;
  const codeEnd = commentStart >= 0 ? commentStart : text.length;

  for (let i = 0; i < codeEnd; i += 1) {
    const char = text[i];

    if (quote) {
      if (char === "\\" && i + 1 < text.length) {
        i += 1;
      } else if (char === quote) {
        stringRanges.push({ start, end: i + 1 });
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      start = i;
    }
  }

  if (quote) {
    stringRanges.push({ start, end: codeEnd });
  }

  return { commentStart: codeEnd, stringRanges };
}

function findCommentStart(line) {
  let quote = null;
  let escaped = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === "\"" || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === ";") {
      return i;
    }
  }

  return -1;
}

function scanRegex(text, regex, callback) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    callback(match);
    if (match[0].length === 0) {
      regex.lastIndex += 1;
    }
  }
}

function addToken(tokens, occupied, line, start, length, type, modifiers = []) {
  const end = start + length;
  if (isInsideRange(start, end, occupied)) {
    return false;
  }

  occupied.push({ start, end });
  tokens.push({ line, start, length, type, modifierBits: encodeTokenModifiers(modifiers) });
  return true;
}

function encodeTokenModifiers(modifiers) {
  return modifiers.reduce((bits, modifier) => {
    const index = tokenModifierIndex.get(modifier);
    return index === undefined ? bits : bits | (1 << index);
  }, 0);
}

function nextIdentifier(text, start) {
  const match = text.slice(start).match(/\s+([A-Za-z_.$?@][A-Za-z0-9_.$?@]*)/);
  if (!match) {
    return null;
  }

  return {
    index: start + match.index + match[0].lastIndexOf(match[1]),
    text: match[1]
  };
}

function isInstruction(word) {
  return (
    INSTRUCTIONS.has(word) ||
    /^cmov[a-z]+$/.test(word) ||
    /^j[a-z]+$/.test(word) ||
    /^set[a-z]+$/.test(word) ||
    /^v[a-z][a-z0-9]*$/.test(word) ||
    /^f[a-z][a-z0-9]*$/.test(word) ||
    /^(?:movs|lods|stos|scas|cmps)[bwdq]?$/.test(word)
  );
}

function intersectsRanges(start, end, ranges) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function isInsideRange(start, end, ranges) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function getHoverToken(document, position) {
  const range = document.getWordRangeAtPosition(position, HOVER_WORD_PATTERN);
  if (!range) {
    return null;
  }

  const token = document.getText(range);
  if (!token || token.trim() === "") {
    return null;
  }

  return { text: token, range };
}

function getHoverInfo(token, document, position, knownSymbols) {
  const lower = token.toLowerCase();
  const normalized = lower.startsWith("%") && lower.length > 1 ? lower.slice(1) : lower;

  const macroInfo = getMacroHoverInfo(token, document, position, knownSymbols);
  if (macroInfo) {
    return macroInfo;
  }

  const documentationInfo = getDocumentationHoverInfo(lower, normalized);
  if (documentationInfo) {
    return documentationInfo;
  }

  if (SPECIAL_SYMBOL_HOVERS[lower]) {
    return SPECIAL_SYMBOL_HOVERS[lower];
  }

  if (SECTION_HOVERS[lower]) {
    return { ...SECTION_HOVERS[lower], opcode: DIRECTIVE_OPCODE_NOTE };
  }

  if (REGISTERS.test(token)) {
    return getRegisterHover(token);
  }

  if (INSTRUCTION_HOVERS[normalized]) {
    return instructionHoverFromTuple(INSTRUCTION_HOVERS[normalized]);
  }

  if (isInstruction(normalized)) {
    return {
      category: "Instruction",
      description: `\`${normalized}\` is an x86/x86-64 instruction mnemonic recognized by NASM.`,
      syntax: `${normalized} operands`,
      example: `${normalized} ...`,
      opcode: "Opcode: varies by operand form.",
      notes: "Check the Intel or AMD instruction reference for exact operand forms, encodings, flags, exceptions, and CPU feature requirements."
    };
  }

  if (DIRECTIVE_HOVERS[normalized]) {
    return { ...DIRECTIVE_HOVERS[normalized], opcode: DIRECTIVE_OPCODE_NOTE };
  }

  if (DATA_HOVERS[normalized]) {
    return tupleHover(DATA_HOVERS[normalized], DIRECTIVE_OPCODE_NOTE);
  }

  if (SIZE_HOVERS[normalized]) {
    return tupleHover(SIZE_HOVERS[normalized], "Opcode: not applicable. This is an assembler size/addressing specifier, not a CPU instruction.");
  }

  if (PREPROCESSOR_HOVERS[normalized]) {
    return tupleHover(PREPROCESSOR_HOVERS[normalized], DIRECTIVE_OPCODE_NOTE);
  }

  if (PREPROCESSOR_DIRECTIVES.has(normalized)) {
    return {
      category: "Preprocessor directive",
      description: `\`%${normalized}\` is a NASM preprocessor directive processed before assembly.`,
      syntax: `%${normalized} ...`,
      example: `%${normalized} ...`,
      opcode: DIRECTIVE_OPCODE_NOTE
    };
  }

  return null;
}

function getDocumentationHoverInfo(lower, normalized) {
  const doc = NASM_DOCS[lower] || NASM_DOCS[normalized] || NASM_DOCS[`%${normalized}`];
  if (!doc) {
    return null;
  }

  return {
    category: doc.category,
    description: doc.description,
    syntax: Array.isArray(doc.syntax) ? doc.syntax.join("\n") : doc.syntax,
    example: Array.isArray(doc.examples) ? doc.examples.join("\n") : doc.examples,
    opcode: doc.opcode,
    notes: Array.isArray(doc.notes) ? doc.notes.join("\n") : doc.notes,
    references: doc.references
  };
}

function getMacroHoverInfo(token, document, position, knownSymbols) {
  const defineMacro = knownSymbols.defineMacros.get(token) || knownSymbols.defineMacros.get(token.toLowerCase());
  if (defineMacro) {
    const info = {
      category: defineMacro.params.length ? "NASM preprocessor macro" : "NASM macro constant",
      definedBy: defineMacro.original
    };

    if (defineMacro.params.length) {
      info.expansionPattern = defineMacro.replacement || "; empty replacement";
    } else {
      info.expandsTo = defineMacro.replacement || "; empty replacement";
    }

    return info;
  }

  const assignMacro = knownSymbols.assignMacros.get(token) || knownSymbols.assignMacros.get(token.toLowerCase());
  if (assignMacro) {
    return {
      category: "NASM preprocessor numeric assignment",
      definedBy: assignMacro.original,
      expandsTo: assignMacro.expression
    };
  }

  const multiLineMacro = knownSymbols.multiLineMacros.get(token) || knownSymbols.multiLineMacros.get(token.toLowerCase());
  if (multiLineMacro) {
    return {
      category: "NASM multi-line macro",
      definedBy: multiLineMacro.original,
      expansionPreview: getMultiLineMacroPreview(multiLineMacro, document.lineAt(position.line).text, token)
    };
  }

  return null;
}

function getMultiLineMacroPreview(macro, lineText, token) {
  if (macro.body.some((line) => COMPLEX_MACRO_DIRECTIVES.test(line))) {
    return [
      "; Expansion preview is simplified.",
      "; This macro contains NASM preprocessor logic.",
      "; Run NASM preprocessor for exact expansion."
    ].join("\n");
  }

  const args = parseMacroCallArguments(lineText, token);
  const previewLines = macro.body.slice(0, 20).map((line) =>
    line.replace(/%([1-9][0-9]*)/g, (match, index) => {
      const replacement = args[Number(index) - 1];
      return replacement === undefined ? match : replacement;
    })
  );

  return limitPreview(previewLines.join("\n"));
}

function parseMacroCallArguments(lineText, token) {
  const state = scanLine(lineText);
  const code = lineText.slice(0, state.commentStart);
  const match = code.match(new RegExp(`(^|\\s)${escapeRegExp(token)}\\b\\s*(.*)$`));
  if (!match) {
    return [];
  }

  const argsText = match[2].trim();
  if (!argsText) {
    return [];
  }

  const args = [];
  let current = "";
  let depth = 0;
  let quote = null;

  for (let i = 0; i < argsText.length; i += 1) {
    const char = argsText[i];

    if (quote) {
      current += char;
      if (char === "\\" && i + 1 < argsText.length) {
        current += argsText[i + 1];
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

function limitPreview(preview) {
  if (preview.length <= 2000) {
    return preview;
  }

  return `${preview.slice(0, 2000)}\n; Preview truncated.`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SPECIAL_SYMBOL_HOVERS = {
  "$": {
    category: "Special ASM symbol",
    description: "`$` evaluates to the assembly position at the start of the expression where it appears.",
    syntax: "$",
    example: "message_len equ $ - message",
    opcode: "Opcode: not applicable. This is an assembler expression symbol, not a CPU instruction.",
    notes: "Commonly used to compute the size of emitted data."
  },
  "$$": {
    category: "Special ASM symbol",
    description: "`$$` evaluates to the start address of the current section.",
    syntax: "$$",
    example: "offset_in_section equ $ - $$",
    opcode: "Opcode: not applicable. This is an assembler expression symbol, not a CPU instruction."
  },
  "%%": {
    category: "Macro-local label prefix",
    description: "`%%` introduces a label local to the current NASM multi-line macro expansion.",
    syntax: "%%label:",
    example: "%%entry:\n    push rbp",
    opcode: DIRECTIVE_OPCODE_NOTE
  }
};

function tupleHover(tuple, opcode) {
  return {
    category: tuple[0],
    description: tuple[1],
    syntax: tuple[2],
    example: tuple[3],
    opcode,
    notes: tuple[4]
  };
}

function instructionHoverFromTuple(tuple) {
  return {
    category: tuple[0],
    description: tuple[1],
    syntax: tuple[2],
    example: tuple[3],
    opcode: tuple[4],
    notes: tuple[5]
  };
}

function getRegisterHover(token) {
  const lower = token.toLowerCase();
  const general = getGeneralRegisterInfo(lower);
  if (general) {
    return general;
  }

  if (/^(?:xmm|ymm|zmm)(?:[0-9]|[12][0-9]|3[01])$/.test(lower)) {
    const family = lower.match(/^[a-z]+/)[0];
    const widths = { xmm: "128-bit", ymm: "256-bit", zmm: "512-bit" };
    return {
      category: `Register - SIMD/vector, ${widths[family]}`,
      description: `\`${lower}\` is a ${widths[family]} vector register used by SSE, AVX, AVX2, or AVX-512 instructions depending on the operand form and CPU feature set.`,
      syntax: lower,
      example: `${family === "xmm" ? "movdqa" : "vmovdqa"} ${lower}, [vector_data]`,
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction.",
      notes: "In 64-bit mode, AVX-512 capable processors expose registers up to `zmm31`; older SIMD extensions expose fewer architectural registers."
    };
  }

  if (/^mm[0-7]$/.test(lower)) {
    return {
      category: "Register - MMX, 64-bit",
      description: `\`${lower}\` is an MMX register aliased onto the x87 floating-point register state.`,
      syntax: lower,
      example: `movq ${lower}, [value]`,
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction.",
      notes: "Use `emms` before returning to x87 floating-point code after MMX operations."
    };
  }

  if (/^st[0-7]$/.test(lower)) {
    return {
      category: "Register - x87 floating-point stack",
      description: `\`${lower}\` names an x87 floating-point stack register. \`st0\` is the current top of stack.`,
      syntax: lower,
      example: "fadd st0, st1",
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction."
    };
  }

  if (/^k[0-7]$/.test(lower)) {
    return {
      category: "Register - AVX-512 opmask, 64-bit architectural mask",
      description: `\`${lower}\` is an AVX-512 opmask register used for per-lane predication and mask results.`,
      syntax: lower,
      example: `ktestw ${lower}, ${lower}`,
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction.",
      notes: "`k0` is often treated specially by AVX-512 instructions as the implicit all-enabled mask when no writemask is encoded."
    };
  }

  if (/^bnd[0-3]$/.test(lower)) {
    return {
      category: "Register - MPX bounds",
      description: `\`${lower}\` is an Intel MPX bounds register used by MPX bounds-checking instructions.`,
      syntax: lower,
      example: `bndmov ${lower}, [bounds]`,
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction.",
      notes: "Intel MPX is obsolete on modern Intel processors, but NASM still recognizes the registers and instructions."
    };
  }

  if (/^cr[02348]$/.test(lower)) {
    return {
      category: "Register - control, 64-bit in 64-bit mode",
      description: `\`${lower}\` is a privileged control register used by the processor for system state such as paging, protection, and extensions.`,
      syntax: lower,
      example: `mov rax, ${lower}`,
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction.",
      notes: "Accessing control registers uses privileged `mov` forms and is normally kernel-only."
    };
  }

  if (/^(?:dr[0-3]|dr6|dr7)$/.test(lower)) {
    return {
      category: "Register - debug, 64-bit in 64-bit mode",
      description: `\`${lower}\` is a debug register used for hardware breakpoints and debug status/control.`,
      syntax: lower,
      example: `mov rax, ${lower}`,
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction.",
      notes: "Debug register access is privileged."
    };
  }

  if (/^(?:cs|ds|es|fs|gs|ss)$/.test(lower)) {
    return {
      category: "Register - segment, 16-bit selector",
      description: `\`${lower}\` is a segment register. In 64-bit mode, most segmentation is disabled, but \`fs\` and \`gs\` bases are still commonly used for thread-local or kernel data.`,
      syntax: lower,
      example: `mov rax, [${lower}:0]`,
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction."
    };
  }

  return null;
}

function getGeneralRegisterInfo(lower) {
  const legacyAliases = {
    a: ["rax", "eax", "ax", "al", "ah", "accumulator", "return values, arithmetic results, and Linux syscall numbers"],
    b: ["rbx", "ebx", "bx", "bl", "bh", "base", "callee-saved storage in many x86-64 ABIs"],
    c: ["rcx", "ecx", "cx", "cl", "ch", "counter", "loop counts, shifts, and the fourth integer argument in the System V AMD64 ABI"],
    d: ["rdx", "edx", "dx", "dl", "dh", "data", "extended arithmetic results and the third integer argument in the System V AMD64 ABI"]
  };

  for (const aliases of Object.values(legacyAliases)) {
    if (aliases.slice(0, 5).includes(lower)) {
      const canonical = aliases[0];
      return {
        category: `Register - general purpose, ${registerWidth(lower)}`,
        description: `\`${lower}\` is part of the ${aliases[5]} general-purpose register family. The 64-bit name is \`${canonical}\`; this family is commonly used for ${aliases[6]}.`,
        syntax: lower,
        example: canonical === "rax" ? "mov rax, 60\nsyscall" : `mov ${lower}, 1`,
        aliases: aliases.slice(0, 5).join(", "),
        opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction."
      };
    }
  }

  const pointerAliases = {
    rsp: ["rsp", "esp", "sp", "spl", "stack pointer", "the top of the current stack"],
    rbp: ["rbp", "ebp", "bp", "bpl", "base/frame pointer", "stack-frame addressing"],
    rsi: ["rsi", "esi", "si", "sil", "source index", "source pointers for string operations and function arguments"],
    rdi: ["rdi", "edi", "di", "dil", "destination index", "destination pointers for string operations and function arguments"],
    rip: ["rip", "eip", "ip", "instruction pointer", "the address of the next instruction"]
  };

  for (const aliases of Object.values(pointerAliases)) {
    if (aliases.slice(0, -2).includes(lower)) {
      return {
        category: `Register - general purpose, ${registerWidth(lower)}`,
        description: `\`${lower}\` belongs to the ${aliases[aliases.length - 2]} register family, used for ${aliases[aliases.length - 1]}.`,
        syntax: lower,
        example: lower === "rip" ? "lea rax, [rel message]" : `mov ${lower}, rsp`,
        aliases: aliases.slice(0, -2).join(", "),
        opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction."
      };
    }
  }

  const extended = lower.match(/^r([8-9]|1[0-5])([dwb])?$/);
  if (extended) {
    const base = `r${extended[1]}`;
    return {
      category: `Register - general purpose, ${registerWidth(lower)}`,
      description: `\`${lower}\` is an x86-64 extended general-purpose register in the \`${base}\` family.`,
      syntax: lower,
      example: `mov ${base}, 1`,
      aliases: `${base}, ${base}d, ${base}w, ${base}b`,
      opcode: "Opcode: not applicable. This is a register operand, not a CPU instruction."
    };
  }

  return null;
}

function registerWidth(registerName) {
  if (/^(?:r(?:ax|bx|cx|dx|si|di|bp|sp|ip)|r(?:[8-9]|1[0-5]))$/.test(registerName)) {
    return "64-bit";
  }
  if (/^(?:e(?:ax|bx|cx|dx|si|di|bp|sp|ip)|r(?:[8-9]|1[0-5])d)$/.test(registerName)) {
    return "32-bit";
  }
  if (/^(?:[abcd]x|[sb]p|[sd]i|ip|r(?:[8-9]|1[0-5])w)$/.test(registerName)) {
    return "16-bit";
  }
  return "8-bit";
}

function formatHover(token, info) {
  const markdown = new vscode.MarkdownString(undefined, true);
  markdown.supportHtml = false;
  markdown.isTrusted = false;

  markdown.appendMarkdown(`### \`${escapeMarkdown(token)}\`\n\n`);
  appendHoverField(markdown, "Category", info.category);
  if (info.description) {
    markdown.appendMarkdown(`${info.description}\n\n`);
  }

  if (info.aliases) {
    appendHoverField(markdown, "Aliases", info.aliases);
  }

  if (info.definedBy) {
    markdown.appendMarkdown("**Defined by:**\n");
    markdown.appendCodeblock(info.definedBy, "asm");
  }

  if (info.expandsTo) {
    markdown.appendMarkdown("**Expands to:**\n");
    markdown.appendCodeblock(info.expandsTo, "asm");
  }

  if (info.expansionPattern) {
    markdown.appendMarkdown("**Expansion pattern:**\n");
    markdown.appendCodeblock(info.expansionPattern, "asm");
  }

  if (info.expansionPreview) {
    markdown.appendMarkdown("**Expansion preview:**\n");
    markdown.appendCodeblock(info.expansionPreview, "asm");
  }

  if (info.syntax) {
    markdown.appendMarkdown("**Syntax:**\n");
    markdown.appendCodeblock(info.syntax, "asm");
  }

  if (info.example) {
    markdown.appendMarkdown("**Example:**\n");
    markdown.appendCodeblock(info.example, "asm");
  }

  if (info.opcode) {
    appendHoverField(markdown, "Opcode", info.opcode.replace(/^Opcode:\s*/i, ""));
  }

  if (info.notes) {
    appendHoverField(markdown, "Notes", info.notes);
  }

  if (info.references && info.references.length) {
    markdown.appendMarkdown("**References:**\n\n");
    for (const reference of info.references) {
      if (reference.url) {
        markdown.appendMarkdown(`* [${escapeMarkdown(reference.name)}](${reference.url})\n`);
      } else {
        markdown.appendMarkdown(`* ${escapeMarkdown(reference.name)}\n`);
      }
    }
    markdown.appendMarkdown("\n");
  }

  return markdown;
}

function appendHoverField(markdown, label, value) {
  markdown.appendMarkdown(`**${label}:** ${value}\n\n`);
}

function escapeMarkdown(value) {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

module.exports = {
  activate,
  deactivate
};
