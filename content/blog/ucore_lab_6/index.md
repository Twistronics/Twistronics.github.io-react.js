---
title: "Operating System (6) : 进程调度"
date: "2016-05-29T13:15:30Z"
description: "理解操作系统的调度过程和调度算法"
tags:
  - "C/C++"
  - "Operating system"
  - "Assembly language"
  - "操作系统"
---

理解操作系统的调度过程和调度算法


## 概要
* 熟悉 ucore 的系统调度器框架，以及内置的 Round-Robin 调度算法。
* 基于调度器框架实现一个调度器算法


## 1: 使用 Round Robin 调度算法
*	分析sched_calss中各个函数指针的用法，结合Round Robin 调度算法描述ucore的调度执行过程
	
	```cpp
	struct sched_class {
	    // the name of sched_class
	    const char *name;
	    // Init the run queue
	    void (*init)(struct run_queue *rq);
	    // put the proc into runqueue, and this function must be called with rq_lock
	    void (*enqueue)(struct run_queue *rq, struct proc_struct *proc);
	    // get the proc out runqueue, and this function must be called with rq_lock
	    void (*dequeue)(struct run_queue *rq, struct proc_struct *proc);
	    // choose the next runnable task
	    struct proc_struct *(*pick_next)(struct run_queue *rq);
	    // dealer of the time-tick
	    void (*proc_tick)(struct run_queue *rq, struct proc_struct *proc);
	    /* for SMP support in the future
	     *  load_balance
	     *     void (*load_balance)(struct rq* rq);
	     *  get some proc from this rq, used in load_balance,
	     *  return value is the num of gotten proc
	     *  int (*get_proc)(struct rq* rq, struct proc* procs_moved[]);
	     */
	};
	```
	init用来初始化运行队列，enqueue用来向队列中加入一个进程，dequeue用来从队列中取出一个进程，pick_next 用来从队列中拿出下一个进程用来执行，proc_tick用来在时钟中断时维护队列
	ucore将目前进程放入队列中，然后选出一个合适的进程出队并运行。round robin算法使用一个进程队列，当进程时间片用完时，ucore进行调度，把目前进程取出来放到队尾，再取出队列头部作为下一个执行的进程。


*	如何设计实现多级反馈队列调度算法

	维护n个队列，并且增加变量记录该进程当前所在的队列以及被调度的次数。enqueue时将该进程放入相对应队列，并把调度次数加一；dequeue时从该队列取出，并根据调度次数修改进程对应队列。

## 2: 实现 Stride Scheduling 调度算法

初始化时队列置为null，进程计数器为零。dequeue时用堆的删除，计数器减一。enqueue时用merge合并，更新time_slice和进程计数器。 pick时拿出队列头部，并把stride加上BIG_STRIDE/priority


