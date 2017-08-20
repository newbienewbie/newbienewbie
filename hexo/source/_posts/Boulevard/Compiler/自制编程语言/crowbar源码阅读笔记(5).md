---
title: crowbar源码阅读笔记(5):表达式求值
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

这是《自制编程语言》一书中的脚本语言`crowbar`的源码阅读笔记(5):表达式求值。表达式求值的实现代码主要存放于文件`eval.c`中。

## 表达式求值算法的总体框架

根据表达式的类型的不同，执行不同的求值算法，然后返回一个`CRB_Value`类型。

```c
static CRB_Value eval_expression(CRB_Interpreter *inter, LocalEnvironment *env, Expression *expr)
{
    CRB_Value   v;
    switch (expr->type) {
    case BOOLEAN_EXPRESSION:
        v = eval_boolean_expression(expr->u.boolean_value);
        break;
    case INT_EXPRESSION:
        v = eval_int_expression(expr->u.int_value);
        break;
    case DOUBLE_EXPRESSION:
        v = eval_double_expression(expr->u.double_value);
        break;
    case STRING_EXPRESSION:
        v = eval_string_expression(inter, expr->u.string_value);
        break;
    case IDENTIFIER_EXPRESSION:
        v = eval_identifier_expression(inter, env, expr);
        break;
    case ASSIGN_EXPRESSION:
        v = eval_assign_expression(inter, env, expr->u.assign_expression.variable, expr->u.assign_expression.operand);
        break;
    case ADD_EXPRESSION:        /* FALLTHRU */
    case SUB_EXPRESSION:        /* FALLTHRU */
    case MUL_EXPRESSION:        /* FALLTHRU */
    case DIV_EXPRESSION:        /* FALLTHRU */
    case MOD_EXPRESSION:        /* FALLTHRU */
    case EQ_EXPRESSION: /* FALLTHRU */
    case NE_EXPRESSION: /* FALLTHRU */
    case GT_EXPRESSION: /* FALLTHRU */
    case GE_EXPRESSION: /* FALLTHRU */
    case LT_EXPRESSION: /* FALLTHRU */
    case LE_EXPRESSION:
        v = crb_eval_binary_expression(inter, env, expr->type, expr->u.binary_expression.left, expr->u.binary_expression.right);
        break;
    case LOGICAL_AND_EXPRESSION:/* FALLTHRU */
    case LOGICAL_OR_EXPRESSION:
        v = eval_logical_and_or_expression(inter, env, expr->type, expr->u.binary_expression.left, expr->u.binary_expression.right);
        break;
    case MINUS_EXPRESSION:
        v = crb_eval_minus_expression(inter, env, expr->u.minus_expression);
        break;
    case FUNCTION_CALL_EXPRESSION:
        v = eval_function_call_expression(inter, env, expr);
        break;
    case NULL_EXPRESSION:
        v = eval_null_expression();
        break;
    case EXPRESSION_TYPE_COUNT_PLUS_1:  /* FALLTHRU */
    default:
        DBG_panic(("bad case. type..%d\n", expr->type));
    }
    return v;
}
```

以整型表达式为例，创建一个`CRB_Value`变量，然后设置其`type`，填充`u`成员的`int_value`字段为指定值：
```c
static CRB_Value eval_int_expression(int int_value)
{
    CRB_Value   v;

    v.type = CRB_INT_VALUE;
    v.u.int_value = int_value;

    return v;
}
```

布尔型表达式求值也是类似的，创建一个`CRB_Value`变量，然后设置其`type`，填充`u`成员的`boolean_value`字段为指定`CRB_Boolean`值：
```c
static CRB_Value eval_boolean_expression(CRB_Boolean boolean_value)
{
    CRB_Value   v;
    v.type = CRB_BOOLEAN_VALUE;
    v.u.boolean_value = boolean_value;
    return v;
}
```

类似的还有浮点型表达式求值、字符串型表达式求值。

## 标识符表达式求值

```c
static CRB_Value eval_identifier_expression(CRB_Interpreter *inter, LocalEnvironment *env, Expression *expr)
{
    CRB_Value   v;
    Variable    *vp;

    vp = crb_search_local_variable(env, expr->u.identifier);
    if (vp != NULL) {
        v = vp->value;
    } else {
        vp = search_global_variable_from_env(inter, env, expr->u.identifier);
        if (vp != NULL) {
            v = vp->value;
        } else {
            crb_runtime_error(expr->line_number, VARIABLE_NOT_FOUND_ERR,
                              STRING_MESSAGE_ARGUMENT,
                              "name", expr->u.identifier,
                              MESSAGE_ARGUMENT_END);
        }
    }
    refer_if_string(&v);

    return v;
}
```


