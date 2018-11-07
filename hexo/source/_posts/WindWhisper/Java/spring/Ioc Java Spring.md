---
title: IoC ，以 Spring 为例
date: 2015-05-31 12:39:54
tags:
- Java
- Spring
- Spring IoC
- IoC
- 依赖注入

categories:
- 风语
- Java
- Spring
---


## IoC的核心理念

IoC的核心理念在于分离这两种职责：

1. 类对象的依赖解析（即：生成或者查找过程）
2. 类对象的使用

具体而言，就是把各个类对象实例的依赖解析过程统一交给容器负责，类的使用者只负责使用类对象，不再去承担类实例的创建、查找职责（即不再去控制依赖解析过程），从而实现了控制反转（IoC），也就是传说中的好莱坞法则：“别打电话给我，我会打给你”的意义：“别自己生成对象，我会替你生成”。

要生成一个类，如果不考虑工厂方法，传统的做法总是类似于：
```Java
MyClass mc=new MyClass(1,"hello,world",true);

```
如果我们丢开这些语法形式，可以发现，通过new生成新对象实际上提供了两个基本信息：
1. 类名
2. 构造器参数

如果把这些信息写入到配置文件中，然后在主程序中读取配置，就可以利用反射技术动态生成这些类的实例。


比如,现有若干个Java类，其中一个POJO类如下所示：

```Java
package com.mycompany.mavenproject1;

public class MyBean {
    private int a;
    private String b;

    public MyBean(int a,String b){
        this.a=a;
        this.b=b;
    }

    /**
        * @return the a
        */
    public int getA() {
        return a;
    }

    /**
        * @param a the a to set
        */
    public void setA(int a) {
        this.a = a;
    }

    /**
        * @return the b
        */
    public String getB() {
        return b;
    }

    /**
        * @param b the b to set
        */
    public void setB(String b) {
        this.b = b;
    }
	
}

```

将其信息写入配置文件，随便其一个名字，比如叫`config.xml`
```XML
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans-4.2.xsd "
>

    <bean id="myBean" class="com.mycompany.mavenproject1.MyBean">
        <constructor-arg name="a" value="2"/>
        <constructor-arg name="b" value="Hello,world"/>
    </bean >

    <!--其他bean的配置信息 -->
</beans>
```


读取配置，这样我们就很容易利用反射创建相应的类:

```Java
	    
public static void main(String[] args) throws ClassNotFoundException {

    String myBeanClassName="";
    int myBeanConstructorA;
    String myBeanConstructorB;

    //...
    //...从配置文件中读取myBean类名称："com.mycompany.mavenproject1.MyBean";
    //...从配置文件中读取myBean类构造器参数a;	
    //...从配置文件中读取myBean类构造器参数b;	
    //...
    Class c=Class.forName(myBeanClassName);
    MyBean myBean;
    try {
        myBean = (MyBean) c.getConstructor(Integer.TYPE,String.class).newInstance(myBeanConstructorA,myBeanConstructorB);
        System.out.println(myBean.getA());
    } catch (InstantiationException ex) {
        //....	 
    }
    //...
}
	
```
由于这里读配置、并根据相关信息进行实例化是个非常普遍的过程，可以将之封装。为了不重复造轮子，利用Maven添加spring-context依赖：
```XML
    <dependencies>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-context</artifactId>
            <version>4.2.4.RELEASE</version>
        </dependency>
    </dependencies>
```


即可使用如下的方式获取对象:

```Java
import org.springframework.context.ApplicationContext;
import org.springframework.context.support.FileSystemXmlApplicationContext;

/**
 *
 * @author snp
 */
public class Main {

    public static void main(String[] args) {
        ApplicationContext ctx=new FileSystemXmlApplicationContext("config.xml");
        MyBean myBean;
        myBean = (MyBean) ctx.getBean(MyBean.class);
        System.out.println(myBean.getA());
        System.out.println(myBean.getB());
    }
}
```

## Spring IoC容器的XML-based的配置

从上面可以看到，只需要在XML中提供配置，就可以通过反射技术由容器自动创建对应的类，完成相应的依赖解析。

### constructor注入与静态方法注入

