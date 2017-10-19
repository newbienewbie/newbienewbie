-- session table
CREATE TABLE `sessions` (
  `session_id` varchar(128)  NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` text ,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- wechat table
CREATE TABLE `wechat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_id` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `encoding_aes_key` varchar(255) DEFAULT NULL,
  `app_secret` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;