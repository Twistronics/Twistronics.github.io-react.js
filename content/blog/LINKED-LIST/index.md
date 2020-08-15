---
title: "线程安全的抽象链表类库"
date: "2014-03-25T11:15:30Z"
description: "实现线程安全的抽象链表库。"
tags: 
  - "C/C++"
---

所谓线程安全的是指，所编写的程序在多线程执行时，不会导致程序错误。为此，抽象链表库的代码必须仔细考虑多个线程同时访问时的同步问题。其基本原则是：（1）抽象链表库允许多个线程同时读取，但不允许同时写入；（2）抽象链表库的部分代码段必须是原子的，也就是说，这些代码段中的代码要么全部执行，要么全部不执行，不允许在执行其中代码的过程中被中断。

读写锁有三种状态，一次只能有一个线程可以占有写模式的读写锁，但是可以有多个线
程同时占有读模式的读写锁。当读写锁处于写加锁状态时，在这个锁被解锁之前，所有试图
对这个锁加锁的线程都会被阻塞。当读写锁处于读加锁状态时，所有试图以读模式对它进行
加锁的线程都可以得到访问权，但是如果线程希望以写模式对此锁进行加锁，它必须阻塞知
道所有的线程释放锁.

通常，当读写锁处于读模式锁住状态时，如果有另外线程试图以写模式加锁，读写锁通
常会阻塞随后的读模式锁请求，这样可以避免读模式锁长期占用，而等待的写模式锁请求长
期阻塞。

读写锁适用于对数据结构的读次数比写次数多得多的情况。因为，读模式锁定时可以共
享，以写模式锁住时意味着独占，所以读写锁又叫共享－独占锁。
读写锁的初始化和销毁函数如下：
```cpp
int pthread_rwlock_init(pthread_rwlock_t *restrict rwlock, const
pthread_rwlockattr_t *restrict attr);
int pthread_rwlock_destroy(pthread_rwlock_t *rwlock);
```

上述函数成功则返回 0，出错则返回错误编号。同互斥量一样，在释放读写锁占用的内
存前，需要先通过 pthread_rwlock_destroy 对读写锁进行清理工作，释放由 init 分配的资源。
加锁函数如下：
```cpp
int pthread_rwlock_rdlock(pthread_rwlock_t *rwlock);
int pthread_rwlock_wrlock(pthread_rwlock_t *rwlock);
int pthread_rwlock_unlock(pthread_rwlock_t *rwlock);
```

上述函数成功则返回 0，出错则返回错误编号。上述三个函数分别实现获取读锁，获取
写锁和释放锁的操作。获取锁的两个函数是阻塞操作。其非阻塞的版本为：
```cpp
int pthread_rwlock_tryrdlock(pthread_rwlock_t *rwlock);
int pthread_rwlock_trywrlock(pthread_rwlock_t *rwlock);
```

上述函数成功则返回 0，出错则返回错误编号。非阻塞的获取锁操作，如果可以获取则返回 0，否则返回错误 EBUSY。

`makefile`
```makefile
objects = main.cpp list.cpp point.cpp zylib.cpp zyrandom.cpp
a.out : $(objects) list.h point.h zylib.h zyrandom.h
	g++ -o a.out -lpthread $(objects)
```

`main.cpp`
```cpp
#include <stdio.h>

#ifndef __POINT__
#include "point.h"
#endif

#ifndef __LIST__
#include "list.h"
#endif

#include "zyrandom.h"

int DoCompareObject( CADT e1, CADT e2 );
void DoDestroyObject( ADT e );
void DoPrintObject( ADT e, ADT tag );

int main()
{
    POINT pt;
    int i;
    LINKED_LIST list = LlCreate();
    Randomize();
    for( i = 0; i < 8; ++i )
    {
        pt = PtCreate( GenerateRandomNumber(10, 99), GenerateRandomNumber(10, 99) );
        LlInsert( list, pt, 0 );
    }
    pt = PtCreate( 6, 6 );
    LlInsert( list, pt, 1 );
    LlTraverse( list, DoPrintObject,(void*) "(%d,%d)" );
    printf( "NULL\n" );

    if( LlSearch( list, pt, DoCompareObject ) )
        printf( "Yes, %s exists.\n", PtTransformIntoString("(%d,%d)", pt) );
    else
        printf( "No, %s doesn't exist.\n", PtTransformIntoString("(%d,%d)", pt) );

    LlDelete( list, 1, DoDestroyObject );
    LlTraverse( list, DoPrintObject,(void*) "(%d,%d)" );
    printf( "NULL\n" );

    pt = PtCreate( 6, 6 );
    if( LlSearch( list, pt, DoCompareObject ) )
        printf( "Yes, %s exists.\n", PtTransformIntoString("(%d,%d)", pt) );
    else
        printf( "No, %s doesn't exist.\n", PtTransformIntoString("(%d,%d)", pt) );

    LlClear( list, DoDestroyObject );
    LlTraverse( list, DoPrintObject,(void*) "(%d,%d)" );
    printf( "NULL\n" );

    LlDestroy( list, DoDestroyObject );
    return 0;
}

int DoCompareObject( CADT e1, CADT e2 )
{
    return PtCompare( (POINT)e1, (POINT)e2 );
}

void DoDestroyObject( ADT e )
{
    DestroyObject( e );
}

void DoPrintObject( ADT e, ADT tag )
{
    printf( PtTransformIntoString( (CSTRING)tag, (POINT)e ) );
    printf( " -> " );
}
```

