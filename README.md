# MJ Asm Highlighter

MJ Asm Highlighter is a NASM x86_64 syntax highlighter for Visual Studio Code.

It uses semantic tokens plus TextMate scopes and works with your current VS Code theme. It does not require selecting a custom theme.

## Supported Files

- `.asm`
- `.nasm`
- `.inc`

The extension does not claim `.s` or `.S` by default because those files are often AT&T/GAS assembly instead of NASM.

## Features

- Two-layer NASM x86_64 highlighting: TextMate scopes for fast lexical fallback plus an analyzer-backed semantic token provider.
- Lightweight NASM symbol indexer for the current document and simple `%include "file.inc"` files.
- Instructions use semantic token type `instruction` so they can stay purple like C/C++ keywords.
- Registers use semantic token type `register` so they can stay dark blue instead of inheriting green/cyan type colors.
- Code labels use semantic token type `function.definition`; data labels in `.data`, `.bss`, `.rodata`, and `.rdata` use `variable.definition`.
- Section names use semantic token type `namespace.section` so `.text`, `.data`, `.bss`, and related names get their own special color.
- `%` in NASM directives and macro parameters uses semantic token type `operator`.
- Macro constants defined by `%define`, `%xdefine`, and `%assign` use semantic token type `macro.readonly`.
- Macro declarations and calls from `%macro`, `%imacro`, and function-like `%define` forms use semantic token type `macro`.
- Normal labels, dot-local labels, macro-local labels, and numeric labels are classified separately.
- `global symbol:function`, `global symbol:data`, and `extern symbol` get exported/external semantic modifiers.
- NASM `struc` names, fields such as `Person.age`, and generated `Person_size` constants are indexed.
- Hovering over `%define`, `%xdefine`, `%assign`, and simple `%macro` uses shows a lightweight macro expansion preview.
- `%include "file.inc"` symbols participate in semantic highlighting and hover, so macros/constants defined in include files can color and document call sites in the including file.
- Hover documentation is local to the extension for common instructions, registers, directives, sections, Linux x86-64 syscalls, and System V AMD64 register roles.
- Symbols use semantic token type `variable`, and macro parameters use `parameter`.
- The TextMate grammar still uses standard C/C++-compatible scope families as a fallback.
- Instructions use keyword-like scopes such as `keyword.mnemonic.asm.nasm` and `keyword.other.instruction.asm.nasm`.
- Registers use support/variable scopes such as `variable.language.register.asm.nasm` and `support.variable.register.asm.nasm`.
- Numbers, strings, comments, labels, preprocessor directives, macro parameters, sections, section attributes, data declarations, size specifiers, brackets, and operators are scoped for normal VS Code themes.
- Case-insensitive matching for common NASM spelling styles like `mov`, `MOV`, and `Mov`.
- Identifier-safe matching so words like `movement` and `myraxvalue` are not partially highlighted.
- Snippets for Linux entry points, syscalls, functions, macros, defines, includes, sections, and conditionals.

## Example

```asm
bits 64
default rel

%define SYS_WRITE 1
%define SYS_EXIT 60
%define STDOUT 1

%macro PRINT 2
    mov rax, SYS_WRITE
    mov rdi, STDOUT
    mov rsi, %1
    mov rdx, %2
    syscall
%%done:
%endmacro

global _start

section .data
message: db "Hello from NASM", 10
msg_len equ $ - message
value dq 0x2A

section .text
_start:
    PRINT message, msg_len

    mov rax, [rel value]
    add rax, 10
    cmp rax, 42
    je .done

.loop:
    dec rax
    jnz .loop

.done:
    mov rax, SYS_EXIT
    xor rdi, rdi
    syscall
```

## Build

```sh
npm install
npm run validate
npm run package
```

The `package` script uses `@vscode/vsce` to create a `.vsix` file.

## Install VSIX

1. Run `npm run package`.
2. Open the VS Code Extensions panel.
3. Select **Install from VSIX...**.
4. Choose the generated `mj-asm-highlighter-0.1.3.vsix`.

## Refresh After Installing

Run:

```text
Ctrl+Shift+P -> Developer: Reload Window
```

Then open a `.asm`, `.nasm`, or `.inc` file. The bottom-right language mode should be `NASM x86_64`.

## Semantic Highlighting

Make sure semantic highlighting is enabled:

```json
"editor.semanticHighlighting.enabled": true
```

## Include Paths

Semantic highlighting resolves simple quoted NASM includes:

```asm
%include "PrintStr.inc"
%include "./PrintStr.inc"
%include "../include/PrintStr.inc"
```

Resolution checks the current file directory, workspace folders, configured include paths, and common project include folders such as `include/`, `includes/`, `asm/include/`, and `interface/Asm/`.

```json
{
  "mjAsmHighlighter.includePaths": [
    "${workspaceFolder}/include",
    "${workspaceFolder}/asm/include",
    "${fileDirname}/../include"
  ]
}
```

