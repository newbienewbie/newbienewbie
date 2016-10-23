---
title: AOP 与 Spring
date: 2016-10-21 01:20:21
tags:
- Java
- AOP
- Spring
categories:
- 风语
- Java
---

## AOP 与装饰器

照例先说需求，我们经常需要扩展某一个或者某一些操作。

在`Python`中可以通过[装饰器](http://www.itminus.com/2015/04/10/WindWhisper/Python/Python%E5%87%BD%E6%95%B0%E8%A3%85%E9%A5%B0%E5%99%A8%E5%8E%9F%E7%90%86%E5%88%86%E6%9E%90/)动态创建一个包装函数来实现，
在`Java`中，可以通过反射技术创建动态代理，拦截对目标`Bean`的方法调用，从而扩展目标`Bean`的功能。

## Spring 对 AOP 的支持

Spring AOP 是基于代理实现的(纯Java) 。

Spring AOP 目前仅支持 method execution join points (advising the execution of methods on Spring beans). 
尽管不必打破Spring AOP 核心 API 就可以做到支持，但是Spring AOP 并未实现 Field 拦截 。如果需要,可以考虑诸如 AspectJ 之类的语言。


### Maven 依赖

#### IoC 模块的依赖：

```
GroupId:    org.springframework
ArtifactId: spring-context
```

如果要使用JCP标准注入注解，还需要的Maven依赖：
```
GroupId:       javax.inject
ArtifactId:    javax.inject
```

#### AOP 模块的依赖

```
GroupId:    org.springframework
ArtifactId: spring-aop
```

集成AspectJ
```
GroupId:    org.springframework
ArtifactId: spring-aspects
```

### 注解配置

现有某一个`Bean`注解为组件：
```Java
@Named
public class BraveKnight implements Knight {

	private Quest quest;

	@Inject
	public BraveKnight(Quest quest) {
		this.quest = quest;
	}

	@Override
	public void embarkOnKnight() {
		quest.embark();
	}
}
```


针对该`Bean`组件建立切面`Aspect`：

```Java
@Aspect
public class BraveKnightAspect {

	@AfterReturning(
			pointcut = "execution(* com.mycompany.knights.Knight.embarkOnKnight(..))",
			returning= "result")
	public void log(){
		System.out.println("Hello,this is advice");
	}
	
}
```

在配置类中使用建立的切面：
```Java
@Configuration
@EnableAspectJAutoProxy
@ComponentScan
public class KnightConfig {

	@Bean
	public Knight braveKnight (){
		return new BraveKnight(quest());
	}

	@Bean
	public Quest quest() {
		return new Quest();
	}

	//required，将Aspect标记为Bean
	@Bean
	public BraveKnightAspect braveKnightAspect(){
		return  new BraveKnightAspect();
	}
}
```

