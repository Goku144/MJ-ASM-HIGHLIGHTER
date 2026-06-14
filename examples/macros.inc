; Shared NASM macro examples for MJ Asm Highlighter.

%define STDOUT 1
%define SYS_WRITE 1
%define SYS_EXIT 60
%assign BUFFER_SIZE 64

%macro write_line 2
    mov rax, SYS_WRITE
    mov rdi, STDOUT
    lea rsi, [rel %1]
    mov rdx, %2
    syscall
%endmacro

%macro repeat_byte 2
%%again:
    mov byte [%1], %2
    inc %1
    loop %%again
%endmacro

%ifdef DEBUG
    %warning "debug build enabled"
%else
    %define DEBUG 0
%endif
