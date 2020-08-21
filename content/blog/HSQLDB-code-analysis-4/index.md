---
title: "HSQLDB (4)：事务机制分析"
date: "2016-03-28T13:15:30Z"
description: "对HSQLDB的事务机制进行调试分析"
tags:
  - "Java"
  - "Database"
  - "SQL"
  - "数据库"
---



## 1)	HSQLDB 实现了哪几种隔离级别？

在文档中看到HSQLDB实现了two-phase-locking (2PL), multiversion concurrency control (MVCC) which is 2PL plus multiversion rows (MVLOCKS) 三种模式。有READ UNCOMMITTED、READ COMMITTED、REPEATABLE READ三种事务级别。



## 2)	在每一个事务中，数据操作时如何进行的？

![](img/1.png)
 
![](img/2.png)

开始事务
![](img/3.png)
 
加锁
![](img/4.png)

解锁
![](img/5.png)
 
提交
![](img/6.png)
![](img/7.png)
![](img/8.png)
 
 
可以看出，数据操作发生在commit时
![](img/9.png)
 
结束事务


## 3)	如何实现回滚和提交操作？

![](img/10.png)


 
开始回滚操作

 ![](img/11.png)

![](img/12.png)

 
把时间戳大于保存点的操作删除
![](img/13.png)
 
操作存储
![](img/14.png)
 
对于插入和更新操作，将索引移除

![](img/15.png)
 
开始commit

![](img/16.png)
 
结束事务

![](img/17.png)
 
把相应的数据存储

![](img/18.png)
 
解锁


## 4)	保存点是如何实现的？

![](img/19.png)
 
开始保存点操作


![](img/20.png)


 
保存点的名字存在表里

![](img/21.png)
 
保存时间戳
![](img/22.png)
 
开始回滚到保存点位置
![](img/23.png)
 
使用上面存的与保存点名字对应的索引

![](img/24.png)

 ![](img/25.png)
 
和上面回滚相同，将对应时间戳之后的动作删除并移除存储和索引




