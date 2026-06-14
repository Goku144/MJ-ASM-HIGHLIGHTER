# NASM Token Scopes

MJ Asm Highlighter uses two layers.

The TextMate grammar is the fast lexical baseline. It scopes comments, strings, numbers, preprocessor directives, instructions, registers, section declarations, data directives, size/addressing keywords, labels, and simple label references.

The semantic token provider builds a lightweight NASM symbol table for the current document and simple `%include "file.inc"` files. It then classifies known symbols in a way that is closer to C/C++ semantic colorization.

Included macro functions and constants are merged into the including document's semantic token pass. For example, if `PrintStr.inc` defines `%macro print_str_macro 2`, then `print_str_macro rdi, rsi` in the including file receives semantic token type `macro`.

## Semantic Tokens

| NASM source | Semantic token |
| --- | --- |
| `%define SYS_WRITE 1` | `macro.declaration.readonly` |
| `SYS_WRITE` | `macro.readonly` |
| `%define BIT(x) ...` | `macro.declaration` |
| `BIT(4)` | `macro` |
| `%macro PUSH_ALL 0` | `macro.declaration` |
| `PUSH_ALL` | `macro` |
| `_start:` in `.text` | `function.definition.code` |
| `buffer:` in `.data`/`.bss` | `variable.definition.data` |
| `.loop:` | `function.definition.local` or `variable.definition.local` |
| `.loop` reference | `function.local` or `variable.local` |
| `1:` | `variable.definition.numericLabel` |
| `1f`, `1b` | `variable.numericLabel` |
| `%%again:` | `variable.definition.macroLocal` |
| `%%again` | `variable.macroLocal` |
| `section .rodata align=16` | `.rodata` as `namespace.section`, `align=16` as `modifier` |
| `global asm_hello:function` | `asm_hello` as `function.global.exported`, `:function` as `modifier.code` |
| `global global_counter:data` | `global_counter` as `variable.global.exported`, `:data` as `modifier.data` |
| `extern printf` | `printf` as `function.global.external` |
| `struc Person` | `Person` as `struct.declaration` |
| `Person.age` | `Person` as `struct`, `.age` as `property` |
| `Person_size` | `macro.readonly` |

## TextMate Scopes

Important fallback scopes include:

```text
comment.line.semicolon.asm.nasm
string.quoted.double.asm.nasm
string.quoted.single.asm.nasm
constant.character.escape.asm.nasm
constant.numeric.integer.asm.nasm
constant.numeric.hex.asm.nasm
constant.numeric.binary.asm.nasm
constant.numeric.octal.asm.nasm
constant.numeric.float.asm.nasm
keyword.control.directive.preprocessor.asm.nasm
keyword.control.conditional.preprocessor.asm.nasm
keyword.control.include.preprocessor.asm.nasm
entity.name.constant.preprocessor.asm.nasm
entity.name.function.macro.asm.nasm
storage.modifier.global.asm.nasm
storage.modifier.extern.asm.nasm
storage.modifier.symbol-attribute.function.asm.nasm
storage.modifier.symbol-attribute.data.asm.nasm
keyword.directive.section.asm.nasm
entity.name.section.asm.nasm
storage.modifier.section.attribute.asm.nasm
entity.name.label.asm.nasm
entity.name.label.local.asm.nasm
entity.name.label.local.macro.asm.nasm
entity.name.label.numeric.asm.nasm
variable.other.label.local.reference.asm.nasm
variable.other.label.local.macro.reference.asm.nasm
variable.other.label.numeric.reference.asm.nasm
keyword.mnemonic.instruction.asm.nasm
variable.language.register.general.asm.nasm
variable.language.register.simd.asm.nasm
variable.language.register.fpu.asm.nasm
variable.language.register.segment.asm.nasm
storage.type.size.asm.nasm
storage.modifier.addressing.asm.nasm
storage.type.data.asm.nasm
keyword.directive.storage.asm.nasm
```

Use `Developer: Inspect Editor Tokens and Scopes` in VS Code to verify both the semantic token and TextMate fallback scope under the cursor.
