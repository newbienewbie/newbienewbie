---
layout: post
title: PHPCMS分析2-admin原理分析
date: 2015-04-13 11:57:08
tags:
- PHPCMS
- 源码分析

categories:
- 风语
- PHP
- PHPCMS
---

PHPCMS的通用后台程序还是非常漂亮的，这篇笔记将对其实现原理进行分析。

## 后台管理页面布局结构与技术原理

### 后台管理页面布局
PHPCMS后台管理页面总体上分为

* 顶部(主要含顶部菜单)
* 左部(主要含左部菜单）
* 右侧上部（当前位置）
* 右侧下部（内嵌iframe）

四大区域，如下图所示 {% asset_img "PHPCMS_admin_layout.png" "phpcms_admin_layout" %}

### 后台管理页面原理综述
后台管理页面从HTML结构上分为四大块

    * ul id="top_menu"
    * div id='leftMain'(利用index::left_menu方法获取）
    * span id=current_pos    (利用admin::current_pos方法获取)
    * iframe id=rightMain   (利用javascript动态改变iframe的src属性)

即每当访问index.php?m=admin的时候，会载入一个通用的index管理外壳（含顶部菜单、左部菜单、当前位置及一个iframe框架）。当用户点击管理外壳的顶部菜单或者左侧菜单时候，都会改变iframe的src属性，从而载入具体的内容页面。

对于后台管理功能，PHPCMS的设计者认为，用户的操作都应该通过index?m=admin提供的外壳进行,而不同像是前台页面那样通过地址栏里输入
```HTML
index.php?m=module&c=contorller&a=action&...
```
即可访问，所以PHPCMS设计者人为设定，``对于后台管理页面的请求都要求校验pc_hash``。通过index.php?m=admin提供的管理界面中的menu菜单访问的，会因带有pc_hash通过校验；否则，则会被拒之门外(提示[hash]数据验证失败)。
{% asset_img "pc_hash_failed.png" "[hash]数据验证失败" %}

对于具体的内容页面，头部往往还有对应于左侧相关菜单的子菜单，这是利用admin::submenu()方法获取的
为了代码重用，PHPCMS实现了一个admin管理类。


## admin管理类源码分析

admin类提供的方法大致分为

* 构造器方法
* 校验方法check_admin()、check_priv()、check_ip()、check_hash()
* 用于获取后台模板的位置的admin_tpl()
* 用于获取管理菜单数组的admin_menu()
* 用于获取当前位置的current_pos()
* 用于获取内嵌iframe内容页面的子菜单HTML代码的submenu()
* 其他功能方法，如日志方法etc.

### 构造器
主要是完成一系列诸如是否为管理员、是否有权限等检查操作,源码及分析如下：
```PHP
public function __construct() {

    self::check_admin();    //检查用户是否已经登录
    self::check_priv();    //检查该用户是否有该URL的权限（根据admin_role_priv_model表）
    pc_base::load_app_func('global','admin');
    if (!module_exists(ROUTE_M)) 
        showmessage(L('module_not_exists'));
    self::manage_log();
    self::check_ip();    //检查是否为被禁止的IP
    self::lock_screen(); 
    self::check_hash();    //检查pc_hash是否为会话中的pc_hash
    if(pc_base::load_config('system','admin_url') && 
        $_SERVER["HTTP_HOST"]!= pc_base::load_config('system','admin_url')
        )
    {
        Header("http/1.1 403 Forbidden");
        exit('No permission resources.');
    }
}
```

### 检查函数

检查函数主要包括check_admin、check_priv、check_hash、check_ip等，源码及分析见下

```PHP


//检查是否是管理员
final public function check_admin() {


    if(ROUTE_M =='admin' && 
        ROUTE_C =='index' && 
        in_array(ROUTE_A, array('login', 'public_card'))
    ){
        return true;
    } else { 
        //检查用户是登录为管理员
        $userid = param::get_cookie('userid');
        if(!isset($_SESSION['userid'])  ||
            !isset($_SESSION['roleid']) || 
            !$_SESSION['userid'] || 
            !$_SESSION['roleid'] || 
            $userid != $_SESSION['userid']
        ) 
            showmessage(L('admin_login'),'?m=admin&c=index&a=login');
    }
}


//检查该角色是否有目前正在访问的m、c、a的操作权限
final public function check_priv() {

    if(ROUTE_M =='admin' && ROUTE_C =='index' && in_array(ROUTE_A, array('login', 'init', 'public_card')))
        return true;

    //如果是超级管理员，pass
    if($_SESSION['roleid'] == 1) 
        return true;

    
    $siteid = param::get_cookie('siteid');
    $action = ROUTE_A;
    $privdb = pc_base::load_model('admin_role_priv_model');

    //如果是以public_开头的方法，pass
    if(preg_match('/^public_/',ROUTE_A)) 
        return true;

    //如果是以ajax_开头的方法，则只截取后半部分作为查询条件
    if(preg_match('/^ajax_([a-z]+)_/',ROUTE_A,$_match)) {
        $action = $_match[1];
    }

    //尝试获取有无m  c a roleid siteid都复合的权限记录
    $r =$privdb->get_one(array(
        'm'=>ROUTE_M,
        'c'=>ROUTE_C,
        'a'=>$action,
        'roleid'=>$_SESSION['roleid'],
        'siteid'=>$siteid
    ));
    if(!$r) 
        showmessage('您没有权限操作该项','blank');
}


//检查hash值，验证用户数据安全性
final private function check_hash() {

    //如果是公有方法、管理首页、登陆界面等不需要hash认证的，予以放行
    if(preg_match('/^public_/', ROUTE_A) || 
        ROUTE_M =='admin' && ROUTE_C =='index' || 
        in_array(ROUTE_A, array('login'))
    ){
        return true;
    }


    //不管是GET还是POST来的pc_hash,如果能和服务端pc_hash对应的上，则pass
    if(isset($_GET['pc_hash']) && 
        $_SESSION['pc_hash'] != '' && 
        ($_SESSION['pc_hash'] == $_GET['pc_hash'])
    ){
        return true;
    } elseif(
        isset($_POST['pc_hash']) && 
        $_SESSION['pc_hash'] != '' && 
        ($_SESSION['pc_hash'] == $_POST['pc_hash'])
    ){
         return true;
    } else {
         showmessage(L('hash_check_false'),HTTP_REFERER);
    }
}


//ip黑名单校验
final private function check_ip(){
    $this->ipbanned = pc_base::load_model('ipbanned_model');
    $this->ipbanned->check_ip();
}


```



### 管理模板的位置与管理菜单的数组

* admin_tpl()    返回后台管理模板的位置
* admin_menu()   返回某个菜单的子菜单数组

#### admin_tpl()
这个函数非常简单，用于加载相关模块的后台管理页面模板，默认是当前模块
```PHP
/**
 * 加载后台模板
 * @param string $file 文件名
 * @param string $m 模型名
 */
final public static function admin_tpl($file, $m = ''){
    ...
}
```

#### admin_menu()

根据当前用户角色的权限，在数据库中按父ID查找出菜单子项的信息，作为数组返回。实现的过程主要是先获取相关父菜单的所有子菜单，然后再筛选出当前角色有权限的菜单。源码分析如下：

```PHP
 /**
  * @param integer $parentid   父菜单ID  
  * @param integer $with_self  是否包括他自己
  */
final public static function admin_menu($parentid, $with_self = 0) {
    ...
    //获取其全部的子菜单
    $result =$menudb->select($where,'*',1000,'listorder ASC');
    if($with_self) {
        $result2[] = $menudb->get_one(array('id'=>$parentid));
        $result = array_merge($result2,$result);
    }


    //如果是超级管理员，全部返回
    if($_SESSION['roleid'] == 1) 
        return $result;

    //找出有权限的部分（根据admin_role_priv_model表）
    $array = array();
    $privdb = pc_base::load_model('admin_role_priv_model');
    $siteid = param::get_cookie('siteid');
    foreach($result as $v) {
        $action = $v['a'];

        //对于公有方法，放行通过
        if(preg_match('/^public_/',$action)) {
            $array[] = $v;

        } else {

            //对于ajax开头的方法，只截取后半部分方法名
            if(preg_match('/^ajax_([a-z]+)_/',$action,$_match)) 
                $action = $_match[1];

            //尝试获取当前角色$roleid是否有对应的m、c、a的操作权限记录
            $r = $privdb->get_one(array(
                'm'=>$v['m'],'c'=>$v['c'],'a'=>$action,'roleid'=>$_SESSION['roleid'],'siteid'=>$siteid
            ));
            if($r)
                $array[] = $v;
        }
    }
    return $array;
}
```
通过以上分析可以看出，PHPCMS的后台管理界面中，菜单是存储在menu数据表中的。当我们二次开发需要新增菜单时候，只需要在menu表中插入相应menu的id、name、parentid、m、c、a、data等信息即可。当然为了让除了超级管理员之外的角色可以访问该menu，还需要在admin_role_priv表中配置权限。

### 当前位置
利用递归，获取某一个menu的所有父菜单层级，作为HTML片段返回
```PHP
/**
  * @param $id 菜单id
  */
final public static function current_pos($id) {
    $menudb = pc_base::load_model('menu_model');
    $r =$menudb->get_one(array('id'=>$id),'id,name,parentid');
    $str = '';
    if($r['parentid']){
        $str = self::current_pos($r['parentid']);
    }
    return $str.L($r['name']).' > ';
}
```

### 子菜单

主要是用来生成相关菜单的所有子菜单导航（一般显示在iframe框架内容页的上部）

```PHP
/**
 * 获取菜单 头部菜单导航
 *
 * @param $parentid 菜单id
 */
final public static function submenu($parentid = '', $big_menu = false) {

    if(empty($parentid)){
        $menudb = pc_base::load_model('menu_model');
        $r = $menudb->get_one(array('m'=>ROUTE_M,'c'=>ROUTE_C,'a'=>ROUTE_A));
        $parentid = $_GET['menuid'] = $r['id'];
    }
    $array = self::admin_menu($parentid,1);
    $numbers = count($array);
    if($numbers==1 && !$big_menu) 
        return '';
    $string = '';
    $pc_hash = $_SESSION['pc_hash'];

    foreach($array as $_value){
        if (!isset($_GET['s'])) {
            $classname = 
                ROUTE_M == $_value['m'] && 
                ROUTE_C == $_value['c'] &&
                ROUTE_A == $_value['a'] ? 
                'class="on"' : '';
        } else {
            $_s = !empty($_value['data']) ? 
                str_replace('=', '', strstr($_value['data'], '=')) : '';
            $classname = ROUTE_M == $_value['m'] && 
                ROUTE_C == $_value['c'] && 
                ROUTE_A == $_value['a'] && 
                $_GET['s'] == $_s ?'class="on"' : '';
        }

        if($_value['parentid'] == 0 || $_value['m']=='') 
            continue;

        if($classname) {
            $string .= "<a href='javascript:;' $classname><em>".  
                L($_value['name']).
                "</em></a><span>|</span>";
        } else {
            $string .= "<a href='?m=".$_value['m'].  
                "&c=".$_value['c'].
                "&a=".$_value['a'].
                "&menuid=$parentid&pc_hash=$pc_hash".
                '&'.$_value['data'].
                "' $classname><em>".
                L($_value['name']).
                "</em></a><span>|</span>";
        }
    }
    $string = substr($string,0,-14);
    return $string;
}


```


## index.php控制器源码分析
控制器类index继承自admin类

### 左侧菜单实现原理

关于左侧菜单菜单生成，是在index控制器中，action名为public_menu_left()，核心代码为：

```PHP
include  $this->admin_tpl('left');
```

对应的left.tpl.php关键代码及其分析如下：

```PHP
foreach($datas as $_value){
    //输出菜单标题
    echo '<h3 class="f14"><span class="switchs cu on" title="'.
        L('expand_or_contract').
        '"></span>'.
        L($_value['name']).
        '</h3>';
    //输出子菜单列表
    echo '<ul>';    
    $sub_array = admin::admin_menu($_value['id']);
    foreach($sub_array as $_key=>$_m){
        //附加data参数
        $data = $_m['data'] ? '&'.$_m['data'] : '';
        if($menuid == 5) { //左侧菜单不显示选中状态
            $classname = 'class="sub_menu"';
        } else {
            $classname = 'class="sub_menu"';
        }
        //输出每个子菜单，并给每个子菜单添加JavaScript伪链接，格式类似于：
        //javascript:_MP(1002,'?m=content&c=create_html&a=category.$data');
        //$data是附加参数
        echo '<li id="_MP'.$_m['id'].'" '.$classname.'><a href="javascript:_MP('.$_m['id'].',\'?m='.$_m['m'].'&c='.$_m['c'].'&a='.$_m['a'].$data.'\');" hidefocus="true" style="outline:none;">'.L($_m['name']).'</a></li>';
    }
    echo '</ul>';
}
?>

<!--使菜单标题点击时有动画切换效果-->
<script type="text/javascript">
$(".switchs").each(function(i){
    var ul = $(this).parent().next();
    $(this).click(unction(){
        if(ul.is(':visible')){
            ul.hide();
            $(this).removeClass('on');
        }else{
            ul.show();
            $(this).addClass('on');
        }
    })
});
</script>
```

这样，左部菜单就能自动生成了，至于这些菜单的动作执行，是通过JavaScript伪链接完成的，其核心函数为_MP(menuid,targetUrl)：
```JavaScript
function _MP(menuid,targetUrl) {

    $("#menuid").val(menuid);
    $("#paneladd").html('<a class="panel-add" href="javascript:add_panel();"><em>添加</em></a>');

    //更新iframe的内容
    $("#rightMain").attr('src', targetUrl+'&menuid='+menuid+'&pc_hash='+pc_hash);

    //更新表示当前位置的字符串
    $('.sub_menu').removeClass("on fb blue");
    $('#_MP'+menuid).addClass("on fb blue");
    $.get(
        "?m=admin&c=index&a=public_current_pos&menuid="+menuid,
        function(data){
            $("#current_pos").html(data+'<span id="current_pos_attr"></span>');
        }
    );
    $("#current_pos").data('clicknum', 1);

    //显示来自v9官方站点的帮助信息，默认会同源策略屏蔽掉
     show_help(targetUrl);
}
```
但是这只是更新了iframe的内容，左侧的菜单是怎么更新的呢：

```JavaScript
function _Site_M(project) {
    var id = '';
    $('#top_menu li').each(function (){
        var S_class = $(this).attr('class');
        if ($(this).attr('id')){
            $(this).hide();
        }
        if (S_class=='on top_menu' || S_class=='top_menu on'){
            id = $(this).attr('id');
        }
    });

    $('#'+id).show();
    id = id.substring(2, id.length);
    if (!project){
        project = 0; 
    }
    $.ajaxSettings.async = false; 
    $.getJSON(
        'index.php', 
        {m:'admin', c:'index', a:'public_set_model', 'site_model':project, 'time':Math.random()}, 
        function (data){
            $.each(data, function(i, n){
                $('#_M'+n).show();
            })
        }
    )
    //更新左侧菜单内容块
    $("#leftMain").load(
        "?m=admin&c=index&a=public_menu_left&menuid="+id
        +'&time='+Math.random()
    );
}
```

## iframe嵌入文件的header源码分析

一个嵌入的模板，大多会在顶部调用代码:
```PHPCMS
include $this->admin_tpl('header', 'admin');
```
而这个admin/templates/header.tpl.php模板文件，分为三大部分：

1. 加载各类css、javascript文件，
2. 一段用于为各个锚定和表单添加pc_hash的javascript代码：
3. 加载submenu的PHP脚本：

为所有锚定和表单添加pc_hash源码及其分析为：
```PHP
<script type="text/javascript">

window.focus();
var pc_hash = '<?php echo $_SESSION['pc_hash'];?>';

<?php if(!isset($show_pc_hash)) { ?>

    window.onload = function(){

        //为各<a>元素的href属性中添加pc_hash
        var html_a = document.getElementsByTagName('a');
        var num = html_a.length;
        for(var i=0;i<num;i++) {
            var href = html_a[i].href;
            if(href && href.indexOf('javascript:') == -1) {
            if(href.indexOf('?') != -1) {
            html_a[i].href = href+'&pc_hash='+pc_hash;
            } else {
            html_a[i].href = href+'?pc_hash='+pc_hash;
            }
            }
        }

        //为各form元素添加一个隐藏的pc_hash字段
        var html_form = document.forms;
        var num = html_form.length;
        for(var i=0;i<num;i++) {
            var newNode = document.createElement("input");
            newNode.name = 'pc_hash';
            newNode.type = 'hidden';
            newNode.value = pc_hash;
            html_form[i].appendChild(newNode);
        }
    }
<?php } ?>
</script>
```

加载当前菜单的子菜单导航HTML片段的源码及其分析为：
```PHP
<?php if(!isset($show_header)) { ?>
    <div class="subnav">
    <div class="content-menu ib-a blue line-x">
    <?php 
        if(isset($big_menu)) { 
            echo '<a class="add fb" href="'.$big_menu[0].'">'.
            '<em>'.$big_menu[1].'</em>'.
            '</a>　';
        } else {
            $big_menu = '';
        }
    ?> 
    <?php echo admin::submenu($_GET['menuid'],$big_menu); ?> 
    </div>
    </div>
<?php } ?>
```
