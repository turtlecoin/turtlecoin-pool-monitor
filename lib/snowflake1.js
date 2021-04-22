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
      url: util.format('%snetwork/stats', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    const network = netstats['11898']

    const poolstats = await request({
      url: util.format('%spool/stats', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    pool.height = network.height
    pool.hashrate = parseInt(poolstats.pool_statistics.portHash['11898'])
    pool.miners = parseInt(poolstats.pool_statistics.portMinerCount['11898'])
    pool.fee = 0
    pool.minPayout = 0
    pool.donation = 0
    pool.status = 1

    const lastBlock = await request({
      url: util.format('%spool/coin_altblocks/11898?page=0&limit=1', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    const block = lastBlock[0]

    pool.lastBlock = (isNaN(block.ts)) ? 0 : parseInt(block.ts / 1000)
  } catch (e) {}

  return pool
}

async function blocks (pool) {
  const result = []

  try {
    const blocks = await request({
      url: util.format('%spool/coin_altblocks/11898?page=0&limit=200', pool.api),
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
