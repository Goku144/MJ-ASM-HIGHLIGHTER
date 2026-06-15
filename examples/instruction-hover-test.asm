bits 64
default rel

section .text

global instruction_hover_test:function

instruction_hover_test:
    push rbp
    mov rbp, rsp
    sub rsp, 32

    mov rax, 1
    lea rdi, [rel message]
    cmp rax, 1
    je .equal
    jne .not_equal

.equal:
    add rax, 2
    adc rax, 0
    sub rax, 1
    sbb rax, 0
    imul rax, rax
    xor rdx, rdx
    div rcx
    test rax, rax
    setne al
    jmp .done

.not_equal:
    neg rax
    not rax
    shl rax, 1
    shr rax, 1
    rol rax, 4
    ror rax, 4

.done:
    cld
    rep movsb
    lock inc qword [counter]

    pxor xmm0, xmm0
    movdqa xmm1, [rel vector_a]
    paddd xmm1, xmm1

    vzeroall
    vmovups ymm0, [rel vector_a]
    vaddps ymm1, ymm0, ymm0

    finit
    fld1
    fstp qword [float_value]

    leave
    ret

section .rodata
message: db "test", 0
vector_a: dd 1.0, 2.0, 3.0, 4.0
float_value: dq 1.0

section .data
counter: dq 0

section .note.GNU-stack noalloc noexec nowrite progbits
