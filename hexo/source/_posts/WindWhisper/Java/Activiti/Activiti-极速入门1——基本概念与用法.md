---
title: Activiti 极速入门1——基本概念与用法
date: 2017-01-13 22:34:29
tags:
- Activiti
categories:
- 风语
- Java
- Activiti
---

## 基本概念

首先思考这样一个业务场景：一种特定级别的公文审批需要经过保存、提交、科长审核、处长审核、局长审核这几个环节。
我们可以使用 `BPMN2.0` 规范描述这个流程。 

需要分清两个概念：
* `process definition`：是某个业务的`BPMN 2.0`流程定义在`Java`中的对等部分
* `process instance`：每次`process definition`执行，都会产生一个`process instance`，一个`process definition`可能有多个`process instance`。比如对一个费用报销审批流程，可能有多个人同时在申请报销。

`Activiti Engine`是一个状态机，可以用来执行流程。一个`BPMN 2.0`流程定义由元素组成:
* `event`
* `task`
* `gateway` 
* `sequence flows`

当流程定义被发布并开始一个新的`process`实例，`BPMN 2.0`的元素就可以被逐个执行。

## 流程部署和启动

在一切开始之前，需要创建一个流程引擎：
```Java
ProcessEngineConfiguration cfg = new StandaloneProcessEngineConfiguration()
        .setJdbcUrl("jdbc:h2:mem:activiti;DB_CLOSE_DELAY=1000")
        .setJdbcUsername("sa")
        .setJdbcPassword("")
        .setJdbcDriver("org.h2.Driver")
        .setDatabaseSchemaUpdate(ProcessEngineConfiguration.DB_SCHEMA_UPDATE_TRUE);
ProcessEngine processEngine = cfg.buildProcessEngine();
```

然后就可以使用`RepositoryService`部署流程了：
```Java
RepositoryService repositoryService = processEngine.getRepositoryService();
Deployment deployment = repositoryService.createDeployment()
    .addClasspathResource("main.bpmn20.xml")
    .deploy();
```

然后就可以使用`RuntimeService`启动具体的流程实例了：
```Java
RuntimeService runtimeService = processEngine.getRuntimeService();
ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("onboarding");
```

## 流程相关服务

`RepositoryService`和`RuntimeService`的区别在于前者处理静态信息，而后者处理流程运行时信息。

通过流程引擎还可以获取一系列服务，比如`TaskService`、`FormService`、`HistoryService`：
```Java
TaskService taskService = processEngine.getTaskService();
FormService formService = processEngine.getFormService();
HistoryService historyService = processEngine.getHistoryService();
```

所有的服务都是无状态的，这些服务都可以通过流程引擎来获取：
```
// 

          [ProcessEngineConfiguration]◄----[activiti.ctg.xml]
                       |
                       |       
                       |            ------------►[HistoryService]
                       |            |
                       |            ------------►[IdentityService]
                       ▼            |
       --------------------------------
       [          ProcessEngine       ]---------►[FormService]
       --------------------------------
              /        |       \    |
             /         |        \   ------------►[ManagementService]
            /          |         \
           /           |          \
          /            ▼           \
         ◣                          ◢    
[RepositoryService] [RuntimeService] [TaskService]
```

`TaskService`负责处理用户任务的相关服务：
```Java
// 根据用户来获取潜在的任务
List<Task> tasks = taskService.createTaskQuery().taskCandidateUser("kermit").list();

// 根据用户组来获取潜在的任务
List<Task> tasks = taskService.createTaskQuery().taskCandidateGroup("accountancy").list();


// 领取任务：
taskService.claim(task.getId(), "fozzie");
// The task is now in the personal task list of the one that claimed the task.
List<Task> tasks = taskService.createTaskQuery().taskAssignee("fozzie").list();

// 完成任务：
taskService.complete(task.getId());
```


