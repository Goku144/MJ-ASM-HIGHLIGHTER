"use strict";

const instructions = require("../../data/nasm-instructions.json");
const registers = require("../../data/nasm-registers.json");
const directives = require("../../data/nasm-directives.json");
const linuxSyscalls = require("../../data/linux-syscalls-x86_64.json");
const callingConventions = require("../../data/calling-conventions.json");

const SECTION_DOCS = {
  ".text": {
    title: ".text",
    category: "Section",
    description: "Code section used for executable instructions and code labels.",
    syntax: ["section .text"],
    examples: ["section .text", "_start:", "    mov rax, 60"]
  },
  ".data": {
    title: ".data",
    category: "Section",
    description: "Initialized writable data section. Values declared here are emitted into the object file.",
    syntax: ["section .data"],
    examples: ["section .data", "message: db \"Hello\", 10, 0"]
  },
  ".bss": {
    title: ".bss",
    category: "Section",
    description: "Uninitialized data section. `resb`, `resq`, and related reservations are commonly placed here.",
    syntax: ["section .bss"],
    examples: ["section .bss", "buffer: resb 64"]
  },
  ".rodata": {
    title: ".rodata",
    category: "Section",
    description: "Read-only data section for constants, strings, jump tables, and other immutable data.",
    syntax: ["section .rodata"],
    examples: ["section .rodata", "prompt: db \"name: \", 0"]
  },
  ".rdata": {
    title: ".rdata",
    category: "Section",
    description: "Read-only data section name commonly used by PE/COFF targets.",
    syntax: ["section .rdata"],
    examples: ["section .rdata", "value: dq 42"]
  },
  ".init": {
    title: ".init",
    category: "Section",
    description: "Initialization code section used by some linkers and runtimes.",
    syntax: ["section .init"],
    examples: ["section .init", "    ret"]
  },
  ".fini": {
    title: ".fini",
    category: "Section",
    description: "Finalization code section used by some linkers and runtimes.",
    syntax: ["section .fini"],
    examples: ["section .fini", "    ret"]
  },
  ".note.gnu-stack": {
    title: ".note.GNU-stack",
    category: "Section",
    description: "ELF note section used to mark whether the object requires an executable stack.",
    syntax: ["section .note.GNU-stack noalloc noexec nowrite progbits"],
    examples: ["section .note.GNU-stack noalloc noexec nowrite progbits"],
    notes: ["Normal user-space objects should not require an executable stack."]
  }
};

const SIZE_DOCS = {
  byte: ["8-bit memory operand or data element.", "byte [address]", "mov byte [buffer], 1"],
  word: ["16-bit memory operand or data element.", "word [address]", "mov word [value], ax"],
  dword: ["32-bit memory operand or data element.", "dword [address]", "mov dword [value], eax"],
  qword: ["64-bit memory operand or data element.", "qword [address]", "mov qword [buffer], 123"],
  tword: ["80-bit memory operand, commonly for x87 extended precision.", "tword [address]", "fld tword [value]"],
  oword: ["128-bit memory operand.", "oword [address]", "movdqa xmm0, oword [vector]"],
  yword: ["256-bit memory operand.", "yword [address]", "vmovdqa ymm0, yword [vector]"],
  zword: ["512-bit memory operand.", "zword [address]", "vmovdqa64 zmm0, zword [vector]"],
  ptr: ["MASM-like memory type marker accepted by NASM in some forms.", "qword ptr [address]", "mov rax, qword ptr [value]"],
  rel: ["Requests RIP-relative addressing for a memory reference in 64-bit mode.", "rel symbol", "mov rax, [rel value]"],
  abs: ["Requests absolute addressing instead of RIP-relative addressing.", "abs symbol", "mov rax, [abs address]"],
  strict: ["Prevents NASM from shrinking an immediate or displacement to a smaller encoding.", "strict size expression", "push strict dword 1"],
  short: ["Requests a short branch encoding where possible.", "short label", "jmp short .done"],
  near: ["Requests or describes a near branch or call.", "near label", "call near helper"],
  far: ["Requests or describes a far branch target.", "far target", "jmp far [pointer]"],
  wrt: ["Requests relocation with respect to another symbol or base where supported.", "symbol wrt base", "mov rax, symbol wrt ..gotpc"]
};

