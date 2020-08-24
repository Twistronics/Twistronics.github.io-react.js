---
title: "Compiler (2)：语义分析"
date: "2015-10-04T13:15:30Z"
description: "能够成功建立语法树只说明了所输入的 Decaf 源程序在格式上是合法的，但是要进行有效的翻译，编译器还需要了解这个程序每个语句的含义。了解程序含义的过程称为语义分析。"
tags:
  - "Java"
  - "Compiler"
  - "YACC"
  - "LEX"
---

能够成功建立语法树只说明了所输入的 Decaf 源程序在格式上是合法的，但是要进行
有效的翻译，编译器还需要了解这个程序每个语句的含义。了解程序含义的过程称为语义分
析。

考虑下面程序片断：
```cpp
int str;
str = "abc";
```
这个程序是符合 Decaf 语法的，可以通过检查并建立语法树，但这段程序显然是不正确的。

我们把语义分析过程分为两个内容：分析符号含义和检查语义正确性。分
析符号含义是指对于表达式中所出现的符号，要找出这个符号所代表的内容，这个工作主要通过检索符号表实现。检查语义正确性指的是要检查每个表达式的操作数是否符合要求，也
就是说这个表达式是否是语言规范中所规定的合法的表达式。由于不合法的语句具体含义在
语言规范中没有规定，从而使得编译器没法明确这些语句的确切含义，所以检查语义的正确
性是很有必要的。

如果一个程序成功通过语义分析，则说明这个程序的含义对于编译器来说是明确的，从而翻译工作才能得以进行。


### 语义分析
语义分析，顾名思义是执行一系列关于程序语义的处理，并明确程序的含义，例如把引
用到的标识符和具体的符号关联、分辨所使用的语言规则等等。语义分析的目标是尽可能深
入地了解源程序的语义，并利用这些信息进行后面的工作（例如优化）。语义分析一般沿着
语法树结构进行，并借助属性文法来开展，这种由语法树结构指导处理的做法称为“语法驱
动”。所谓属性文法，就是给每个语法符号绑定一系列的属性后形成的扩展文法，这种文法
有利于进行语法驱动的语义分析。关于属性文法的具体说明请参考本文档后面的部分。

语法驱动的语义分析过程是以遍历语法树的方式进行的，有两种主要的遍历方式：
1. 语义分析和建立语法树同时进行，并且分析顺序与语法树建立顺序一致。这种方式的优
点是编写的总代码量比较少，分析速度快，而且语法分析、语义分析和中间代码翻译是
同时进行的；但是它的缺点在于语义分析能够利用的信息严重受限于语法分析的顺序，
通常要求所引用的所有符号都必须在前面已经声明，而且实现的时候逻辑容易混乱。采
用这种方式进行语义分析的话通常都只语法符号的综合属性，属性传递方向都是自下而
上。
2. 首先建立 AST，然后再通过一次或多次的遍历 AST（可能有回溯）来进行语义值传递、
语义错误检测等。这种方式的优点是功能强大，能够尽最大可能提取源程序的语义信息，
而且其逻辑简单，遍历语法树的代码不需要额外的专业基础也能轻易编写，因此被不少
现代的编译器例如 GCC 等采用。但它也有明显的缺点：编码量相对较大，而且由于采用
多趟遍历语法树，编译过程的时间开销也随之增大，然而这些缺点在现在一般不是大家
重点关心的地方。另外，采用这种方式进行语义分析的时候往往同时采用继承属性和综
合属性。

### 属性文法
所谓属性文法，即“带属性的文法”。属性文法是指这样扩展以后的上下文无关文法：

为每种语法符号关联一个可能为空的属性集合。这样做的意义在于通过这些属性，我们可以
在遍历语法树的时候在某些结点中记录下一些计算结果，供子结点或者父结点的计算过程使
用，甚至还可以供以后再次经过该结点的计算过程使用。由于语法树结点和语法符号是相对
应的，下面为了便于理解起见，也把一个语法树结点对应的语法符号的属性称为该语法树结
点的属性。

