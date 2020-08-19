---
title: "Operating System (1) : Bootloader, Interrupt and Device Driver"
date: "2016-05-11T13:15:30Z"
description: "启动操作系统的bootloader，了解操作系统启动前的状态和要做的准备工作，了解运行操作系统的硬件支持，操作系统如何加载到内存中，理解两类中断--“外设中断”，“陷阱中断”"
tags:
  - "C/C++"
  - "Operating system"
  - "Assembly language"
  - "操作系统"
---

启动操作系统的bootloader，了解操作系统启动前的状态和要做的准备工作，了解运行操作系统的硬件支持，操作系统如何加载到内存中，理解两类中断--“外设中断”，“陷阱中断”

## 概要
* 基于分段机制的存储管理
* 设备管理的基本概念
* PC启动bootloader的过程
* bootloader的文件组成
* 编译运行bootloader的过程
* 调试bootloader的方法
* 在汇编级了解栈的结构和处理过程
* 中断处理机制
* 通过串口/并口/CGA输出字符的方法

```r
project /
|-- boot
|   |-- asm.h
|   |-- bootasm.S
|   `-- bootmain.c
|-- libs
|   |-- types.h
|   `-- x86.h
|-- Makefile
`-- tools
    |-- function.mk
    `-- sign.c
 
3 directories, 8 files
```


### 理解通过make生成执行文件的过程

#### 1.操作系统镜像文件ucore.img的生成过程

```shell
moocos-> make V=
+ cc kern/init/init.c
gcc -Ikern/init/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/init/init.c -o obj/kern/init/init.o
kern/init/init.c:95:1: warning: ‘lab1_switch_test’ defined but not used [-Wunused-function]
    lab1_switch_test(void) {
    ^
+ cc kern/libs/readline.c
gcc -Ikern/libs/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/libs/readline.c -o obj/kern/libs/readline.o
+ cc kern/libs/stdio.c
gcc -Ikern/libs/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/libs/stdio.c -o obj/kern/libs/stdio.o
+ cc kern/debug/kdebug.c
gcc -Ikern/debug/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/kdebug.c -o obj/kern/debug/kdebug.o
kern/debug/kdebug.c:251:1: warning: ‘read_eip’ defined but not used [-Wunused-function]
    read_eip(void) {
    ^
+ cc kern/debug/kmonitor.c
gcc -Ikern/debug/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/kmonitor.c -o obj/kern/debug/kmonitor.o
+ cc kern/debug/panic.c
gcc -Ikern/debug/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/panic.c -o obj/kern/debug/panic.o
+ cc kern/driver/clock.c
gcc -Ikern/driver/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/clock.c -o obj/kern/driver/clock.o
+ cc kern/driver/console.c
gcc -Ikern/driver/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/console.c -o obj/kern/driver/console.o
+ cc kern/driver/intr.c
gcc -Ikern/driver/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/intr.c -o obj/kern/driver/intr.o
+ cc kern/driver/picirq.c
gcc -Ikern/driver/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/picirq.c -o obj/kern/driver/picirq.o
+ cc kern/trap/trap.c
gcc -Ikern/trap/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/trap.c -o obj/kern/trap/trap.o
kern/trap/trap.c:14:13: warning: ‘print_ticks’ defined but not used [-Wunused-function]
    static void print_ticks() {
                ^
kern/trap/trap.c:30:26: warning: ‘idt_pd’ defined but not used [-Wunused-variable]
    static struct pseudodesc idt_pd = {
                            ^
+ cc kern/trap/trapentry.S
gcc -Ikern/trap/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/trapentry.S -o obj/kern/trap/trapentry.o
+ cc kern/trap/vectors.S
gcc -Ikern/trap/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/vectors.S -o obj/kern/trap/vectors.o
+ cc kern/mm/pmm.c
gcc -Ikern/mm/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/mm/pmm.c -o obj/kern/mm/pmm.o
+ cc libs/printfmt.c
gcc -Ilibs/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/  -c libs/printfmt.c -o obj/libs/printfmt.o
+ cc libs/string.c
gcc -Ilibs/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/  -c libs/string.c -o obj/libs/string.o
```

用 gcc 生成 `init.o, readline.o, stdio.o, kdebug.o, kmonitor.o, panic.o, clock.o, console.o, intr.o, picirq.o, trap.o, trapentry.o, vectors.o, pmm.o, printfmt.o, string.o`
	
