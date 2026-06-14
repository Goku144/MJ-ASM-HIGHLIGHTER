# Include Resolution

The analyzer resolves simple quoted NASM includes for semantic highlighting and hover:

```asm
%include "PrintStr.inc"
%include "./PrintStr.inc"
%include "../include/PrintStr.inc"
```

Resolution order:

1. Directory of the current `.asm`, `.nasm`, or `.inc` file.
2. Workspace folders.
3. `mjAsmHighlighter.includePaths`.
4. Common project folders that exist: `include/`, `includes/`, `asm/include/`, and `interface/Asm/`.

The include path setting supports:

```json
{
  "mjAsmHighlighter.includePaths": [
    "${workspaceFolder}/include",
    "${fileDirname}/../include"
  ]
}
```

The analyzer keeps a visited-file set and a maximum include depth to avoid recursive include loops. File watchers clear the include cache and request semantic-token refresh when `.asm`, `.nasm`, or `.inc` files are created, changed, or deleted.

Limitations:

- Angle-bracket and special NASM includes are ignored by the lightweight resolver.
- Conditional include logic is not evaluated.
- Resolution is for editor help only; NASM remains the authority for real assembly.
