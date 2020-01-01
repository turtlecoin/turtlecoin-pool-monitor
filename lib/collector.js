// Copyright (c) 2019, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const Crypto = require('crypto')
const DatabaseBackend = require('./databaseBackend.js')
const EventEmitter = require('events').EventEmitter
const Metronome = require('node-metronome')
const request = require('request-promise-native')
const TurtleCoind = require('turtlecoin-rpc').TurtleCoind
const util = require('util')

class Collector extends EventEmitter {
  constructor (opts) {
    super()
    opts = opts || {}
    this.poolList = opts.poolList || false
    this.pollingInterval = opts.pollingInterval || 60 // 1 minute
    this.updateInterval = opts.updateInterval || (60 * 60) // 1 hour
    this.historyDays = opts.historyDays || 0.25 // 6 hours

    if (!this.poolList) throw new Error('Must supply url to pool list')

    this.database = new DatabaseBackend(opts.database || {})

    this.daemon = new TurtleCoind(opts.daemon || {})

    var poolListCache = []

    this.pollingTimer = new Metronome(this.pollingInterval * 1000)
    this.pollingTimer.pause = true
    this.pollingTimer.on('tick', () => {
      const timestamp = parseInt((new Date()).getTime() / 1000)

      const promises = []

      poolListCache.forEach(pool => promises.push(this.poolStatus(pool)))

      return Promise.all(promises)
        .then(responses => { if (responses.length !== 0) return this.database.savePoolsPolling(timestamp, responses) })
        .then(() => this.emit('info', util.format('Saved polling event for %s pools in the database', poolListCache.length)))
        .catch(err => this.emit('error', util.format('Could not save polling event for %s pools in the database: %s', poolListCache.length, err.toString())))
    })

    this.blockPollingTimer = new Metronome(this.pollingInterval * 1000)
    this.blockPollingTimer.pause = true
    this.blockPollingTimer.on('tick', () => {
      const promises = []

      poolListCache.forEach(pool => promises.push(this.poolBlocks(pool)))

      return Promise.all(promises)
        .then(responses => { if (responses.length !== 0) return this.database.savePoolsBlocks(responses) })
        .then(() => this.emit('info', util.format('Saved blocks polling event for %s pools in the database', poolListCache.length)))
        .catch(err => this.emit('error', util.format('Could not save blocks polling event for %s pools in the database: %s', poolListCache.length, err.toString())))
    })

    this.updateTimer = new Metronome(this.updateInterval * 1000)
    this.updateTimer.pause = true
    this.updateTimer.on('tick', () => {
      return getList(this.poolList)
        .then(list => { poolListCache = list })
        .then(() => this.emit('update', poolListCache))
        .catch(err => this.emit('error', util.format('Could not update the public pool list: %s', err.toString())))
    })

    this.updateTimer.on('tick', () => {
      const currentTimestamp = parseInt((new Date()).getTime() / 1000)
      const historySeconds = this.historyDays * 24 * 60 * 60
      const cutoff = currentTimestamp - historySeconds

      return this.database.cleanPollingHistory(cutoff)
        .then(() => this.emit('info', util.format('Cleaned old polling history before %s', cutoff)))
        .catch(err => this.emit('error', util.format('Could not clear old history from before %s: %s', cutoff, err.toString())))
    })

    this.on('update', (pools) => {
      return this.database.savePools(pools)
        .then(() => this.emit('info', util.format('Saved %s pools in the database', pools.length)))
        .catch(err => this.emit('error', util.format('Could not save %s pools in the database: %s', pools.length, err.toString())))
    })
  }

  list () {
    return getList(this.poolList)
  }

  poolBlocks (pool) {
    return getPoolBlocks(this.daemon, pool)
  }

  poolStatus (pool) {
    return getPoolStatus(pool)
  }

  start () {
    this.pollingTimer.pause = false
    this.blockPollingTimer.pause = false
    this.updateTimer.pause = false
    this.updateTimer.tick()
  }

  stop () {
    this.pollingTimer.pause = true
    this.blockPollingTimer.pause = true
    this.updateTimer.pause = true
  }
}

function getList (url) {
  return request({
    uri: url,
    json: true
  })
    .then((response) => {
      if (response.pools) {
        for (var i = 0; i < response.pools.length; i++) {
          response.pools[i].id = getPoolId(response.pools[i])
          response.pools[i].mergedMining = (response.pools[i].mergedMining) ? 1 : 0
          response.pools[i].mergedMiningIsParentChain = (response.pools[i].mergedMiningIsParentChain) ? 1 : 0
          response.pools[i].type = response.pools[i].type.toLowerCase()
          response.pools[i].height = 0
          response.pools[i].hashrate = 0
          response.pools[i].miners = 0
          response.pools[i].fee = 0
          response.pools[i].minPayout = 0
          response.pools[i].lastBlock = 0
          response.pools[i].donation = 0
          response.pools[i].status = 0
        }
        return response.pools
      } else {
        throw new Error('Pool list not found')
      }
    })
}

async function getBlocksInfoByHeight (daemon, blocks) {
  if (!Array.isArray(blocks)) return []

  for (var i = 0; i < blocks.length; i++) {
    try {
      const data = await daemon.blockHeaderByHeight(blocks[i].height)

      if (data.hash === '0') {
        delete blocks[i]
      } else {
        blocks[i].hash = data.hash
      }
    } catch (e) {
      delete blocks[i]
    }
  }

  return blocks.sort((a, b) => (a.height > b.height) ? 1 : -1).reverse()
}