The analyzer keeps a visited-file set and a max include depth, so recursive include chains cannot loop forever. Editing `.asm`, `.nasm`, or `.inc` files clears the include cache and requests semantic-token refresh.

## Macro Expansion Hover

The extension can show simple macro expansion previews for `%define`, `%xdefine`, `%assign`, and `%macro`, including macros found through simple `%include` resolution.

```asm
%define SYS_EXIT 60
mov rax, SYS_EXIT
```

Hovering over `SYS_EXIT` shows:

```asm
60
```

For multi-line macros:

```asm
%macro prologue 1
    push rbp
    mov rbp, rsp
    sub rsp, %1
%endmacro

prologue 16
```

Hovering over `prologue` shows a simplified expansion preview:

```asm
push rbp
mov rbp, rsp
sub rsp, 16
```

This is a preview, not a full NASM preprocessor emulator. Complex macros using `%rep`, `%if`, `%rotate`, nested macros, or recursive expansion may show a simplified note. For exact expansion, use NASM preprocessing/output tools.

Cross-file example:

```asm
%include "PrintStr.inc"

print_str:
    print_str_macro rdi, rsi
```

If `PrintStr.inc` defines `%macro print_str_macro 2`, hovering the call shows the include file and line, raw body, `%1`/`%2` argument mapping, and a best-effort preview with `rdi` and `rsi` substituted.

## Hover documentation

Hover documentation is local and useful without opening a website. Test:

- Hover over `mov`
- Hover over `rax`
- Hover over `%define`
- Hover over `.data`
- Hover over `db`
- Hover over `qword`
- Hover over `syscall`
- Hover over `rdi`
- Hover over `.note.GNU-stack`

## Macro expansion hover

Test:

- Hover over `SYS_EXIT`
- Hover over `BUFFER_SIZE`
- Hover over `BIT`
- Hover over `LOCAL_COUNT`
- Hover over `prologue`
- Hover over `repeat_store`

Expected:

- `SYS_EXIT` shows expands to `60`
- `BUFFER_SIZE` shows expands to `64`
- `BIT` shows its expansion pattern
- `LOCAL_COUNT` shows expands to `4`
- `prologue` shows a simple expansion preview
- `repeat_store` reports that exact expansion requires NASM preprocessing

## Optional Color Fallback

This extension contributes minimal NASM-only color defaults for semantic tokens and TextMate scopes. If your theme still does not color NASM tokens the way you want, add this to your VS Code `settings.json`:

```json
{
  "editor.semanticHighlighting.enabled": true,
  "editor.semanticTokenColorCustomizations": {
    "rules": {
      "instruction:nasmx64": "#C586C0",
      "keyword:nasmx64": "#C586C0",
      "register:nasmx64": "#569CD6",
      "macro:nasmx64": "#569CD6",
      "macro.readonly:nasmx64": "#569CD6",
      "macro.declaration:nasmx64": "#569CD6",
      "macroConstant:nasmx64": "#569CD6",
      "macroConstant.declaration:nasmx64": "#569CD6",
      "namespace.section:nasmx64": "#4FC1FF",
      "section:nasmx64": "#4FC1FF",
      "modifier:nasmx64": "#D7BA7D",
      "operator:nasmx64": "#D7BA7D",
      "function:nasmx64": "#DCDCAA",
      "function.definition:nasmx64": "#DCDCAA",
      "function.local:nasmx64": "#DCDCAA",
      "variable:nasmx64": "#9CDCFE",
      "variable.declaration:nasmx64": "#9CDCFE",
      "variable.definition:nasmx64": "#9CDCFE",
      "variable.numericLabel:nasmx64": "#D7BA7D",
      "variable.macroLocal:nasmx64": "#D7BA7D",
      "type:nasmx64": "#4EC9B0",
      "struct:nasmx64": "#4EC9B0",
      "property:nasmx64": "#9CDCFE",
      "parameter:nasmx64": "#9CDCFE",
      "number:nasmx64": "#B5CEA8",
      "string:nasmx64": "#CE9178"
    }
  },
  "editor.tokenColorCustomizations": {
    "textMateRules": [
      {
        "scope": [
          "punctuation.definition.directive.asm.nasm",
          "punctuation.definition.macro.asm.nasm",
          "punctuation.definition.preprocessor.asm.nasm"
        ],
        "settings": {
          "foreground": "#D7BA7D"
        }
      },
      {
        "scope": [
          "entity.name.function.asm.nasm"
        ],
        "settings": {
          "foreground": "#DCDCAA"
        }
      },
      {
        "scope": [
          "entity.name.section.asm.nasm"
        ],
        "settings": {
          "foreground": "#4FC1FF"
        }
      },
      {
        "scope": [
          "entity.name.constant.preprocessor.asm.nasm",
          "constant.other.preprocessor.asm.nasm"
        ],
        "settings": {
          "foreground": "#569CD6"
        }
      },
      {
        "scope": [
          "variable.language.register.asm.nasm",
          "support.variable.register.asm.nasm"
        ],
        "settings": {
          "foreground": "#569CD6"
        }
      },
      {
        "scope": [
          "keyword.mnemonic.asm.nasm",
          "keyword.other.instruction.asm.nasm"
        ],
        "settings": {
          "foreground": "#C586C0"
        }
      }
    ]
  }
}
```

