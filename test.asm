; ============================================================================
; NASM x86-64 Syntax Highlighting Full Test File
; Purpose: test comments, sections, directives, labels, macros, registers,
; operands, strings, numbers, memory addressing, SIMD, FPU, preprocessor, etc.
; ============================================================================

; -----------------------------
; File-level directives
; -----------------------------
bits 64
default rel
cpu x64

; -----------------------------
; Extern / global symbols
; -----------------------------
global _start
global asm_hello:function
global global_counter:data

extern printf
extern puts
extern malloc
extern free

; -----------------------------
; Preprocessor constants
; -----------------------------
%define SYS_READ        0
%define SYS_WRITE       1
%define SYS_EXIT        60
%define STDIN           0
%define STDOUT          1
%define STDERR          2

%define BUFFER_SIZE     128
%define MAGIC_HEX       0xDEADBEEF
%define MAGIC_BIN       10101010b
%define MAGIC_OCT       755o
%define MAGIC_DEC       123456
%define CHAR_A          'A'
%define NEWLINE         10

%assign LOCAL_COUNT 4
%assign LOCAL_COUNT LOCAL_COUNT + 1

; -----------------------------
; Conditional preprocessing
; -----------------------------
%ifdef DEBUG
    %define BUILD_MODE 1
%elifdef RELEASE
    %define BUILD_MODE 2
%else
    %define BUILD_MODE 0
%endif

%if BUILD_MODE = 0
    %warning "Building in default test mode"
%endif

; -----------------------------
; Macro definitions
; -----------------------------
%macro SYS_WRITE_MACRO 2
    mov rax, SYS_WRITE
    mov rdi, STDOUT
    mov rsi, %1
    mov rdx, %2
    syscall
%endmacro

%macro PUSH_ALL 0
%if %0 = 0
    push rax
    push rbx
    push rcx
    push rdx
    push rsi
    push rdi
%endif
%endmacro

%macro POP_ALL 0
    pop rdi
    pop rsi
    pop rdx
    pop rcx
    pop rbx
    pop rax
%endmacro

%macro MAKE_LABEL 1
%%local_label:
    nop
    jmp %%end_label
%%end_label:
    ; Macro-local labels use %%name
%endmacro

%imacro lower_macro 1
    mov rax, %1
%endmacro

; -----------------------------
; Repeat preprocessing
; -----------------------------
%rep 3
    %assign LOCAL_COUNT LOCAL_COUNT + 1
%endrep

; -----------------------------
; Struct definition
; -----------------------------
struc Person
    .age:       resd 1
    .height:    resd 1
    .name_ptr:  resq 1
endstruc

; ============================================================================
; Read-only data
; ============================================================================
section .rodata align=16

msg_hello:      db "Hello from NASM!", 10, 0
msg_hello_len:  equ $ - msg_hello

msg_quote:      db "String with quote: ", '"', "NASM", '"', 10, 0
msg_escape:     db 'Single quoted string', 10, 0
msg_path:       db "C:\fake\path\test.asm", 0

fmt_number:     db "Value = %ld", 10, 0
fmt_string:     db "Text = %s", 10, 0

align 16
vector_a:       dd 1.0, 2.0, 3.0, 4.0
vector_b:       dd 5.0, 6.0, 7.0, 8.0

; ============================================================================
; Initialized data
; ============================================================================
section .data align=8

global_counter: dq 0
byte_value:     db 255
word_value:     dw 65535
dword_value:    dd 0x12345678
qword_value:    dq 0x1122334455667788

signed_num:     dq -42
float32_num:    dd 3.14
float64_num:    dq 2.718281828

char_array:     db 'A', 'B', 'C', 0
int_array:      dq 10, 20, 30, 40, 50

mixed_data:
    db  1, 2, 3, 4
    dw  1000, 2000
    dd  300000
    dq  4000000000

times 8 db 0xAA

person_instance:
    istruc Person
        at Person.age,      dd 21
        at Person.height,   dd 180
        at Person.name_ptr, dq msg_hello
    iend

; ============================================================================
; Uninitialized data
; ============================================================================
section .bss align=16

buffer:         resb BUFFER_SIZE
word_buffer:    resw 16
dword_buffer:   resd 16
qword_buffer:   resq 16
person_buffer:  resb Person_size

; ============================================================================
; Text section
; ============================================================================
section .text align=16

; ----------------------------------------------------------------------------
; Program entry point
; ----------------------------------------------------------------------------
_start:
    ; Print static message using macro
    SYS_WRITE_MACRO msg_hello, msg_hello_len

    ; Call a normal function
    call asm_hello

    ; Exit syscall
    mov rax, SYS_EXIT
    xor rdi, rdi
    syscall