`list.h`
```cpp
#ifndef __LIST__
#define __LIST__

#ifndef __ZYLIB__
#include "zylib.h"
#endif

typedef struct __LINKED_LIST * LINKED_LIST;

typedef int ( * COMPARE_OBJECT )( CADT e1, CADT e2 );
typedef void ( * DESTROY_OBJECT )( ADT e );
typedef void ( * MANIPULATE_OBJECT )( ADT e, ADT tag );

LINKED_LIST LlCreate();
void LlDestroy( LINKED_LIST list, DESTROY_OBJECT destroy );
void LlClear( LINKED_LIST list, DESTROY_OBJECT destroy );
void LlAppend( LINKED_LIST list, ADT object );
void LlInsert( LINKED_LIST list, ADT object, unsigned int pos );
void LlDelete( LINKED_LIST list, unsigned int pos, DESTROY_OBJECT destroy );
void LlTraverse( LINKED_LIST list, MANIPULATE_OBJECT manipulate, ADT tag );
BOOL LlSearch( LINKED_LIST list, ADT object, COMPARE_OBJECT compare );
unsigned int LlGetCount( LINKED_LIST list );
BOOL LlIsEmpty( LINKED_LIST list );

#endif
```

`list.cpp`
```cpp
#include <stdio.h>

#ifndef __ZYLIB__
#include "zylib.h"
#endif

#ifndef __LIST__
#include "list.h"
#endif

typedef struct __NODE * NODE;
struct __LINKED_LIST{ unsigned int count; NODE head, tail; pthread_rwlock_t rwlock; };
struct __NODE{ ADT data; NODE next; };

LINKED_LIST LlCreate()
{
    LINKED_LIST p = NewObject( struct __LINKED_LIST );
    p->count = 0;
    p->head = NULL;
    p->tail = NULL;
    pthread_rwlock_init( &p->rwlock, NULL );
    return p;
}

void LlDestroy( LINKED_LIST list, DESTROY_OBJECT destroy )
{
    if( list ){LlClear( list, destroy ); pthread_rwlock_destroy(&list->rwlock); DestroyObject( list );  }
}

void LlClear( LINKED_LIST list, DESTROY_OBJECT destroy )
{
    if( !list )  PrintErrorMessage( FALSE, "LlClear: Parameter illegal." );

    pthread_rwlock_wrlock( &list->rwlock );

    while( list->head )
    {
        NODE t = list->head;
        list->head = t->next;
        if( destroy )  ( *destroy )( t->data );
        DestroyObject( t );
        list->count--;
    }
    list->tail = NULL;

    pthread_rwlock_unlock( &list->rwlock );
}

void LlAppend( LINKED_LIST list, ADT object )
{
    NODE t = NewObject( struct __NODE );
    if( !list || !object )  PrintErrorMessage( FALSE, "LlAppend: Parameter illegal." );

    t->data = object;
    t->next = NULL;

    pthread_rwlock_wrlock( &list->rwlock );

    if( !list->head )  // singly linked list with no elements
    {
        list->head = t;
        list->tail = t;
    }
    else
    {
        list->tail->next = t;
        list->tail = t;
    }
    list->count++;

    pthread_rwlock_unlock( &list->rwlock );
}

void LlInsert( LINKED_LIST list, ADT object, unsigned int pos )
{
    if( !list || !object )  PrintErrorMessage( FALSE, "LlInsert: Parameter illegal." );

    pthread_rwlock_wrlock( &list->rwlock );

    if( pos < list->count ){
        NODE t = NewObject( struct __NODE );
        t->data = object;
        t->next = NULL;
        if( pos == 0 ){
            t->next = list->head;
            list->head = t;
        }
        else{
            unsigned int i;
            NODE u = list->head;
            for( i = 0; i < pos - 1; ++i )  u = u->next;
            t->next = u->next;
            u->next = t;
        }
        list->count++;

    }
    else {
        NODE t = NewObject( struct __NODE );
        if( !list || !object )  PrintErrorMessage( FALSE, "LlAppend: Parameter illegal." );
        t->data = object;
        t->next = NULL;
        if( !list->head )  // singly linked list with no elements
        {
            list->head = t;
            list->tail = t;
        }
        else
        {
            list->tail->next = t;
            list->tail = t;
        }
        list->count++;
    }

    pthread_rwlock_unlock( &list->rwlock );
}

void LlDelete( LINKED_LIST list, unsigned int pos, DESTROY_OBJECT destroy )
{

    if( !list )  PrintErrorMessage( FALSE, "LlDelete: Parameter illegal." );

    pthread_rwlock_wrlock( &list->rwlock );

    if( list->count == 0 ) { pthread_rwlock_unlock( &list->rwlock ); return; }
    if( pos == 0 ){
        NODE t = list->head;
        list->head = t->next;
        if( !t->next )  list->tail = NULL;
        if( destroy )  ( *destroy )( t->data );
        DestroyObject( t );
        list->count--;
    }
    else if( pos < list->count ){
        unsigned int i;
        NODE u = list->head, t;
        for( i = 0; i < pos - 1; ++i )  u = u->next;
        t = u->next;
        u->next = t->next;
        if( !t->next )  list->tail = u;
        if( destroy )  ( *destroy )( t->data );
        DestroyObject( t );
        list->count--;
    }

    pthread_rwlock_unlock( &list->rwlock );
}

void LlTraverse( LINKED_LIST list, MANIPULATE_OBJECT manipulate, ADT tag )
{
    pthread_rwlock_rdlock( &list->rwlock );

    NODE t = list->head;
    if( !list )  PrintErrorMessage( FALSE, "LlTraverse: Parameter illegal." );
    while( t ){
        if( manipulate )  ( *manipulate )(t->data, tag );
        t = t->next;
    }

    pthread_rwlock_unlock( &list->rwlock );
}

BOOL LlSearch( LINKED_LIST list, ADT object, COMPARE_OBJECT compare )
{
    pthread_rwlock_rdlock( &list->rwlock );

    NODE t = list->head;
    if( !list || !object || !compare )  PrintErrorMessage( FALSE, "LlSearch: Parameter illegal." );
    while( t ){
        if( ( *compare )( t->data, object ) ) {

            pthread_rwlock_unlock( &list->rwlock );

            return TRUE;
        }
        t = t->next;
    }

    pthread_rwlock_unlock( &list->rwlock );
    return FALSE;
}

unsigned int LlGetCount( LINKED_LIST list )
{
    if( !list )  PrintErrorMessage( FALSE, "LlGetCount: Parameter illegal." );

    pthread_rwlock_rdlock( &list->rwlock );
    unsigned int temp_count = list->count;
    pthread_rwlock_unlock( &list->rwlock );
    return temp_count;
}

BOOL LlIsEmpty( LINKED_LIST list )
{
    if( !list )  PrintErrorMessage( FALSE, "LlIsEmpty: Parameter illegal." );

    pthread_rwlock_rdlock( &list->rwlock );
    bool temp = list->count == 0;
    pthread_rwlock_unlock( &list->rwlock );
    return temp;
}
```

