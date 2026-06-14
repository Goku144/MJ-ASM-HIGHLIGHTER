; -----------------------------------------------------------------------------
; Shared NASM macro examples for MJ Asm Highlighter.
; Include this file with `%include "macros.inc"` from a NASM source file.
; -----------------------------------------------------------------------------

; Syscall constants used by the write_line macro.
%define STDOUT 1
%define SYS_WRITE 1
%define SYS_EXIT 60

; Numeric preprocessor variables can be useful for generated buffers or loops.
%assign BUFFER_SIZE 64

; Emit a Linux write syscall for a label and byte count.
; `%1` is the buffer label, and `%2` is the length expression.
%macro write_line 2
    mov rax, SYS_WRITE
    mov rdi, STDOUT
    lea rsi, [rel %1]
    mov rdx, %2
    syscall
%endmacro

; Fill memory with a byte value while `rcx` counts down at runtime.
; `%%again` is a macro-local label, so repeated expansions do not collide.
%macro repeat_byte 2
%%again:
    mov byte [%1], %2
    inc %1
    loop %%again
%endmacro

; Conditional assembly lets examples change behavior for debug builds.
%ifdef DEBUG
    %warning "debug build enabled"
%else
    %define DEBUG 0
%endif