## TextMate Percent Fallback

This extension uses TextMate scopes and your current VS Code theme. If your theme does not color `%` gold, add this to your VS Code `settings.json`:

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    {
      "scope": [
        "punctuation.definition.directive.asm.nasm",
        "punctuation.definition.macro.asm.nasm",
        "punctuation.definition.preprocessor.asm.nasm"
      ],
      "settings": {
        "foreground": "#D7BA7D"
      }
    }
  ]
}
```

## TextMate Comment Fallback

Most VS Code themes color `comment.line` scopes automatically. If NASM semicolon comments are not green in your theme, add this to your VS Code `settings.json`:

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    {
      "scope": "comment.line.semicolon.asm.nasm",
      "settings": {
        "foreground": "#6A9955"
      }
    }
  ]
}
```

## Inspect Scopes

To verify semantic tokens:

1. Open Command Palette.
2. Run: `Developer: Inspect Editor Tokens and Scopes`.
3. Click on a data label like `message`.
4. It must show semantic token type `variable` with modifier `definition`.

Click on a code label like `_start`.
It must show semantic token type `function`.

Click on `.data`. It must show semantic token type `namespace` with modifier `section`.

Click on `rax`. It must show semantic token type `register`.

Click on `mov`. It must show semantic token type `instruction`.

Click on `SYS_WRITE`. It must show semantic token type `macro` with modifier `readonly`.

Click on `%` in `%define`. It must show semantic token type `operator`.

Click on `message` when used in `mov rsi, message`. It must show semantic token type `variable`.

Click on `PUSH_ALL`. It must show semantic token type `macro`.

Click on `1f` or `1b`. It must show semantic token type `variable` with modifier `numericLabel`.

Click on `%%end_label`. It must show semantic token type `variable` with modifier `macroLocal`.

Click on `Person.age`. `Person` must show semantic token type `struct`, and `.age` must show semantic token type `property`.

For conditional preprocessor checks:

Click on `%` in `%elifndef`. It must show semantic token type `operator` with color `#D7BA7D`.

Click on `elifndef`. It must show semantic token type `instruction` or `keyword` with color `#C586C0`.

Click on `RELEASE`. It must show semantic token type `macro` with color `#569CD6`.

Click on `rax`. It must show semantic token type `register` with color `#569CD6`.

Click on `mov`. It must show semantic token type `instruction` with color `#C586C0`.

The TextMate fallback scopes should also include:

```text
entity.name.function.asm.nasm
entity.name.section.asm.nasm
punctuation.definition.directive.asm.nasm
variable.other.asm.nasm
```

See [docs/token-scopes.md](docs/token-scopes.md) for the semantic token and TextMate fallback mapping, [docs/local-hover-docs.md](docs/local-hover-docs.md) for local hover documentation, and [docs/include-resolution.md](docs/include-resolution.md) for include search behavior.

## Project Layout

```text
mj-asm-highlighter/
  package.json
  README.md
  CHANGELOG.md
  LICENSE
  language-configuration.json
  data/
    nasm-docs.json
    nasm-instructions.json
    nasm-registers.json
    nasm-directives.json
    linux-syscalls-x86_64.json
    calling-conventions.json
  docs/
    token-scopes.md
    local-hover-docs.md
    include-resolution.md
  src/
    extension.js
    language/
      grammar-support.js
      hoverProvider.js
      semanticTokens.js
      nasmAnalyzer.js
      includeResolver.js
      localDocs.js
      macroExpansion.js
      symbolTable.js
      tokenTypes.js
      diagnostics.js
    test/
      analyzer.test.js
      hoverProvider.test.js
      semanticTokens.test.js
  syntaxes/
    nasm-x64.tmLanguage.json
  snippets/
    nasm-x64.code-snippets
  examples/
    demo.asm
    macros.inc
    PrintStr.inc
    cross-file-macro-test.asm
  scripts/
    validate.js
  .vscodeignore
  .gitignore
```

## Limitations

This extension highlights NASM syntax and provides lightweight macro expansion previews. The semantic analyzer indexes simple declarations and includes, but it does not perform full NASM preprocessing, macro expansion, assembling, linking, or diagnostics.

Known limits:

- Macro expansion preview is simple `%1`, `%2`, `%3` substitution.
- Complex preprocessor logic such as `%rep`, `%if`, `%rotate`, nested macros, or recursive expansion may show the raw macro body only.
- Include resolution supports normal quoted include paths, not every NASM include edge case.
# MJ-ASM-HIGHLIGHTER