`point.h`
```cpp
#ifndef __POINT__
#define __POINT__

#ifndef __ZYLIB__
#include "zylib.h"
#endif

typedef struct __POINT * POINT;

POINT PtCreate( int x, int y );
void PtDestroy( POINT point );
void PtGetValue( POINT point, int * x, int * y );
void PtSetValue( POINT point, int x, int y );
BOOL PtCompare( POINT point1, POINT point2 );
STRING PtTransformIntoString( CSTRING format, POINT point );
void PtPrint( POINT point );

#endif
```

`point.cpp`
```cpp
#include <stdio.h>

#ifndef __POINT__
#include "point.h"
#endif

#ifndef __ZYLIB__
#include "zylib.h"
#endif

struct __POINT{ int x, y; };

POINT PtCreate( int x, int y )
{
    POINT t = NewObject( struct __POINT );
    t->x = x;
    t->y = y;
    return t;
}

void PtDestroy( POINT point )
{
    if( point ){  DestroyObject( point );  }
}

void PtGetValue( POINT point, int * x, int * y )
{
    if( point ){  if( x )  *x = point->x;  if( y )  *y = point->y;  }
}

void PtSetValue( POINT point, int x, int y )
{
    if( point ){  point->x = x;  point->y = y;  }
}

BOOL PtCompare( POINT point1, POINT point2 )
{
    if( !point1 || !point2 )  PrintErrorMessage( FALSE, "PtCompare: Parameter(s) illegal." );
    return ( point1->x == point2->x ) && ( point1->y == point2->y );
}

STRING PtTransformIntoString( CSTRING format, POINT point )
{
    char buf[BUFSIZ];
    if( point ){
        sprintf( buf, format, point->x, point->y );
        return DuplicateString( buf );
    }
    else  return (char*) "NULL";
}

void PtPrint( POINT point )
{
    if( point )
        printf( "(%d,%d)", point->x, point->y );
    else
        printf( "NULL" );
}
```

