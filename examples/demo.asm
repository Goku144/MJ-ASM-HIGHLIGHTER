bits 64
default rel
cpu x64

%define DEBUG 1
%define RELEASE 0
%define SYS_EXIT 60
%define SYS_WRITE 1
%define STDOUT 1
%define BUFFER_SIZE 64
%define BIT(x) (1 << (x))
%assign LOCAL_COUNT 4

%ifdef DEBUG
    %define BUILD_MODE 1
%elifndef RELEASE
    %define BUILD_MODE 2
%else
    %define BUILD_MODE 0
%endif

%macro prologue 1
%%entry:
    push rbp
    mov rbp, rsp
    sub rsp, %1
%endmacro

%macro epilogue 0
    leave
    ret
%endmacro

%macro repeat_store 3
    %rep %3
        mov byte [%1], %2
        inc %1
    %endrep
%endmacro

global _start
extern puts
extern printf

section .data align=16
message:        db "Hello, NASM", 10, 0
escaped:        db `tab:\t quote:\" hex:\x41 zero:\0`, 0
single_char:    db 'Z'
word_value:     dw 0FFh
dword_value:    dd 0x7fffffff
qword_value:    dq 1010b
octal_value:    dd 755q
float_value:    dd 3.14159
scientific:     dd -1.25e+3
packed_words:   times 4 dw 1234h
message_len     equ $ - message

section .bss
buffer:         resb BUFFER_SIZE

section .text
_start:
    prologue 32
    mov rsi, message
    mov rax, [rel qword_value]
    mov byte [buffer], 1
    mov rax, SYS_WRITE
    mov rbx, BUFFER_SIZE
    mov rcx, BIT(4)
    repeat_store buffer, 1, LOCAL_COUNT
    call helper_function

.done:
    mov rax, SYS_EXIT
    mov rax, BUILD_MODE
    mov rbx, RELEASE
    mov rcx, DEBUG
    xor rdi, rdi
    syscall

helper_function:
    enter 16, 0
    mov rax, [rbp + 16]
    leave
    ret

section .init
init_label:
    nop

section .fini
fini_label:
    ret

section .note.GNU-stack
