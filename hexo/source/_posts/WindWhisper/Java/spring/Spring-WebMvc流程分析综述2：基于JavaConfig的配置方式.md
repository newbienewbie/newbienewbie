---
title: Spring WebMvc流程分析综述2：基于JavaConfig的配置方式
date: 2016-10-19 00:56:29
tags:
- Java
- Spring 
- Spring WebMvc
categories:
- 风语
- Java
---

如[Spring-WebMvc流程分析综述1：基于XML的配置方式](/2016/10/18/WindWhisper/Java/spring/Spring-WebMvc流程分析综述1：基于XML的配置方式) 所述， Spring WebMvc提供了`DispatherServlet`作为MVC的`前端控制器`， 为了让相应的请求都被映射到这个Servlet来处理，需要对应用进行配置：
传统的方式是基于XML的`web.xml`配置方式。
然而这种方式非常啰嗦，而且难以在编译期发现错误，故现在大家更推崇的是基于`JavaConfig`的配置方式。

## 启动流程

### 新的标准——Servlet容器初始化器

对于Servlet 3.0环境而言，容器会在`classpath`中搜寻`javax.servlet.ServletContainerInitializer`接口(`SPI`)的实现类， 任何实现该 `SPI` 的类都会被用于配置`Servlet容器`，从而为避免使用`web.xml`的方式来配置提供了可能。

```Java
public interface ServletContainerInitializer
{
    void onStartup(Set<Class<?>> c, ServletContext ctx)
}
```

### Spring 提供的实现

Spring为此`SPI`提供了一个实现类`SpringServletContainerInitializer`，通过 JAR Services API `ServiceLoader.load(Class)` ，该实现类会被自动加载用于配置 `Servlet容器`。

`SpringServletContainerInitializer`会找出接口`WebApplicationInitializer`的实现类，然后委托他们去配置。 Spring3.2为`WebApplicationInitializer`引入了一个方便的基础类`AbstractAnnotationConfigDispatcherServletInitializer`。

吐槽：这个抽象类`AbastractAnnotationConfigDispatherServletInitializer`名字真长！但是想要记住也不是难事:
* Abstract :抽象类前缀
* AnnotationConfig :注解配置
* DispatcherServletInitalizer ：DispatcherServlet初始化器

根据继承关系，只要我们新建一个 `AbastractAnnotationConfigDispatherServletInitializer` 的子类，就会被自动加载用于配置容器。

这个类有三个重要的抽象方法:

* `getServletConfigClasses()`返回的配置类用于为`DispatherServlet`定义配置，其context多用于加载web组件，如controllers，view resolvers，handler mappings
* `getRootConfigClasses()`返回的配置类用于配置由`ContextLoaderListener`创建的application context，可用于加载非web 的components，如后端的中间层，数据层组件
* `getServletMappings()` 用于匹配映射


```Java
package config;

public class AppInit extends AbstractAnnotationConfigDispatcherServletInitializer
{

    // 注意这里返回了 DispatcherSerlvet 的配置类的信息
    @Override
    protected Class<?>[] getServletConfigClasses()
    {
        return new Class<?>[]{ServletConfig.class};
    }
    
    @Override
    protected Class<?>[] getRootConfigClasses()
    {
        return null ;
    }

    @Override
    protected String[] getServletMappings()
    {
        return new String[]{"/"};
    }

	
}
```

新建一个用于`ServletDispatcher`的配置类，注意类名应该和上文中的`getServletConfigClasses()`返回的Class数组匹配。

为了避免手工配置静态资源处理方式，这里选择继承`WebMvcConfigureAdapter`：

```Java
package config;

@Configuration
@ComponentScan("m1.controller")
@EnableWebMvc
public class ServletConfig extends WebMvcConfigurerAdapter
{

    @Override
    public void configureDefaultServletHandling(DefaultServletHandlerConfigurer configurer)
    {
        configurer.enable();
    }

    @Bean
    public ViewResolver viewResolver()
    {
        InternalResourceViewResolver resolver=new InternalResourceViewResolver();
        resolver.setPrefix("/WEB-INF/views/");
        resolver.setSuffix(".jsp");
        resolver.setExposeContextBeansAsAttributes(true);
        return resolver;
    }

}

```

总之，通过为标准的`javax.servlet.ServletContainerInitializer`接口提供实现`SpringServletContainerInitializer`,Spring会把工作委托给接口`WebApplicationInitializer`的实现类来完成。


## MVC处理

配置完毕，然后可以开始业务流程了。和基于XML配置一样，也是通过IoC机制获取相应的控制器和视图解析器，控制器返回一个视图逻辑名，经视图解析器解析得到视图对象。

控制器：
```Java
package m1.controller;



@Controller
@RequestMapping("/mycontroller")
public class MyController
{
    @RequestMapping(value = "/home")
    public String home(Map model)
    {
        model.put("k","fuck gfw");
        return  "home";
    }

}
```

控制器方法完成业务逻辑后对`Map`型参数`model`施加影响，并返回`视图逻辑名`。
前期配置的`视图解析器`将会根据`视图逻辑名`和`setExposeContextBeansAsAttributes(true)`情况生成`View类对象`。

与视图逻辑名`home`匹配的的视图文件：`/WEB-INF/views/home.jsp`

```HTML
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>JSP Page</title>
    </head>
    <body>
        <h1>home</h1>
        <p>
            ${k}
        </p>
    </body>
</html>
```