`zylib.h`
```cpp
#ifndef __ZYLIB__
#define __ZYLIB__

#include <stddef.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>
#include <pthread.h>


/*****************************************************************************/
/*  基本数据类型定义  */
/*****************************************************************************/
typedef bool BOOL;
#define TRUE true
#define FALSE false
/*  布尔类型  */

/*  抽象字符串类型  */
typedef char* STRING;
typedef const char* CSTRING;

/*  抽象数据类型  */
typedef void* ADT;
typedef const void * CADT;


/*****************************************************************************/
/*  宏与常量定义  */
/*****************************************************************************/

/*  无定义对象  */
extern const ADT undefined_object;

/*  索引下标不存在常量  */
extern const unsigned int inexistent_index;



/*****************************************************************************/
/*  时间处理  */
/*****************************************************************************/

/*  函数：STRING TimeToString(const struct tm* t)  */
/*  将时间数据转换为字符串。*/
/*  字符串的格式为：YYYY-MM-DD HH:MM:SS。*/
/*  使用方法：time_t t0; struct tm* t1; STRING s; t0 = time(NULL); t1 = localtime(&t0); s = TimeToString(t1);  */
STRING TimeToString(const struct tm* t);

/*  函数：STRING CurrentTimeToString()  */
/*  将当前时间转换为字符串。*/
/*  字符串的格式为：YYYY-MM-DD HH:MM:SS。*/
STRING CurrentTimeToString();



/*****************************************************************************/
/*  错误处理  */
/*****************************************************************************/

/*  函数：void PrintErrorMessage(CSTRING fmt, ...)  */
/*  错误处理。*/
/*  向标准错误流中输出错误信息，使用方式类似标准库函数printf()。*/
/*  on：TRUE表示程序继续运行，FALSE表示程序终止。*/
void PrintErrorMessage(BOOL on, CSTRING fmt, ...);

/*  函数：void PrintErrorMessageToFile(FILE* fp, CSTRING fmt, ...)  */
/*  错误处理。*/
/*  向文件中写入错误信息，使用方式类似标准库函数fprintf()。*/
/*  on：TRUE表示程序继续运行，FALSE表示程序终止。*/
void PrintErrorMessageToFile(FILE* fp, BOOL on, CSTRING fmt, ...);



/*****************************************************************************/
/*  动态内存分配与管理  */
/*****************************************************************************/

/*  宏：NewObject(T)  */
/*  创建目标数据对象，返回指向它的指针。*/
/*  使用方法：T* p; p = NewObject(T); */
#define NewObject(T)         (T*)malloc(sizeof(T))

/*  宏：CreateObjects(T, n)  */
/*  创建连续多个目标数据对象（数组），返回指向数组第一个元素的指针。*/
/*  使用方法：T* p; int n = 10; p = CreateObjects(T, n); */
#define CreateObjects(T, n)  (T*)malloc((n)*sizeof(T))

/*  宏：CreateObject(T, n)  */
/*  创建连续多个目标数据对象，返回指向第一个元素的指针。用于所创建的多个目标数据对象总是作为整体考察的场合，例如创建10个字符，但目标数据对象总是被作为字符串而不是数组处理。*/
/*  使用方法：char* p; int n = 10; p = CreateObject(char, n); */
#define CreateObject(T, n)   (T*)malloc((n)*sizeof(T))

/*  宏：DestroyObject(p)  */
/*  销毁指针所指向的目标数据对象。*/
/*  使用方法：T* p; ...; DestroyObject(p); */
#define DestroyObject(p)     free(p);  p = NULL

/*  宏：DestroyObjects(p)  */
/*  销毁指针所指向的目标数据对象。*/
/*  使用方法：T* p; ...; DestroyObjects(p); */
#define DestroyObjects(p)    free(p); p = NULL



/*****************************************************************************/
/*  字符串功能  */
/*****************************************************************************/

/*  函数：int GetIntegerFromKeyboard() */
/*  从键盘获取整数。*/
int GetIntegerFromKeyboard();

/*  函数：double GetRealFromKeyboard() */
/*  从键盘获取浮点数。*/
double GetRealFromKeyboard();

/*  函数：STRING GetStringFromKeyboard() */
/*  从键盘获取字符串。*/
/*  使用方法：STRING s; s = GetStringFromKeyboard(); ...; DestroyObject(s); */
STRING GetStringFromKeyboard();

/*  函数：STRING GetLineFromFile(FILE* fp) */
/*  从文件中获取一行信息（以'\n'分隔或到文件结尾）。*/
/*  使用方法：STRING s; FILE* fp; fp = fopen(...); s = GetLineFromFile(fp); ...; DestroyObject(s); */
STRING GetLineFromFile( FILE* fp );

/*  函数：STRING DuplicateString( STRING s ) */
/*  拷贝字符串。*/
STRING DuplicateString( STRING s );

/*  函数：STRING ConcatenateString( STRING s1, STRING s2 ) */
/*  合并两个字符串，并返回结果。*/
STRING ConcatenateString( STRING s1, STRING s2 );

/*  函数：int CompareString( STRING s1, STRING s2 ) */
/*  字符串比较。若按照字典顺序，s1在s2之前，返回－1，s1与s2相等，返回0；否则返回1。*/
int CompareString( STRING s1, STRING s2 );

/*  函数：BOOL IsStringEqual( STRING s1, STRING s2 ) */
/*  判断两个字符串是否相等，大小写敏感。*/
BOOL IsStringEqual( STRING s1, STRING s2 );

/*  函数：BOOL IsStringEqualWithoutCase( STRING s1, STRING s2 ) */
/*  判断两个字符串是否相等，忽略大小写。*/
BOOL IsStringEqualWithoutCase( STRING s1, STRING s2 );

/*  函数：unsigned int GetStringLength( STRING s ) */
/*  获取字符串的长度。*/
unsigned int GetStringLength( STRING s );

/*  函数：char GetIthChar( STRING s, unsigned int pos ) */
/*  获取字符串的第pos个字符，pos从0开始编号。*/
/*  使用方法：字符串的首字符使用0作为参数。*/
char GetIthChar( STRING s, unsigned int pos );

/*  函数：STRING GetSubString( STRING s, unsigned int pos, unsigned int length ) */
/*  获取字符串的子串，子串位置从pos处开始，最多包含n个字符。*/
/*  如果pos不在字符串长度范围0～GetStringLength(s)-1内，则返回空字符串，否则返回从pos位置开始的n个字符，若超出字符串长度，则只截至到字符串尾部。*/
STRING GetSubString( STRING s, unsigned int pos, unsigned int n );

/*  函数：STRING TransformStringIntoUpperCase( STRING s ) */
/*  将字符串的全部字符转换为大写字母。*/
STRING TransformStringIntoUpperCase( STRING s );

/*  函数：STRING TransformStringIntoLowerCase( STRING s ) */
/*  将字符串的全部字符转换为小写字母。*/
STRING TransformStringIntoLowerCase( STRING s );

/*  函数：STRING TransformCharIntoString( char c ) */
/*  将一个字符转换为字符串。*/
STRING TransformCharIntoString( char c );

/*  函数：STRING TransformIntegerIntoString( int n ) */
/*  将整数转换为字符串。*/
STRING TransformIntegerIntoString( int n );

/*  函数：int TransformStringIntoInteger( STRING s ) */
/*  将字符串转换为整数。*/
int TransformStringIntoInteger( STRING s );

/*  函数：STRING TransformRealIntoString( double d ) */
/*  将浮点数转换为字符串。*/
STRING TransformRealIntoString( double d );

/*  函数：double TransformStringIntoReal( STRING s ) */
/*  将字符串转换为浮点数。*/
double TransformStringIntoReal( STRING s );

/*  函数：unsigned int FindCharFirst( char key, STRING s ) */
/*  查找字符串s中的指定字符key。返回其第一次查找到的索引下标。若不存在，则返回inexistent_index。*/
unsigned int FindCharFirst( char key, STRING s );

/*  函数：unsigned int FindCharNext( char key, STRING s, int pos ) */
/*  从指定位置pos开始，查找字符串s中的指定字符key。返回从此位置开始首个查找到的索引下标。若不存在，则返回inexistent_index。*/
unsigned int FindCharNext( char key, STRING s, unsigned int pos );

/*  函数：unsigned int FindSubStringFirst( STRING key, STRING s ) */
/*  查找字符串s中的指定子串key。返回其第一次查找到的索引下标。若不存在，则返回inexistent_index。*/
unsigned int FindSubStringFirst( STRING key, STRING s );

/*  函数：unsigned int FindSubStringNext( STRING key, STRING s, int pos ) */
/*  从指定位置pos开始，查找字符串s中的指定子串key。返回从此位置开始首个查找到的索引下标。若不存在，则返回inexistent_index。*/
unsigned int FindSubStringNext( STRING key, STRING s, unsigned int pos );

#endif
```