基于XML的配置类似于：
```XML
<bean id="sss" class="SSS"></bean>
<bean id="xxx" class="XXX">
    <constructor-arg value="15"/>    <!--构造器注入：基本类型的参数-->
    <constructor-arg ref="sss"/>     <!--构造器注入：引用类型的参数-->
</bean>
<bean id="yyy" class="YYY" factory-method="getInstance"/>   <!--通过静态方法构建-->
```
Spring Bean默认为单例，当容器分配一个Bean时，总是返回该Bean类的同一个实例。如何修改这种默认特性呢？可以为Bean声明一个作用域：
```XML
<bean id="zzz" class="ZZZ" scope="prototype"></bean>
```
常见的作用域包括：
* prototype        #每次都是新的
* singleton       #默认
* request           #每次HTTP Request都产生新的
* session            #每次HTTP Session都产生新的
* global-session

### setter注入

基于XML的配置类似于：
```XML
<bean id="sss" class="SSS">
    <property name="x" value="Jingle Bells"/>
    <property name="y" ref="yId"/>
</bean>
```

## Spring IoC容器的Java-based的配置


使用XML是一种比较传统的做法，但是缺点也很明显：
* 啰嗦
* 非类型安全的：如果手误打错一个字符串，可能要到运行时才能发现

为了利用静态语言类型安全的优势，基于Java注解的配置方式被发明了出来。

既然IoC核心在于将依赖解析这个职责分离出去，我们大可以向容器提供基于Java的配置，用以直接调用new来生成相应的类对象（Bean）：

```Java
@Configuration
class MyJavaConfig
{
    @Bean
    public MyBean1 myBean1(){
        return new MyBean1();
    }
    
    //...
}
```
如此，同样达到了控制反转、分离依赖解析职责的目的。

由于这种每一个Bean都需要手工显式声明Bean的方式很麻烦，对此Spring提供了auto wiring机制：

* 组件的自动扫描
* 组件的自动装配

当然，Spring允许混搭风格的配置，你完全可以杂糅XML-based的配置、Java-based的配置和显式声明Bean与隐式声明Bean（让Spring自动查找及装配）多种配置方式。

### 组件的注解

Spring默认提供了以下4种注解将POJO声明为组件：

* `@Component`：通用的构造型注解，标识该类为Spring组件
* `@Controller`：标识该类为Spring MVC controller
* `@Repository`：标识该类为数据仓库
* `@Service`：标识该类为服务

当需要声明由容器自动进行装配时，应用`@Autowired`注解之。

JSR-330中提供了

* `@Named`作为标准的组件注解。
* `@Inject`作为标准的注入注解

一般而言，特定的组件Bean应以`@Component`（或者标准的`@Named`）注解之。当该组件不是单例模式时，应以`@Scope`注解之。需要注入的地方应以`@Autowired`（或者标准的`@Inject`）注解之。

### 配置类的注解

配置类可以使用
* `@Configuration` 来表示这是一个基于注解的配置类
* `@ComponentScan` 来表示让Spring去自动扫描合适的组件
* `@Import` 表示需要从其他JavaConfig中导入配置
* `@ImportResource` 表示要从XML文件中导入配置

对于部分要要显式声明的Bean，应在配置类的相关方法使用`@Bean`注解之。


最后，基于Java注解配置的ApplicationContext应该如此获取：

```Java
ApplicationContext context=new AnnotationConfigApplicationContext(KnightConfig.class);
```

这种基于Java注解的Java配置类效果类似于以下的XML文件：

```XML
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:aop="http://www.springframework.org/schema/aop"
    xmlns:context="http://www.springframework.org/schema/context"

    xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans-4.2.xsd
        http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop-4.2.xsd
        http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context-4.2.xsd"
>
    <context:annotation-config/>
    <context:component-scan  base-package="testannotationinject.instrument" ></context:component-scan>
    <context:component-scan  base-package="testannotationinject.performer" ></context:component-scan>
    <context:component-scan  base-package="testannotationinject.performer.instrumentalist" ></context:component-scan>
    <context:component-scan  base-package="testannotationinject.performer.juggler" ></context:component-scan>

</beans>
```
其中：
* `<context:annotation-config/>`用于告诉Spring使用注解配置
* `<context:component-scan>`用于通知Spring自动扫描base-package，对使用构造型(`stereotype`)标注的类会自动注册为Bean。

当然，类似于Java配置类获取容器的方式，利用XML格式的配置文件生成容器的方式为：

```Java
ApplicationContext context=new FileSystemXmlApplicationContext(KnightConfig.class);
```



