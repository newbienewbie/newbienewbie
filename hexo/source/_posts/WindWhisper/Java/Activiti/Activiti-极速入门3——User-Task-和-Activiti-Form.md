---
title: Activiti 极速入门3——User Task 和 Activiti Form
date: 2017-01-14 06:19:48
tags:
- Java
- Activiti
- BPMN2
categories:
- 风语
- Java
- Activiti
---

我们可以通过`scriptTask`或者`serviceTask`来处理一些自动化任务，但是，如果需要和人进行交互，则可以使用`userTask`来完成：
`userTask`
指定`activiti:formKey`属性使用自己的渲染技术进行模板渲染
```XML
<startEvent id="theStart" activiti:formKey="your.form" />
```

利用`activiti:formProperty`定义表单属性，
```XML
<userTask id="myUserTask" name="Enter Data" 
    activiti:assignee="${initiator}" 
    activiti:candidateGroups="kezhang" >
    <extensionElements>
        <activiti:formProperty id="name" name="Full Name" type="string"> </activiti:formProperty>
        <activiti:formProperty id="age" name="age" type="long" required="true"></activiti:formProperty>
    </extensionElements>
</userTask>
```

一旦表单被提交，表单中的字段就会被以流程变量存储于流程上下文中，默认的类型是`String`，其他支持的类型包括`long`, `Boolean`, `enum`, 和`date` 。

服务`FormService`可以访问`userTask` 或`startEvent`定义的`formProperty`，也可以被用来提交表单字段来完成特定的`userTask`。 

```Java

// Task task = ...
FormData formData = formService.getTaskFormData(task.getId());

Map<String, Object> variables = new HashMap<String, Object>();
for (FormProperty formProperty : formData.getFormProperties()) {
    // get type 
    formProperty.getType();
    // get name
    formProperty.getName();
    // get id
    formProperty.getId();
    // value= ...
    Object value /=* via input or sthm */ ;
    variables.put(formProperty.getId(), value);
}
taskService.complete(task.getId(), variables);
```