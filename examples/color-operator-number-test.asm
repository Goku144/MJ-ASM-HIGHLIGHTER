bits 64
default rel

section .rodata align=16
vector_a: dd 1.0, 2.0, 3.0, 4.0

section .data align=16
counter: dq 0

section .text align=16

global test:function

test:
    push rbp
    mov rbp, rsp

    mov rax, 123
    mov rbx, 0xABCDEF
    mov rcx, 101010b
    mov rdx, -1

    mov rax, [counter]
    mov rax, [counter + 8]
    mov rax, [counter + rcx * 8]
    mov rax, [rbp - 8]
    mov rax, qword [fs:0x28]
    lea rdi, [counter + rax * 2 + 16]

    align 16
    leave
    ret

section .note.GNU-stack noalloc noexec nowrite progbits
