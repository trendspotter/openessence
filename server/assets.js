'use strict';

var express = require('express');
var env = require('./conf').env;
// don't require browserify-middleware up here, it's a dev dependency

/**
 * Returns an express app that serves static resources that do not require authentication.
 */
exports.anonymous = function () {
  var app = express();
  if (env === 'development') {
    app.use('/.tmp', express.static(__dirname + '/../.tmp'));
    app.use('/public', express.static(__dirname + '/../public'));

    // In development, we use browserify-middleware so that you don't have to do a build
    app.use('/js/app.js', require('browserify-middleware')('../public/scripts/app.js'));

    // TODO po2json middleware instead
    app.use('/public/translations', express.static(__dirname + '/../dist/public/translations'));
  } else if (env === 'test') {
    app.use('/.tmp', express.static(__dirname + '/../.tmp'));
    app.use('/test', express.static(__dirname + '/../test'));
  } else if (env === 'production') {
    // TODO set Cache-Control: max-age=31556926 if resource has hash
    app.use('/public', express.static(__dirname + '/../dist/public'));
  } else {
    throw new Error('Unknown environment ' + env);
  }

  return app;
};

/**
 * Returns an express app that serves static Kibana resources.
 */
exports.kibana = function () {
  var app = express();
  if (env === 'development') {
    app.use(express.static(__dirname + '/../kibana/src'));
  } else if (env === 'test') {
    app.use(express.static(__dirname + '/../kibana/dist'));
  } else if (env === 'production') {
    app.use(express.static(__dirname + '/../kibana/dist'));
  } else {
    throw new Error('Unknown environment ' + env);
  }

  return app;
};