; ----------------------------------------------------------------------------
; Function callable from C/C++
; extern "C" void asm_hello(void);
; ----------------------------------------------------------------------------
asm_hello:
    push rbp
    mov rbp, rsp
    sub rsp, 32

    ; Basic register moves
    mov rax, 123
    mov rbx, 0xABCDEF
    mov rcx, 101010b
    mov rdx, -1

    ; 8-bit / 16-bit / 32-bit / 64-bit registers
    mov al,  1
    mov ah,  2
    mov ax,  300
    mov eax, 40000
    mov rax, 50000

    ; Extended registers
    mov r8,  8
    mov r9,  9
    mov r10, 10
    mov r11, 11
    mov r12, 12
    mov r13, 13
    mov r14, 14
    mov r15, 15

    ; Memory operands
    mov rax, [global_counter]
    mov rax, [rel global_counter]
    mov rax, [int_array + 8]
    mov rax, [int_array + rcx * 8]
    mov rax, [rbp - 8]
    mov byte  [buffer], 0
    mov word  [word_buffer], 123
    mov dword [dword_buffer], 456
    mov qword [qword_buffer], 789

    ; Segment override example
    mov rax, qword [fs:0x28]

    ; LEA addressing
    lea rsi, [rel msg_hello]
    lea rdi, [buffer + rax * 2 + 16]

    ; Arithmetic
    add rax, rbx
    sub rax, 10
    imul rax, rbx
    xor rdx, rdx
    mov rcx, 3
    div rcx

    ; Bitwise
    and rax, 0xFF
    or  rax, 0x100
    xor rax, rax
    not rax
    shl rbx, 1
    shr rbx, 1
    sar rbx, 1
    rol rax, 4
    ror rax, 4

    ; Stack
    push rax
    push qword [global_counter]
    pop rbx

    ; Compare and jumps
    cmp rax, rbx
    je .equal
    jne .not_equal
    ja .above
    jb .below
    jg .greater
    jl .less

.equal:
    mov rax, 1
    jmp .after_compare

.not_equal:
    mov rax, 2
    jmp .after_compare

.above:
    mov rax, 3
    jmp .after_compare

.below:
    mov rax, 4
    jmp .after_compare

.greater:
    mov rax, 5
    jmp .after_compare

.less:
    mov rax, 6

.after_compare:
    ; Conditional move and setcc
    cmp rax, 10
    cmove rbx, rcx
    cmovne rbx, rdx
    sete al
    setne bl

    ; Loop example
    mov rcx, 5
.loop_start:
    dec rcx
    jnz .loop_start

    ; String instructions
    cld
    lea rsi, [rel msg_hello]
    lea rdi, [rel buffer]
    mov rcx, msg_hello_len
    rep movsb

    ; Atomic instruction
    lock inc qword [global_counter]

    ; Macro calls
    PUSH_ALL
    lower_macro 777
    MAKE_LABEL test_label
    POP_ALL

    ; SIMD / SSE
    pxor xmm0, xmm0
    movdqa xmm1, [rel vector_a]
    movdqa xmm2, [rel vector_b]
    paddd xmm1, xmm2
    movdqa [rel buffer], xmm1

    ; AVX
    vzeroall
    vmovups ymm0, [rel vector_a]
    vmovups ymm1, [rel vector_b]
    vaddps ymm2, ymm0, ymm1

    ; FPU legacy instructions
    finit
    fld qword [float64_num]
    fld1
    faddp st1, st0
    fstp qword [float64_num]

    ; Calls
    lea rdi, [rel msg_hello]
    call puts

    ; Function epilogue
    add rsp, 32
    pop rbp
    ret

; ----------------------------------------------------------------------------
; Function with parameters
; System V AMD64:
; rdi = const char* str
; rsi = length
; ----------------------------------------------------------------------------
asm_print_string:
    push rbp
    mov rbp, rsp

    mov rdx, rsi
    mov rsi, rdi
    mov rax, SYS_WRITE
    mov rdi, STDOUT
    syscall

    pop rbp
    ret

; ----------------------------------------------------------------------------
; Null-terminated string length
; rdi = const char* str
; returns rax = length
; ----------------------------------------------------------------------------
asm_strlen:
    xor rax, rax

.count_loop:
    cmp byte [rdi + rax], 0
    je .done
    inc rax
    jmp .count_loop

.done:
    ret

; ----------------------------------------------------------------------------
; Local labels with numbers
; ----------------------------------------------------------------------------
numeric_labels_test:
    mov rcx, 3
    jmp 1f

1:
    dec rcx
    jnz 1b

    mov rcx, 3
    jmp 2f

2:
    dec rcx
    jnz 2b

    ret

; ----------------------------------------------------------------------------
; NASM special symbols
; ----------------------------------------------------------------------------
special_symbols_test:
    mov rax, $
    mov rbx, $$
    mov rcx, msg_hello_len
    ret

; ----------------------------------------------------------------------------
; Include directive test
; Uncomment only if the file exists.
; ----------------------------------------------------------------------------
; %include "macros.inc"

; ============================================================================
; GNU stack note
; ============================================================================
section .note.GNU-stack noalloc noexec nowrite progbits
