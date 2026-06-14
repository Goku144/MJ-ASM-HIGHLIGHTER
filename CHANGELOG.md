# Changelog

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
