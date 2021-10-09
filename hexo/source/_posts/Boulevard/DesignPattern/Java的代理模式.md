---
layout: post
title: Java的代理模式
date: 2016-10-23 22:32:48
tags:
- Java
- 设计模式
- 代理模式
- AOP
- 反射
categories:
- 大道
- 设计模式
---


代理模式和 [AOP](http://www.itminus.com/tags/AOP/) 是息息相关的。要理解代理模式，必须先理解代理模式要解决的是什么问题。

## 静态代理模式

考虑有这样一个例子，我们需要给某一个类组件（索性叫目标`Bean`吧）添加一些与之无关的功能。怎么办？

装饰器模式和静态代理没啥好说的，过于简单，暂时略过。

## 动态代理模式

再考虑上文中所述需要为目标`Bean`添加不相干的功能的问题。毫无疑问，静态代理可以解决一部分问题———对需要扩展的方法挨个添加扩展代码即可。问题在于，如果目标`Bean`需要扩展的方法有很多，而且要扩展的功能都相似呢？挨个添加代码岂不是会违反`DRY`原则？

基于反射原理，利用动态代理模式，可以轻松解决这一问题。
考虑一个接口，
```Java
public interface Monster {
    void attack();
    void escape();
}
```

某个实现(也就是我们研究的问题中的目标`Bean`)为:
```Java
public class CrazyDog implements Monster{

    @Override
    public void escape() {
        System.out.println("Wait a minute ! I will be back soon!");
    }

    @Override
    public void attack() {
        System.out.println("Launch an attack : I will bite you");
    }

}
```

现在我们通过实现接口`InvocationHandler`构建一个方法调用的处理器对象，然后用之创建代理，从而对这个目标`Bean`进行功能扩展。
```Java
public class MonsterProxyFactory {

    public static Monster create() {
        Monster animal = new CrazyDog();
        Object proxyObj = Proxy.newProxyInstance(
            animal.getClass().getClassLoader(),
            animal.getClass().getInterfaces(),
            new InvocationHandler() {
                public Object invoke(Object proxy, Method method, Object[] args) {
                    try {
                        System.out.println("before "+proxy.getClass()+"::" + method.getName());
                        Object ret = method.invoke(animal, args);
                        System.out.println("after " +proxy.getClass()+"::" + method.getName());
                        return ret;
                    } catch (IllegalArgumentException e) {
                        e.printStackTrace();
                        return null;
                    } catch (IllegalAccessException e) {
                        e.printStackTrace();
                        return null;
                    } catch (InvocationTargetException e) {
                        e.printStackTrace();
                        return null;
                    }
                }
            }
        );
        Monster animalProxy = (Monster) proxyObj;
        return animalProxy;
    }
}
```

调用：
```Java
public class Main {
    public static void main(String[] args) {
        Monster monster=MonsterProxyFactory.create();
        monster.attack();
        monster.escape();
        monster.hashCode();
    }
}
```

输出为:
```
before class com.sun.proxy.$Proxy0::attack
Launch an attack : I will bite you
after class com.sun.proxy.$Proxy0::attack
before class com.sun.proxy.$Proxy0::escape
Wait a minute ! I will be back soon!
after class com.sun.proxy.$Proxy0::escape
before class com.sun.proxy.$Proxy0::hashCode
after class com.sun.proxy.$Proxy0::hashCode
```
