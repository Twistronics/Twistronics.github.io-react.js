---
title: "动态存储管理机制"
date: "2014-03-20T11:15:30Z"
description: "重载 new 和 delete 操作符，基于伙伴系统（buddy system），创建自己的内存管理机制。"
tags: 
  - "C/C++"
---

动态存储结构的最大缺陷在于所申请的内存在使用完毕后经常不会合理释放，以及容易造成指针访问错误。这里面有程序员的原因（很多程序员对指针使用方法一知半解，该释放时不知道释放，不该释放时却盲目释放），也有系统的原因（像广义表这样的数据结构很难确定内存释放的时机）。此时，设计一类灵活的动态内存策略就是非常有必要的了。

作为一般原则，可以在程序开始时分配一片足够大的存储空间，并使用 pool 指针指向它。
其后所有内存分配都使用重载的 new 操作符在 pool 指向的存储空间中进行，即将 pool 指向
的存储空间作为后续存储管理的存储池。

所谓存储池（storage pool），是指一片连续的存储区，其中包括多个连续的、不相交的、
更小的、可进一步分配的存储区，它可用来管理动态内存分配，即系统一次分配整个存储池
的存储空间，而将进一步的存储分配保留在存储池中进行。存储池保存在进程地址空间中的
某个位置，通过使用特殊方法创生数据对象，程序就有可能在某个固定的存储池中为该对象
分配大小合适的存储空间，当释放该存储空间时再将其返回给存储池。

这种创生数据对象的特殊方法就是 new 操作符的第三种使用形式——定位创生表达式
（placement new expression）。该形式的 operator new() 函数原型为：
```cpp
void* operator new( std::size_t size, void* p );
```
调用方法为：
```cpp
char* base_addr = new char[4096]; // 分配 4096 个字节的存储空间
int* p = new(base_addr) int(16); // 在该存储空间中分配整数匿名数据对象
```
带有定位参数的 new 操作符不会在堆中分配存储空间，它只是使用后面的初始体（如果
存在）初始化已分配好的堆存储空间（由参数 base_addr 指定），函数的返回值是转型后的基
地址值 base_addr。

定位创生表达式在 base_addr 处只能“分配”单个匿名数据对象，两次分配只以最后一次
为准。例如对于下述代码，p、q 均指向 base_addr，因而只有最后一个匿名数据对象有效：
```cpp
using namespace std;
char* base_addr = new char[4096];
int* p ＝ new(base_addr) int(16);
cout << hex << showbase << setw(8) << int(p) << " " << dec << *p << endl;
int* q ＝ new(base_addr) int(32);
cout << hex << showbase << setw(8) << int(q) << " " << dec << *q << endl;
delete[] base_addr;
```
使用定位创生表达式创生的匿名数据对象不能使用 delete 操作符销毁。事实上，也没有
这样的 delete 操作符。

定位创生表达式的最大意义在于可用来设计一种应用程序独有的动态内存管理策略，以
部分解决标准内存管理策略下频繁分配小数据对象时的低效率问题（当然只有在应用程序独
有的动态内存管理策略好于标准内存管理策略时才有效）。

分析存储池可以发现，它至少应支持下述两个操作：
1. Acquire() 用于从存储池中获取内存并返回指向该内存的指针；此过程称为获取
（acquirement）或保留（reservation），并称该片存储空间已保留（reserved）。
2. Reclaim() 将某个指针指向的内存返回给存储池，此过程称为回收（reclaim）或释
放（liberation）；返回给存储池的存储空间仍维持空闲（free）。

注意，因为定位创生表达式只能在指定位置重新解释已分配的内存，所以简单使用定位
创生表达式不能完成 Acquire() 任务。为完成 Acquire() 与 Reclaim() 操作，必须重载 operator
new() 与 operator delete() 操作符函数。

技术上，operator new() 与 operator delete() 的重载相当特殊——既可以重载为全局操作
符函数，也可以重载为类的成员函数，部分编译器（Borland C++）甚至允许将它们重载到某
个独立的名空间。另外，operator new() 与 operator delete() 既可以重载为多参数版本，也可
以重载为单参数版本，后者将覆盖（override）全局 operator new() 与 operator delete() 操作符
函数。

