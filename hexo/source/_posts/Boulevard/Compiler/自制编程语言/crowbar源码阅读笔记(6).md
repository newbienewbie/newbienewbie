---
layout: post
title: crowbar源码阅读笔记(6):语句执行
date: 2017-08-20 14:01:08
tags:
- 编译原理
- 自制编程语言
- crowbar
categories:
- 大道
- 编译原理
- 自制编程语言
---

这是《自制编程语言》一书中的脚本语言`crowbar`的源码阅读笔记(6):语句执行。语句执行的实现代码主要存放于文件`execute.c`中。

## 语句执行总体框架

### 单语句执行

运行单个语句，则和表达式求值的思路一样，要区分具体的语句类型，然后执行不同的策略，最后返回语句执行结果(`StatementResult`类型对象)：
```c
static StatementResult execute_statement(CRB_Interpreter *inter, LocalEnvironment *env, Statement *statement)
{
    StatementResult result;

    result.type = NORMAL_STATEMENT_RESULT;

    switch (statement->type) {
    case EXPRESSION_STATEMENT:
        result = execute_expression_statement(inter, env, statement);
        break;
    case GLOBAL_STATEMENT:
        result = execute_global_statement(inter, env, statement);
        break;
    case IF_STATEMENT:
        result = execute_if_statement(inter, env, statement);
        break;
    case WHILE_STATEMENT:
        result = execute_while_statement(inter, env, statement);
        break;
    case FOR_STATEMENT:
        result = execute_for_statement(inter, env, statement);
        break;
    case RETURN_STATEMENT:
        result = execute_return_statement(inter, env, statement);
        break;
    case BREAK_STATEMENT:
        result = execute_break_statement(inter, env, statement);
        break;
    case CONTINUE_STATEMENT:
        result = execute_continue_statement(inter, env, statement);
        break;
    case STATEMENT_TYPE_COUNT_PLUS_1:   /* FALLTHRU */
    default:
        DBG_panic(("bad case...%d", statement->type));
    }

    return result;
}
```
<!-- more -->

不同语句有不同的执行结果，语句执行结果抽象为一个结构体
```c
typedef struct {
    StatementResultType type;
    union {
        CRB_Value       return_value;
    } u;
} StatementResult;
```
语句的执行结果有不同类型，可以分为:
* `NORMAL_STATEMENT_RESULT`：常规语句执行
* `RETURN_STATEMENT_RESULT`: 返回语句执行
* `BREAK_STATEMENT_RESULT` : `break`语句执行
* `CONTINUE_STATEMENT_RESULT`: `continue`语句执行
* `STATEMENT_RESULT_TYPE_COUNT_PLUS_1`: 

其中，`RETURN_STATEMENT_RESULT`、`BREAK_STATEMENT_RESULT`标识了将要中断循环；而`CONTINUE_STATEMENT_RESULT`则表示要循环体语句的执行`crb_execute_statement_list()`将要被中断。

语句执行后的结果值用联合`u`表示，目前只有个表示返回值的`return_value`字段，这是一个`CRB_Value`型结构，可以统一表达各种类型的返回值。

### 语句链表的执行

语句链表的执行，是依次执行语句并检查执行结果：
```c
StatementResult crb_execute_statement_list(CRB_Interpreter *inter, LocalEnvironment *env, StatementList *list)
{
    StatementList *pos;
    StatementResult result;

    result.type = NORMAL_STATEMENT_RESULT;
    for (pos = list; pos; pos = pos->next) {
        result = execute_statement(inter, env, pos->statement);
        if (result.type != NORMAL_STATEMENT_RESULT)
            goto FUNC_END;
    }

  FUNC_END:
    return result;
}
```

## 表达式语句

