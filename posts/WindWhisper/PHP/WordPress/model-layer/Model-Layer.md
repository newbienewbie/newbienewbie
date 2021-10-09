---
layout: post
title: WordPress Model Layer
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


WordPress虽说并不和现代的MVC模式一致,但是也有独立的数据库操作层。

# 全局对象$wpdb

有一个全局对象$wpdb 作为WPINC/wp-db.php中的wpdb类实例对象。该类是
` WordPress Database Access Abstraction`。

可以用其他的类替换之。

## Adding Data 

利用$wpdb->insert()方法，此方法接受三个参赛：

1. 表名
2. 数组，字段的名和值对组成的数组
3. 数组，可选的格式

```PHP
$wpdb->insert(
   $wpdb->posts,
   array(
       'post_title'=>'xx',
       'post_content'=>'xx',
       'post_type'=>'xx',
   ),
   array("%s",%s","%s")
);
```

## update

利用$wpdb->update()方法，此方法接受5个参数：

1. 表名 
2. 新记录的数组表示，由各字段的名/值对组成的数组
3. where条件数组 
4. 数组,每个元素表示新记录中的值的格式
5. 数组，表示where条件数组的格式

```PHP
$wpdb->update(
    $wpdb->posts,
    array(
       'post_title'=>'new',
       'post_content'=>'new',
       'post_type'=>'new',
    ),
    array(
       'ID'=>$post_id,
    ),
    array("%s","%s"),
    array("%s")
);
```


## Delete
 
$wpdb->delte()方法可以用来删除行记录。 原型为
```PHP
public function delete( $table, $where, $where_format = null ) 
```
例如：
```PHP
$wpdb->delete( 'table', array( 'ID' => 1 ), array( '%d' ) );
```

## Retrieving


### 获取单个值
 

```PHP
$post_id=$wpdb->get_var(
    "select ID from ".$wpdb->posts." where post_author=1 limit 1"
);
```

### 获取一列值

```PHP
$wpdb->get_col(
    "select ID from ".$wpdb->posts." where post_author=1 ",
    ARRAY_A    # NULL|ARRAY_A|ARRAY_N,默认为object格式的返回值，
);
```

### 获取一行值

```PHP
$wpdb->get_row(
    "select * from ".$wpdb->users." where ID=43;",
    ARRAY_N    #NULL|ARRAY_A|ARRAY_N
);
```

### 获取完整的数据集

```PHP
$wpdb->get_results(
    "select * from ".$wpdb->users.a",
    ARRAY_N    #NULL|ARRAY_A|ARRAY_N
);
```

## 执行查询

```PHP
$wpdb->query(string SqlString);
```

## SQL 注入与防御

WordPress 使用`$wpdb->prepare()`防御SQL注入。此方法使用PHP printf()函数的语法为字段进行代换，
如同printf()那样，这里的占位符也可以使用排序索引。

```
$sanitized_sql=$wpdb->prepare(
    "'insert into my_plugin_table set field1=%1$d,$field2=$2$s,$field=%3$s,32',32,'Barzell','Washington,DC'"
);
$wpdb->query($sanitized_sql);
```



