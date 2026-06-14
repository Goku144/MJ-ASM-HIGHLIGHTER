; -----------------------------------------------------------------------------
; MJ Asm Highlighter demo file.
; This file is intentionally broad: it exercises NASM directives, data forms,
; labels, memory operands, macros, loops, and vector instruction highlighting.
; -----------------------------------------------------------------------------

; Assemble following instructions in 64-bit mode and prefer RIP-relative memory
; references for registerless addresses such as `[message]`.
bits 64
default rel
cpu x64

; Pull in shared macro examples from the companion include file.
%include "macros.inc"

; -----------------------------------------------------------------------------
; Constants used by Linux x86_64 syscalls and demo-only feature switches.
; `%define` creates text-like preprocessor constants and function-style macros.
; -----------------------------------------------------------------------------
%define DEBUG 1
%define RELEASE 0
%define SYS_EXIT 60
%define SYS_WRITE 1
%define STDOUT 1
%define BUFFER_SIZE 64
%define BIT(x) (1 << (x))

; `%assign` creates a numeric preprocessor variable that can be reassigned.
%assign LOCAL_COUNT 4

%ifdef DEBUG
    %define BUILD_MODE 1
%elifndef RELEASE
    %define BUILD_MODE 2
%else
    %define BUILD_MODE 0
%endif

; -----------------------------------------------------------------------------
; Stack-frame helper macro.
; `%1` is the first macro argument, and `%%entry` is local to each expansion.
; -----------------------------------------------------------------------------
%macro prologue 1
%%entry:
    push rbp
    mov rbp, rsp
    sub rsp, %1
%endmacro

; Simple epilogue macro with no arguments.
%macro epilogue 0
    leave
    ret
%endmacro

; Repeat a small store operation at preprocessing time.
; `%rep` expands the body LOCAL_COUNT times before assembly.
%macro repeat_store 3
    %rep %3
        mov byte [%1], %2
        inc %1
    %endrep
%endmacro

; Export `_start` for the linker and declare C-library symbols as external.
global _start
extern puts
extern printf

; -----------------------------------------------------------------------------
; NASM structure layout.
; `struc` defines field offsets, while `at`/`iend` initialize an instance.
; -----------------------------------------------------------------------------
struc point
    .x: resd 1
    .y: resd 1
endstruc

; -----------------------------------------------------------------------------
; Initialized data section.
; `db`, `dw`, `dd`, and `dq` emit bytes, words, doublewords, and quadwords.
; `equ` defines an assembly-time constant; here it computes the string length.
; -----------------------------------------------------------------------------
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
origin_point:
    istruc point
        at point.x, dd 10
        at point.y, dd 20
    iend

; Read-only data is useful for constants and SIMD masks.
section .rodata align=16
vector_a:       dd 1.0, 2.0, 3.0, 4.0
vector_b:       dd 4.0, 3.0, 2.0, 1.0

; Reserve uninitialized storage in `.bss`; `resb` does not emit bytes.
section .bss
buffer:         resb BUFFER_SIZE

; -----------------------------------------------------------------------------
; Program entry point.
; Linux expects `_start` when linking without the C runtime.
; -----------------------------------------------------------------------------
section .text
_start:
    prologue 32

    ; General-purpose registers hold syscall arguments on Linux x86_64.
    ; rax = syscall number, rdi = fd, rsi = buffer, rdx = byte count.
    mov rax, SYS_WRITE
    mov rdi, STDOUT
    lea rsi, [rel message]
    mov rdx, message_len
    syscall

    ; Memory operands show direct, RIP-relative, and base-plus-offset addressing.
    mov rsi, message
    mov rax, [rel qword_value]
    mov eax, [rel origin_point + point.x]
    mov byte [buffer], 1

    ; Macro constants and function-like macros are highlighted as symbols.
    mov rbx, BUFFER_SIZE
    mov rcx, BIT(4)

    ; The macro expands to repeated stores at assembly time.
    repeat_store buffer, 1, LOCAL_COUNT

    ; Runtime loop using `rcx` as the counter and `loop` as the branch.
    mov rcx, LOCAL_COUNT
    lea rdi, [rel buffer]
.fill_loop:
    mov byte [rdi], 0
    inc rdi
    loop .fill_loop

    ; SSE and AVX samples exercise vector register and instruction scopes.
    movaps xmm0, [rel vector_a]
    addps xmm0, [rel vector_b]
    vpxor ymm1, ymm1, ymm1

    call helper_function

.done:
    ; Exit with status 0.
    mov rax, SYS_EXIT
    mov rax, BUILD_MODE
    mov rbx, RELEASE
    mov rcx, DEBUG
    xor rdi, rdi
    syscall

; A normal helper label is treated like a function by semantic highlighting.
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

; Marks ELF objects as not requiring an executable stack.
section .note.GNU-stack
