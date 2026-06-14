# Local Hover Docs

MJ Asm Highlighter provides hover text from local extension data, not from live website lookups.

Local docs cover:

- Common x86-64/NASM instructions such as `mov`, `lea`, `call`, `ret`, `syscall`, jumps, bit operations, SIMD examples, and x87 examples.
- General-purpose, segment, vector, and x87 registers.
- NASM assembler and preprocessor directives such as `section`, `global`, `%include`, `%define`, `%assign`, `%macro`, and `%endmacro`.
- Linux x86-64 syscall register usage and common syscall numbers.
- System V AMD64 function-call register roles.
- Common sections such as `.text`, `.data`, `.bss`, `.rodata`, and `.note.GNU-stack`.

Macro hover uses the analyzer symbol table. For included macros, hover shows the defining file and line, macro body, argument mapping, and a simple preview with `%1`, `%2`, `%3`, and later numbered parameters substituted.

Limitations:

- This is not a full NASM assembler or preprocessor.
- Complex macro bodies that use conditional or repeat preprocessor logic show the raw macro body with a warning.
- Local docs are concise teaching notes; exact encodings and every CPU exception are intentionally out of scope.
