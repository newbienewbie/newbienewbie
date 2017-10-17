---
title: crowbar源码阅读笔记(1):基本的数据结构
date: 2017-08-18 20:17:01
tags:
- 编译原理
- 自制编程语言
- crowbar
categories:
- 大道
- 编译原理
- 自制编程语言
---

这是《自制编程语言》一书中的脚本语言`crowbar`的源码阅读笔记(1):基本的数据结构。

`crowbar`语言由`C`语言编写，分为以下三个独立模块:

* `CRB`：`crowbar` 主程序
* `MEM`: 通用内存管理模块，源码位于`memory/`目录下
* `DBG`: 通用`Debug`模块，源码位于`debug/`目录下

## `CRB`解释器接口

`CRB.h`是解释器的接口文件：
```c
/* 创建解释器 */
CRB_Interpreter *CRB_create_interpreter(void);

/* 使用解释器编译文件 */
void CRB_compile(CRB_Interpreter *interpreter, FILE *fp);

/* 使用解释器解释 */
void CRB_interpret(CRB_Interpreter *interpreter);

/* 回收解释器 */
void CRB_dispose_interpreter(CRB_Interpreter *interpreter);
```

## `CRB`解释器扩展接口

为了扩展解释器，可以使用解释器的开发接口：`CRB_dev.h`。这个接口规定了`crowbar`这门语言的值类型和扩展接口。

<!-- more -->

### 值类型 

`crowbar`中可用的类型包括布尔型、整型、浮点型、字符串型、原生指针型、和空引用型：
```c
typedef enum {
    CRB_BOOLEAN_VALUE = 1,
    CRB_INT_VALUE,
    CRB_DOUBLE_VALUE,
    CRB_STRING_VALUE,
    CRB_NATIVE_POINTER_VALUE,
    CRB_NULL_VALUE
} CRB_ValueType;
```

`crowbar`中变量可以是其中任意一种类型，为了表示变量的值，可以把“值”定义为:
```c
typedef struct {
    CRB_ValueType       type;
    union {
        CRB_Boolean     boolean_value;
        int             int_value;
        double          double_value;
        CRB_String      *string_value;
        CRB_NativePointer       native_pointer;
    } u;
} CRB_Value;
```

### 扩展接口

要为这门语言开发功能，需要使用扩展接口，`CRB`提供了以下三个函数：

```c
/* 代表能返回 CRB_Value 的函数 */
typedef CRB_Value CRB_NativeFunctionProc(CRB_Interpreter *interpreter, int arg_count, CRB_Value *args);

/* 注册函数到解释器 */
void CRB_add_native_function(CRB_Interpreter *interpreter, char *name, CRB_NativeFunctionProc *proc);
/* 注册全局变量到解释器*/
void CRB_add_global_variable(CRB_Interpreter *inter, char *identifier, CRB_Value *value);
```

## `CRB` 解释器

`CRB`解释器相关定义位于`crowbar.h`中，规定了一些列语言相关的数据结构：

* 解释器、编译错误、运行时错误、消息参数类型、消息格式、
* 变量、标识符列表、局部环境、全局变量引用
* 表达式类型、表达式、赋值表达式、二叉表达式、函数调用表达式、
* 语句类型、语句、语句列表、块、语句结果类型、语句结果、if语句、while语句、for语句、return语句、全局语句
* 函数定义、参数列表(链表)
* String、String Pool

其中最重要的是解释器`CRB_Interpreter`：
```c
struct CRB_Interpreter_tag {
    /* 在解释器生成时生成，解释器废弃时释放 */
    MEM_Storage         interpreter_storage;
    /* 运行时的存储  */
    MEM_Storage         execute_storage;
    /* 全局变量 链表 */
    Variable            *variable;
    /* 函数定义 链表 */
    FunctionDefinition  *function_list;
    /* 语句 链表 */
    StatementList       *statement_list;
    /* 当前行号 */
    int                 current_line_number;
};
```
## 变量

其中，`Varible`实际上指的是全局变量链表：