一个语法树结点的属性一般分为两类，一类是它的值是只根据这个结点的子节点的属性
值计算得到的，这种属性称为“综合属性”；另一类是计算它的值的时候还需要用到父结点
或者兄弟节点的属性值的，这样的属性称为“继承属性”。在自底向上的语法树遍历过程中
一般只使用综合属性；在自顶向下的语法树遍历过程中通常需要使用继承属性。


### 符号表组织
符号表的作用是管理符号信息，其主要目的是为符号信息的存储和访问提供一种高效、
方便的途径。一个符号依据不同的场合可能有多种不同的属性，但是一般来说都具备两种基
本属性：符号的名字、符号有效的作用域。

为了高效地从符号名字找出对应的符号实体，一般采用哈希表或者平衡二叉树（例如红
黑树）又或者 trie 这样的数据结构来组织单个符号表。

符号的作用域信息用于帮助在同名的符号中找出当前有效的符号，也用于判断作用域错
误。所谓的作用域是说一个符号在源程序中的有效范围。按照记录作用域信息的不同方法，
符号表有两种组织方式：

1、单表形式

所有的标识符都记录在同一个符号表中，同时为每个记录添加一个作用域属性来标记该
记录对应的标识符所声明的作用域层次。作用域的层次是用一个计数器来记录的，每进入一
个新的作用域，计数器就增 1；每退出一个作用域，计数器就减 1。利用哈希表实现单表结
构的符号表时，同名的标识符按照作用域层号递减的顺序记录在同一个桶对应的链表中。这
样在访问一个标识符时，从哈希表中找到的第一个表项就是最靠近内层的作用域中声明的标
识符。这种结构的最大开销在于每退出一层作用域时，都需要遍历整个符号表以删除该作用
域中声明的所有标识符表项。

2、多级符号表

为每个作用域单独建立一个符号表，仅记录当前作用域中声明的标识符。同时建立一个
栈来管理整个程序的作用域：每打开一个作用域，就把该作用域压入栈中；每关闭一个作用
域，就从栈顶弹出该作用域。这样，这个作用域栈中就记录着当前所有打开的作用域的信息，
栈顶元素就是当前最内层的作用域。查找一个变量时，按照自顶向下的顺序查找栈中各作用
域的符号表，最先找到的就是最靠近内层的变量。这样处理的不利之处在于，查找外层变量
的时间开销会变大。但这样组织的符号表实现起来比较简单，并且一般来说，作用域嵌套的
层次不会太深，另外程序访问当前作用域中变量的概率总是大一些。


### 实现

在`/src/decaf/tree/Tree.java`中

```java
        public void visitPostInc(PostInc that)	{
        	visitTree(that);
        }
        
        public void visitPreInc(PreInc that)	{
        	visitTree(that);
        }
        
        public void visitPostDec(PostDec that)	{
        	visitTree(that);
        }
        
        public void visitPreDec(PreDec that)	{
        	visitTree(that);
        }
        
        public void visitCondExpr(CondExpr that)	{
        	visitTree(that);
        }
        
        public void visitNuminstances(Numinstances that)	{
        	visitTree(that);
        }
        
        public void visitGuarded(Guarded that)	{
        	visitTree(that);
        }
        
        public void visitGuardedIf(GuardedIf that)	{
        	visitTree(that);
        }
        
        public void visitGuardedDo(GuardedDo that)	{
        	visitTree(that);
        }
```

`/src/typecheck/BuildSym.java`
```java
	@Override
	public void visitGuardedIf(Tree.GuardedIf ifStmt) {
		ifStmt.guard.accept(this);
	}

	@Override
	public void visitGuardedDo(Tree.GuardedDo doStmt) {
		doStmt.guard.accept(this);
	}
	
	@Override
	public void visitGuarded(Tree.Guarded guarded)	{
		if(guarded.preguarded != null)	{
			guarded.preguarded.accept(this);
		}
		guarded.stmt.accept(this);
	}
```

