---
title: "Operating System (8) : 文件系统"
date: "2016-06-07T13:15:30Z"
description: "了解文件系统的具体实现，与进程管理等的关系，了解缓存对操作系统IO访问的性能改进，了解虚拟文件系统（VFS）、buffer cache和disk driver之间的关系。"
tags:
  - "C/C++"
  - "Operating system"
  - "Assembly language"
  - "操作系统"
---

了解文件系统的具体实现，与进程管理等的关系，了解缓存对操作系统IO访问的性能改进，了解虚拟文件系统（VFS）、buffer cache和disk driver之间的关系。

## 概要
* 掌握基本的文件系统系统调用的实现方法；
* 了解一个基于索引节点组织方式的Simple FS文件系统的设计与实现；
* 了解文件系统抽象层-VFS的设计与实现


## 1: 完成读文件操作的实现
在sfs_inode.c::sfs_io_nolock中，先判断开头大小，如果小于一块， 就直接调用buf_io后返回。如果大于一块，中间的每块也用调用blk_io。直到最后块，此时判断结尾块大小，然后继续调用buf_io。ret表示是否操作成功，alen表示长度。

对于UNIX的PIPE机制，可在管道内使用以下变量，读、写指针，互斥锁，缓冲区。读写指针表示数组的读入读出位置，当读写指针重合时，挂起正在读的进程。此时使用互斥锁保证一个进程在操作时不会有其他进程同时操作，并且使写入操作完成后唤醒读进程。


`kern/fs/sfs/sfs_inode.c`
```cpp
/*  
 * sfs_io_nolock - Rd/Wr a file contentfrom offset position to offset+ length  disk blocks<-->buffer (in memroy)
 * @sfs:      sfs file system
 * @sin:      sfs inode in memory
 * @buf:      the buffer Rd/Wr
 * @offset:   the offset of file
 * @alenp:    the length need to read (is a pointer). and will RETURN the really Rd/Wr lenght
 * @write:    BOOL, 0 read, 1 write
 */
static int
sfs_io_nolock(struct sfs_fs *sfs, struct sfs_inode *sin, void *buf, off_t offset, size_t *alenp, bool write) {
    struct sfs_disk_inode *din = sin->din;
    //cprintf("sfsio off%d len%d write%d\n", offset, *alenp, write);
    assert(din->type != SFS_TYPE_DIR);
    off_t endpos = offset + *alenp, blkoff;
    *alenp = 0;
	// calculate the Rd/Wr end position
    if (offset < 0 || offset >= SFS_MAX_FILE_SIZE || offset > endpos) {
        return -E_INVAL;
    }
    if (offset == endpos) {
        return 0;
    }
    if (endpos > SFS_MAX_FILE_SIZE) {
        endpos = SFS_MAX_FILE_SIZE;
    }
    if (!write) {
        if (offset >= din->size) {
            return 0;
        }
        if (endpos > din->size) {
            endpos = din->size;
        }
    }

    int (*sfs_buf_op)(struct sfs_fs *sfs, void *buf, size_t len, uint32_t blkno, off_t offset);
    int (*sfs_block_op)(struct sfs_fs *sfs, void *buf, uint32_t blkno, uint32_t nblks);
    if (write) {
        sfs_buf_op = sfs_wbuf, sfs_block_op = sfs_wblock;
    }
    else {
        sfs_buf_op = sfs_rbuf, sfs_block_op = sfs_rblock;
    }

    int ret = 0;
    size_t size, alen = 0;
    uint32_t ino;
    uint32_t blkno = offset / SFS_BLKSIZE;          // The NO. of Rd/Wr begin block
    uint32_t nblks = endpos / SFS_BLKSIZE - blkno;  // The size of Rd/Wr blocks

  //LAB8:EXERCISE1  HINT: call sfs_bmap_load_nolock, sfs_rbuf, sfs_rblock,etc. read different kind of blocks in file
	/*
	 * (1) If offset isn't aligned with the first block, Rd/Wr some content from offset to the end of the first block
	 *       NOTICE: useful function: sfs_bmap_load_nolock, sfs_buf_op
	 *               Rd/Wr size = (nblks != 0) ? (SFS_BLKSIZE - blkoff) : (endpos - offset)
	 * (2) Rd/Wr aligned blocks 
	 *       NOTICE: useful function: sfs_bmap_load_nolock, sfs_block_op
     * (3) If end position isn't aligned with the last block, Rd/Wr some content from begin to the (endpos % SFS_BLKSIZE) of the last block
	 *       NOTICE: useful function: sfs_bmap_load_nolock, sfs_buf_op	
	*/
    if (offset % SFS_BLKSIZE != 0)  {
    	blkoff = offset % SFS_BLKSIZE;

    	uint32_t size = (nblks != 0) ? (SFS_BLKSIZE - blkoff) : (endpos - offset);

        if ((ret = sfs_bmap_load_nolock(sfs, sin, blkno, &ino)) != 0) 
            goto out;
        
        if ((ret = sfs_buf_op(sfs, buf, size, ino, blkoff)) != 0) 
            goto out;
        
        alen += size;
        if (nblks == 0) 
            goto out;
        
    	nblks--;
    	blkno++;
    	buf += size;
    }


    for (int i = 0; i < nblks; i++) {
        if ((ret = sfs_bmap_load_nolock(sfs, sin, blkno, &ino)) != 0) 
            goto out;
        
        if ((ret = sfs_block_op(sfs, buf, ino, 1)) != 0) 
            goto out;
        
        alen += SFS_BLKSIZE, buf += SFS_BLKSIZE, blkno ++, nblks --;
    }

    if (endpos % SFS_BLKSIZE != 0)  {
    	uint32_t size = endpos % SFS_BLKSIZE;
        if ((ret = sfs_bmap_load_nolock(sfs, sin, blkno, &ino)) != 0) 
            goto out;
        
        if ((ret = sfs_buf_op(sfs, buf, size, ino, 0)) != 0) 
            goto out;
        
        alen += size;
    }

out:
    *alenp = alen;
    if (offset + alen > sin->din->size) {
        sin->din->size = offset + alen;
        sin->dirty = 1;
    }
    return ret;
}
```

