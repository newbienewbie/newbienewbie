---
layout: post
title: crowbar源码阅读笔记(4):语句构建
date: 2017-08-20 09:48:58
tags:
- 编译原理
- 自制编程语言
- crowbar
categories:
- 大道
- 编译原理
- 自制编程语言
---

这是《自制编程语言》一书中的脚本语言`crowbar`的源码阅读笔记(4):语句构建


## 语句、语句表、与语句块的结构表示

如[《crowbar源码阅读笔记(1):基本的数据结构》](/2017/08/18/Boulevard/Compiler/自制编程语言/crowbar源码阅读笔记%281%29)中所述，**语句** 、**语句表** 、**语句块** 可以抽象为：
```c
struct Statement_tag {
    StatementType       type;
    int                 line_number;
    union {
        Expression      *expression_s;
        GlobalStatement global_s;
        IfStatement     if_s;
        WhileStatement  while_s;
        ForStatement    for_s;
        ReturnStatement return_s;
    } u;
};

typedef struct StatementList_tag {
    Statement   *statement;
    struct StatementList_tag    *next;
} StatementList;

typedef struct {
    StatementList       *statement_list;
} Block;
```
<!-- more -->

## 语句、语句链表、与语句块的构建机理

和创建表达式类似，创建语句的时候，也需要申请在内存中开辟一段空间：
```c
static Statement * alloc_statement(StatementType type)
{
    Statement *st;
    st = crb_malloc(sizeof(Statement));
    st->type = type;
    st->line_number = crb_get_current_interpreter()->current_line_number;
    return st;
}
```
开辟内存之后，再在其中填充`Statement`结构成员(类型、行号)；最后针对要创建的具体语句类型，填充`u`成员的特定字段。


语句表是用链表实现的，每个节点都包含一个`statement`成员指向相应语句和一个`next`成员指向下一个节点。故创建一个语句表的实现即为申请分配一个`StatementList`结构体大小的内存空间，然后将其`statement`成员初始化为指定的语句指针即可：
```c
StatementList * crb_create_statement_list(Statement *statement)
{
    StatementList *sl;
    /* 申请开辟一段内存 */
    sl = crb_malloc(sizeof(StatementList));
    
    /* 设置语句链表的第一个节点为指定的语句 */
    sl->statement = statement;
    /* 把下一个节点初始化为NULL */
    sl->next = NULL;

    return sl;
}
```

仅仅能创建语句链表还不够方便，我们还需要随时可以给某个链表添加语句的功能，与新增变量会放到相关环境中第一个节点不同，新增的语句会作为最后一个节点追加到指定语句链表上：
```c
StatementList * crb_chain_statement_list(StatementList *list, Statement *statement)
{
    StatementList *pos;

    if (list == NULL)
        return crb_create_statement_list(statement);

    /* 跳到链表的最后一个节点 */
    for (pos = list; pos->next; pos = pos->next)
        ;
    /* 追加新的语句 */
    pos->next = crb_create_statement_list(statement);

    return list;
}
```

构建语句块的过程也要先申请开辟内存，然后填充`Block`结构——把`statement_list`成员指向相关的语句表即可：
```c
Block * crb_create_block(StatementList *statement_list)
{
    Block *block;

    block = crb_malloc(sizeof(Block));
    block->statement_list = statement_list;

    return block;
}
```

## 与关键字相关的语句创建

### 分支判断语句创建

`crowbar`语言所支持的`if`语句的语法格式类似于：
```ruby
# condition
if(condition)
# then block
{
}
# elsif list
elsif(){
    # ...
}
# else block
else{
    # ...
}
```

所以创建`if`语句的实现思路为先申请开辟一段内存存放`Statement`结构体，然后填充`u`成员`if_s`的相关字段:
```c
Statement * crb_create_if_statement(Expression *condition, Block *then_block, Elsif *elsif_list, Block *else_block)
{
    Statement *st;
    st = alloc_statement(IF_STATEMENT);

    st->u.if_s.condition = condition;
    st->u.if_s.then_block = then_block;
    st->u.if_s.elsif_list = elsif_list;
    st->u.if_s.else_block = else_block;

    return st;
}
```

### 循环语句创建：

`crowbar`语言支持`while`语句，其语法类似于：
```ruby
while(condition)
{
    # block 
}
```

创建`while`语句的实现为先申请开辟一段内存存放`Statement`结构体，然后填充`u`成员`while_s`的相关字段：
```c
Statement * crb_create_while_statement(Expression *condition, Block *block)
{
    Statement *st;
    st = alloc_statement(WHILE_STATEMENT);

    st->u.while_s.condition = condition;
    st->u.while_s.block = block;

    return st;
}
```

创建`for`循环语句与之类似：
```
Statement * crb_create_for_statement(Expression *init, Expression *cond, Expression *post, Block *block)
{
    Statement *st;
    st = alloc_statement(FOR_STATEMENT);

    st->u.for_s.init = init;
    st->u.for_s.condition = cond;
    st->u.for_s.post = post;
    st->u.for_s.block = block;

    return st;
}
```

与循环相关的还有`break`和`continue`语句。由于不涉及其他信息，其实现非常简单，并不填充`Statement`的`u`字段：
```c
Statement *crb_create_break_statement(void)
{
    return alloc_statement(BREAK_STATEMENT);
}

Statement *crb_create_continue_statement(void)
{
    return alloc_statement(CONTINUE_STATEMENT);
}
```


###  `return`语句

创建`return`语句：
```c
Statement * crb_create_return_statement(Expression *expression)
{
    Statement *st;
    st = alloc_statement(RETURN_STATEMENT);

    st->u.return_s.return_value = expression;

    return st;
}
```

## 其他语句

这类结构较为简单。

### 表达式语句的创建

```c
Statement * crb_create_expression_statement(Expression *expression)
{
    Statement *st;
    st = alloc_statement(EXPRESSION_STATEMENT);

    st->u.expression_s = expression;

    return st;
}
```

### 全局语句的创建

```c
Statement * crb_create_global_statement(IdentifierList *identifier_list)
{
    Statement *st;

    st = alloc_statement(GLOBAL_STATEMENT);
    st->u.global_s.identifier_list = identifier_list;

    return st;
}
```