## 赋值表达式求值 

赋值表达式求值非常简单：
* 先求出等号右部的表达式的值
* 尝试搜寻指定标识符对应的变量，找不到就在指定环境中创建一个变量。
* 然后将等号左边的变量值修改为计算出来的值。

```c
static CRB_Value eval_assign_expression(CRB_Interpreter *inter, LocalEnvironment *env, char *identifier, Expression *expression)
{
    CRB_Value   v;
    Variable    *left;

    v = eval_expression(inter, env, expression);

    left = crb_search_local_variable(env, identifier);
    if (left == NULL) {
        left = search_global_variable_from_env(inter, env, identifier);
    }
    if (left != NULL) {
        release_if_string(&left->value);
        left->value = v;
        refer_if_string(&v);
    } else {
        if (env != NULL) {
            crb_add_local_variable(env, identifier, &v);
        } else {
            CRB_add_global_variable(inter, identifier, &v);
        }
        refer_if_string(&v);
    }

    return v;
}
```

## `BinaryExpression` 求值

根据参与运算的`left`和`right`类型，又可以分为布尔型、整型、浮点型、字符串型等

### 布尔型 `BinaryExpression`

它的求值方法非常简单，即根据左右表达式是否相等来返回结果：
```c
static CRB_Boolean eval_binary_boolean(CRB_Interpreter *inter, ExpressionType operator, CRB_Boolean left, CRB_Boolean right, int line_number)
{
    CRB_Boolean result;

    if (operator == EQ_EXPRESSION) {
        result = left == right;
    } else if (operator == NE_EXPRESSION) {
        result = left != right;
    } else {
        char *op_str = crb_get_operator_string(operator);
        crb_runtime_error(line_number, NOT_BOOLEAN_OPERATOR_ERR, STRING_MESSAGE_ARGUMENT, "operator", op_str, MESSAGE_ARGUMENT_END);
    }

    return result;
}
```

### 逻辑`BinaryExpression`表达式求值

逻辑表达式总体来说采用的是递归法求解：
* 先递归求解出`left_value`，根据运算符的不同，判断是否触发短路，是则不再进一步求解
* 否则，再递归求解出`right_value`
* 然后根据`left_value`和`right_value`求解出最终的值。

```c
static CRB_Value eval_logical_and_or_expression(CRB_Interpreter *inter, LocalEnvironment *env, ExpressionType operator, Expression *left, Expression *right)
{
    CRB_Value   left_val;
    CRB_Value   right_val;
    CRB_Value   result;
    result.type = CRB_BOOLEAN_VALUE;

    /* left_value 求解 */
    left_val = eval_expression(inter, env, left);

    if (left_val.type != CRB_BOOLEAN_VALUE) { crb_runtime_error(left->line_number, NOT_BOOLEAN_TYPE_ERR, MESSAGE_ARGUMENT_END); }

    /* 测试是否触发短路逻辑 */
    if (operator == LOGICAL_AND_EXPRESSION) {
        if (!left_val.u.boolean_value) { result.u.boolean_value = CRB_FALSE; return result; }
    } 
    else if (operator == LOGICAL_OR_EXPRESSION) {
        if (left_val.u.boolean_value) { result.u.boolean_value = CRB_TRUE; return result; }
    }
    else {
        DBG_panic(("bad operator..%d\n", operator));
    }

    /* right_value 求解 */
    right_val = eval_expression(inter, env, right);
    if (right_val.type != CRB_BOOLEAN_VALUE) {
        crb_runtime_error(right->line_number, NOT_BOOLEAN_TYPE_ERR, MESSAGE_ARGUMENT_END); 
    }

    result.u.boolean_value = right_val.u.boolean_value;
    return result;
}
```

### 整型 `BinaryExpression` 求值

整型表达式的左右表达式均为整型。其求值结果可能是整型，也可能是布尔型。比如：
* `3+4`这个表达式的结果为整型
* `3>4`这个表达式的结果为布尔假值。

求值的时候，需要针对每种情况区别对待：
* 当运算符为 **数学运算符**，比如`+`、`-`、`*`、`/`、`%`，求值结果整型
* 当运算符为 **比较运算符**，比如`>`、`>=`、`<`、`<=`、`==`、`!=`，求值结果为布尔值。