表达式类型的语句执行非常简单，就是对相应的表达式进行求值：
```c
static StatementResult execute_expression_statement(CRB_Interpreter *inter, LocalEnvironment *env, Statement *statement)
{
    StatementResult result;
    CRB_Value v;

    result.type = NORMAL_STATEMENT_RESULT;

    v = crb_eval_expression(inter, env, statement->u.expression_s);
    if (v.type == CRB_STRING_VALUE) {
        crb_release_string(v.u.string_value);
    }

    return result;
}
```

表达式语句不设置语句返回值，只是填充`type`为`NORMAL_STATEMENT_RESULT`。比如：
```js
v1=3+4*2;
```
这是一个 **赋值表达式** 构成的语句。赋值表达式求值会计算等号右边的值，然后赋给`v1`标识符对应的变量。最后当这个语句执行完毕后返回一个执行结果。
注意，该语句结果并不包含表达式的值，只告诉解释器，该语句执行完毕后是一个`NORMAL_STATEMENT_RESULT`。


## 与关键字相关的语句

### `return` 语句执行

`return`语句的执行本身比较简单，最后也是返回一个语句执行结果，该结果的`type`字段为`RETURN_STATEMENT_RESULT`，而具体的执行值在`u.return_value`字段中填充：
* 如果后面跟着一个表达式，则对表达式进行求值，然后填充至结果的`u.return_value`字段。
* 否则，设置`u.return_value.type`为`CRB_NULL_VALUE`。

```c
static StatementResult execute_return_statement(CRB_Interpreter *inter, LocalEnvironment *env, Statement *statement)
{
    StatementResult result;
    result.type = RETURN_STATEMENT_RESULT;

    if (statement->u.return_s.return_value) {
        result.u.return_value = crb_eval_expression(inter, env, statement->u.return_s.return_value);
    } else {
        result.u.return_value.type = CRB_NULL_VALUE;
    }

    return result;
}
```

### `for` 循环语句执行

一个完整的`for`语句可以拆分4个部分，即`init`、`condition`、 `post`、`block` ：
```c
for(init;condition;post)
    block
```
 
具体执行过程是：
1. 先对`init`部分的表达式进行求值，
2. 然后检测是否达到终止条件，
3. 如果未达到，则执行`for`语句块。
4. 如果执行结果满足`return`、`break`这类跳出条件的，则终止循环。
5. 如果需要继续，则执行`post`相关表达式
6. 最后开始下一次循环。

```c
static StatementResult execute_for_statement(CRB_Interpreter *inter, LocalEnvironment *env, Statement *statement)
{
    StatementResult result;
    CRB_Value   cond;

    result.type = NORMAL_STATEMENT_RESULT;

    /* 对for循环的init表达式求值 */
    if (statement->u.for_s.init) {
        crb_eval_expression(inter, env, statement->u.for_s.init);
    }
    for (;;) {
        /* 检测是否满足for循环的condition */
        if (statement->u.for_s.condition) {
            cond = crb_eval_expression(inter, env, statement->u.for_s.condition);
            if (cond.type != CRB_BOOLEAN_VALUE) {
                crb_runtime_error(statement->u.for_s.condition->line_number, NOT_BOOLEAN_TYPE_ERR, MESSAGE_ARGUMENT_END);
            }
            DBG_assert(cond.type == CRB_BOOLEAN_VALUE, ("cond.type..%d", cond.type));
            if (!cond.u.boolean_value)
                break;
        }
        /* 执行for循环的循环体block */
        result = crb_execute_statement_list(inter, env, statement->u.for_s.block ->statement_list);

        /* 检测是否需要返回 */
        if (result.type == RETURN_STATEMENT_RESULT) {
            break;
        }
        /* 检测是否需要中断循环 */
        else if (result.type == BREAK_STATEMENT_RESULT) {
            result.type = NORMAL_STATEMENT_RESULT;
            break;
        }

        /* 对for循环的post表达式求值 */
        if (statement->u.for_s.post) {
            crb_eval_expression(inter, env, statement->u.for_s.post);
        }
    }

    return result;
}
```

## 其他语句

其他语句与上述语句类似，不再赘述。
