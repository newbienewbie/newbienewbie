---
layout: post
title: Symfony Translation
date: 2015-04-10 09:27:08
tags:
- Symfony

categories:
- 风语
- PHP
- Symfony
---

 

翻译的过程可以理解为从消息`message`到译文`translation`的过程。Symfony/Translation这个组件的工作流程大致可以分为三步：

0. 创建翻译器
1. 为翻译器添加资源: `source`到`target`的消息映射关系
2. 根据`domain`、`locale`及对应的`message`给出译文`translation`。  

## 创建翻译器

翻译器的创建非常简单，仅需提供一个默认的`locale`值：

```PHP
use Symfony\Component\Translation\Translator;

$translator=new Translator('fr_FR');    #默认locale='fr_FR'
```

所谓`locale`，大致可以当成一个指代用户语言和国家/地区的字符串。推荐用
`ISO639-1LanguageCode_ISO3166-1Alpha-2CountryCode>`
这样的格式来表示。比如：`fr_FR`。

## 翻译资源的加载


### Translation Resources

Translation Resources定义了一组从源(`source`)到目标`target`的消息映射关系。这种映射关系可以用不同的形式来表达，比如XML：

```XML
<?xml version="1.0"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
    <file source-language="en" datatype="plaintext" original="file.ext">
        <body>
            <trans-unit id="1">
                <source>Symfony is great</source>
                <target>J'aime Symfony</target>
            </trans-unit>
            <trans-unit id="2">
                <source>symfony.great</source>
                <target>J'aime Symfony</target>
            </trans-unit>
        </body>
    </file>
</xliff>
```

又如YAML：
```YAML
Symfony is great: J'aime Symfony
symfony.great:    J'aime Symfony
```

再如PHP的Array：
```PHP
return array(
    'Symfony is great' => 'J\'aime Symfony',
    'symfony.great'    => 'J\'aime Symfony',
);
```

当然，还支持JSON等其他形式——只要他们表达了这种映射关系，即可以被当做一个Translation Resources。

#### 消息占位符

上面例子中的`%...%`这种表达（如`%name%`）是一种消息占位符。这种占位符机制可以动态映射一些message到translation。


#### 复数形式

借助占位符和管道符可以很好的表达复数形式。

```
'There is one apple|There are %count% apples'
```

有时候我们需要借助于区间获取更多的控制：

'{0} There are no apples|{1} There is one apple|]1,19] There are %count% apples|[20,Inf[ There are many apples'

区间表达遵循`ISO 311-11`的记法规则,可以是两端(可以借助于-Inf和+Inf表达正负无穷)之间的数字，还可以是有限个数字的集合如: 
```
{1,2,3}
```


### 资源加载的过程：

1. 设置资源加载器
2. 利用资源加载器加载资源

Symfony支持不同的资源加载方法，:

* ArrayLoader
* CsvFileLoader
* IcuDatFileLoader
* PhpFileLoader
* XliffFileLoader
* JsonFileLoader
* YamlFileLoader
* ...

所有的加载器都实现了LoaderInterface接口，其load()方法返回一个catalog以用作将来的翻译。

我们还可以设置定义自己的资源类型，比如采用

```
(source)(target)
```

这种形式，只要我们为之定义加载器：

```PHP
use Symfony\Component\Translation\MessageCatalogue;
use Symfony\Component\Translation\Loader\LoaderInterface;

class MyFormatLoader implements LoaderInterface
{
    public function load($resource, $locale, $domain = 'messages')
    {
        $messages = array();
        $lines = file($resource);

        foreach ($lines as $line) {
            if (preg_match('/\(([^\)]+)\)\(([^\)]+)\)/', $line, $matches)) {
                $messages[$matches[1]] = $matches[2];
            }
        }

        $catalogue = new MessageCatalogue($locale);
        $catalogue->add($messages, $domain);

        return $catalogue;
    }

}
```

加载Translation Resources的示例代码为:

```PHP
$translator->addLoader('xlf',new XliffFileLoader());
$translator->addResource('xlf','message.fr.xlf','fr_FR');    # 默认domain为'messages'
$translator->addResource('xlf','message.fr.xlf','fr_FR','admin');
$translator->addResource('xlf','navigation.fr.xlf','fr_FR','navigation');

```


## 翻译过程

翻译实际上是分成两步完成的：

1. 从translation resources中加载翻译好的message一览表(catalog)
2. 从catalog中定位message并返回对应的翻译。如果定位不到，则返回原始message。

可以通过调用`ITranslator`接口提供两个关键的方法`trans()`或者`transChoice()`来执行这个过程。

```PHP
public function trans($id, array $parameters = array(), $domain = null, $locale = null);
public function transChoice($id, $number, array $parameters = array(), $domain = null, $locale = null);
```

如果不提供locale，trans()方法在默认情况下会使用fallback的locale，

```PHP
$translator->trans('hello, %name%',array('name'=>'Chicago'),'admin','fr_FR');

$translator->transChoice(
    '{0} There are no apples|{1} There is one apple|]1,Inf[ There are %count% apples',
    10,
    array('%count%' => 10),
    'messages',
    'fr_FR'
);

```


## 例子

来自官方文档的[一个例子](http://symfony.com/doc/current/components/translation/usage.html)：

```PHP
use Symfony\Component\Translation\Translator;
use Symfony\Component\Translation\Loader\ArrayLoader;

$translator = new Translator('fr_FR');
$translator->addLoader('array', new ArrayLoader());
$translator->addResource('array', array(
    'Symfony is great!' => 'J\'aime Symfony!',
), 'fr_FR');

var_dump($translator->trans('Symfony is great!'))
```

## 在Symfony框架中使用翻译组件

Symfony框架集成了翻译功能，

翻译资源的位置在以下位置寻找（按照以下优先级）：

* `app/Resources/translations`
* `app/Resources/<bundle name>/translations` 
* `Path/to/SomeBundle/Resources/translations/` 

翻译资源文件的命名必须遵循这样的规则：

`domain.locale.loader`

domain是可选项；Symfony自带的loader包括xlf、php、yml等。例如：`FOSUserBundle.zh_CN.yml`、`validators.en.yml`等。

设想用户的`locale`是`fr_FR`，当要翻译“Symfony is great” 时，会按照以下顺序寻找：

1.  尝试寻找`fr_FR`对应的翻译资源,例如messages.fr_FR.xlf;
2.  如果第一步没找到，则会寻找`fr`对应的翻译资源,例如messages.fr.xlf;
3.  如果还没找到，则使用`fallbacks`对应的资源。

## 在Symfony框架集成的Twig模板中使用翻译组件

绝大部分时候，我们都是在在Symfony框架的Twig中使用翻译组件。

Twig提供了tags和filters支持翻译功能：

tags：
```Twig
{% trans with {'%name%': 'Fabien'} f
    rom "app" %}Hello %name%
{% endtrans %}
{% trans with {'%name%': 'Fabien'} from "app" into "fr" %}
    Hello %name%
{% endtrans %}
{% transchoice count with {'%name%': 'Fabien'} from "app" %}
    {0} %name%, there are no apples|{1} %name%, there is one apple|]1,Inf[ %name%, there are %count% apples
{% endtranschoice %}
```

filters:
```Twig
{{ message|trans }}
{{ message|transchoice(5) }}
{{ message|trans({'%name%': 'Fabien'}, "app") }}
{{ message|transchoice(5, {'%name%': 'Fabien'}, 'app') }}
```
