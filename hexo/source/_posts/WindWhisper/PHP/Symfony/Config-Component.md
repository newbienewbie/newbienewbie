---
title: 定义和处理配置文件
date: 2015-04-10 09:27:08
tags:
- Symfony

categories:
- 风语
- PHP
- Symfony
---



## 使用TreeBuilder定义Configuration Vaules的等级结构

TreeBuilder实例是被一个实现了`ConfigurationInterface`接口的定制的`Configuration`类返回的。

```PHP
namespace Acme\DatabaseConfiguration;

use Symfony\Component\Config\Definition\ConfigurationInterface;
use Symfony\Component\Config\Definition\Builder\TreeBuilder;

class DatabaseConfiguration implements ConfigurationInterface
{
    public function getConfigTreeBuilder()
    {
        $treeBuilder = new TreeBuilder();
        $rootNode = $treeBuilder->root('database');

        // ... add node definitions to the root of the tree

        return $treeBuilder;
    }
}
```

## 向Tree中增加节点定义

### NodeType

* scalar      # 通用类型，包括了booleans,strings,intergers,floats,和null
* boolean
* interger
* float
* enum        # 有限集
* array
* variable    # 无验证

### Numeric Node 约束

提供了`min()`和`max()`

```PHP
$rootNode
    ->children()
        ->integerNode('positive_value')
            ->min(0)
        ->end()
        ->floatNode('big_value')
            ->max(5E45)
        ->end()
        ->integerNode('value_inside_a_range')
            ->min(-50)->max(50)
        ->end()
    ->end()
;
```

### Enum Node

```PHP
$rootNode
    ->children()
        ->enumNode('gender')
            ->values(array('male','female'))
        ->end()
    ->end()
;
```

### Array Node

用以描述更深层次的等级结构,rootNode也算是这样一种数组结构：

```PHP
$rootNode
    ->children()
        ->arrayNode('connection')
            ->children()
                ->scalarNode('driver')->end()
                ->scalarNode('host')->end()
                ->scalarNode('username')->end()
                ->scalarNode('password')->end()
            ->end()
        ->end()
    ->end()
;

```

在定义arrayNode的children之前，可以使用以下选项：

* useAttributeAsKey() 
* requireAtLeastOneElememt()
* addDefaultsIfNotSet()

### 默认值和必填值

对于所有的node types，都可以设置默认值，并当一个节点有某些特定值的时候替换alues。

* `defaultValue()`
* `isRequired()`
* `cannotBeEmpty()`
* `default*()`      #(null,true,false) `defaultValue()`的shortcut
* `treat*Like()`    #(null,true,false) 当值是`*`的时候进行替换


```PHP

$rootNode
    ->children()

        ->arrayNode('connection')
            ->children()

                ->scalarNode('driver')
                    ->isRequired()
                    ->cannotBeEmpty()
                ->end()

                ->scalarNode('host')
                    ->defaultVaule('localhost')
                ->end()

                ->scalarNode('username')->end()
                ->scalarNode('password')->end()

                ->booleanNode()
                    ->defaultFalse()
                ->end()

            ->end()
        ->end()


        ->arrayNode('settings')
            ->addDefaultsIfNotSet()
            ->children()
                ->scalarNode('name')
                    ->isRequired()
                    ->cannotBeEmpty()
                    ->defaultValue('value')
                ->end()
            ->end()
        ->end()
        
    ->end()
;

```

### Documenting the option

`info()`方法可以用来生成文档。`config:dump-reference`


### appending sections

如果有一个复杂的配置，Tree可能变得非常大，你或许想要把它分割成多个部分。你可以把一个section作为独立的节点append到main tree中。


```PHP
public function getConfigTreeBuilder(){

    $TreeBuilder=new TreeBuilder;
    $rootNode=$treeBuilder->root('database');


    $rootNode
        ->children()
            ->arrayNode('connection')
                ->children()
                    ->scalarNode('driver')
                        ->isRequired()
                        ->cannotBeEmpty()
                    ->end()
                    ->scalarNode('host')
                        ->defaultValue('localhost')
                    ->end()
                    ->scalarNode('username')->end()
                    ->scalarNode('password')->end()
                    ->booleanNode('memory')
                        ->defaultFalse()
                    ->end()
                ->end()
                ->append($this->addParametersNode())
            ->end()
        ->end()
    ;
    return $treeBuilder;
}

public function addParametersNode(){

    $builder = new TreeBuilder();
    $node = $builder->root('parameters');

    $node
        ->isRequired()
        ->requiresAtLeastOneElement()
        ->useAttributeAsKey('name')
        ->prototype('array')
            ->children()
                ->scalarNode('value')->isRequired()->end()
            ->end()
        ->end()
    ;

    return $node;
}

```


### Normalization

标准化过程(normalization process)用于消除那些由于不同格式造成的不同，主要是YAML和XML。

在YAML中，keys中的典型分隔符是`_` ,而XML中的是 `-` ，例如 在YAML中`auto_connect` 在XML中是 `auto-connect`。
normalization 会把这些都变成`auto_connect`.

另外一个YAML和XML之间的区别是数组取值的表示方法。

YAML:
```YAML
twig:
    extensions: ['twig.extension.foo', 'twig.extension.bar']
```

XML:
```XML
<twig:config>
    <twig:extension>twig.extension.foo</twig:extension>
    <twig:extension>twig.extension.bar</twig:extension>
</twig:config>
```
这种复数的区别可以通过fixXmlConfig来消除：

```PHP
$rootNode
    ->fixXmlConfig('extension')
    ->children()
        ->arrayNode('extensions')
            ->prototype('scalar')->end()
        ->end()
    ->end()
;
```