function getLocalDoc(token) {
  const lower = normalize(token);
  return (
    getInstructionDoc(lower) ||
    getRegisterDoc(lower) ||
    getDirectiveDoc(token) ||
    getSectionDoc(lower) ||
    getSizeDoc(lower)
  );
}

function getInstructionDoc(token) {
  const resolved = resolveInstructionDoc(token);
  if (!resolved) {
    return null;
  }

  const { doc, aliasOf } = resolved;
  if (token === "syscall") {
    const convention = linuxSyscalls.registerConvention;
    return {
      title: "syscall",
      category: "Instruction - Linux system call entry",
      description: doc.summary,
      syntax: doc.syntax,
      examples: doc.examples,
      notes: [
        "On Linux x86-64:",
        `- \`${convention.number}\` = syscall number`,
        ...convention.arguments.map((register, index) => `- \`${register}\` = argument ${index + 1}`),
        `- \`${convention.returnValue}\` contains the return value`,
        ...convention.notes
      ]
    };
  }

  return {
    title: token,
    subtitle: doc.subtitle,
    category: `Instruction - ${doc.category}`,
    description: doc.summary,
    syntax: doc.syntax,
    examples: doc.examples,
    notes: aliasOf ? [`Alias of \`${aliasOf}\`.`, ...(doc.notes || [])] : doc.notes,
    flags: doc.flags
  };
}

function resolveInstructionDoc(token, seen = new Set()) {
  const lower = normalize(token);
  const doc = instructions[lower];
  if (!doc || seen.has(lower)) {
    return null;
  }

  if (!doc.aliasOf) {
    return { doc };
  }

  const aliasOf = normalize(doc.aliasOf);
  seen.add(lower);
  const resolved = resolveInstructionDoc(aliasOf, seen);
  return resolved ? { doc: resolved.doc, aliasOf } : null;
}

function getRegisterDoc(token) {
  const explicit = registers[token];
  if (explicit && token !== "familyTemplates") {
    return registerDoc(explicit);
  }

  const legacy = legacyRegisterDoc(token);
  if (legacy) {
    return registerDoc(legacy);
  }

  const extended = token.match(/^r([8-9]|1[0-5])([dwb])?$/);
  if (extended) {
    const base = `r${extended[1]}`;
    const baseDoc = registers[base] || {
      name: base,
      size: 64,
      family: "general-purpose",
      summary: "64-bit extended general-purpose register."
    };
    return registerDoc({
      ...baseDoc,
      name: token,
      size: registerWidth(token),
      summary: `${registerWidth(token)} extended general-purpose register in the \`${base}\` family.`,
      examples: [`mov ${token}, 1`]
    });
  }

  const vector = token.match(/^(xmm|ymm|zmm)([0-9]|[12][0-9]|3[01])$/);
  if (vector) {
    const template = registers.familyTemplates[vector[1]];
    return registerDoc({
      ...template,
      name: token
    });
  }

  const fpu = token.match(/^st([0-7])$/);
  if (fpu) {
    const template = registers.familyTemplates.st;
    return registerDoc({
      ...template,
      name: token
    });
  }

  return null;
}

function getDirectiveDoc(token) {
  const lower = normalize(token);
  const key = lower.startsWith("%") ? lower : lower;
  const percentKey = lower.startsWith("%") ? lower : `%${lower}`;
  const doc = directives[key] || directives[percentKey];
  if (!doc) {
    return null;
  }

  return {
    title: doc.name,
    subtitle: doc.subtitle,
    category: titleCase(doc.category),
    description: doc.summary,
    syntax: doc.syntax,
    examples: doc.examples,
    notes: doc.notes
  };
}

function getSectionDoc(token) {
  return SECTION_DOCS[token] || null;
}

