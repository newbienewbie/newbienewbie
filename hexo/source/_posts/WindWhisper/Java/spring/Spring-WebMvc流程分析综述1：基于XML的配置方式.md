---
title: Spring WebMvc流程分析综述1：基于XML的配置方式
date: 2016-10-18 10:03:33
tags:
- Java
- Spring 
- WebMvc
categories:
- 风语
- Java
---

Spring WebMvc 启动流程是怎么样的？

## 从DispatcherServlet说起

首先，在标准部署描述符`web.xml`文件中，有类似如下的一段`Servlet`配置：

```XML
<servlet>
    <servlet-name>dispatcher</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <load-on-startup>2</load-on-startup>
</servlet>
<servlet-mapping>
    <servlet-name>dispatcher</servlet-name>
    <url-pattern>*.htm</url-pattern>
</servlet-mapping>
```

声明所有以`*.htm`结尾的url-pattern都交给`org.springframework.web.servlet.DispatcherServlet`类去处理，这个类扮演着前端控制器(Front Controller)的角色，
默认情况下会去加载与`sevlet-name`元素相关的一个配置文件（应用上下文配置文件），其路径名规则为：

`WEB-INF/${servlet-name}-servlet.xml`

比如，这里指定的`sevlet-name`元素名为`dispatcher`，则会默认去加载`web/WEB-INF/dispatcher-servlet.xml`文件。
这是一种``约定优于配置``的做法，当然，我们也可以手工指定`DispatcherServlet`配置文件：

```XML
<servlet>
    <description>spring mvc servlet</description>
    <servlet-name>springMvc</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <init-param>
        <description>spring mvc 配置文件</description>
        <param-name>contextConfigLocation</param-name>
        <param-value>classpath:spring-mvc.xml</param-value>
    </init-param>
    <load-on-startup>1</load-on-startup>
</servlet>
```
`DispatcherServlet`的相关配置文件还可以是JavaConfig形式：

```XML
<servlet>
    <servlet-name>appServlet</servlet-name> 
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <init-param> 
        <param-name>contextClass</param-name>
        <param-value>org.springframework.web.context.support.AnnotationConfigWebApplicationContext</param-value>
    </init-param> 
    <init-param> 
        <param-name>contextConfigLocation</param-name> 
        <param-value>com.habuma.spitter.config.WebConfigConfig</param-value>
    </init-param> 
    <load-on-startup>1</load-on-startup>
</servlet>
```

`DsipatcherServlet`配置文件是一个Spring应用上下文配置文件，XML结构类似于：

```XML
<?xml version='1.0' encoding='UTF-8' ?>
<!-- was: <?xml version="1.0" encoding="UTF-8"?> -->
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:p="http://www.springframework.org/schema/p"
    xmlns:aop="http://www.springframework.org/schema/aop"
    xmlns:tx="http://www.springframework.org/schema/tx"
    xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans-4.0.xsd
    http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop-4.0.xsd
    http://www.springframework.org/schema/tx http://www.springframework.org/schema/tx/spring-tx-4.0.xsd">

    <bean class="org.springframework.web.servlet.mvc.support.ControllerClassNameHandlerMapping"/>
    <!--
    Most controllers will use the ControllerClassNameHandlerMapping above, but
    for the index controller we are using ParameterizableViewController, so we must
    define an explicit mapping for it.
    -->
    <bean id="urlMapping" class="org.springframework.web.servlet.handler.SimpleUrlHandlerMapping">
        <property name="mappings">
            <props>
                <prop key="index.htm">indexController</prop>
            </props>
        </property>
    </bean>

    <bean id="viewResolver"
        class="org.springframework.web.servlet.view.InternalResourceViewResolver"
        p:prefix="/WEB-INF/jsp/"
        p:suffix=".jsp" />

    <!-- The index controller. -->
    <bean name="indexController"
        class="org.springframework.web.servlet.mvc.ParameterizableViewController"
        p:viewName="index" />
</beans>
```

当`DispatcherServlet`接到一个匹配`*.htm`形式的请求（比如这里配置的`index.htm`）时，就会知道对应的`控制器Bean`的名称（比如，这里配置的`indexControll`），
再通过IoC获取相应的`控制器Bean`。

当然，这种把

* `路径-控制器Bean`映射关系的声明
*  控制器Bean的声明

写到XML文件中的方式很啰嗦，也不够直观，Spring支持：

* 通过`@Controller`注解声明Bean
* 通过`@RequestMapping`注解来配置这种映射关系。

