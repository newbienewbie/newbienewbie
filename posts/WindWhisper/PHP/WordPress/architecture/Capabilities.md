---
layout: post
title: WordPress Capabilities
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


## 内置的Roles与Capabilities

WordPress内置了以下的角色(Roles)：

1. Super Admin
2. Administrator
3. Editor
4. Author
5. Contributor
6. Subscriber

没个角色都拥有特定的capabilities，诸如:read类、 edit类、 delete类、 publish类、 manage categories类、 manage links类、 moderate comments类、 upload files类、 remove users类等等。

WordPress中capabilities分为两种：

* permitive   表示一个指定角色能否做一件事儿
* meta     用于根据上下文语境来确定一个指定用户能否做一件事儿

二者的重要区别是，前者针对的是Role，是宽泛性的，常为复数；后者一般针对的是User，为单数。

`map_meta_cap()` translates a user's primitive capabilities to his/her meta capabilities.


## WordPress的用户-角色原理

### 基本思想

从本质上说，角色能力控制的基础是要表达这样的一种信息：

1. 角色集合的管理: 都有哪些角色？如何增加、删除和修改角色。
2. 角色能力管理: 都有哪些能力？如何增加、删除、和修改能力


可以表达为这样的PHP数组形式：

```PHP
array (

  	'role1' => array (
  		'name' => 'rolename1',
  		'capabilities' => array(
            'cap1'=>true,
            'cap2'=>false,
            //...
        )
  	),

  	'role2' => array (
  		'name' => 'rolename2',
  		'capabilities' => array(
            'cap1'=>true,
            'cap2'=>false,
            //...
        )
  	),

    //...

)
```

### 文件定义概述

为了实现上述功能，WordPress的`wp-includes/capabilities.php`文件定义了这样几个类：

* `WP_Roles`    # 管理一系列`WP_Role`的类，其有一个全局类实例`$wp_roles`
* `WP_Role`     # 管理一个角色的capabilities
* `WP_User`     # 管理用户

和这样的几个函数：

* `map_meta_cap($cap,$user_id)`
* `current_user_can($capability)`
* `current_user_can_for_blog( $blog_id, $capability )`
* `author_can($post,$capability)`
* `user_can($post,$capability)`
* `wp_roles()`         #获取全局的`WP_Roles`实例
* `get_role($role)`    #调用全局`WP_Roles`实例的`get_role($role)` 方法
* `add_role($role)`    #调用全局`WP_Roles`实例的`add_role($role)` 方法
* `remove_role($role)`    #调用全局`WP_Roles`实例的`remove_role($role)` 方法
* `get_super_admins()`                #获取超级管理员数组
* `is_super_admin($user_id=false)`    #是否是超级管理员

其中，`WP_Roles` 用于管理一组角色，`WP_Role`用于管理一个角色的各项能力。


## 用法：


### 检查用户的capability 

最实用的函数是：`current_user_can($capability)`，可以用来检查当前用户是否有做某件事的权限。

### 新建角色

当内置的角色不满足实际需求时，还可以自定义自己的角色：

* `wp_roles()`         #获取全局的`WP_Roles`实例
* `get_role($role)`    #调用全局`WP_Roles`实例的`get_role($role)` 方法
* `add_role($role)`    #调用全局`WP_Roles`实例的`add_role($role)` 方法
* `remove_role($role)`    #调用全局`WP_Roles`实例的`remove_role($role)` 方法

比如，要增加一个新的角色`photo_uploader`,默认的capability是`organize_gallery`:

```PHP
add_role('photo_uploader','Photo Uploader','organize_gallery');
```
要删除这个角色：

```PHP
remove_role('photo_uploader');
```

### 特定角色的capabilities管理

如果想给一个已经存在的特定角色添加capability，可以获取该角色`WP_Role`实例后再调用`add_cap()`方法:

```PHP
$role=get_role('author');
$role->add_cap('organize_gallery');
```

### 用户角色-能力管理

获取用户对象：

```PHP

//利用id获取用户对象
$user=new WP_User($id);

// 利用用户名获取用户对象
$user=new WP_User(null,$user_name);

```

管理用户的角色:

```PHP

//添加角色
$user->add_role($role);

//移除角色
$user->remove_role($role_name);

//设置角色(覆盖)
$user->set_role($role_name);

```


## WP_Roles类

`WP_Roles`是用来管理角色集合的，内部维护了具有之前提到的那种结构的`$roles`属性(PHP数组)，提供对一组角色进行管理的功能，当调用：

`add_role($role,$display_name,$capabilities=array())`

时，会优先检查该数组结构是否存在相应的$role是否已经存在，如果没有，再同步到数据库中，然后同步其他属性。

## WP_Role类

`WP_Role`类是非常简单的类，用于管理具体的角色都能做那些事。具有这样两个属性：

* name             # 此角色名 
* capabilities     # 此角色的能力集合

然后针对capabilities这个集合提供这样几个方法：

* `has_cap( $cap )`
* `add_cap( $cap, $grant=true )`
* `remove_cap( $cap )`



`WP_Roles`中为指定角色添加$capabilities`add_cap()`方法：
```
public function add_cap( $role, $cap, $grant = true ) {

    if ( ! isset( $this->roles[$role] ) )
        return;

    $this->roles[$role]['capabilities'][$cap] = $grant;
    if ( $this->use_db )
        update_option( $this->role_key, $this->roles );
}
```

本质上还是在操作$roles这个内部数组，然后同步到数据库中。


##  WP_User类

`WP_User`类用于管理一个用户的角色和能力。