`zylib.cpp`
```cpp
#include <stddef.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifndef __ZYLIB__
#include "zylib.h"
#endif



/*****************************************************************************/
/*  宏与常量定义  */
/*****************************************************************************/

extern const ADT undefined_object = (void*) &undefined_object;

extern const unsigned int inexistent_index = 0xFFFFFFFF;



/*****************************************************************************/
/*  时间处理  */
/*****************************************************************************/

STRING TimeToString(const struct tm* t)
{
    STRING _s;
    _s = CreateObject(char, 20);
    if(!strftime(_s, 20, "%Y-%m-%d %H:%M:%S", t))
    {
        DestroyObject(_s);
        return NULL;
    }
    return _s;
}

STRING CurrentTimeToString()
{
    time_t _t0 = time(NULL);
    struct tm* _t1 = localtime(&_t0);
    return TimeToString(_t1);
}



/*****************************************************************************/
/*  错误处理  */
/*****************************************************************************/

#define EXITCODE (-1)

void PrintErrorMessage(BOOL on, CSTRING fmt, ...)
{
    va_list _args;
    STRING _s;
    if(fmt)
    {
        _s = CurrentTimeToString();
        va_start(_args, fmt);
        fprintf(stderr, "[");
        fprintf(stderr, _s);
        fprintf(stderr, "] ");
        vfprintf(stderr, fmt, _args);
        fprintf(stderr, "\n");
        va_end(_args);
    }
    if(!on)
        exit(EXITCODE);
}


void PrintErrorMessageToFile(FILE* fp, BOOL on, CSTRING fmt, ...)
{
    va_list _args;
    STRING _s;
    if(fp && fmt)
    {
        _s = CurrentTimeToString();
        va_start(_args, fmt);
        fprintf(fp, "[");
        fprintf(fp, _s);
        fprintf(fp, "] ");
        vfprintf(fp, fmt, _args);
        fprintf(fp, "\n");
        va_end(_args);
    }
    if(!on)
        exit(EXITCODE);
}



/*****************************************************************************/
/*  动态内存分配与管理  */
/*****************************************************************************/



/*****************************************************************************/
/*  字符串功能  */
/*****************************************************************************/

int GetIntegerFromKeyboard()
{
    STRING _s;
    int _n;
    char _junk;
    while(TRUE)
    {
        _s = GetStringFromKeyboard();
        switch(sscanf(_s, " %d %c", &_n, &_junk))
        {
            case 1:
                DestroyObject(_s);
                return _n;
            case 2:
                printf("Unexpected character '%c'.\n", _junk);
                break;
            default:
                printf("Please input an integer.\n");
                break;
        }
        DestroyObject(_s);
        printf("Retry: ");
    }
}

double GetRealFromKeyboard()
{
    STRING _s;
    double _d;
    char _junk;
    while(TRUE)
    {
        _s = GetStringFromKeyboard();
        switch(sscanf(_s, " %lf %c", &_d, &_junk))
        {
            case 1:
                DestroyObject(_s);
                return _d;
            case 2:
                printf("Unexpected character '%c'.\n", _junk);
                break;
            default:
                printf("Please input an real number.\n");
                break;
        }
        DestroyObject(_s);
        printf("Retry: ");
    }
}

STRING GetStringFromKeyboard()
{
    fflush(stdin);
    return GetLineFromFile(stdin);
}

STRING GetLineFromFile(FILE* fp)
{
    STRING _s, _t;
    int _n, _c, _size;
    _n = 0;
    _size = BUFSIZ;
    _s = CreateObject(char, _size);
    while((_c = getc(fp)) != '\n' && _c != EOF)
    {
        if(_n >= _size - 1)
        {
            _size <<= 1;
            _t = CreateObject(char, _size);
            strncpy(_t, _s, _n);
            DestroyObject(_s);
            _s = _t;
        }
        _s[_n++] = (char)_c;
    }
    if(_n == 0 && _c == EOF)
    {
        DestroyObject(_s);
        return NULL;
    }
    _s[_n] = '\0';
    _t = CreateObject(char, _n + 1);
    strcpy(_t, _s);
    DestroyObject(_s);
    return _t;
}

STRING DuplicateString(STRING s)
{
    STRING _s;
    unsigned int _n, _i;
    _n = strlen(s);
    _s = CreateObject(char, _n + 1);
    /* while( *_s++ = *s++ ); */
    for(_i=0; _i<_n; _i++)
        _s[_i] = s[_i];
    _s[_n] = '\0';
    return _s;
}

STRING ConcatenateString( STRING s1, STRING s2 )
{
    STRING _s;
    unsigned int _n1, _n2;
    if( !s1 || !s2 )
        PrintErrorMessage( FALSE, "ConcatenateString: Illegal string parameter(s).\n" );
    _n1 = strlen( s1 );
    _n2 = strlen( s2 );
    _s = CreateObject( char, _n1 + _n2 + 1 );
    strcpy( _s, s1 );
    strcpy( _s + _n1, s2 );
    return _s;
}

int CompareString( STRING s1, STRING s2 )
{
    if( !s1 || !s2 )
        PrintErrorMessage( FALSE, "CompareString: Illegal string parameter(s).\n" );
    return strcmp( s1, s2 );
}

BOOL IsStringEqual(STRING s1, STRING s2)
{
    BOOL _r;
    if(!s1 || !s2)
        PrintErrorMessage(FALSE, "IsStringEqual: Illegal string parameter(s).\n");
    _r = strcmp(s1, s2) == 0;
    return _r;
}

BOOL IsStringEqualWithoutCase(STRING s1, STRING s2)
{
    STRING _s1, _s2;
    BOOL _r;
    if(!s1 || !s2)
        PrintErrorMessage(FALSE, "IsStringEqualWithoutCase: Illegal string parameter(s).\n");
    _s1 = DuplicateString(s1);
    TransformStringIntoUpperCase(_s1);
    _s2 = DuplicateString(s2);
    TransformStringIntoUpperCase(_s2);
    _r = strcmp(_s1, _s2) == 0;
    DestroyObject(_s1);
    DestroyObject(_s2);
    return _r;
}

unsigned int GetStringLength( STRING s )
{
    if(!s)
        PrintErrorMessage(FALSE, "GetStringLength: Illegal string parameter(s).\n");
    return strlen(s);
}

char GetIthChar(STRING s, unsigned int pos)
{
    unsigned int _n;
    if(!s)
        PrintErrorMessage(FALSE, "GetIthChar: Illegal string parameter(s).\n");
    _n = strlen(s);
    if(pos >= _n)
        PrintErrorMessage(FALSE, "GetIthChar: Index %d out of range.\n", pos );
    else
        return s[pos];
}

STRING GetSubString( STRING s, unsigned int pos, unsigned int n )
{
    unsigned int _n;
    if(!s)
        PrintErrorMessage(FALSE, "GetSubString: Illegal string parameter.\n");
    _n = strlen( s );
    if( pos >= _n )
        PrintErrorMessage(FALSE, "GetSubString: Index %d out of range.\n", pos );
    else
    {
        unsigned int _m = n < _n - pos ? n : _n - pos;
        STRING _s = CreateObject( char, _m + 1 );
        unsigned int _i;
        for( _i = 0; _i < _m; _i++ )
            _s[_i] = s[pos + _i];
        _s[_m] = '\0';
        return _s;
    }
}

STRING TransformStringIntoUpperCase(STRING s)
{
    unsigned int _n, _i = 0;
    if(!s)
        PrintErrorMessage(FALSE, "TransformStringIntoUpperCase: Illegal string parameter.\n");
    _n = strlen(s);
    for(_i=0; _i<_n; _i++)
        s[_i] = toupper(s[_i]);
    return s;
}


STRING TransformStringIntoLowerCase(STRING s)
{
    unsigned int _n, _i = 0;
    if(!s)
        PrintErrorMessage(FALSE, "TransformStringIntoLowerCase: Illegal string parameter.\n");
    _n = strlen(s);
    for(_i=0; _i<_n; _i++)
        s[_i] = tolower(s[_i]);
    return s;
}

STRING TransformCharIntoString( char c )
{
    STRING _s = CreateObject( char, 2 );
    _s[0] = c;
    _s[1] = '\0';
    return _s;
}

STRING TransformIntegerIntoString( int n )
{
    char _s[BUFSIZ];
    sprintf( _s, "%d", n );
    return DuplicateString(_s);
}

int TransformStringIntoInteger( STRING s )
{
    int _n;
    char _junk;
    if(!s)
        PrintErrorMessage(FALSE, "TransformStringIntoInteger: Illegal string parameter.\n");
    if( sscanf( s, " %d %c", &_n, &_junk ) != 1 )
        PrintErrorMessage(FALSE, "TransformStringIntoInteger: %s is not a number.\n", s );
    return _n;
}

STRING TransformRealIntoString( double d )
{
    char _s[BUFSIZ];
    sprintf( _s, "%G", d );
    return DuplicateString(_s);
}

double TransformStringIntoReal( STRING s )
{
    double _d;
    char _junk;
    if(!s)
        PrintErrorMessage(FALSE, "TransformStringIntoReal: Illegal string parameter.\n");
    if( sscanf( s, " %lg %c", &_d, &_junk ) != 1 )
        PrintErrorMessage(FALSE, "TransformStringIntoReal: %s is not a real number.\n", s );
    return _d;
}

unsigned int FindCharFirst( char key, STRING s )
{
    unsigned int _i;
    if(!s)
        PrintErrorMessage(FALSE, "FindCharFirst: Illegal string parameter.\n");
    for( _i = 0; s[_i] != '\0'; _i++ )
    {
        if( s[_i] == key )
            return _i;
    }
    return inexistent_index;
}

unsigned int FindCharNext( char key, STRING s, unsigned int pos )
{
    unsigned int _i;
    if(!s)
        PrintErrorMessage(FALSE, "FindCharNext: Illegal string parameter.\n");
    if( pos >= strlen(s) )
        return inexistent_index;
    for( _i = pos; s[_i] != '\0'; _i++ )
    {
        if( s[_i] == key )
            return _i;
    }
    return inexistent_index;
}

unsigned int FindSubStringFirst( STRING key, STRING s )
{
    STRING _s;
    if( !s || !key )
        PrintErrorMessage(FALSE, "FindSubStringFirst: Illegal string parameter.\n");
    _s = strstr( s, key );
    if( !_s )
        return inexistent_index;
    else
        return _s - s;
}

unsigned int FindSubStringNext( STRING key, STRING s, unsigned int pos )
{
    STRING _s;
    if( !s || !key )
        PrintErrorMessage(FALSE, "FindSubStringNext: Illegal string parameter.\n");
    if( pos >= strlen(s) )
        return inexistent_index;
    _s = strstr( s + pos, key );
    if( !_s )
        return inexistent_index;
    else
        return _s - s;
}
```