`/src/error/IncompatCondOpError.java`
```java
package decaf.error;

import decaf.Location;

/**
 * example：incompatible operands: int and bool
 * PA2
 */
public class IncompatCondOpError extends DecafError {

	private String left;

	private String right;

	private String op;

	public IncompatCondOpError(Location location, String left, String op,
			String right) {
		super(location);
		this.left = left;
		this.right = right;
		this.op = op;
	}

	@Override
	protected String getErrMsg() {
		return "incompatible condition operates: " + left + " " + op + " " + right;
	}

}
```


`/src/typecheck/TypeCheck.java`
```java
import decaf.error.IncompatCondOpError;

/* ... */

	@Override
	public void visitPostInc(Tree.PostInc expr)	{
		expr.ident.accept(this);
		if (expr.ident.type.equal(BaseType.ERROR)
				|| expr.ident.type.equal(BaseType.INT)) {
			expr.type = expr.ident.type;
		} else {
			issueError(new IncompatUnOpError(expr.getLocation(), "++",
					expr.ident.type.toString()));
			expr.type = BaseType.ERROR;
		}		
	}
	
	@Override
	public void visitPreInc(Tree.PreInc expr)	{
		expr.ident.accept(this);
		if (expr.ident.type.equal(BaseType.ERROR)
				|| expr.ident.type.equal(BaseType.INT)) {
			expr.type = expr.ident.type;
		} else {
			issueError(new IncompatUnOpError(expr.getLocation(), "++",
					expr.ident.type.toString()));
			expr.type = BaseType.ERROR;
		}			
	}
	
	@Override
	public void visitPostDec(Tree.PostDec expr)	{
		expr.ident.accept(this);
		if (expr.ident.type.equal(BaseType.ERROR)
				|| expr.ident.type.equal(BaseType.INT)) {
			expr.type = expr.ident.type;
		} else {
			issueError(new IncompatUnOpError(expr.getLocation(), "--",
					expr.ident.type.toString()));
			expr.type = BaseType.ERROR;
		}			
	}

	@Override
	public void visitPreDec(Tree.PreDec expr)	{
		expr.ident.accept(this);
		if (expr.ident.type.equal(BaseType.ERROR)
				|| expr.ident.type.equal(BaseType.INT)) {
			expr.type = expr.ident.type;
		} else {
			issueError(new IncompatUnOpError(expr.getLocation(), "--",
					expr.ident.type.toString()));
			expr.type = BaseType.ERROR;
		}			
	}
	
	@Override
	public void visitCondExpr(Tree.CondExpr condExpr)	{
		checkTestExpr(condExpr.condition);	
		condExpr.left.accept(this);
		condExpr.right.accept(this);
		if(condExpr.left.type.equal(condExpr.right.type))	{
			if(condExpr.left.type.equal(BaseType.ERROR)
					|| condExpr.right.type.equal(BaseType.ERROR)
					|| condExpr.condition.type.equal(BaseType.ERROR))	{
				condExpr.type = BaseType.ERROR;
			} else {
				condExpr.type = condExpr.left.type;
			} 
		} else {
			condExpr.type = BaseType.ERROR;
			issueError(new IncompatCondOpError(condExpr.getLocation(),
					condExpr.left.type.toString(), "and", condExpr.right.type.toString()));
		}
	}
	
	@Override
	public void visitNuminstances(Tree.Numinstances numinstances) {
		Class c = table.lookupClass(numinstances.name);
		if (c == null) {
			issueError(new ClassNotFoundError(numinstances.getLocation(),
					numinstances.name));
			numinstances.type = BaseType.ERROR;
		} else {
			numinstances.type = BaseType.INT;
		}
	}
	
	@Override
	public void visitGuardedDo(Tree.GuardedDo doStmt) {
		breaks.add(doStmt);
		doStmt.guard.accept(this);
		breaks.pop();

	}	
	
	@Override
	public void visitGuardedIf(Tree.GuardedIf ifStmt) {
		ifStmt.guard.accept(this);
	}
	
	@Override
	public void visitGuarded(Tree.Guarded guard) {
		if(guard.preguarded != null)	{
			guard.preguarded.accept(this);
		}
		
		checkTestExpr(guard.boolexpr);
		guard.stmt.accept(this);
	}
```
