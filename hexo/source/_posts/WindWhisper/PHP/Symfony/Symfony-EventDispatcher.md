---
layout: post
title: Symfony EventDispather
date: 2015-04-10 09:27:08
tags:
- Symfony

categories:
- 风语
- PHP
- Symfony
---



## Event和EventDispatcher

Event是什么？

其实很简单，Event是用于描述“what happens?” 的东西。正因为此，Event对象中通常包含了一些数据，用来表示发生了什么。事实上，事件对象只是在描述发生了什么—准确的说，事件对象提供了一个接口，让别人知道发生了什么。

Symfony/EventDispather 提供了Event基础类来描述“What Happens”，这个基础类非常简单，只是对以下信息进行抽象：

* Event调度器是谁？（dispatcher属性及getter/setter）
* Event是否还能传播？（propagationStopped属性及getter/setter）
* Event叫什么名字？（deprecated:name属性及getter/setter））

对于包含特殊信息的特定事件，可以继承自Event类，再添加自己对该类事件的特殊属性的抽象。比如：

```PHP
class FilterOrderEvent extends Event{

    protected $order;
	public function __construct(){
	    $this->order=$order;
	}
	
	public function getOrder(){
	    return $this->getOrder();
	}

}
```

这样，FilterOrderEvent事件除了包含Event基础类中那些对发生了什么的描述，还增加了对order这类信息的描述（提供了getOrder()接口让其他人获取Order对象）。

再比如，Symfony/Form组件中的FormEvent类，除了基础的Event属性外，还添加了两个额外属性:

```PHP
class FormEvent extends Event
{
    private $form;
    protected $data;
    
    public function __construct(FormInterface $form, $data)
    {
        $this->form = $form;
        $this->data = $data;
    }
    
    //....
}
```

一个是实现了FormInterface的表单对象$form，代表与当前事件相关的是哪个表单;一个是混合类型的$data参数，用于对特定数据的动态修改，如modelData之类。

很多时候，我们并不仅仅想知道发生了什么，我们还想根据发生了什么做出相应的动作。关于这一点，可以参见Wiki给出的Event定义：

> In computing, an event is an action or occurrence detected by the program that may be handled by the program 

这段话说明了一点很重要的东西：事件应当可以被检测、处理。通常由事件监听器(event listener)或者说事件处理器(event handle)来完成这一工作。

Symfony/EventDispather组件提供了这类对事件发布、调度、监听的功能。

EventDispather对象的dispatch()方法会根据某一个事件对应的Listeners,按优先级逐一进行调用。EventDispather支持两套风格事件处理程序的绑定。最常用的是addListener(),这是一种快速编码的回调风格，类似于JavaScript中的回调函数。还有一种使用Subscriber对象的风格。

## 使用具有回调风格的Listener

添加监听器的方法原型为：
```PHP
addListener($eventName,$listener,$priority=0)
```

这一方法的关键特征是:传递给addListener的第二个参数是一个callable对象。这十分类似于JavaScript的回调函数:

```PHP

$dispather->addListener(
    'foo.action',
    array($listener,'onFooAction')       //a PHP callable
);

$dispather->addListener(
    'bar.action',
    function(Event $event){              //a PHP callable
        //...
    }
);
```

## 使用EventSubscriber对象

EventDispather还支持另外一种风格的监听绑定：

```PHP
addSubscriber(EventSubscriberInterface $subscriber);
```
此方法接受一个实现了EventSubscriberInterface接口的对象作为参数。该接口非常简单：


```PHP
interface EventSubscriberInterface
{
    public static function getSubscribedEvents();
}
```
   
接口方法getSubscribedEvents()返回一个数组，该数组可以是三种方式中的一种：
    
 * array('eventName' => 'methodName')
 * array('eventName' => array('methodName', $priority))
 * array('eventName' => array(array('methodName1', $priority), array('methodName2'))
    
addSubscriber()方法会自动检测接收到的$subscriber对象并解析出合适的方法名，再通过过addListener()方法完成事件绑定监听。其源码及实现分析如下：

```PHP

    public function addSubscriber(EventSubscriberInterface $subscriber)
    {
        foreach ($subscriber->getSubscribedEvents() as $eventName => $params) {

            //$subscripter->getSubscribedEvents   返回的数组类似于: 
            //    array(
            //        'eventName'=>"methodName",
            //         //... 
            //    )
            if (is_string($params)) {
                $this->addListener($eventName, array($subscriber, $params));
            }

            //$subscripter->getSubscribedEvents   返回的数组类似于: 
            //    array(
            //        'eventName'=>array("methodName",$priority),
            //         //... 
            //    )
             elseif (is_string($params[0])) {      
                $this->addListener($eventName, array($subscriber, $params[0]), isset($params[1]) ? $params[1] : 0);
             } 

            //$subscripter->getSubscribedEvents   返回的数组类似于: 
            //    array(
            //        'eventName'=>array(
            //            array("methodName1",$priority)
            //            array("methodName22")
            //         ),
            //        //... 
            //    )
             else {
                foreach ($params as $listener) {
                    $this->addListener($eventName, array($subscriber, $listener[0]), isset($listener[1]) ? $listener[1] : 0);
                }
            }
        }
    }
```

可以看到，addSubscriber()始终都是把形如`array($subscriber,$methodName)`这样的callable传递给addListener。显而易见，一个Subscrber应该有如下的类似形式：

```PHP
class StoreSubscriber implements EventSubscriberInterface{
    
    public static function getSubscribedEvents(){
        return array(
            'kernel.repsonse'=>array(
                array('onKernelResponsePre',10),
                array('onKernelResponseMid',5),
                array('onKernelResponsePost',0),
            ),
            'store.order'=>array('onStoreOrder',0)
        );
    }


    public static function onKernelResponsePre{
        //...
    }

    public static function onKernelResponseMid{
        //...
    }

    public static function onKernelResponsePost{
        //...
    }

    public static function onStoreOrder{
        //...
    }
}
```

这种十分类似于Java Swing中事件监听接口，比如MouseListener类：
```Java
button.addMouseListener(new MouseListener() {

    @Override
    public void mouseClicked(MouseEvent e) {
        System.out.println("mouseClicked");
    }

    @Override
    public void mousePressed(MouseEvent e) {
        System.out.println("鼠标被按住");
    }


    @Override
    public void mouseReleased(MouseEvent e) {
        System.out.println("鼠标被释放");

    }

    @Override
    public void mouseEntered(MouseEvent e) {

        System.out.println("鼠标被进入");
    }

    @Override
    public void mouseExited(MouseEvent e) {
        System.out.println("鼠标被退出");
    }
});
```

Symfony中的EventSubscriber对象为一组事件监听器提供了良好的组织形式，使得代码更具有可读性。