```c
typedef struct Variable_tag {
    char        *name;
    CRB_Value   value;
    struct Variable_tag *next;
} Variable;
```
变量都很简单，自身拥有两个属性：
* 变量名：即标识符。
* 变量值：统一为`CRB_Value`类型。

`crowbar`以链表的形式组织变量，依次取`next`指针即可遍历。

在此变量基础上，就可以表示出全局变量变量链表和局部环境:
```c
typedef struct GlobalVariableRef_tag {
    Variable    *variable;
    struct GlobalVariableRef_tag *next;
} GlobalVariableRef;

typedef struct {
    Variable    *variable;
    GlobalVariableRef   *global_variable;
} LocalEnvironment;
```

变量解析即是从相应环境（局部、全局）中寻找标识符的过程，由于`crowbar`采用了链表的组织方式，其的实现机理也是直接在相应环境中从头开始遍历`Varible`链表，检查链表相应节点的变量名是否和相应的标识符一致：
```c
Variable * crb_search_local_variable(LocalEnvironment *env, char *identifier);
Variable * crb_search_global_variable(CRB_Interpreter *inter, char *identifier);
```

### 表达式

表达式的数据结构为：
```c
struct Expression_tag {
    ExpressionType type;
    int line_number;
    union {
        CRB_Boolean             boolean_value;
        int                     int_value;
        double                  double_value;
        char                    *string_value;
        char                    *identifier;
        AssignExpression        assign_expression;
        BinaryExpression        binary_expression;
        Expression              *minus_expression;
        FunctionCallExpression  function_call_expression;
    } u;
};
```

表达式有多种，比如赋值表达式：
```c
typedef struct {
    char        *variable;
    Expression  *operand;
} AssignExpression;
```

二叉表达式：
```c
typedef struct {
    Expression  *left;
    Expression  *right;
} BinaryExpression;
```

函数调用表达式:
```c
typedef struct {
    char                *identifier;
    ArgumentList        *argument;
} FunctionCallExpression;
```

### 语句、语句列表、及块

#### 对语句、语句列表及块的抽象表示

一个语句可能是表达式语句、全局语句、`if`语句、`while`语句、`for`语句、`return`语句。故可以把语句抽象为：
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
```

在此基础上，可以抽象出语句链表：
```c
typedef struct StatementList_tag {
    Statement   *statement;
    struct StatementList_tag    *next;
} StatementList;
```

而一系列语句列表可以构成块：
```c
typedef struct {
    StatementList       *statement_list;
} Block;
```

#### 具体分类的语句的定义

不同的语句有不同的特征，需要为具体类型的语句定义特定的成员。比如`if`语句为：
```c
typedef struct {
    Expression  *condition;
    Block       *then_block;
    Elsif       *elsif_list;
    Block       *else_block;
} IfStatement;
```

而用于循环的`while`语句：
```c
typedef struct {
    Expression  *condition;
    Block       *block;
} WhileStatement;
```

`for`语句：
```c
typedef struct {
    Expression  *init;
    Expression  *condition;
    Expression  *post;
    Block       *block;
} ForStatement;
```

`return`用于返回一个表达式的值：
```c
typedef struct {
    Expression *return_value;
} ReturnStatement;
```


### 函数定义构成的链表


在定义函数之前，先要抽象出参数链表:
```c
typedef struct ArgumentList_tag {
    Expression *expression;
    struct ArgumentList_tag *next;
} ArgumentList;
```

函数分为`CROWBAR_FUNCTION`和`NATIVE_FUNCTION`两种。对于前者，函数定义由参数链表和`block`构成。对于后者，实际上由`C`语言写就，故可以用一个函数指针来表示。

```c
typedef struct FunctionDefinition_tag {
    char                       *name;
    FunctionDefinitionType      type;
    union {
        struct {
            ParameterList       *parameter;
            Block               *block;
        } crowbar_f;
        struct {
            CRB_NativeFunctionProc      *proc;
        } native_f;
    } u;
    struct FunctionDefinition_tag       *next;
} FunctionDefinition;
```
