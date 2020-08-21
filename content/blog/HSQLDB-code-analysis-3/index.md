---
title: "HSQLDB (3)：SQL查询处理过程"
date: "2016-03-21T13:15:30Z"
description: "对HSQLDB的SQL查询处理过程进行调试分析"
tags:
  - "Java"
  - "Database"
  - "SQL"
  - "数据库"
---

## 1)	QueryExpression、QuerySpecification 及 Statement 的结构分别是怎样的？ SQL 语句是如何用这些结构表示的？

开始查看QueryExpression的构造过程
![](img/1.png)
 
分析select语句的解析过程
![](img/2.png)
 
可以看出，先用XreadSelect函数解析select关键字对应的内容，再进入XreadTableExpression函数中用XreadFromClause函数解析from、XreadWhereGroupHaving函数解析where
 
![](img/3.png)

进入XreadSelect函数中，这里建立了一个新的QuerySpecification的中间结构，用XreadValueExpression读取值 

![](img/4.png)


将读取到的值插入到QuerySpecification的exprColumnList中，QuerySpecification中也存了一些其他信息，比如isDistinctSelect、rangeVariableList来存取是否有distinct关键字与变量列表
 
![](img/5.png)

遇到from或者into等其他关键字时，结束对select关键字对应值的读取
 
![](img/6.png)

继续使用上一步解析select之后的QuerySpecification实例，完善from和where相关信息
 
 ![](img/7.png)

QuerySpecification中的rangeVariableList用来存放解析from后的信息
 
![](img/8.png)

queryCondition用来存放解析where后的布尔表达式信息
 
![](img/9.png)


## 2)	SQL 语句中的查询条件是如何转化为关系代数树的？

开始解析where信息
 
![](img/10.png)

生成了ExpressionLogical构成的树结构
![](img/11.png) 


叶节点
 
![](img/12.png)

## 3)	表的连结运算是如何运行的？条件选择运算是如何实现的？

![](img/13.png)

开始进行条件判断
 
![](img/14.png)

比较当前列值与条件值

![](img/15.png)

判断相等条件
 
 ![](img/16.png)

## 4)	查询处理中是怎样利用索引来加快查询速度的？

![](img/17.png)
 
用AVL树进行检索
 
 ![](img/18.png)

 ![](img/19.png)

 ![](img/20.png)