```bash
+ ld bin/kernel
ld -m    elf_i386 -nostdlib -T tools/kernel.ld -o bin/kernel  obj/kern/init/init.o obj/kern/libs/readline.o obj/kern/libs/stdio.o obj/kern/debug/kdebug.o obj/kern/debug/kmonitor.o obj/kern/debug/panic.o obj/kern/driver/clock.o obj/kern/driver/console.o obj/kern/driver/intr.o obj/kern/driver/picirq.o obj/kern/trap/trap.o obj/kern/trap/trapentry.o obj/kern/trap/vectors.o obj/kern/mm/pmm.o  obj/libs/printfmt.o obj/libs/string.o
```

用 .o 文件链接生成 `bin/kern`
	
```bash
+ cc boot/bootasm.S
gcc -Iboot/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Os -nostdinc -c boot/bootasm.S -o obj/boot/bootasm.o
+ cc boot/bootmain.c
gcc -Iboot/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Os -nostdinc -c boot/bootmain.c -o obj/boot/bootmain.o
```

用 gcc 生成 `bootasm.o, bootmain.o`
	
```shell
+ cc tools/sign.c
gcc -Itools/ -g -Wall -O2 -c tools/sign.c -o obj/sign/tools/sign.o
gcc -g -Wall -O2 obj/sign/tools/sign.o -o bin/sign
```

生成 `bin/sign`
	
```shell
+ ld bin/bootblock
ld -m    elf_i386 -nostdlib -N -e start -Ttext 0x7C00 obj/boot/bootasm.o obj/boot/bootmain.o -o obj/bootblock.o
'obj/bootblock.out' size: 472 bytes
build 512 bytes boot sector: 'bin/bootblock' success!
dd if=/dev/zero of=bin/ucore.img count=10000
10000+0 records in
10000+0 records out
5120000 bytes (5.1 MB) copied, 0.109049 s, 47.0 MB/s
dd if=bin/bootblock of=bin/ucore.img conv=notrunc
1+0 records in
1+0 records out
512 bytes (512 B) copied, 0.000198834 s, 2.6 MB/s
dd if=bin/kernel of=bin/ucore.img seek=1 conv=notrunc
138+1 records in
138+1 records out
70775 bytes (71 kB) copied, 0.000586356 s, 121 MB/s
```

最后生成 `ucore.img`


#### 2.一个被系统认为是符合规范的硬盘主引导扇区的特征

```cpp
    buf[510] = 0x55;
    buf[511] = 0xAA;
    FILE *ofp = fopen(argv[2], "wb+");
    size = fwrite(buf, 1, 512, ofp);
    if (size != 512) {
        fprintf(stderr, "write '%s' error, size is %d.\n", argv[2], size);
        return -1;
    }
```

扇区大小为512字节，510字节处为`0x55`、511字节处为`0xAA`作为标志



## 使用qemu执行并调试lab1中的软件

#### 1. 从CPU加电后执行的第一条指令开始，单步跟踪BIOS的执行。

```r
(gdb) x /2i 0xffff0
    0xffff0:     ljmp   $0xf000,$0xe05b
    0xffff5:     xor    %dh,0x322f
(gdb) i r
eax            0x0      0
ecx            0x0      0
edx            0x663    1635
ebx            0x0      0
esp            0x0      0x0
ebp            0x0      0x0
esi            0x0      0
edi            0x0      0
eip            0xfff0   0xfff0
eflags         0x2      [ ]
cs             0xf000   61440
ss             0x0      0
ds             0x0      0
es             0x0      0
fs             0x0      0
gs             0x0      0
```

#### 2.在初始化位置0x7c00设置实地址断点,测试断点正常

```r
(gdb) b *0x7c00
Breakpoint 1 at 0x7c00
(gdb) continue
Continuing.
=> 0x7c00:      cli    

Breakpoint 1, 0x00007c00 in ?? ()
```

#### 3.从`0x7c00`开始跟踪代码运行,将单步跟踪反汇编得到的代码与`bootasm.S`和 `bootblock.asm`进行比较

```r
(gdb) x /6i $pc
=> 0x7c00:      cli    
    0x7c01:      cld    
    0x7c02:      xor    %ax,%ax
    0x7c04:      mov    %ax,%ds
    0x7c06:      mov    %ax,%es
    0x7c08:      mov    %ax,%ss
```

`boottasm.S` 中

```r
.globl start
start:
.code16                                             # Assemble for 16-bit mode
    cli                                             # Disable interrupts
    cld                                             # String operations increment

    # Set up the important data segment registers (DS, ES, SS).
    xorw %ax, %ax                                   # Segment number zero
    movw %ax, %ds                                   # -> Data Segment
    movw %ax, %es                                   # -> Extra Segment
    movw %ax, %ss                                   # -> Stack Segment
```

#### 4.对于bootloader或内核中的代码位置，设置断点并进行测试

修改 `tools/gdbinit` 为

	file obj/bootblock.o
	target remote :1234
	break bootmain
	continue