## 2: 完成基于文件系统的执行程序机制的实现

对lab8之前的load_icode函数进行一下修改，之前是直接在缓存读取，在lab8使用了一个文件描述符，从文件中读取文件头和程序段。即把原来在缓存中读取修改为用调用load_icode_read函数读取。

实现软连接，可以直接在软连接文件中存储一个文件名即可，解析这个文件时直接转去解析源文件地址。实现硬链接，可以把文件的inode直接设置源文件的inode，并加一项用来存储硬链接的个数，只有该项为零时才能被完全删除，不为0时则保留。

`kern/process/proc.c`
```cpp
// alloc_proc - alloc a proc_struct and init all fields of proc_struct
static struct proc_struct *
alloc_proc(void) {
    struct proc_struct *proc = kmalloc(sizeof(struct proc_struct));
    if (proc != NULL) {
    //LAB4:EXERCISE1 
    /*
     * below fields in proc_struct need to be initialized
     *       enum proc_state state;                      // Process state
     *       int pid;                                    // Process ID
     *       int runs;                                   // the running times of Proces
     *       uintptr_t kstack;                           // Process kernel stack
     *       volatile bool need_resched;                 // bool value: need to be rescheduled to release CPU?
     *       struct proc_struct *parent;                 // the parent process
     *       struct mm_struct *mm;                       // Process's memory management field
     *       struct context context;                     // Switch here to run process
     *       struct trapframe *tf;                       // Trap frame for current interrupt
     *       uintptr_t cr3;                              // CR3 register: the base addr of Page Directroy Table(PDT)
     *       uint32_t flags;                             // Process flag
     *       char name[PROC_NAME_LEN + 1];               // Process name
     */
     //LAB5  : (update LAB4 steps)
    /*
     * below fields(add in LAB5) in proc_struct need to be initialized  
     *       uint32_t wait_state;                        // waiting state
     *       struct proc_struct *cptr, *yptr, *optr;     // relations between processes
     */
     //LAB6  : (update LAB5 steps)
    /*
     * below fields(add in LAB6) in proc_struct need to be initialized
     *     struct run_queue *rq;                       // running queue contains Process
     *     list_entry_t run_link;                      // the entry linked in run queue
     *     int time_slice;                             // time slice for occupying the CPU
     *     skew_heap_entry_t lab6_run_pool;            // FOR LAB6 ONLY: the entry in the run pool
     *     uint32_t lab6_stride;                       // FOR LAB6 ONLY: the current stride of the process
     *     uint32_t lab6_priority;                     // FOR LAB6 ONLY: the priority of process, set by lab6_set_priority(uint32_t)
     */
        //LAB8:EXERCISE2  HINT:need add some code to init fs in proc_struct, ...
        proc->state = PROC_UNINIT;
        proc->pid = -1;
        proc->runs = 0;
        proc->need_resched = 0;
        proc->cr3 = boot_cr3;

        proc->kstack = 0;
        proc->mm = 0;
        proc->parent = NULL;
        proc->tf = NULL;
        proc->flags = 0;
        memset(proc->name, 0, PROC_NAME_LEN);
        memset(&proc->context, 0, sizeof(proc->context));
        proc->wait_state = 0;
        proc->cptr = proc->yptr = proc->optr = NULL;
        proc->rq = NULL;
        list_init(&proc->run_link);
        proc->time_slice = 0;
        skew_heap_init(&proc->lab6_run_pool);
        proc->lab6_stride = 0;
        proc->lab6_priority = 1;
        proc->filesp = NULL;
    }
    return proc;
}
```