```c
static void eval_binary_int(CRB_Interpreter *inter, ExpressionType operator, int left, int right, CRB_Value *result, int line_number) 
{
    if (dkc_is_math_operator(operator)) { result->type = CRB_INT_VALUE; } 
    else if (dkc_is_compare_operator(operator)) { result->type = CRB_BOOLEAN_VALUE; } 
    else { DBG_panic(("operator..%d\n", operator)); }

    switch (operator) {
    case BOOLEAN_EXPRESSION:    /* FALLTHRU */
    case INT_EXPRESSION:        /* FALLTHRU */
    case DOUBLE_EXPRESSION:     /* FALLTHRU */
    case STRING_EXPRESSION:     /* FALLTHRU */
    case IDENTIFIER_EXPRESSION: /* FALLTHRU */
    case ASSIGN_EXPRESSION:
        DBG_panic(("bad case...%d", operator));
        break;
    case ADD_EXPRESSION:
        result->u.int_value = left + right;
        break;
    case SUB_EXPRESSION:
        result->u.int_value = left - right;
        break;
    case MUL_EXPRESSION:
        result->u.int_value = left * right;
        break;
    case DIV_EXPRESSION:
        result->u.int_value = left / right;
        break;
    case MOD_EXPRESSION:
        result->u.int_value = left % right;
        break;
    case LOGICAL_AND_EXPRESSION:        /* FALLTHRU */
    case LOGICAL_OR_EXPRESSION:
        DBG_panic(("bad case...%d", operator));
        break;
    case EQ_EXPRESSION:
        result->u.boolean_value = left == right;
        break;
    case NE_EXPRESSION:
        result->u.boolean_value = left != right;
        break;
    case GT_EXPRESSION:
        result->u.boolean_value = left > right;
        break;
    case GE_EXPRESSION:
        result->u.boolean_value = left >= right;
        break;
    case LT_EXPRESSION:
        result->u.boolean_value = left < right;
        break;
    case LE_EXPRESSION:
        result->u.boolean_value = left <= right;
        break;
    case MINUS_EXPRESSION:              /* FALLTHRU */
    case FUNCTION_CALL_EXPRESSION:      /* FALLTHRU */
    case NULL_EXPRESSION:               /* FALLTHRU */
    case EXPRESSION_TYPE_COUNT_PLUS_1:  /* FALLTHRU */
    default:
        DBG_panic(("bad case...%d", operator));
    }
}
```

### 浮点型 `BinaryExpression` 求值

浮点型 `BinaryExpression` 与整型 `BinaryExpression` 求值过程类似，根据运算符的类型，要按浮点型和布尔型区别对待。
```c
static void eval_binary_double(CRB_Interpreter *inter, ExpressionType operator, double left, double right, CRB_Value *result, int line_number) 
{
    if (dkc_is_math_operator(operator)) { result->type = CRB_DOUBLE_VALUE; } 
    else if (dkc_is_compare_operator(operator)) { result->type = CRB_BOOLEAN_VALUE; }
    else { DBG_panic(("operator..%d\n", operator)); }

    switch (operator) {
    case BOOLEAN_EXPRESSION:    /* FALLTHRU */
    case INT_EXPRESSION:        /* FALLTHRU */
    case DOUBLE_EXPRESSION:     /* FALLTHRU */
    case STRING_EXPRESSION:     /* FALLTHRU */
    case IDENTIFIER_EXPRESSION: /* FALLTHRU */
    case ASSIGN_EXPRESSION:
        DBG_panic(("bad case...%d", operator));
        break;
    case ADD_EXPRESSION:
        result->u.double_value = left + right;
        break;
    case SUB_EXPRESSION:
        result->u.double_value = left - right;
        break;
    case MUL_EXPRESSION:
        result->u.double_value = left * right;
        break;
    case DIV_EXPRESSION:
        result->u.double_value = left / right;
        break;
    case MOD_EXPRESSION:
        result->u.double_value = fmod(left, right);
        break;
    case LOGICAL_AND_EXPRESSION:        /* FALLTHRU */
    case LOGICAL_OR_EXPRESSION:
        DBG_panic(("bad case...%d", operator));
        break;
    case EQ_EXPRESSION:
        result->u.int_value = left == right;
        break;
    case NE_EXPRESSION:
        result->u.int_value = left != right;
        break;
    case GT_EXPRESSION:
        result->u.int_value = left > right;
        break;
    case GE_EXPRESSION:
        result->u.int_value = left >= right;
        break;
    case LT_EXPRESSION:
        result->u.int_value = left < right;
        break;
    case LE_EXPRESSION:
        result->u.int_value = left <= right;
        break;
    case MINUS_EXPRESSION:              /* FALLTHRU */
    case FUNCTION_CALL_EXPRESSION:      /* FALLTHRU */
    case NULL_EXPRESSION:               /* FALLTHRU */
    case EXPRESSION_TYPE_COUNT_PLUS_1:  /* FALLTHRU */
    default:
        DBG_panic(("bad default...%d", operator));
    }
}
```