重载的operator new() 与operator delete() 应与C++ 标准库中的形式相同或类似：operator
new() 必须接受一个 std::size_t 型式的参数以表示分配空间的大小，必须返回一个 void* 型式
的指针；operator delete() 必须接受一个 void* 型式的指针。例如，假设存在存储池 pool，则
可以这样重载 operator new() 与 operator delete() 操作符函数：
```cpp
void* operator new( std::size_t size, STORAGEPOOL* pool )
{
 return Acquire( pool, size );
}
void operator delete( void* ptr )
{
 Reclaim( ptr );
}
```

一旦实现了上述函数与 Acquire()、Reclaim() 函数，则可以在程序中使用下述代码在存储
池中进行内存分配：

```cpp
int* p = new(pool) int; // 假设 pool 指向的存储池数据对象已分配
delete p; // 使用完毕后通过 delete 操作符调用重载的 operator delete() 回收存储空间
```

其中，存储池 pool 表示进一步内存分配的源，通过重载的 operator new() 分配的所有内
存都从存储池 pool 中获得，通过重载的 operator delete() 释放的所有内存都返回给存储池
pool。当调用重载的 operator new() 时，程序显式给出了 pool 参数，该参数指示了从哪个存
储池获取 p 所指向的匿名数据对象的存储空间，然而在调用重载的 operator delete() 时却没有
指定将该片存储空间返回给哪个存储池。当程序中存在两个存储池时，上述程序代码就会导
致问题。

仔细研究存储管理策略，兼顾存储管理的效率与性能。实现存储管理策略为伙伴系统（buddy system）。

```makefile
a.out : main.cpp STORAGEPOOL.cpp STORAGEPOOL.h
	g++ -o a.out main.cpp STORAGEPOOL.cpp
```

`STORAGEPOOL.h`
```cpp

#ifndef __STORAGEPOOL_H__
#define __STORAGEPOOL_H__

#include<iostream>
#include<stdlib.h>
using namespace std;

class STORAGEPOOL;

struct BuddyNode  // 过于冗余，如果为了节省内存可以放到多个不同类节点中
{                 // 为了写起来方便，集成到一类节点中
    bool rdy;
    short log2size;
    void* data;
    STORAGEPOOL* pool;
    BuddyNode* parent;
    BuddyNode* buddy;
    BuddyNode* front;
    BuddyNode* next;
};




class STORAGEPOOL
{
    public:
        STORAGEPOOL(int);
        ~STORAGEPOOL();

        void* Acquire( int );
        void Reclaim( BuddyNode* );


        static int poolCount;
        char* name;

        static BuddyNode** buddysArray;
        static int buddysArraySize;
        static int buddysArrayCount;
        static BuddyNode* freeNodesList;   // 为了节省内存，用来存放回收的节点
        static int NodesCount;



    private:
        int size;  // 为log2(真实大小)
        void* dataPool;

        BuddyNode** SizeArray;  // 存放各个大小的节点的数组，最小节点为16字节


        // buddy system
        void split( BuddyNode* );
        bool merge( BuddyNode* ); // 不是直接合并，先判断后合并
        void join( BuddyNode* );
        void pop( BuddyNode* );

        // 对伙伴节点的静态存储池进行全局初始化
        void initBuddyNodes();
        void deleteBuddyNodes();

        // 操作静态存储池
        void increaseBuddysSize();
        void increaseBuddysArraySize();
        BuddyNode* newNodes();
        BuddyNode* initNodes( BuddyNode* );
        void freeNode( BuddyNode* );
        void freeAllNodes();

        // 工具函数
        int log2size( int );
        void initDataPool( void*, BuddyNode* );
        void* startAddr( void* );
};


#endif
```