`kern/process/proc.c`
```cpp

/* do_fork -     parent process for a new child process
 * @clone_flags: used to guide how to clone the child process
 * @stack:       the parent's user stack pointer. if stack==0, It means to fork a kernel thread.
 * @tf:          the trapframe info, which will be copied to child process's proc->tf
 */
int
do_fork(uint32_t clone_flags, uintptr_t stack, struct trapframe *tf) {
    int ret = -E_NO_FREE_PROC;
    struct proc_struct *proc;
    if (nr_process >= MAX_PROCESS) {
        goto fork_out;
    }
    ret = -E_NO_MEM;
    //LAB4:EXERCISE2 
    //LAB8:EXERCISE2   HINT:how to copy the fs in parent's proc_struct?
    /*
     * Some Useful MACROs, Functions and DEFINEs, you can use them in below implementation.
     * MACROs or Functions:
     *   alloc_proc:   create a proc struct and init fields (lab4:exercise1)
     *   setup_kstack: alloc pages with size KSTACKPAGE as process kernel stack
     *   copy_mm:      process "proc" duplicate OR share process "current"'s mm according clone_flags
     *                 if clone_flags & CLONE_VM, then "share" ; else "duplicate"
     *   copy_thread:  setup the trapframe on the  process's kernel stack top and
     *                 setup the kernel entry point and stack of process
     *   hash_proc:    add proc into proc hash_list
     *   get_pid:      alloc a unique pid for process
     *   wakup_proc:   set proc->state = PROC_RUNNABLE
     * VARIABLES:
     *   proc_list:    the process set's list
     *   nr_process:   the number of process set
     */
  //LAB5  : (update LAB4 steps)
   /* Some Functions
    *    set_links:  set the relation links of process.  ALSO SEE: remove_links:  lean the relation links of process
    *    -------------------
  *    update step 1: set child proc's parent to current process, make sure current process's wait_state is 0
  *    update step 5: insert proc_struct into hash_list && proc_list, set the relation links of process
    */

    //    1. call alloc_proc to allocate a proc_struct
    if ((proc = alloc_proc()) == NULL)
        goto fork_out;
    proc->parent = current;
    assert(current->wait_state == 0);


    if (setup_kstack(proc) != 0)
        goto bad_fork_cleanup_proc;

    if (copy_mm(clone_flags, proc) != 0)
        goto bad_fork_cleanup_kstack;

    if (copy_files(clone_flags, proc) != 0)
    	goto bad_fork_cleanup_fs;
    copy_thread(proc, stack, tf);

    bool intr_flag;
    local_intr_save(intr_flag);
    {
        proc->pid = get_pid();
        hash_proc(proc);
        set_links(proc);
    }
    local_intr_restore(intr_flag);

    wakeup_proc(proc);

    ret = proc->pid;
	
fork_out:
    return ret;

bad_fork_cleanup_fs:  //for LAB8
    put_files(proc);
bad_fork_cleanup_kstack:
    put_kstack(proc);
bad_fork_cleanup_proc:
    kfree(proc);
    goto fork_out;
}
```


