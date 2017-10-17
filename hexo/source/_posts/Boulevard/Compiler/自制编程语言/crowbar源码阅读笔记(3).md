---
title: crowbar源码阅读笔记(3):表达式构建
date: 2017-08-20 08:20:01
tags:
- 编译原理
- 自制编程语言
- crowbar
categories:
- 大道
- 编译原理
- 自制编程语言
---

这是《自制编程语言》一书中的脚本语言`crowbar`的源码阅读笔记(3):表达式构建

## 表达式的分类与表示

表达式分为布尔表达式、整型表达式、标识符表达式、赋值表达式、函数调用表达式等：
```c
typedef enum {
    BOOLEAN_EXPRESSION = 1,
    INT_EXPRESSION,
    DOUBLE_EXPRESSION,
    STRING_EXPRESSION,
    IDENTIFIER_EXPRESSION,
    ASSIGN_EXPRESSION,
    ADD_EXPRESSION,
    SUB_EXPRESSION,
    MUL_EXPRESSION,
    DIV_EXPRESSION,
    MOD_EXPRESSION,
    EQ_EXPRESSION,
    NE_EXPRESSION,
    GT_EXPRESSION,
    GE_EXPRESSION,
    LT_EXPRESSION,
    LE_EXPRESSION,
    LOGICAL_AND_EXPRESSION,
    LOGICAL_OR_EXPRESSION,
    MINUS_EXPRESSION,
    FUNCTION_CALL_EXPRESSION,
    NULL_EXPRESSION,
    EXPRESSION_TYPE_COUNT_PLUS_1
} ExpressionType;
```

<!-- more -->

为了表示表达式，将其类型统一定义为：
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

对于具体类型的表达式，则再具体定义，如：
```c
typedef struct { 
    Expression *left; 
    Expression *right; 
} BinaryExpression;

typedef struct {
    char *identifier; 
    ArgumentList *argument;
} FunctionCallExpression;
```

## 表达式的构建

表达式的创建过程都是先申请一块内存，然后再填充具体的字段，最后返回所创建表达式的指针。

比如创建一个赋值表达式：
```c
Expression * crb_create_assign_expression(char *variable, Expression *operand)
{
    Expression *exp;
    exp = crb_alloc_expression(ASSIGN_EXPRESSION);

    /* 变量 */
    exp->u.assign_expression.variable = variable;
    /* 操作数 */
    exp->u.assign_expression.operand = operand;
    return exp;
}
```

这里，`crb_alloc_expression()`函数是一个辅助函数，负责根据`Expression`这个结构体开辟一块内存空间，然后设置好表达式类型、行号信息，而具体的联合字段`u`则留待后续填充：
```c
Expression * crb_alloc_expression(ExpressionType type)
{
    Expression  *exp;
    exp = crb_malloc(sizeof(Expression));
    exp->type = type;
    exp->line_number = crb_get_current_interpreter()->current_line_number;
    return exp;
}
```

再比如，创建一个`BINARY_EXPRESSION`:
```c
Expression * crb_create_binary_expression(ExpressionType operator, Expression *left, Expression *right)
{
    /* 如果左右表达式都是整型或者浮点型表达式这种极其简单情况，则直接进行求值——可用于常量折叠 */
    if ((left->type == INT_EXPRESSION || left->type == DOUBLE_EXPRESSION)
        && (right->type == INT_EXPRESSION || right->type == DOUBLE_EXPRESSION)) 
    {
        CRB_Value v;
        v = crb_eval_binary_expression(crb_get_current_interpreter(), NULL, operator, left, right);
        /* 覆写左表达式 */
        *left = convert_value_to_expression(&v);
        return left;
    }
    /* 一般情况下，需要先开辟内存，然后再填充`u`的左表达式字段和右表达式字段  */
    else {
        Expression *exp;
        exp = crb_alloc_expression(operator);
        exp->u.binary_expression.left = left;
        exp->u.binary_expression.right = right;
        return exp;
    }
}
```

与之类似的还有`MINUS_EXPRESSION`:
```c
Expression * crb_create_minus_expression(Expression *operand)
{
    /* 可直接求值的情况 */
    if (operand->type == INT_EXPRESSION || operand->type == DOUBLE_EXPRESSION)
    {
        CRB_Value v;
        v = crb_eval_minus_expression(crb_get_current_interpreter(), NULL, operand);
        *operand = convert_value_to_expression(&v);
        return operand;
    } 
    /* 一般情况下，需要先开辟内存，然后再填充`u.`的`minus_expression`字段  */
    else {
        Expression *exp;
        exp = crb_alloc_expression(MINUS_EXPRESSION);
        exp->u.minus_expression = operand;
        return exp;
    }
}
```
其他诸如`IDENTIFIER_EXPRESSION`、`FUNCTION_CALL_EXPRESSION`、`BOOLEAN_EXPRESSION`等表达式的创建函数，其实现也是先申请内存，然后填充相应字段，不再赘述。

唯一比较特殊的是`NULL_EXPRESSION`，开辟内存后，并不填充`u`字段：
```c
Expression * crb_create_null_expression(void)
{
    Expression  *exp;
    exp = crb_alloc_expression(NULL_EXPRESSION);
    return exp;
}
```
