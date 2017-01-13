---
title: Activiti 极速入门2——Java Service Task 和 Script Task
date: 2017-01-14 05:03:29
tags:
- Java
- Activiti
- BPMN2
categories:
- 风语
- Java
- Activiti
---

我们知道，在`Activiti`支持的`BPMN2.0`流程定义中，可以使用
* `userTask`元素
* `scriptTask`元素
* `serviceTask`元素
来处理相关任务。

和使用`userTask`元素定义用户任务一样，我们也可以通过`serviceTask`元素来调用`Java Service`处理流程：
```XML
<serviceTask id="serviceTask1" name="a java service to validate sth" 
    activiti:class="a-fully-qualified-class-name"
/>
```

除此之外，还可以利用`scriptTask`元素调用诸如`JavaScript`、`Groovy`之类的脚本来执行任务:
```XML
<scriptTask id="automatedIntro" name="Generic and Automated Data Entry" 
    scriptFormat="javascript" activiti:autoStoreVariables="false" >
    <script>
        <![CDATA[
            var dateAsString = new Date().toString();
            execution.setVariable("autoWelcomeTime", dateAsString);
        ]]>
    </script>
</scriptTask>
```

## Java Service Task

一个 `Java Service Task` 可以有4种用法：
* Java service task class
* Java service task class with field extensions
* Java service task with method or value expressions
* A delegate expression that defines a variable that is resolved to a Java bean at
runtime


### Java Service Task class

一个典型的`Java Service Task`必须实现`JavaDelegate`接口，
```Java
public class ValidateService implements JavaDelegate {
    @Override
    public void execute(DelegateExecution execution) {
        System.out.println("execution id " + execution.getId());
        Long isbn = (Long) execution.getVariable("isbn");
        System.out.println("received isbn " + isbn);
        execution.setVariable("validatetime", new Date());
    }
}
```
`DelegateExecution`实例提供了一个可以获取、设置流程变量的接口。一旦`Java Service Task`被执行，其`execute(DelegateExecution execution)`方法将会被流程引擎调用。

然而这种方式是一种同步方式，意味着进程实例必须等待`automatic task`完成才能继续处理。要解决这个问题，从`BPMN2.0` XML的角度来说，很简单，只要声明任务为异步即可：
```XML
<serviceTask id="serviceTask1" name="a java service to validate sth"
    activiti:async="true"
    activiti:class="a-fully-qualified-class-name"
/>
```
一旦把`activiti:async`设置为`true`，相关任务会在单独的事务和线程中执行。


### Script Task

对于`Activiti Engine`执行的`scriptTask`，`scriptFormat`属性值必须兼容于`JSR-223`(“Scripting for the Java Platform”)。支持的语言包括：`Groovy`, `Clojure`, `JRuby`, `Jython`, 还有`JavaScript`。

在`Java Service Task`中，可以通过`DelegateExecution`实例来读取、设置流程变量，在`Script Task`中也可以显式通过`execution`变量来读取、设置流程变量。
比如，一段`Groovy`脚本为：
```XML
<script>
    def bookVar = "BPMN 2.0 with Activiti"
    execution.setVariable("bookName", bookVar);
</script>
```

当然，还可以通过隐式修改的方式（自动保存变量）进行:
```XML
<script>
    sum = 0;
    for ( i in inputArray ) {
        sum += i
    }
</script>
```
这里`sum`会被自动保存到流程变量中，如果要避免这种行为，应该使用`script-local variables`的方式——即使用`def`进行声明。