`kern/process/proc.c`
```cpp
static int
load_icode(int fd, int argc, char **kargv) {
    /* LAB8:EXERCISE2   HINT:how to load the file with handler fd  in to process's memory? how to setup argc/argv?
     * MACROs or Functions:
     *  mm_create        - create a mm
     *  setup_pgdir      - setup pgdir in mm
     *  load_icode_read  - read raw data content of program file
     *  mm_map           - build new vma
     *  pgdir_alloc_page - allocate new memory for  TEXT/DATA/BSS/stack parts
     *  lcr3             - update Page Directory Addr Register -- CR3
     */
	/* (1) create a new mm for current process
     * (2) create a new PDT, and mm->pgdir= kernel virtual addr of PDT
     * (3) copy TEXT/DATA/BSS parts in binary to memory space of process
     *    (3.1) read raw data content in file and resolve elfhdr
     *    (3.2) read raw data content in file and resolve proghdr based on info in elfhdr
     *    (3.3) call mm_map to build vma related to TEXT/DATA
     *    (3.4) callpgdir_alloc_page to allocate page for TEXT/DATA, read contents in file
     *          and copy them into the new allocated pages
     *    (3.5) callpgdir_alloc_page to allocate pages for BSS, memset zero in these pages
     * (4) call mm_map to setup user stack, and put parameters into user stack
     * (5) setup current process's mm, cr3, reset pgidr (using lcr3 MARCO)
     * (6) setup uargc and uargv in user stacks
     * (7) setup trapframe for user environment
     * (8) if up steps failed, you should cleanup the env.
     */

    if (current->mm != NULL) 
        panic("load_icode: current->mm must be empty.\n");
    

    int ret = -E_NO_MEM;
    struct mm_struct *mm;

    if ((mm = mm_create()) == NULL)
        goto bad_mm;
    
  
    if (setup_pgdir(mm) != 0) 
        goto bad_pgdir_cleanup_mm;
    
 
    struct Page *page;
 
    struct elfhdr __elf, *elf = &__elf;
    if ((ret = load_icode_read(fd, elf, sizeof(struct elfhdr), 0)) != 0) 
        goto bad_elf_cleanup_pgdir;
    
 
    if (elf->e_magic != ELF_MAGIC) {
        ret = -E_INVAL_ELF;
        goto bad_elf_cleanup_pgdir;
    }

    uint32_t vm_flags, perm;

    for (int i = 0; i < elf->e_phnum; i++) {
 
        struct proghdr __ph, *ph = &__ph;
        off_t phoff = elf->e_phoff + sizeof(struct proghdr) * i;
        if ((ret = load_icode_read(fd, ph, sizeof(struct proghdr), phoff)) != 0) 
            goto bad_cleanup_mmap;
        
        if (ph->p_type != ELF_PT_LOAD) 
            continue ;
        
        if (ph->p_filesz > ph->p_memsz) 
            ret = -E_INVAL_ELF;
            goto bad_cleanup_mmap;
        
        if (ph->p_filesz == 0) 
            continue ;
        

        vm_flags = 0, perm = PTE_U;
        if (ph->p_flags & ELF_PF_X) vm_flags |= VM_EXEC;
        if (ph->p_flags & ELF_PF_W) vm_flags |= VM_WRITE;
        if (ph->p_flags & ELF_PF_R) vm_flags |= VM_READ;
        if (vm_flags & VM_WRITE) perm |= PTE_W;
        if ((ret = mm_map(mm, ph->p_va, ph->p_memsz, vm_flags, NULL)) != 0) 
            goto bad_cleanup_mmap;
        

        size_t off, size;
        off_t foff = ph->p_offset;
        uintptr_t start = ph->p_va, end, la = ROUNDDOWN(start, PGSIZE);

        ret = -E_NO_MEM;


        end = ph->p_va + ph->p_filesz;

        while (start < end) {

            if ((page = pgdir_alloc_page(mm->pgdir, la, perm)) == NULL) {
                ret = -E_NO_MEM;
                goto bad_cleanup_mmap;
            }
            off = start - la, size = PGSIZE - off, la += PGSIZE;
            if (end < la) 
                size -= la - end;
            
            if ((ret = load_icode_read(fd, page2kva(page) + off, size, foff)) != 0) {
                goto bad_cleanup_mmap;
            }
            start += size;
            foff += size;
        }


        end = ph->p_va + ph->p_memsz;
        if (start < la) {

            if (start == end) {
                continue ;
            }
            off = start + PGSIZE - la, size = PGSIZE - off;
            if (end < la) {
                size -= la - end;
            }
            memset(page2kva(page) + off, 0, size);
            start += size;
            assert((end < la && start == end) || (end >= la && start == la));
        }
        while (start < end) {
            if ((page = pgdir_alloc_page(mm->pgdir, la, perm)) == NULL) {
                ret = -E_NO_MEM;
                goto bad_cleanup_mmap;
            }
            off = start - la, size = PGSIZE - off, la += PGSIZE;
            if (end < la) {
                size -= la - end;
            }
            memset(page2kva(page) + off, 0, size);
            start += size;
        }
    }
    sysfile_close(fd);

    vm_flags = VM_READ | VM_WRITE | VM_STACK;
    if ((ret = mm_map(mm, USTACKTOP - USTACKSIZE, USTACKSIZE, vm_flags, NULL)) != 0) 
        goto bad_cleanup_mmap;
    
    assert(pgdir_alloc_page(mm->pgdir, USTACKTOP-PGSIZE , PTE_USER) != NULL);
    assert(pgdir_alloc_page(mm->pgdir, USTACKTOP-2*PGSIZE , PTE_USER) != NULL);
    assert(pgdir_alloc_page(mm->pgdir, USTACKTOP-3*PGSIZE , PTE_USER) != NULL);
    assert(pgdir_alloc_page(mm->pgdir, USTACKTOP-4*PGSIZE , PTE_USER) != NULL);

    mm_count_inc(mm);
    current->mm = mm;
    current->cr3 = PADDR(mm->pgdir);
    lcr3(PADDR(mm->pgdir));

    uint32_t cursize = 0, k;
    uintptr_t newstacktop;
    for (k = 0; k < argc; ++k)
    	cursize += strnlen(kargv[k], EXEC_MAX_ARG_LEN + 1)+1;
    newstacktop = USTACKTOP - (cursize/sizeof(long)+1)*sizeof(long);

    cursize = 0;
    char** uargv=(char **)(newstacktop  - argc * sizeof(char *));
    for (k = 0; k < argc; ++k)  {
    	uargv[k]=strcpy((char*)(newstacktop+cursize), kargv[k]);
    	cursize += strnlen(kargv[k], EXEC_MAX_ARG_LEN + 1)+1;
    }

    newstacktop -= argc*sizeof(char*);
    newstacktop -= sizeof(int);
    *(int*)newstacktop = argc;

    
    struct trapframe *tf = current->tf;
    memset(tf, 0, sizeof(struct trapframe));
    /* LAB5:EXERCISE1 
     * should set tf_cs,tf_ds,tf_es,tf_ss,tf_esp,tf_eip,tf_eflags
     * NOTICE: If we set trapframe correctly, then the user level process can return to USER MODE from kernel. So
     *          tf_cs should be USER_CS segment (see memlayout.h)
     *          tf_ds=tf_es=tf_ss should be USER_DS segment
     *          tf_esp should be the top addr of user stack (USTACKTOP)
     *          tf_eip should be the entry point of this binary program (elf->e_entry)
     *          tf_eflags should be set to enable computer to produce Interrupt
     */
    tf->tf_cs = USER_CS;
    tf->tf_ds = tf->tf_es = tf->tf_ss = USER_DS;
    tf->tf_esp = newstacktop;
    tf->tf_eip = elf->e_entry;
    tf->tf_eflags = FL_IF;
    ret = 0;
    out:
        return ret;
    bad_cleanup_mmap:
        exit_mmap(mm);
    bad_elf_cleanup_pgdir:
        put_pgdir(mm);
    bad_pgdir_cleanup_mm:
        mm_destroy(mm);
    bad_mm:
        goto out;
}
```