function getPoolBlocks (daemon, pool) {
  function fetch (url, payload) {
    if (payload) return post(url, payload)

    return request({
      url: url,
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })
      .then(response => {
        if (pool.type === 'node.js' && !Array.isArray(response)) return []
        if (pool.type === 'forknote' && (!response || !response.pool || !response.pool.blocks)) return []

        const blocks = []

        if (pool.type === 'node.js') {
          response.forEach(item => blocks.push({ hash: item.hash, height: item.height }))
        } else if (pool.type === 'forknote') {
          response = response.pool.blocks

          for (var i = 0; i < response.length; i++) {
            const hash = response[i].split(':').slice(0, 1).join('')
            const height = parseInt(response[++i])

            blocks.push({ hash, height })
          }
        }

        return blocks.sort((a, b) => (a.height > b.height) ? 1 : -1).reverse()
      })
      .catch(() => { return false })
  }

  function post (url, payload) {
    return request({
      url: url,
      method: 'post',
      json: true,
      timeout: 10000,
      rejectUnauthorized: false,
      body: payload
    })
      .then(response => {
        if (!Array.isArray(response.MinedBlocks)) return []

        const blocks = []

        response.MinedBlocks.forEach(item => blocks.push({ hash: false, height: item.Height }))

        return blocks.reverse()
      })
      .catch(() => { return false })
  }

  var url
  var payload = false

  if (pool.type === 'forknote') {
    url = util.format('%sstats', pool.api)
  } else if (pool.type === 'node.js') {
    url = util.format('%spool/blocks?page=0&limit=30', pool.api)
  } else if (pool.type === 'other' && pool.api.indexOf('cryptonote.social') !== -1) {
    url = 'https://cryptonote.social/json/MinedBlocks'
    payload = { Coin: 'trtl' }
  } else if (pool.type === 'other') {
    return {
      pool,
      error: 'Unknown pool type'
    }
  }

  return fetch(url, payload)
    .then(response => {
      if (!response) return []

      if (pool.type === 'other') return getBlocksInfoByHeight(daemon, response.splice(0, 30))

      return response
    })
    .then(blocks => { pool.blocks = blocks })
    .then(() => { return pool })
    .catch(() => { return pool })
}

function getPoolStatus (pool) {
  function fetch (url) {
    return request({
      url: url,
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })
      .catch(() => { return {} })
  }

  const promises = []

  if (pool.type === 'forknote') {
    promises.push(fetch(pool.api + 'stats'))
  } else if (pool.type === 'node.js') {
    promises.push(fetch(pool.api + 'pool/stats'))
    promises.push(fetch(pool.api + 'network/stats'))
    promises.push(fetch(pool.api + 'config'))
  } else if (pool.type === 'other') {
    promises.push(fetch(pool.api))
  }

  if (promises.length === 0) {
    return {
      pool: pool,
      error: 'Unknown Pool Type'
    }
  }

  return Promise.all(promises)
    .then(responses => {
      if (!responses) return

      responses.forEach(response => {
        if (!response) return
        if (Object.keys(response).length === 0) return

        if (pool.type === 'forknote') {
          pool.height = parseInt(response.network.height)
          pool.hashrate = parseInt(response.pool.hashrate)
          pool.miners = parseInt(response.pool.miners)
          pool.fee = parseFloat(response.config.fee)
          pool.minPayout = parseInt(response.config.minPaymentThreshold)
          pool.lastBlock = parseInt(response.pool.lastBlockFound / 1000)
          pool.donation = 0
          pool.status = 1

          if (response.pool.soloHashrate) {
            pool.hashrate += parseInt(response.pool.soloHashrate)
          }

          if (response.pool.soloMiners) {
            pool.miners += parseInt(response.pool.soloMiners)
          }

          if (response.config.donation) {
            Object.keys(response.config.donation).forEach((idx) => {
              pool.fee += parseFloat(response.config.donation[idx])
            })
          }
        } else if (pool.type === 'node.js') {
          if (response.height) {
            pool.height = response.height
            pool.status = 1
          } else if (response.pool_statistics) {
            pool.hashrate = parseInt(response.pool_statistics.hashRate)
            pool.miners = parseInt(response.pool_statistics.miners)
            pool.lastBlock = parseInt(response.pool_statistics.lastBlockFoundTime)
          } else if (response.min_wallet_payout) {
            pool.fee = response.pplns_fee
            pool.minPayout = response.min_wallet_payout
            pool.donation = response.dev_donation || 0 + response.pool_dev_donation || 0
          }
        } else if (pool.type === 'other') {
          pool.height = parseInt(response.height)
          pool.hashrate = parseInt(response.hashRate)
          pool.miners = parseInt(response.miners)
          pool.fee = parseInt(response.fee)
          pool.minPayout = parseInt(response.minimum * Math.pow(10, 2))
          pool.lastBlock = parseInt(response.lastBlockFoundTime)
          pool.donation = 0
          pool.status = 1
        }
      })

      /* If the pool is brand new, there's a pretty good chance that
         the value in lastBlock is not actually a number. In those cases
         we need to sanitize the result into a number to make sure that
         we don't break things in other places */
      if (isNaN(pool.lastBlock)) {
        pool.lastBlock = 0
      }

      pool.fee = parseFloat(pool.fee.toFixed(2))
      pool.donation = parseFloat(pool.donation.toFixed(2))

      return pool
    })
    .catch(() => { return pool })
}

function getPoolId (pool) {
  function sha256 (message) {
    return Crypto.createHmac('sha256', message).digest('hex')
  }

  return sha256(util.format('%s-%s-%s', pool.miningAddress, pool.mergedMining, pool.mergedMiningIsParentChain))
}

module.exports = Collector
