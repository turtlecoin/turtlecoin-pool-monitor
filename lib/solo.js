// Copyright (c) 2021, The TurtleCoin Developers
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
    const poolstats = await request({
      url: util.format('%sstats', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    pool.height = poolstats.height
    pool.hashrate = poolstats.hashrate
    pool.miners = poolstats.miners
    pool.fee = poolstats.fee
    pool.minPayout = poolstats.minPayout
    pool.donation = poolstats.donation
    pool.status = 1

    pool.lastBlock = poolstats.lastBlock
  } catch (e) {}

  return pool
}

async function blocks (pool) {
  const result = []

  try {
    const blocks = await request({
      url: util.format('%sstats/blocks', pool.api),
      json: true,
      timeout: 10000,
      rejectUnauthorized: false
    })

    for (const block of blocks) {
      const info = await request({
        url: util.format('https://blockapi.turtlepay.io/block/header/%s', block.hash),
        json: true,
        timeout: 10000,
        rejectUnauthorized: false
      })

      result.push({ hash: block.hash, height: info.height })
    }
  } catch (e) {}

  pool.blocks = result.sort((a, b) => (a.height > b.height) ? 1 : -1).reverse()

  return pool
}

module.exports = {
  getStatus: status,
  getBlocks: blocks
}
