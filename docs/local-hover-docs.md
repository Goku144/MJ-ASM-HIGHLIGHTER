# Local Hover Docs

MJ Asm Highlighter provides hover text from local extension data, not from live website lookups.

Local docs cover:

- Every instruction mnemonic recognized by the grammar, including aliases such as `je`/`jz`, condition-code families, stack/frame instructions, string instructions, system/CPU instructions, atomics, SSE/SIMD, AVX, AVX-512 mask operations, AES/SHA helpers, and legacy x87 instructions.
- General-purpose, segment, vector, and x87 registers.
- NASM assembler and preprocessor directives such as `section`, `align`, `global`, `%include`, `%define`, `%assign`, `%macro`, and `%endmacro`.
- Section attributes such as `align=16`, `noalloc`, `noexec`, `nowrite`, and `progbits`.
- Linux x86-64 syscall register usage and common syscall numbers.
- System V AMD64 function-call register roles.
- Common sections such as `.text`, `.data`, `.bss`, `.rodata`, and `.note.GNU-stack`.

Macro hover uses the analyzer symbol table. For included macros, hover shows the defining file and line, macro body, argument mapping, and a simple preview with `%1`, `%2`, `%3`, and later numbered parameters substituted.

Limitations:

- This is not a full NASM assembler or preprocessor.
- Complex macro bodies that use conditional or repeat preprocessor logic show the raw macro body with a warning.
- Local docs are concise teaching notes; exact encodings and every CPU exception are intentionally out of scope.

Instruction coverage is checked by `npm run check:instruction-docs`, which compares the TextMate grammar mnemonic list with `data/nasm-instructions.json`.
