# Changelog

## 1.0.2

- Removed redundant explicit activation events and kept runtime activation through contributed NASM language and command declarations.
- Added regression validation for cross-file NASM macro recognition.
- Added documentation for cross-file macro testing.
- Preserved include-file macro highlighting and navigation behavior.

## 1.0.1

- Added VS Code Go to Definition and Go to Declaration support for NASM labels, local labels, numeric labels, macro-local labels, macros, constants, structs, fields, externs, globals, and include-resolved symbols.
- Added definition navigation examples, tests, and documentation.

## 1.0.0

- Added complete local hover documentation coverage for every instruction mnemonic recognized by the grammar, with alias support for equivalent condition-code and prefix variants.
- Added `examples/instruction-hover-test.asm` as a manual hover coverage fixture.
- Added local hover docs for `leave`, `enter`, `test`, carry arithmetic, division helpers, extension moves, loop instructions, interrupts, CPU ID, timestamp, and halt instructions.
- Added local hover docs for `align` as both a directive and section attribute, plus `.note.GNU-stack` attributes `noalloc`, `noexec`, `nowrite`, and `progbits`.
- Split `align=16` tokenization into `align`, `=`, and numeric `16` for better theme-friendly modifier/operator/number coloring.
- Added TextMate scopes for arithmetic operators, assignment, commas, segment separators, and bracket begin/end punctuation.
- Added a visual operator/number acceptance example and automated checks for semantic number priority.

## 0.1.3

- Added include-aware macro/constant hover for simple `%include "file.inc"` files.
- Added local hover docs for common instructions, registers, directives, sections, Linux x86-64 syscalls, and System V AMD64 roles.
- Added simple macro expansion previews with `%1`, `%2`, `%3` argument substitution and raw-body fallback for complex macros.
- Added cross-file macro examples and tests for included macro semantic tokens and hover previews.
- Added include resolution docs, local hover docs, repository metadata, and package version bump.

## 0.1.1

- Fixed NASM semicolon comment scopes and punctuation capture for theme-friendly comment coloring.
- Added comment-safe semantic token parsing so instructions and symbols inside comments are ignored.
- Expanded the example ASM files with educational comments and broader NASM examples.

## 0.1.0

- Added NASM x86_64 TextMate grammar using standard theme-friendly scopes.
- Added highlighting scopes for instructions, registers, numbers, strings, comments, preprocessor directives, macro-defined names, macro parameters, labels, sections, data declarations, size specifiers, brackets, and operators.
- Added language configuration, snippets, rich NASM examples, VSIX packaging script, and validation script.
- Removed the theme contribution so highlighting works with the user's active VS Code theme.