`STORAGEPOOL.cpp`
```cpp
#include"STORAGEPOOL.h"


int STORAGEPOOL::poolCount = 0;

BuddyNode** STORAGEPOOL::buddysArray = NULL;
BuddyNode* STORAGEPOOL::freeNodesList = NULL;
int STORAGEPOOL::NodesCount = 0;
int STORAGEPOOL::buddysArraySize = 0;
int STORAGEPOOL::buddysArrayCount = 0;



STORAGEPOOL::STORAGEPOOL( int size_0 )
{
    if( poolCount == 0 )
        initBuddyNodes();
    poolCount++;

    if( size_0 < 16 )  size_0 = 16;  // 最小16字节
    dataPool = new char[size_0];

    size = log2size( size_0 ) - 1;
    SizeArray = new BuddyNode* [size - 3];

    for( int i = 0; i < size - 3; i++ )
        SizeArray[i] = NULL;

    char* tempPtr = (char*) dataPool;
    while( size_0 > 16 )
    {
        int tempSize = log2size( size_0 ) - 1;
        BuddyNode* node = newNodes();
        node->log2size = tempSize;
        node->data = tempPtr;
        SizeArray[ tempSize - 4 ] = node;
        initDataPool( tempPtr, node );

        tempPtr += ( 1 << tempSize );
        size_0 -= ( 1 << tempSize );
    }

}

STORAGEPOOL::~STORAGEPOOL()
{
    freeAllNodes();

    free( dataPool );
    free( SizeArray );

    poolCount--;
    if( poolCount == 0 )
        deleteBuddyNodes();

}

void* STORAGEPOOL::Acquire( int size_0 )  // 无法分配时返回NULL
{
    size_0 += 8; // 给返回指针留出空间
    int Count = log2size( size_0 ) - 4;
    if( size < Count + 4 ) return NULL;

    BuddyNode* node;
    if( SizeArray[Count] )
    {
        node = SizeArray[Count];
        pop( node );
    } else
    {
        int splitCount = Count + 1;
        while( splitCount <= size - 4 && ! SizeArray[splitCount] )
            splitCount++;

        if( splitCount > size - 4 ) return NULL;

        while( Count < splitCount ) {
            split( SizeArray[splitCount] );
            splitCount--;
        }
        node = SizeArray[Count];
    }

    pop( node );
    return startAddr( node );
}

void STORAGEPOOL::Reclaim( BuddyNode* node )
{
    node->rdy = true;
    join( node );
    int count = node->log2size - 4;
    while( count < size - 3 && merge( SizeArray[count] ))  // 可以使用惰性合并机制来进行优化
        count++;                                          // 为了写起来方便，这里直接合并
}

// buddy system
void STORAGEPOOL::split( BuddyNode* node )
{
    if( node->log2size <= 4 || ! node->rdy ) return;

    pop( node );

    BuddyNode* child_1 = newNodes();
    BuddyNode* child_2 = newNodes();

    child_1->parent = child_2->parent = node;
    child_1->buddy = child_2;
    child_2->buddy = child_1;

    child_1->log2size = child_2->log2size = node->log2size - 1;
    child_1->data = node->data;
    child_2->data = (void*) ((char*) node->data + (int)(1 << int(child_1->log2size)));
    initDataPool( child_1->data, child_1 );
    initDataPool( child_2->data, child_2 );


    join( child_1 );
    join( child_2 );
}

bool STORAGEPOOL::merge( BuddyNode* node )
{
    if( ! ( node->buddy && node->parent && node->buddy->rdy )) return false;

    BuddyNode* buddy = node->buddy;
    BuddyNode* parent = node->parent;
    parent->rdy = true;
    initDataPool( parent->data, parent );
    join( parent );

    pop( node );
    pop( buddy );
    freeNode( node );
    freeNode( buddy );
    return true;
}

void STORAGEPOOL::join( BuddyNode* node )
{
    int count = node->log2size - 4;
    if( SizeArray[count] ) {
        node->next = SizeArray[count];
        SizeArray[count]->front = node;
        SizeArray[count] = node;
    } else
        SizeArray[count] = node;

    node->front = NULL;
}

void STORAGEPOOL::pop( BuddyNode* node )
{
    node->rdy = false;
    if( node->next )
        node->next->front = node->front;

    if( node->front )
        node->front->next = node->next;
    else
        SizeArray[node->log2size - 4] = node->next;
}

//工具函数
int STORAGEPOOL::log2size( int size )
{
    int count = 4;
    size >>= 4;  // 最小返回4

    while( size ) {
        count++;
        size >>= 1;
    }

    return count;
}




// 对伙伴节点的静态存储池进行全局初始化
void STORAGEPOOL::initBuddyNodes()
{
    buddysArray = NULL;
    freeNodesList = NULL;

    buddysArray = new BuddyNode*[20];
    buddysArraySize = 20;// 初始有20容量
    buddysArrayCount = NodesCount = 0;

    increaseBuddysSize();
}

void STORAGEPOOL::deleteBuddyNodes()
{

    for( int i = 0; i < buddysArraySize; i++ )
        free( buddysArray[i] );

    free( buddysArray );

    buddysArray = NULL;
    freeNodesList = NULL;
}



// 操作静态存储池
void STORAGEPOOL::increaseBuddysSize()
{
    if( buddysArraySize <= ( buddysArrayCount + 2 ) )
        increaseBuddysArraySize();


    buddysArray[buddysArrayCount] = new BuddyNode[1 << (buddysArrayCount + 4)];
    buddysArrayCount++;
    NodesCount = 0;
}

void STORAGEPOOL::increaseBuddysArraySize()
{
    BuddyNode** temp = buddysArray;
    buddysArray = new BuddyNode*[buddysArraySize << 1];

    for( int i = 0; i < buddysArraySize; i++ )
        buddysArray[i] = temp[i];

    buddysArraySize <<= 1;
    free( temp );
}


BuddyNode* STORAGEPOOL::newNodes()
{
    if( freeNodesList )
    {
        BuddyNode* temp = freeNodesList;
        freeNodesList = freeNodesList->next;
        return initNodes( temp );
    }
    else
    {
        if( (1 << (buddysArrayCount + 3)) <= (NodesCount + 2 ))
            increaseBuddysSize();


        return initNodes( &buddysArray[buddysArrayCount - 1][NodesCount++] );
    }
}

BuddyNode* STORAGEPOOL::initNodes( BuddyNode* node )
{
    node->rdy = true;
    node->pool = this;
    node->data = node->parent = node->buddy = node->front = node->next = NULL;

    return node;
}

void STORAGEPOOL::freeNode( BuddyNode* node )
{
    node->next = freeNodesList;
    freeNodesList = node;
}

void STORAGEPOOL::freeAllNodes()
{
    for( int i = 0; i < size - 3; i++ ) {
        BuddyNode* now = SizeArray[i];
        while( now ) {
            BuddyNode* next = now->next;  // freeNode()会更改now->next，需要先保存
            freeNode( now );
            now = next;
        }
    }
}

inline void STORAGEPOOL::initDataPool( void* DataPool, BuddyNode* node )
{
    *(BuddyNode**)DataPool = node;
}
inline void* STORAGEPOOL::startAddr( void* DataAddr )
{
    return (void*) ((BuddyNode*) DataAddr + 1);
}
```

