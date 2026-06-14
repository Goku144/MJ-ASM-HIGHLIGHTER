%define INCLUDED_CONST 99
%assign INCLUDED_COUNT 2

%macro INCLUDED_MACRO 1
%%again:
    mov rax, %1
    jmp %%again
%endmacro