`kern/trap/trap.c`
```cpp
static void
trap_dispatch(struct trapframe *tf) {
    char c;

    int ret=0;

    switch (tf->tf_trapno) {
    case T_PGFLT:  //page fault
        if ((ret = pgfault_handler(tf)) != 0) {
            print_trapframe(tf);
            if (current == NULL) {
                panic("handle pgfault failed. ret=%d\n", ret);
            }
            else {
                if (trap_in_kernel(tf)) {
                    panic("handle pgfault failed in kernel mode. ret=%d\n", ret);
                }
                cprintf("killed by kernel.\n");
                panic("handle user mode pgfault failed. ret=%d\n", ret); 
                do_exit(-E_KILLED);
            }
        }
        break;
    case T_SYSCALL:
        syscall();
        break;
    case IRQ_OFFSET + IRQ_TIMER:
#if 0
    LAB3 : If some page replacement algorithm(such as CLOCK PRA) need tick to change the priority of pages,
    then you can add code here. 
#endif
		/* LAB1 : STEP 3 */
		/* handle the timer interrupt */
		/* (1) After a timer interrupt, you should record this event using a global variable (increase it), such as ticks in kern/driver/clock.c
		 * (2) Every TICK_NUM cycle, you can print some info using a funciton, such as print_ticks().
		 * (3) Too Simple? Yes, I think so!
		 */

		/* LAB5 */
		/* you should upate you lab1 code (just add ONE or TWO lines of code):
		 *    Every TICK_NUM cycle, you should set current process's current->need_resched = 1
		 */

        /* LAB6 */
        /* IMPORTANT FUNCTIONS:
	     * run_timer_list
	     *----------------------
	     * you should update your lab5 code (just add ONE or TWO lines of code):
         *    Every tick, you should update the system time, iterate the timers, and trigger the timers which are end to call scheduler.
         *    You can use one funcitons to finish all these things.
         */
		ticks ++;
		assert(current != NULL);
        break;
    case IRQ_OFFSET + IRQ_COM1:
        c = cons_getc();
        cprintf("serial [%03d] %c\n", c, c);
        break;
    case IRQ_OFFSET + IRQ_KBD:
        c = cons_getc();
        cprintf("kbd [%03d] %c\n", c, c);
        break;
    //LAB1 CHALLENGE 1 
    case T_SWITCH_TOU:
    case T_SWITCH_TOK:
        panic("T_SWITCH_** ??\n");
        break;
    case IRQ_OFFSET + IRQ_IDE1:
    case IRQ_OFFSET + IRQ_IDE2:
        /* do nothing */
        break;
    default:
        print_trapframe(tf);
        if (current != NULL) {
            cprintf("unhandled trap.\n");
            do_exit(-E_KILLED);
        }
        // in kernel, it must be a mistake
        panic("unexpected trap in kernel.\n");

    }
}
```

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
        proc->state = PROC_UNINIT;
        proc->pid = -1;
        proc->runs = 0;
        proc->kstack = 0;
        proc->need_resched = 0;
        proc->parent = NULL;
        proc->mm = NULL;
        memset(&(proc->context), 0, sizeof(struct context));
        proc->tf = NULL;
        proc->cr3 = boot_cr3;
        proc->flags = 0;
        memset(proc->name, 0, PROC_NAME_LEN);
     //LAB5   : (update LAB4 steps)
    /*
     * below fields(add in LAB5) in proc_struct need to be initialized
     *       uint32_t wait_state;                        // waiting state
     *       struct proc_struct *cptr, *yptr, *optr;     // relations between processes
	 */
        proc->wait_state = 0;
        proc->cptr = proc->optr = proc->yptr = NULL;
     //LAB6   : (update LAB5 steps)
    /*
     * below fields(add in LAB6) in proc_struct need to be initialized
     *     struct run_queue *rq;                       // running queue contains Process
     *     list_entry_t run_link;                      // the entry linked in run queue
     *     int time_slice;                             // time slice for occupying the CPU
     *     skew_heap_entry_t lab6_run_pool;            // FOR LAB6 ONLY: the entry in the run pool
     *     uint32_t lab6_stride;                       // FOR LAB6 ONLY: the current stride of the process
     *     uint32_t lab6_priority;                     // FOR LAB6 ONLY: the priority of process, set by lab6_set_priority(uint32_t)
     */
        proc->rq = NULL;
        list_init(&(proc->run_link));
        proc->time_slice = 0;
        proc->lab6_run_pool.left = proc->lab6_run_pool.right = proc->lab6_run_pool.parent = NULL;
        proc->lab6_stride = 0;
        proc->lab6_priority = 0;
    }
    return proc;
}
```

`kern/schedule/default_sched.c`
```cpp
#include <defs.h>
#include <list.h>
#include <proc.h>
#include <assert.h>
#include <default_sched.h>

#define USE_SKEW_HEAP 1

/* You should define the BigStride constant here*/
/* LAB6:   */
#define BIG_STRIDE 0x7FFFFFFF   /* you should give a value, and is ??? */

/* The compare function for two skew_heap_node_t's and the
 * corresponding procs*/
static int
proc_stride_comp_f(void *a, void *b)
{
     struct proc_struct *p = le2proc(a, lab6_run_pool);
     struct proc_struct *q = le2proc(b, lab6_run_pool);
     int32_t c = p->lab6_stride - q->lab6_stride;
     if (c > 0) return 1;
     else if (c == 0) return 0;
     else return -1;
}

/*
 * stride_init initializes the run-queue rq with correct assignment for
 * member variables, including:
 *
 *   - run_list: should be a empty list after initialization.
 *   - lab6_run_pool: NULL
 *   - proc_num: 0
 *   - max_time_slice: no need here, the variable would be assigned by the caller.
 *
 * hint: see libs/list.h for routines of the list structures.
 */