控制器在完成相应的业务逻辑后，设置Model参数，返回视图的逻辑名；通过IoC获取视图解析器；
再由视图解析器完成从逻辑视图名转到View视图对象的转换，
最后由View对象的render()方法进行渲染到response。


## ContextLoaderListener

由于`前端控制器`所加载的配置文件是只是`{$dispatcherServletConfigName}`的文件，对于其他配置文件的加载怎么办?
这可以用`Servlet监听器`实现。

### 标准的 ServletContext 

#### ServletContext 简介

根据标准，一个Host下可以部署多个Web Application，Web Application 都有一个`ServletContext`接口对象：

每一个`Context`都可以配置自己独立的资源，比如数据源资源。在具体项目目录的META-INF/，创建`context.xml`即可：
```XML
<?xml version='1.0' encoding='utf-8'?>

<Context docBase="demods" path="/demods" reloadable="true">
    <Resource name="jdbc/EmployeeDB"
        auth="Container"
        type="javax.sql.DataSource"
        username="dbusername"
        password="dbpassword"
        driverClassName="org.hsql.jdbcDriver"
        url="jdbc:HypersonicSQL:database"
        maxActive="8"
        maxIdle="4"
    />
</Context>
```

`Servlet`可以用之与`Servlet容器`通信，例如：
* 得到文件的MIME类型
* 转发请求
* 向日志文件写入日志消息。

`ServletContext`的具体表现就是Web服务器中一个已知路径的根。比如`http://localhost:8080/demo/`，这里demo便是。

#### ServletContext 参数

在`web.xml`文件中，还可以指定若干<context-param>元素来配置`ServletContext`的参数

```XML
<context-param>
    <param-name>url</param-name>
    <param-value>jdbc:microsoft:sqlserver://localhost:1433;databse=snptest</param-value>
</context-param>

<context-param>
    <param-name>contextConfigLocation</param-name>
    <param-value>/WEB-INF/applicationContext.xml</param-value>
</context-param>
```
如此，即可在`Servlet`中，通过
```Java
getServletContext().getInitParameter("paramName");
```
来获取之。

总之，如名字暗示的那样，`ServletContext`代表了`Servlet`的运行上下文环境。

#### ServletContext 的事件与监听器

与`ServletContext`相关的事件主要有两个：
* `生命周期`:`ServletContext`初始化、销毁，监听器为`ServletContextListener`
* `属性改变`:`ServletContext`的属性被增加、删除或者替换时发生，监听器为`ServletContextAttributeListener`

其中，`ServletContextListener`接口如下:

```Java
public interface ServletContextListener extends EventListener {

    /**
     * Receives notification that the web application initialization
     * process is starting.
     *
     * <p>All ServletContextListeners are notified of context
     * initialization before any filters or servlets in the web
     * application are initialized.
     *
     * @param sce the ServletContextEvent containing the ServletContext
     * that is being initialized
     */
    public void contextInitialized(ServletContextEvent sce);

    /**
     * Receives notification that the ServletContext is about to be
     * shut down.
     *
     * <p>All servlets and filters will have been destroyed before any
     * ServletContextListeners are notified of context
     * destruction.
     *
     * @param sce the ServletContextEvent containing the ServletContext
     * that is being destroyed
     */
    public void contextDestroyed(ServletContextEvent sce);
}
```



### Spring 的 ContextLoaderListener

Spring 加载其他配置文件是通过在`web.xml`中注册`ServletContextListener`实现的。

```XML
<listener>
    <listener-class>
        org.springframework.web.context.ContextLoaderListener
    </listener-class>
</listener>

```
Spring 提供的`ContextLoaderListener`是标准接口`javax.servlet.ServletContextListener`的一个实现。
用于加载其他配置文件到Spring应用上下文中。默认情况下，这个监听器会加载`WEB-INF/applicationContext.xml`配置文件。也可以手工指定这个配置文件名：

```XML
<context-param>
    <param-name>contextConfigLocation</param-name>
    <param-value>
        /WEB-INF/spitter-security.xml
        classpath:service-context.xml
        classpath:persistence-context.xml
        classpath:dataSource-context.xml
    </param-value>
</context-param>
```

## 小结

Spring WebMvc 启动流程主要是通过标准的`web.xml`部署描述符完成。

* 指定一切请求交由调度器`DipatcherServlet`根据相关配置（默认是`WEB-INF/${servlet-name}-servlet.xml`）处理。
* 通过`ServletContext`监听器`ContextLoaderListener`加载上下文配置文件（默认是`WEB-INF/applicationContext.xml`）。

