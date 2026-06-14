bits 64
default rel

%include "PrintStr.inc"

global print_str

section .text

print_str:
    print_str_macro rdi, rsi
    ret

section .note.GNU-stack noalloc noexec nowrite progbits