### 通用`BinaryExpression`的求值策略

通用的`BinaryExpression`策略是采用递归法求解的：
* 先递归求解`left`表达式的值`left_value`
* 再递归求解`right`表达式的值`right_value`
* 然后根据`left_value`和`right_value`的具体类型，分情况求解出最终的值。

```c
CRB_Value crb_eval_binary_expression(CRB_Interpreter *inter, LocalEnvironment *env, ExpressionType operator, Expression *left, Expression *right)
{
    CRB_Value   left_val;
    CRB_Value   right_val;
    CRB_Value   result;

    left_val = eval_expression(inter, env, left);
    right_val = eval_expression(inter, env, right);

    /* 整型 BinaryExpression 求解 */
    if (left_val.type == CRB_INT_VALUE && right_val.type == CRB_INT_VALUE) {
        eval_binary_int(inter, operator, left_val.u.int_value, right_val.u.int_value, &result, left->line_number);
    } 
    /* 浮点型 BinaryExpression */
    else if (left_val.type == CRB_DOUBLE_VALUE && right_val.type == CRB_DOUBLE_VALUE) {
        eval_binary_double(inter, operator, left_val.u.double_value, right_val.u.double_value, &result, left->line_number);
    }
    /* 浮点型 BinaryExpression */
    else if (left_val.type == CRB_INT_VALUE && right_val.type == CRB_DOUBLE_VALUE) {
        left_val.u.double_value = left_val.u.int_value;
        eval_binary_double(inter, operator, left_val.u.double_value, right_val.u.double_value, &result, left->line_number);
    }
    /* 浮点型 BinaryExpression */
    else if (left_val.type == CRB_DOUBLE_VALUE && right_val.type == CRB_INT_VALUE) {
        right_val.u.double_value = right_val.u.int_value;
        eval_binary_double(inter, operator, left_val.u.double_value, right_val.u.double_value, &result, left->line_number);
    }
    /* 布尔型 BinaryExpression */
    else if (left_val.type == CRB_BOOLEAN_VALUE && right_val.type == CRB_BOOLEAN_VALUE) {
        result.type = CRB_BOOLEAN_VALUE;
        result.u.boolean_value = eval_binary_boolean(inter, operator, left_val.u.boolean_value, right_val.u.boolean_value, left->line_number);
    } 
    /* 字符串拼接 */
    else if (left_val.type == CRB_STRING_VALUE && operator == ADD_EXPRESSION) {
        char    buf[LINE_BUF_SIZE];
        CRB_String *right_str;

        if (right_val.type == CRB_INT_VALUE) {
            sprintf(buf, "%d", right_val.u.int_value);
            right_str = crb_create_crowbar_string(inter, MEM_strdup(buf));
        } else if (right_val.type == CRB_DOUBLE_VALUE) {
            sprintf(buf, "%f", right_val.u.double_value);
            right_str = crb_create_crowbar_string(inter, MEM_strdup(buf));
        } else if (right_val.type == CRB_BOOLEAN_VALUE) {
            if (right_val.u.boolean_value) {
                right_str = crb_create_crowbar_string(inter, MEM_strdup("true"));
            } else {
                right_str = crb_create_crowbar_string(inter, MEM_strdup("false"));
            }
        } else if (right_val.type == CRB_STRING_VALUE) {
            right_str = right_val.u.string_value;
        } else if (right_val.type == CRB_NATIVE_POINTER_VALUE) {
            sprintf(buf, "(%s:%p)", right_val.u.native_pointer.info->name, right_val.u.native_pointer.pointer);
            right_str = crb_create_crowbar_string(inter, MEM_strdup(buf));
        } else if (right_val.type == CRB_NULL_VALUE) {
            right_str = crb_create_crowbar_string(inter, MEM_strdup("null"));
        } 
        result.type = CRB_STRING_VALUE;
        result.u.string_value = chain_string(inter, left_val.u.string_value, right_str);
    }
    /* 字符串比较大小 */
    else if (left_val.type == CRB_STRING_VALUE && right_val.type == CRB_STRING_VALUE) {
        result.type = CRB_BOOLEAN_VALUE;
        result.u.boolean_value = eval_compare_string(operator, &left_val, &right_val, left->line_number);
    }
    /* 空值 */
    else if (left_val.type == CRB_NULL_VALUE || right_val.type == CRB_NULL_VALUE) {
        result.type = CRB_BOOLEAN_VALUE;
        result.u.boolean_value = eval_binary_null(inter, operator, &left_val, &right_val, left->line_number);
    } 
    /* 报错 */
    else {
        char *op_str = crb_get_operator_string(operator);
        crb_runtime_error(left->line_number, BAD_OPERAND_TYPE_ERR, STRING_MESSAGE_ARGUMENT, "operator", op_str, MESSAGE_ARGUMENT_END);
    }

    return result;
}
```