function getSizeDoc(token) {
  const doc = SIZE_DOCS[token];
  if (!doc) {
    return null;
  }

  return {
    title: token,
    category: "Size/addressing specifier",
    description: doc[0],
    syntax: [doc[1]],
    examples: [doc[2]]
  };
}

function getSyscallDocByMacro(name, value) {
  const syscallName = syscallNameFromMacro(name);
  const byName = syscallName ? linuxSyscalls.syscalls[syscallName] : null;
  const byValue = value !== undefined ? syscallByNumber(value) : null;
  const syscall = byName || byValue;
  if (!syscall) {
    return null;
  }

  const resolvedName = byName ? syscallName : syscall.name;
  return {
    title: `Linux syscall: ${resolvedName}`,
    category: "Linux x86-64 syscall",
    description: `Syscall number ${syscall.number}.`,
    syntax: [`rax = ${syscall.number}`, ...syscall.arguments.map((arg) => `${arg.register} = ${arg.name}`)],
    examples: syscall.example,
    notes: linuxSyscalls.registerConvention.notes
  };
}

function syscallByNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }

  for (const [name, syscall] of Object.entries(linuxSyscalls.syscalls)) {
    if (syscall.number === number) {
      return { name, ...syscall };
    }
  }
  return null;
}

function syscallNameFromMacro(name) {
  const match = String(name || "").match(/^SYS_([A-Za-z0-9_]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function registerDoc(doc) {
  const notes = [];
  if (doc.sysvRole) {
    notes.push(`System V AMD64: ${doc.sysvRole}`);
  }
  if (doc.linuxSyscallRole) {
    notes.push(`Linux syscall: ${doc.linuxSyscallRole}`);
  }

  return {
    title: doc.name,
    category: `Register - ${doc.family}, ${doc.size}-bit`,
    description: doc.summary,
    syntax: [doc.name],
    examples: doc.examples || [`mov ${doc.name}, 0`],
    notes
  };
}

function legacyRegisterDoc(token) {
  const families = {
    rax: ["rax", "eax", "ax", "al", "ah"],
    rbx: ["rbx", "ebx", "bx", "bl", "bh"],
    rcx: ["rcx", "ecx", "cx", "cl", "ch"],
    rdx: ["rdx", "edx", "dx", "dl", "dh"],
    rsi: ["rsi", "esi", "si", "sil"],
    rdi: ["rdi", "edi", "di", "dil"],
    rbp: ["rbp", "ebp", "bp", "bpl"],
    rsp: ["rsp", "esp", "sp", "spl"],
    rip: ["rip", "eip", "ip"]
  };

  for (const [base, aliases] of Object.entries(families)) {
    if (aliases.includes(token)) {
      const baseDoc = registers[base];
      if (!baseDoc) {
        return null;
      }
      return {
        ...baseDoc,
        name: token,
        size: registerWidth(token),
        summary: token === base ? baseDoc.summary : `${registerWidth(token)} alias in the \`${base}\` register family.`,
        examples: token === base ? baseDoc.examples : [`mov ${token}, 0`]
      };
    }
  }

  return null;
}

function registerWidth(token) {
  if (/^(?:r(?:ax|bx|cx|dx|si|di|bp|sp|ip)|r(?:[8-9]|1[0-5]))$/.test(token)) {
    return 64;
  }
  if (/^(?:e(?:ax|bx|cx|dx|si|di|bp|sp|ip)|r(?:[8-9]|1[0-5])d)$/.test(token)) {
    return 32;
  }
  if (/^(?:[abcd]x|[sd]i|[sb]p|ip|r(?:[8-9]|1[0-5])w)$/.test(token)) {
    return 16;
  }
  return 8;
}

function normalize(token) {
  return String(token || "").toLowerCase();
}

function titleCase(value) {
  return String(value || "").replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

module.exports = {
  callingConventions,
  getLocalDoc,
  getInstructionDoc,
  resolveInstructionDoc,
  getRegisterDoc,
  getDirectiveDoc,
  getSectionDoc,
  getSizeDoc,
  getSyscallDocByMacro,
  syscallByNumber,
  syscallNameFromMacro
};
