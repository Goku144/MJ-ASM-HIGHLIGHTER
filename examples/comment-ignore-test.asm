bits 64
default rel

%include "PrintStr.inc"

; This commented macro call must NOT resolve:
; print_str_macro rdi, rsi

; This commented constant must NOT resolve:
; SYS_WRITE

; This commented instruction/register must NOT show hover docs:
; mov rax, 1
; syscall

; This commented numeric label reference must NOT resolve:
; jnz 1b

section .text

global comment_ignore_test:function

comment_ignore_test:
    mov rax, SYS_WRITE ; SYS_WRITE here in comment must NOT resolve: SYS_WRITE
    print_str_macro rdi, rsi ; print_str_macro here in comment must NOT resolve

    jmp 1f ; 1f here in comment must NOT resolve

1:
    dec rcx
    jnz 1b ; 1b here in comment must NOT resolve

    ret

section .note.GNU-stack noalloc noexec nowrite progbits
