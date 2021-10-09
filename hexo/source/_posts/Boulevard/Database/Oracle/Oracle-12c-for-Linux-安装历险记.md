---
layout: post
title: Oracle 12c for Linux 安装历险记
date: 2017-03-22 12:03:14
tags:
- LDAP
- AD
categories:
- 大道
- 数据库
- Oracle
---

由于项目需要，申请搭建了个虚拟服务器。

硬件：

* Intel(R) Xeon(R) CPU E7-4830 v2 @ 2.20GHz，8核心 2处理器
* MemTotal:       32677076 kB

操作系统发行版：Oracle Linux Server release 6.8 （64位）

但是安装 Oracle Database 12c 数据库需要图形环境（当时不知道可以使用命令行的方式静默安装），下载好数据库，在建好相关账号、目录，修改内核参数之后，我让系统管理员开始双击执行`runInstaller`。
安装完毕系统管理员发来了消息：
> Oracle Enterprise Manager Database Express URL: https://EPBP:5500/em

然后我在命令行调用命令：
```
$ wget https://127.0.0.1:5500/em
--2017-03-21 12:40:24--  https://127.0.0.1:5500/em
正在连接 127.0.0.1:5500... 失败：拒绝连接。
```
发现貌似服务没起来，系统管理员表示现在可以自己敲命令了呀，又不需要图形化。好吧，人也确实很忙，再说我跟人不熟，也不好意思再麻烦别人。

添加`$ORACLE_HOME/bin`到`PATH`,发现`emca`工具未安装成功：
```
$ emca -version
Java HotSpot(TM) 64-Bit Server VM warning: ignoring option MaxPermSize=128M; support was removed in 8.0
Invalid syntax
```

在服务器上使用`sqlplus`简单测试：
```
$ sqlplus '/as sysdba'
SQL> select 2+2 from dual;

       2+2
----------
         4
```
其他`SQL`命令也正常，但是在本地通过`SQL Developer`尝试连接始终无法连接。

尝试重启启动
```
SQL> shutdown immediate
SQL> startup mount
```

依然不正常，接着尝试关掉监听器后再启动：
```
$ lsnrctl start

LSNRCTL for Linux: Version 12.2.0.1.0 - Production on 22-MAR-2017 11:20:44

Copyright (c) 1991, 2016, Oracle.  All rights reserved.

Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=EPBP)(PORT=1539)))
STATUS of the LISTENER
------------------------
Alias                     LISTENER
Version                   TNSLSNR for Linux: Version 12.2.0.1.0 - Production
Start Date                22-MAR-2017 11:18:50
Uptime                    0 days 0 hr. 1 min. 54 sec
Trace Level               off
Security                  ON: Local OS Authentication
SNMP                      OFF
Listener Parameter File   /home/oracle/app/oracle/product/12.2.0/dbhome_1/network/admin/listener.ora
Listener Log File         /home/oracle/app/oracle/diag/tnslsnr/EPBP/listener/alert/log.xml
Listening Endpoints Summary...
  (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=EPBP)(PORT=1539)))
  (DESCRIPTION=(ADDRESS=(PROTOCOL=ipc)(KEY=EXTPROC1521)))
The listener supports no services
The command completed successfully
```

注意到： 

> The listener supports no services 

数据库实例services没被注册监听，网上说可以手工注册解决：

> SQL> alter system register; 

经尝试，无果。

然后尝试直接修改监听器的配置文件 `/home/oracle/app/oracle/product/12.2.0/dbhome_1/network/admin/listener.ora`，
根据`sid`追加`SID_LIST_LISTENER`配置，指定`Global Database Name`和本地实例的`SID`信息：
 ```
LISTENER =
    (DESCRIPTION_LIST =
        (DESCRIPTION =
            (ADDRESS = (PROTOCOL = TCP)(HOST = EPBP)(PORT = 1539))
            (ADDRESS = (PROTOCOL = IPC)(KEY = EXTPROC1521))
        )
    )

SID_LIST_LISTENER =
    (SID_LIST =
        (SID_DESC =
            (GLOBAL_DBNAME = orcl)
            (SID_NAME = orcl)
        )
    )
```

重新加载配置文件：
```
$ lsnrctl reload

LSNRCTL for Linux: Version 12.2.0.1.0 - Production on 22-MAR-2017 11:26:31

Copyright (c) 1991, 2016, Oracle.  All rights reserved.

Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=EPBP)(PORT=1539)))
The command completed successfully
[oracle@EPBP ~]$ lsnrctl status

LSNRCTL for Linux: Version 12.2.0.1.0 - Production on 22-MAR-2017 11:26:38

Copyright (c) 1991, 2016, Oracle.  All rights reserved.

Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=EPBP)(PORT=1539)))
STATUS of the LISTENER
------------------------
Alias                     LISTENER
Version                   TNSLSNR for Linux: Version 12.2.0.1.0 - Production
Start Date                22-MAR-2017 11:20:58
Uptime                    0 days 0 hr. 5 min. 40 sec
Trace Level               off
Security                  ON: Local OS Authentication
SNMP                      OFF
Listener Parameter File   /home/oracle/app/oracle/product/12.2.0/dbhome_1/network/admin/listener.ora
Listener Log File         /home/oracle/app/oracle/diag/tnslsnr/EPBP/listener/alert/log.xml
Listening Endpoints Summary...
  (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=EPBP)(PORT=1539)))
  (DESCRIPTION=(ADDRESS=(PROTOCOL=ipc)(KEY=EXTPROC1521)))
Services Summary...
Service "orcl" has 1 instance(s).
  Instance "orcl", status UNKNOWN, has 1 handler(s) for this service...
The command completed successfully
```

这时候发现`orcl`服务已经有了一个实例运行，但是使用`Sql Developer`连接，报错：
> ORA-01033: ORACLE 正在初始化或关闭

直接在服务器上清除日志，打开数据库：
```
SQL> alter database clear logfile group 3;
SQL> alter database open ;
```

再次尝试连接，成功。
