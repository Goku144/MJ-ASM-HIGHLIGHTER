# Go To Definition

MJ Asm Highlighter provides lightweight NASM navigation through VS Code's definition and declaration APIs.

Use any normal VS Code navigation gesture:

- `Ctrl+Click`
- `F12`
- Right click -> `Go to Definition`
- Right click -> `Go to Declaration`

Supported symbols:

- Normal labels such as `asm_hello`
- Dot-local labels such as `.loop`, scoped to the previous non-local label
- Numeric labels such as `1f`, `1b`, `2f`, and `99b`
- Macro-local labels such as `%%loop` inside the same macro body
- `%macro`, `%imacro`, function-like `%define`, and macro constants
- Included macros and constants resolved through simple `%include "file.inc"`
- `struc` names, struct fields such as `Person.age`, and generated constants such as `Person_size`
- `extern` declarations when the real definition is outside the project
- `global` declarations when no local label definition exists

For cross-file macro and constant navigation, include resolution uses the same search order as semantic highlighting and hover:

1. Directory of the current file.
2. Workspace folders.
3. `mjAsmHighlighter.includePaths`.
4. Common project folders that exist: `include/`, `includes/`, `asm/include/`, and `interface/Asm/`.

```json
{
  "mjAsmHighlighter.includePaths": [
    "${workspaceFolder}/include",
    "${workspaceFolder}/interface/Asm"
  ]
}
```

Limitations:

- This is not a full NASM assembler or preprocessor.
- Complex conditional preprocessing may not always resolve to the same symbol NASM would choose.
- Only simple quoted `%include` paths are fully supported by the lightweight resolver.
- External functions jump to local `extern` declarations, not system libraries or linked object files.