`zyrandom.h`
```cpp
#ifndef __ZYRANDOM__
#define __ZYRANDOM__

#ifndef __ZYLIB__
#include "zylib.h"
#endif



/*****************************************************************************/
/*  随机数功能  */
/*****************************************************************************/

/*
   函数名称：Randomize
   函数功能：初始化伪随机数发生器
   参    数：无
   返 回 值：无
   使用说明：在每次程序执行前，调用此函数初始化伪随机数库。注意，此函数只应执行一次
   */
void Randomize();

/*
   函数名称：GenerateRandomNumber
   函数功能：随机生成介于low和high之间（闭区间）的整数
   参    数：low和high分别表示区间下界和上界；确保low不大于high，否则程序终止执行
   返 回 值：伪随机数
   */
int GenerateRandomNumber(int low, int high);

/*
   函数名称：GenerateRandomReal
   函数功能：随机生成介于low和high之间（闭区间）的浮点数
   参    数：low和high分别表示区间下界和上界；确保low不大于high，否则程序终止执行
   返 回 值：伪随机数
   */
double GenerateRandomReal(double low, double high);


#endif
```

`zyrandom.cpp`
```cpp
#include <stdlib.h>
#include <time.h>

#ifndef __ZYRANDOM__
#include "zyrandom.h"
#endif

#ifndef __ZYLIB__
#include "zylib.h"
#endif



/*****************************************************************************/
/*  随机数功能  */
/*****************************************************************************/

void Randomize()
{
    srand((int)time(NULL));
}

int GenerateRandomNumber(int low, int high)
{
    double _d;
    if( low > high )
        PrintErrorMessage( FALSE, "GenerateRandomNumber: Make sure low <= high.\n" );
    _d = (double)rand() / ((double)RAND_MAX + 1.0);
    return (low + (int)(_d * (high - low + 1)));
}

double GenerateRandomReal(double low, double high)
{
    double _d;
    if( low > high )
        PrintErrorMessage( FALSE, "GenerateRandomReal: Make sure low <= high.\n" );
    _d = (double)rand() / ((double)RAND_MAX + 1.0);
    return (low + _d * (high - low));
}
```


