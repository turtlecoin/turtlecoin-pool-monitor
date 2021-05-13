// Copyright (c) 2019-2021, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const request = require('request-promise-native')
const util = require('util')

async function status (pool) {
  pool.height = 0
  pool.hashrate = 0
  pool.miners = 0
  pool.fee = 0
  pool.minPayout = 0
  pool.donation = 0
  pool.status = 0
  pool.lastBlock = 0

  try {
    const netstats = await request({
      url: util.format('%sapinetwork/stats', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    const network = netstats['11898'] || {}

    const poolstats = await request({
      url: util.format('%sapipool/stats', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    const pool_stats = poolstats.pool_statistics || {}

    pool.height = network.height || 0
    pool.hashrate = parseInt(pool_stats.portHash['11898']) || 0
    pool.miners = parseInt(pool_stats.portMinerCount['11898']) || 0
    pool.fee = 0
    pool.minPayout = 0
    pool.donation = 0
    pool.status = 1

    const lastBlock = await request({
      url: util.format('%sapipool/coin_altblocks/11898?page=0&limit=1', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    const block = lastBlock[0] || {}

    pool.lastBlock = (parseInt(block.ts) || 0) / 1000
  } catch (e) {
    console.log(e)
  }

  return pool
}

async function blocks (pool) {
  const result = []

  try {
    const blocks = await request({
      url: util.format('%sapipool/coin_altblocks/11898?page=0&limit=200', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    for (const block of blocks) {
      result.push({ hash: block.hash, height: block.height })
    }
  } catch (e) {}

  pool.blocks = result.sort((a, b) => (a.height > b.height) ? 1 : -1).reverse()

  return pool
}

module.exports = {
  getStatus: status,
  getBlocks: blocks
}
