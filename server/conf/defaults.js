'use strict';

// A place to hold default settings. Useful so environments can reference the defaults when they override

var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var bunyan = require('bunyan');
var PrettyStream = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream({
  mode: 'short' // 'long' is useful if you want to see PID and/or hostname
});
prettyStdOut.pipe(process.stdout);

var env = process.env.NODE_ENV || 'development';

var createLogger = function (name) {
  var serializers = _.assign({
    user: function userSerializer (user) {
      if (!user) {
        return null;
      }
      if (typeof user.codexModel === 'function') {
        user = user.doc;
      }

      return {
        id: user.id,
        username: user.username,
        roles: user.roles
        // possibly more fields we deem useful...
      };
    }
  }, bunyan.stdSerializers);

  return bunyan.createLogger({
    name: name,
    serializers: serializers,
    streams: [
      // human-readable output on stdout
      {
        // we don't want any noise besides the red/green lights when we run tests
        level: env === 'test' ? 'warn' : 'debug',
        type: 'raw',
        stream: prettyStdOut
      }

      // TODO machine-readable output in log file
      // We need log rotation, but bunyan's implementation has issues
      // (see https://github.com/trentm/node-bunyan/pull/97 for example). Log rotation is a big enough problem that
      // it should be handled independently, e.g. by logrotate on Linux. All the more reason to deploy to a managed
      // container.
    ]
  });
};

function ElasticSearchLogger () {
  var logger = createLogger('elasticsearch.js');

  this.error = logger.error.bind(logger);
  this.warning = logger.warn.bind(logger);
  this.info = logger.info.bind(logger);
  this.debug = logger.debug.bind(logger);
  this.trace = function (method, requestUrl, body, responseBody, responseStatus) {
    logger.trace({
      method: method,
      requestUrl: requestUrl,
      body: body,
      responseBody: responseBody,
      responseStatus: responseStatus
    });
  };
  this.close = function () {};
}

var certPath = process.env.SSL_CERT || __dirname + '/../../cert.pem';
var keyPath = process.env.SSL_KEY || __dirname + '/../../key.pem';
var sessionStore = process.env.SESSION_STORE || 'memory'; // 'redis' is also accepted

module.exports = {
  env: env,
  logger: createLogger('fracas'),

  ssl: {
    enabled: fs.existsSync(certPath) && fs.existsSync(keyPath),
    certPath: certPath,
    keyPath: keyPath
    // more properties are defined in ./index.js
  },

  // Number of Fracas worker processes. Note that the default session store saves sessions in memory, and thus
  // will not work with more than one worker. A shared session store like Redis should therefore be used in production.
  workers: (function () {
    var workers = process.env.WORKERS || (sessionStore === 'memory' ? 1 : 2);
    if (workers === 'NUM_CPUS') {
      workers = require('os').cpus().length;
    } else {
      workers = parseInt(workers, 10);
    }

    return workers;
  })(),

  phantom: {
    enabled: process.env.PHANTOM !== 'false',

    // Base port for PhantomJS cluster. Worker n is assigned basePort + n, e.g. 12301 for the first worker.
    // 12300 is the default port number used by phantom-cluster. We specify it here in case they ever change it.
    // https://github.com/dailymuse/phantom-cluster/blob/87ebc9f2c5fc81792aa4c98ae1c6cf44c784cc5e/index.coffee#L105
    basePort: 12300
  },

  // Define extra users. The auth layers checks if a user is defined here first and then checks if the user is in the
  // data store. This is useful for development: instead of every Fracas instance having a known set of test users,
  // e.g. "admin", "test", etc. and having to make sure those accounts are disabled or their passwords changed before
  // deployment, you can include them in conf instead. Settings users to `false` will disable the pre-registration
  // requirement and grant all Persona users admin privileges.
  users: process.env.USERS === 'false' ? false : {
    // example local user
//    admin: {
//      roles: ['admin']
//    }

    // example Persona user
//    'foo@bar.com' : {
//      roles: ['entry']
//    }
  },

  persona: {
    enabled: true
  },

  proxy: {
    // true if Fracas is running behind a reverse proxy
    enabled: !!process.env.PROXY || false
  },

  session: {
    // Session store. Accepted values are currently 'memory' and 'redis'. Memory is fine for development, but Redis
    // should be used in production to provide persistence and the ability to scale past a single web server process.
    store: sessionStore,

    // Secret used to sign cookies
    secret: process.env.SESSION_SECRET
  },

  redis: {
    url: process.env.REDIS_URL || (function () {
      var redisPort = process.env.REDIS_PORT; // Docker sets the TCP port the linked redis container exports
      if (!redisPort) {
        return 'redis://localhost:6379';
      }

      var parsedRedisPort = url.parse(redisPort);
      if (parsedRedisPort.protocol === 'tcp:') {
        parsedRedisPort.protocol = 'redis:';
      }

      return url.format(parsedRedisPort);
    })(),
    password: null // Redis doesn't use usernames
  },

  // elasticsearch settings, duh
  elasticsearch: {
    host: process.env.ELASTICSEARCH_HOST || (function () {
      var elasticsearchPort = process.env.ELASTICSEARCH_PORT; // Docker sets this
      if (!elasticsearchPort) {
        return 'http://localhost:9200';
      }

      var parsedElasticsearchPort = url.parse(elasticsearchPort);
      if (parsedElasticsearchPort.protocol === 'tcp:') {
        parsedElasticsearchPort.protocol = 'http:';
      }

      return url.format(parsedElasticsearchPort);
    })(),
    log: ElasticSearchLogger,
    apiVersion: '1.1'
  },

  // Database settings. Fracas doesn't use a relational database, but we still need connection info for things like
  // importing data. If you're not using a features that require connecting to a DB, then you can skip this.
  db: {
    url: 'jdbc:postgresql://localhost:5432/fracas',
    user: 'postgres',
    password: '',
    driver: 'org.postgresql.Driver'
  }
};
