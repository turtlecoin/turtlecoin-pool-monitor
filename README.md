[![NPM](https://nodei.co/npm/turtlecoin-pool-monitor.png?downloads=true&stars=true)](https://nodei.co/npm/turtlecoin-pool-monitor/)

<h1 align="center"></h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.0.1-blue.svg?cacheSeconds=2592000" />
  <a href="https://github.com/turtlecoin/turtlecoin-pool-monitor#readme">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-meh-brightgreen.svg" target="_blank" />
  </a>
  <a href="https://github.com/turtlecoin/turtlecoin-pool-monitor/graphs/commit-activity">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" target="_blank" />
  </a>
  <a href="https://github.com/turtlecoin/turtlecoin-pool-monitor/blob/master/LICENSE">
    <img alt="License: AGPL-3.0" src="https://img.shields.io/badge/License-AGPL-yellow.svg" target="_blank" />
  </a>
  <a href="https://twitter.com/ ">
    <img alt="Twitter:  " src="https://img.shields.io/twitter/follow/_turtlecoin.svg?style=social" target="_blank" />
  </a>
</p>

## Prerequisites

* pool.js >= 6.x
* MySQL/MariaDB
  * Load the [database schema](#database-schema)

## Install



### Collection Service

```sh
npm install -g turtlecoin-pool-monitor
export MYSQL_HOST=<server ip>
export MYSQL_PORT=<server port>
export MYSQL_USERNAME=<server username>
export MYSQL_PASSWORD=<server password>
export MYSQL_DATABASE=<database>
turtlecoin-pool-monitor
```

#### Additional Options

```sh
export MYSQL_SOCKET=<server socket path (default: not set)>
export MYSQL_CONNECTION_LIMIT=<# of maximum server connections (default: 10)>
export HISTORY_DAYS=<# of days to keep history (default: 6 hours)>
export UPDATE_INTERVAL=<# of seconds between updating pool list (default: 1 hour)>
export POLLING_INTERVAL=<# of seconds between checking pools (default: 15s)>
export POOL_LIST_URL=<Full URL to pool list (default: turtlecoin-pools-json)>
```

### As a Module for Pulling Stats

```sh
npm install --save turtlecoin-pool-monitor
```

#### Sample Code

```javascript
const StatsDatabase = require('turtlecoin-pool-monitor')

const db = new StatsDatabase({
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'password',
  database: 'turtlecoin',
  connectionLimit: 10
})

db.getPoolStats().then((stats) => {
  console.log(stats)
})
```

## Database Schema

```sql
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
```

## Author

**The TurtleCoin Developers**

* Twitter: [@turtlecoin](https://twitter.com/_turtlecoin )
* Github: [@turtlecoin](https://github.com/turtlecoin)

## License

Copyright © 2019 [The TurtleCoin Developers](https://github.com/turtlecoin).<br />
This project is [AGPL-3.0](https://github.com/turtlecoin/cryptodira/blob/master/LICENSE) licensed.
