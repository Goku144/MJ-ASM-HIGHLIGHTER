bits 64
default rel

section .text

global numeric_label_hover_test:function

numeric_label_hover_test:
    jmp 1f

1:
    dec rcx
    jnz 1b

    jmp 2f

2:
    cmp rax, 0
    jne 2b

    jmp 99f

99:
    ret

section .note.GNU-stack noalloc noexec nowrite progbits