`make debug`

	0x0000fff0 in ?? ()
	Breakpoint 1 at 0x7cd1: file boot/bootmain.c, line 87.
	
	Breakpoint 1, bootmain () at boot/bootmain.c:87
	
`gdb`

	   │85      /* bootmain - the entry of bootloader */                           │
	   │86      void                                                               │
	B+>│87      bootmain(void) {                                                   │
	   │88          // read the 1st page off disk                                  │
	   │89          readseg((uintptr_t)ELFHDR, SECTSIZE * 8, 0);                   │



## 分析bootloader进入保护模式的过程

#### 为何开启A20，以及如何开启A20

在 `boot/bootasm.S` 中
```r	
    # Enable A20:
    #  For backwards compatibility with the earliest PCs, physical
    #  address line 20 is tied low, so that addresses higher than
    #  1MB wrap around to zero by default. This code undoes this.
seta20.1:
    inb $0x64, %al                                  # Wait for not busy(8042 input buffer empty).
    testb $0x2, %al
    jnz seta20.1

    movb $0xd1, %al                                 # 0xd1 -> port 0x64
    outb %al, $0x64                                 # 0xd1 means: write data to 8042's P2 port

seta20.2:
    inb $0x64, %al                                  # Wait for not busy(8042 input buffer empty).
    testb $0x2, %al
    jnz seta20.2

    movb $0xdf, %al                                 # 0xdf -> port 0x60
    outb %al, $0x60                                 # 0xdf = 11011111, means set P2's A20 bit(the 1 bit) to 1
```

循环查看64端口的值，不小于2时向64端口输出`0xd1`、向60端口输出`0xdf`


####初始化GDT表

在 `boot/bootasm.S` 中

```r
lgdt gdtdesc	

# Bootstrap GDT
.p2align 2                                          # force 4 byte alignment
gdt:
    SEG_NULLASM                                     # null seg
    SEG_ASM(STA_X|STA_R, 0x0, 0xffffffff)           # code seg for bootloader and kernel
    SEG_ASM(STA_W, 0x0, 0xffffffff)                 # data seg for bootloader and kernel

gdtdesc:
    .word 0x17                                      # sizeof(gdt) - 1
    .long gdt                                       # address gdt
```

对GDT表进行了初始化

####如何进入保护模式

在 `boot/bootasm.S` 中
```r	
movl %cr0, %eax
orl $CR0_PE_ON, %eax
movl %eax, %cr0

# Jump to next instruction, but in 32-bit code segment.
# Switches processor into 32-bit mode.
ljmp $PROT_MODE_CSEG, $protcseg
```

其中

```r
.set CR0_PE_ON,             0x1
```

把 cr0 最后一位置为1，然后跳转保护模式代码段

##分析bootloader加载ELF格式的OS的过程

####bootloader如何读取硬盘扇区的？

在 `boot/bootmain.c` 中
```cpp	
static void
readsect(void *dst, uint32_t secno) {
    // wait for disk to be ready
    waitdisk();

    outb(0x1F2, 1);                         // count = 1
    outb(0x1F3, secno & 0xFF);
    outb(0x1F4, (secno >> 8) & 0xFF);
    outb(0x1F5, (secno >> 16) & 0xFF);
    outb(0x1F6, ((secno >> 24) & 0xF) | 0xE0);
    outb(0x1F7, 0x20);                      // cmd 0x20 - read sectors

    // wait for disk to be ready
    waitdisk();

    // read a sector
    insl(0x1F0, dst, SECTSIZE / 4);
}
```

其中 `waitdisk` 函数等待磁盘准备好

```cpp
static void
waitdisk(void) {
    while ((inb(0x1F7) & 0xC0) != 0x40)
        /* do nothing */;
}
```

之后发出读取扇区的命令，再调用 `waitdisk` 函数等待磁盘。之后调用 `insl` 函数把磁盘扇区数据读到指定内存
```cpp
static inline void
insl(uint32_t port, void *addr, int cnt) {
    asm volatile (
            "cld;"
            "repne; insl;"
            : "=D" (addr), "=c" (cnt)
            : "d" (port), "0" (addr), "1" (cnt)
            : "memory", "cc");
}
```

#### bootloader是如何加载ELF格式的OS

在 `boot/bootmain.c` 中
```cpp
void
bootmain(void) {
    // read the 1st page off disk
    readseg((uintptr_t)ELFHDR, SECTSIZE * 8, 0);  //读取 elfhdr

    // is this a valid ELF?
    if (ELFHDR->e_magic != ELF_MAGIC) {   //elfhdr 的 e_magic 不为 ELF_MAGIC 时进入 bad 循环
        goto bad;
    }

    struct proghdr *ph, *eph;

    // load each program segment (ignores ph flags)
    ph = (struct proghdr *)((uintptr_t)ELFHDR + ELFHDR->e_phoff);
    eph = ph + ELFHDR->e_phnum;
    for (; ph < eph; ph ++) {
        readseg(ph->p_va & 0xFFFFFF, ph->p_memsz, ph->p_offset);  //加载每一个程序段
    }

    // call the entry point from the ELF header
    // note: does not return
    ((void (*)(void))(ELFHDR->e_entry & 0xFFFFFF))();  //调用入口地址

bad:
    outw(0x8A00, 0x8A00);
    outw(0x8A00, 0x8E00);

    /* do nothing */
    while (1);
}
```

##实现函数调用堆栈跟踪函数

make 的时候

	kern/debug/kdebug.c:328:2: error: ‘for’ loop initial declarations are only allowed in C99 mode

所以没有用for
```cpp
void
print_stackframe(void) {

    uint32_t ebp = read_ebp();
    uint32_t eip = read_eip();

    int i = 0, j = 0;
    while(i < STACKFRAME_DEPTH && ebp)  // ebp 为0时表明程序返回到了最开始初始化的函数	{
        cprintf("ebp:0x%08x eip:0x%08x args:", ebp, eip);
        uint32_t* arguments = (uint32_t)ebp + 2; // 获得参数地址

        j = 0;
        while(j < 4)	{
            cprintf("0x%08x ", arguments[j]);
            j++;
        }

        cprintf("\n");
        print_debuginfo(eip - 1);
        eip = *(uint32_t*)(ebp + 4);
        ebp = *(uint32_t*)ebp;  // 更新 eip, ebp

        i++;
    }
}
```


输出为

	ebp:0x00007b08 eip:0x001009a6 args:0x0c9c0000 0x00940010 0x00000001 0x7b380000 
	    kern/debug/kdebug.c:306: print_stackframe+21
	ebp:0x00007b18 eip:0x00100c9c args:0x00920000 0x00000010 0x00000000 0x00000000 
	    kern/debug/kmonitor.c:125: mon_backtrace+10
	ebp:0x00007b38 eip:0x00100092 args:0x00bb0000 0x00000010 0x7b600000 0x00000000 
	    kern/init/init.c:48: grade_backtrace2+33
	ebp:0x00007b58 eip:0x001000bb args:0x00d90000 0x00000010 0x00000000 0x7b84ffff 
	    kern/init/init.c:53: grade_backtrace1+38
	ebp:0x00007b78 eip:0x001000d9 args:0x00fe0000 0x00000010 0x00000000 0x00000010 
	    kern/init/init.c:58: grade_backtrace0+23
	ebp:0x00007b98 eip:0x001000fe args:0x00550000 0x32fc0010 0x32e00010 0x130a0010 
	    kern/init/init.c:63: grade_backtrace+34
	ebp:0x00007bc8 eip:0x00100055 args:0x7d680000 0x00000000 0x00000000 0x00000000 
	    kern/init/init.c:28: kern_init+84
	ebp:0x00007bf8 eip:0x00007d68 args:0x7c4f0000 0xfcfa0000 0xd88ec031 0xd08ec08e 
	    <unknow>: -- 0x00007d67 --

其中最后一行对应 `bootmain.c` 中的 `bootmain` 函数，`bootmain`中`ebp`为`0x7bf8`。返回地址`eip`为`0x0000d64`，之后四个是参数`args:0x7c4f0000 0xfcfa0000 0xd88ec031 0xd08ec08e`

##完善中断初始化和处理

####1. 中断描述符表（也可简称为保护模式下的中断向量表）中一个表项占多少字节？其中哪几位代表中断处理代码的入口？
一个表项占8个字节，其中第0-15，48-63位代表中断处理代码的入口

####2. 完善`kern/trap/trap.c`中对中断向量表进行初始化的函数`idt_init`。
```cpp
void
idt_init(void) {

    extern uintptr_t __vectors[];
    int i = 0;
    while(i < 256)	{
        SETGATE(idt[i], 0 ,GD_KTEXT ,__vectors[i], DPL_KERNEL);
        i++;
    }
    SETGATE(idt[T_SYSCALL], 1, GD_KTEXT, __vectors[T_SYSCALL], DPL_USER);
    lidt(&idt_pd);
}
```

####3. 完善`trap.c`中的中断处理函数`trap`，在对时钟中断进行处理的部分填写`trap`函数中处理时钟中断的部分，使操作系统每遇到100次时钟中断后，调用`print_ticks`子程序，向屏幕上打印一行文字”100 ticks”

```cpp
    case IRQ_OFFSET + IRQ_TIMER:

        ticks = (ticks + 1) % TICK_NUM;
        if(ticks == 0)
            print_ticks();

        break;
```