## 函数调用表达式求值


函数调用表达式根据函数类型分为两种， **原生函数调用** 和 **crowbar函数调用** ，根据函数类型的不同，再选择性地调用`call_native_function()`或`call_crowbar_function()`:
```c
static CRB_Value eval_function_call_expression(CRB_Interpreter *inter, LocalEnvironment *env, Expression *expr)
{
    CRB_Value           value;
    FunctionDefinition  *func;
    
    char *identifier = expr->u.function_call_expression.identifier;

    func = crb_search_function(identifier);
    if (func == NULL) {
        crb_runtime_error(expr->line_number, FUNCTION_NOT_FOUND_ERR, STRING_MESSAGE_ARGUMENT, "name", identifier, MESSAGE_ARGUMENT_END);
    }
    switch (func->type) {
        case CROWBAR_FUNCTION_DEFINITION:
            value = call_crowbar_function(inter, env, expr, func);
            break;
        case NATIVE_FUNCTION_DEFINITION:
            value = call_native_function(inter, env, expr, func->u.native_f.proc);
            break;
        default:
            DBG_panic(("bad case..%d\n", func->type));
    }

    return value;
}
```

原生函数调用的求值过程非常简单，因为原生函数实际上`C`语言编写的封装类型，通过指针，就可以直接调用：
```c
static CRB_Value call_native_function(CRB_Interpreter *inter, LocalEnvironment *env, Expression *expr, CRB_NativeFunctionProc *proc)
{
    CRB_Value   value;
    int         arg_count;
    ArgumentList        *arg_p;
    CRB_Value   *args;
    int         i;

    /* 原生函数的参数个数 */
    for (arg_count = 0, arg_p = expr->u.function_call_expression.argument;
         arg_p; arg_p = arg_p->next) {
        arg_count++;
    }

    /* 原生函数的参数数组 */
    args = MEM_malloc(sizeof(CRB_Value) * arg_count);
    for (arg_p = expr->u.function_call_expression.argument, i = 0; arg_p; arg_p = arg_p->next, i++)
    {
        args[i] = eval_expression(inter, env, arg_p->expression);
    }

    /* 通过函数指针调用原生函数 */
    value = proc(inter, arg_count, args);

    /* 释放参数数组的内存 */
    for (i = 0; i < arg_count; i++) {
        release_if_string(&args[i]);
    }
    MEM_free(args);

    return value;
}
```

而利用`crowbar`脚本语言编写的脚本，则相对复杂一点；
* 要为函数创建一个局部环境，然后把相关参数注册到该环境中，
* 然后再执行函数体中的语句列表
* 最后释放局部环境并返回最终结果

```c
static CRB_Value call_crowbar_function(CRB_Interpreter *inter, LocalEnvironment *env, Expression *expr, FunctionDefinition *func)
{
    CRB_Value   value;
    StatementResult     result;
    ArgumentList        *arg_p;
    ParameterList       *param_p;
    LocalEnvironment    *local_env;

    /* 创建一个局部环境，把相关参数添加到该局部环境中 */
    local_env = alloc_local_environment();
    for(arg_p = expr->u.function_call_expression.argument, param_p = func->u.crowbar_f.parameter; 
        arg_p;
        arg_p = arg_p->next, param_p = param_p->next) 
    {
        CRB_Value arg_val;

        if (param_p == NULL) {
            crb_runtime_error(expr->line_number, ARGUMENT_TOO_MANY_ERR, MESSAGE_ARGUMENT_END);
        }
        arg_val = eval_expression(inter, env, arg_p->expression);
        crb_add_local_variable(local_env, param_p->name, &arg_val);
    }
    if (param_p) {
        crb_runtime_error(expr->line_number, ARGUMENT_TOO_FEW_ERR, MESSAGE_ARGUMENT_END);
    }

    /* 执行函数体 */
    result = crb_execute_statement_list(inter, local_env, func->u.crowbar_f.block ->statement_list);

    if (result.type == RETURN_STATEMENT_RESULT) { value = result.u.return_value; } 
    else { value.type = CRB_NULL_VALUE; }

    dispose_local_environment(inter, local_env);

    return value;
}
```

