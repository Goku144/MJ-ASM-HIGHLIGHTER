bits 64
default rel

%include "common.inc"

global _start
global asm_hello:function
global global_counter:data
extern printf

%define SYS_WRITE 1
%define STDOUT 1
%define BUFFER_SIZE 128
%define BIT(x) (1 << (x))
%assign LOCAL_COUNT 4

%macro PUSH_ALL 0
    push rax
%endmacro

%macro MAKE_LABEL 1
%%local_label:
    nop
    jmp %%end_label
%%end_label:
%endmacro

struc Person
    .age: resd 1
    .name_ptr: resq 1
endstruc

section .data align=16
global_counter: dq 0
buffer: resb BUFFER_SIZE
person_buffer: resb Person_size

section .text align=16
_start:
    mov rax, SYS_WRITE
    mov rdi, STDOUT
    mov rbx, BUFFER_SIZE
    mov rcx, BIT(4)
    mov rdx, INCLUDED_CONST
    PUSH_ALL
    INCLUDED_MACRO LOCAL_COUNT
    MAKE_LABEL test_label
    call asm_hello
    call printf
    jmp 1f

1:
    dec rcx
    jnz 1b
    je .done

.done:
    mov eax, [rel global_counter + Person.age]
    ret

asm_hello:
    ret

section .note.GNU-stack noalloc noexec nowrite progbits
