'use strict'

var config = {}

config.facebook = {
  'appID': '261938654297222',
  'appSecret': 'cd8d0bf4ce75ae5e24be29970b79876f',
  'callbackUrl': '/login/facebook/callback/'
}

config.server = {
  'port': process.env.PORT || 3000,
  'env': process.env.NODE_ENV || 'dev',
  'dbUrl': process.env.MONGODB_URI || 'mongodb://localhost:27017/minihero',
  'sessionSecret': 'Minihero FTW!'
}

module.exports = config