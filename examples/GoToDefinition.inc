%define SYS_WRITE 1
%define STDOUT 1

%macro print_str_macro 2
    mov rax, SYS_WRITE
    mov rdi, STDOUT
    mov rsi, %1
    mov rdx, %2
    syscall
%endmacro

struc Person
    .age: resd 1
    .name_ptr: resq 1
endstruc
