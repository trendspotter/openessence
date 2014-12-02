'use strict';

var codex = require('../codex');
var Boom = require('boom');
var Disposition = require('../models/Disposition');

module.exports = codex.controller(Disposition, {
  get: true,
  search: true,
  insert: true,
  replace: true,
  preInsert: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }
  },

  delete: true,
  preDelete: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }

    callback(null, esRequest);
  }
}).with(require('../caper-trail').controller);
