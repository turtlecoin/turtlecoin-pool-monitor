CREATE TABLE IF NOT EXISTS `pools` (
  `id` VARCHAR(64) NOT NULL, 
  `name` VARCHAR(255) NOT NULL, 
  `url` VARCHAR(255) NOT NULL, 
  `api` VARCHAR(255) NOT NULL, 
  `type` VARCHAR(255) NOT NULL, 
  `miningAddress` VARCHAR(255) NOT NULL, 
  `mergedMining` INT(1) NOT NULL DEFAULT 0, 
  `mergedMiningIsParentChain` INT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `type` (`type`), 
  KEY `mergedMining` (`mergedMining`), 
  KEY `mergedMiningIsParentChain` (`mergedMiningIsParentChain`)
) engine = innodb DEFAULT charset = utf8 ROW_FORMAT = COMPRESSED;

CREATE TABLE `pool_polling` (
  `id` VARCHAR(64) NOT NULL, 
  `timestamp` BIGINT(1) UNSIGNED NOT NULL, 
  `height` BIGINT(20) NOT NULL DEFAULT 0, 
  `hashrate` BIGINT(20) NOT NULL DEFAULT 0, 
  `miners` BIGINT(20) NOT NULL DEFAULT 0, 
  `fee` DOUBLE NOT NULL DEFAULT 0, 
  `minPayout` BIGINT(20) NOT NULL DEFAULT 0, 
  `lastBlock` BIGINT(20) NOT NULL DEFAULT 0, 
  `donation` DOUBLE NOT NULL DEFAULT 0, 
  `status` INT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`, `timestamp`), 
  KEY `status` (`status`), 
  KEY `lastBlock` (`lastBlock`)
) engine = innodb DEFAULT charset = utf8 ROW_FORMAT = COMPRESSED;

CREATE TABLE `pool_blocks` (
  `hash` varchar(64) NOT NULL,
  `height` bigint(20) NOT NULL,
  `id` varchar(64) NOT NULL,
  PRIMARY KEY (`hash`),
  KEY `id` (`id`),
  KEY `height` (`height`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=COMPRESSED;