static void
stride_init(struct run_queue *rq) {
     /* LAB6:  
      * (1) init the ready process list: rq->run_list
      * (2) init the run pool: rq->lab6_run_pool
      * (3) set number of process: rq->proc_num to 0
      */
	list_init(&(rq->run_list));
	rq->lab6_run_pool = NULL;
	rq->proc_num = 0;
}

/*
 * stride_enqueue inserts the process ``proc'' into the run-queue
 * ``rq''. The procedure should verify/initialize the relevant members
 * of ``proc'', and then put the ``lab6_run_pool'' node into the
 * queue(since we use priority queue here). The procedure should also
 * update the meta date in ``rq'' structure.
 *
 * proc->time_slice denotes the time slices allocation for the
 * process, which should set to rq->max_time_slice.
 *
 * hint: see libs/skew_heap.h for routines of the priority
 * queue structures.
 */
static void
stride_enqueue(struct run_queue *rq, struct proc_struct *proc) {
     /* LAB6:  
      * (1) insert the proc into rq correctly
      * NOTICE: you can use skew_heap or list. Important functions
      *         skew_heap_insert: insert a entry into skew_heap
      *         list_add_before: insert  a entry into the last of list
      * (2) recalculate proc->time_slice
      * (3) set proc->rq pointer to rq
      * (4) increase rq->proc_num
      */
	rq->lab6_run_pool = skew_heap_insert(rq->lab6_run_pool, &(proc->lab6_run_pool), proc_stride_comp_f);
	proc->time_slice = rq->max_time_slice;
	proc->rq = rq;
	rq->proc_num++;
}

/*
 * stride_dequeue removes the process ``proc'' from the run-queue
 * ``rq'', the operation would be finished by the skew_heap_remove
 * operations. Remember to update the ``rq'' structure.
 *
 * hint: see libs/skew_heap.h for routines of the priority
 * queue structures.
 */
static void
stride_dequeue(struct run_queue *rq, struct proc_struct *proc) {
     /* LAB6:  
      * (1) remove the proc from rq correctly
      * NOTICE: you can use skew_heap or list. Important functions
      *         skew_heap_remove: remove a entry from skew_heap
      *         list_del_init: remove a entry from the  list
      */
	rq->lab6_run_pool = skew_heap_remove(rq->lab6_run_pool, &(proc->lab6_run_pool), proc_stride_comp_f);
	rq->proc_num--;
}
/*
 * stride_pick_next pick the element from the ``run-queue'', with the
 * minimum value of stride, and returns the corresponding process
 * pointer. The process pointer would be calculated by macro le2proc,
 * see kern/process/proc.h for definition. Return NULL if
 * there is no process in the queue.
 *
 * When one proc structure is selected, remember to update the stride
 * property of the proc. (stride += BIG_STRIDE / priority)
 *
 * hint: see libs/skew_heap.h for routines of the priority
 * queue structures.
 */
static struct proc_struct *
stride_pick_next(struct run_queue *rq) {
     /* LAB6:  
      * (1) get a  proc_struct pointer p  with the minimum value of stride
             (1.1) If using skew_heap, we can use le2proc get the p from rq->lab6_run_poll
             (1.2) If using list, we have to search list to find the p with minimum stride value
      * (2) update p;s stride value: p->lab6_stride
      * (3) return p
      */
	if (rq->lab6_run_pool == NULL)
		return NULL;
	struct proc_struct *p = le2proc(rq->lab6_run_pool, lab6_run_pool);

	if (p->lab6_priority == 0)
		p->lab6_stride += BIG_STRIDE;
	else
		p->lab6_stride += BIG_STRIDE / p->lab6_priority;

	return p;
}

/*
 * stride_proc_tick works with the tick event of current process. You
 * should check whether the time slices for current process is
 * exhausted and update the proc struct ``proc''. proc->time_slice
 * denotes the time slices left for current
 * process. proc->need_resched is the flag variable for process
 * switching.
 */
static void
stride_proc_tick(struct run_queue *rq, struct proc_struct *proc) {
     /* LAB6:   */
    if (proc->time_slice > 0)
         proc->time_slice --;

    if (proc->time_slice == 0)
         proc->need_resched = 1;

}

struct sched_class default_sched_class = {
     .name = "stride_scheduler",
     .init = stride_init,
     .enqueue = stride_enqueue,
     .dequeue = stride_dequeue,
     .pick_next = stride_pick_next,
     .proc_tick = stride_proc_tick,
};
```