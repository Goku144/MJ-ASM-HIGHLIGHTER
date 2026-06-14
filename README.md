# MJ Asm Highlighter

MJ Asm Highlighter is a NASM x86_64 syntax highlighter for Visual Studio Code.

It uses semantic tokens plus TextMate scopes and works with your current VS Code theme. It does not require selecting a custom theme.

## Supported Files

- `.asm`
- `.nasm`
- `.inc`

The extension does not claim `.s` or `.S` by default because those files are often AT&T/GAS assembly instead of NASM.

## Features

- NASM x86_64 semantic token provider using standard VS Code token types plus NASM-specific token types.
- Instructions use semantic token type `instruction` so they can stay purple like C/C++ keywords.
- Registers use semantic token type `register` so they can stay dark blue instead of inheriting green/cyan type colors.
- Code labels use semantic token type `function`; data labels in `.data`, `.bss`, `.rodata`, and `.rdata` use `variable.declaration`.
- Section names use semantic token type `section` so `.text`, `.data`, `.bss`, and related names get their own special color.
- `%` in NASM directives and macro parameters uses semantic token type `operator`.
- Macro constants defined by `%define`, `%xdefine`, and `%assign` use semantic token type `macroConstant`.
- Hovering over `%define`, `%xdefine`, `%assign`, and simple `%macro` uses shows a lightweight macro expansion preview.
- Symbols use semantic token type `variable`, and macro parameters use `parameter`.
- The TextMate grammar still uses standard C/C++-compatible scope families as a fallback.
- Instructions use keyword-like scopes such as `keyword.mnemonic.asm.nasm` and `keyword.other.instruction.asm.nasm`.
- Registers use support/variable scopes such as `variable.language.register.asm.nasm` and `support.variable.register.asm.nasm`.
- Numbers, strings, comments, labels, preprocessor directives, macro parameters, sections, data declarations, size specifiers, brackets, and operators are scoped for normal VS Code themes.
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
4. Choose the generated `mj-asm-highlighter-0.1.1.vsix`.

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

## Macro Expansion Hover

The extension can show simple macro expansion previews for `%define`, `%xdefine`, `%assign`, and `%macro`.

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

## Hover documentation

Test:

- Hover over `mov`
- Hover over `rax`
- Hover over `%define`
- Hover over `.data`
- Hover over `db`
- Hover over `qword`

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
      "macroConstant:nasmx64": "#569CD6",
      "macroConstant.declaration:nasmx64": "#569CD6",
      "section:nasmx64": "#4FC1FF",
      "operator:nasmx64": "#D7BA7D",
      "function:nasmx64": "#DCDCAA",
      "variable:nasmx64": "#9CDCFE",
      "variable.declaration:nasmx64": "#9CDCFE",
      "type:nasmx64": "#4EC9B0",
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
4. It must show semantic token type `variable` with modifier `declaration`.

Click on a code label like `_start`.
It must show semantic token type `function`.

Click on `.data`. It must show semantic token type `section`.

Click on `rax`. It must show semantic token type `register`.

Click on `mov`. It must show semantic token type `instruction`.

Click on `SYS_WRITE`. It must show semantic token type `macroConstant`.

Click on `%` in `%define`. It must show semantic token type `operator`.

Click on `message` when used in `mov rsi, message`. It must show semantic token type `variable`.

For conditional preprocessor checks:

Click on `%` in `%elifndef`. It must show semantic token type `operator` with color `#D7BA7D`.

Click on `elifndef`. It must show semantic token type `instruction` or `keyword` with color `#C586C0`.

Click on `RELEASE`. It must show semantic token type `macroConstant` with color `#569CD6`.

Click on `rax`. It must show semantic token type `register` with color `#569CD6`.

Click on `mov`. It must show semantic token type `instruction` with color `#C586C0`.

The TextMate fallback scopes should also include:

```text
entity.name.function.asm.nasm
entity.name.section.asm.nasm
punctuation.definition.directive.asm.nasm
variable.other.asm.nasm
```

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
  src/
    extension.js
  syntaxes/
    nasm-x64.tmLanguage.json
  snippets/
    nasm-x64.code-snippets
  examples/
    demo.asm
    macros.inc
  scripts/
    validate.js
  .vscodeignore
  .gitignore
```

## Limitations

This extension highlights NASM syntax and provides lightweight macro expansion previews, but it does not perform full symbol resolution, full NASM preprocessing, assembling, linking, or diagnostics.
# MJ-ASM-HIGHLIGHTER