`main.cpp`
```cpp
#include"STORAGEPOOL.h"


inline void* Acquire( STORAGEPOOL* pool, size_t size )
{
    return pool->Acquire( size );
}

void Reclaim( void* ptr )
{
    BuddyNode* node = ((BuddyNode*) ptr ) - 1; //前一位保存伙伴节点的指针，若溢出则指针失效
    STORAGEPOOL* pool = node->pool;
    cout<<" delete in "<< pool->name <<endl;
    pool->Reclaim( node );
}

void* operator new[] ( size_t size, STORAGEPOOL* pool )
{
     cout<<" new[] in "<< pool->name <<endl;
     return Acquire( pool, size );
}

void* operator new( size_t size, STORAGEPOOL* pool )
{
    cout<<" new in "<< pool->name <<endl;
    return Acquire( pool, size );
}

void operator delete( void* ptr )
{
    Reclaim( ptr );
}


int main( int argv, char** argc )
{
    STORAGEPOOL pool_1( 2048 );
    STORAGEPOOL pool_2( 4096 );
    char name_1[] = "pool_1";
    char name_2[] = "pool_2";

    pool_1.name = name_1;
    pool_2.name = name_2;


    int* temp1 = new( &pool_1 ) int;
    double* temp2 = new( &pool_2 ) double;

    delete temp1;
    delete temp2;

    temp1 = new( &pool_1 ) int[40];
    temp2 = new( &pool_2 ) double[20];

    delete temp1;
    delete temp2;   // 在STORAGEPOOL中分配的空间,统一使用delete删除

    return 0;
}
```