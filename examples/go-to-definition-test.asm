bits 64
default rel

%include "GoToDefinition.inc"

global asm_hello:function
extern printf

section .text

asm_hello:
    print_str_macro rdi, rsi
    call printf
    call local_function
    jmp 1f

.loop:
    dec rcx
    jnz .loop

1:
    jnz 1b

    ret

local_function:
    ret

section .data

person_instance:
    istruc Person
        at Person.age, dd 21
        at Person.name_ptr, dq 0
    iend

section .note.GNU-stack noalloc noexec nowrite progbits
