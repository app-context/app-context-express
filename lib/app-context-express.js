var fs = require('fs');
var os = require('os');
var path = require('path');
var http = require('http');
var https = require('https');
var chalk = require('chalk');
var express = require('express');
var Promise = require('bluebird');

function create(context, opts) {
  context.express = express();
}

function listen(context, opts) {
  var httpPort = parseInt(opts.port || process.env.PORT || 3000);
  var httpsPort = parseInt((opts.ssl && opts.ssl.port) || process.env.HTTPS_PORT || (httpPort + 1));

  function startServer(key, server, port) {
    return new Promise(function(resolve, reject) {
      server.on('error', reject);
      server.on('listening', function() {
        server.removeListener('error', reject);
        context[key] = server;
        resolve();
      });

      server.listen(port);
    });
  }

  var promises = [startServer('httpServer', http.createServer(context.express), httpPort)];

  if (opts.ssl && (opts.ssl.pfx || (opts.ssl.key && opts.ssl.cert))) {
    if (opts.ssl.pfx) { opts.ssl.pfx = fs.readFileSync(path.resolve(context.root, opts.ssl.pfx)); }
    if (opts.ssl.key) { opts.ssl.key = fs.readFileSync(path.resolve(context.root, opts.ssl.key)); }
    if (opts.ssl.cert) { opts.ssl.cert = fs.readFileSync(path.resolve(context.root, opts.ssl.cert)); }

    promises.push(startServer('httpsServer', https.createServer(opts.ssl, context.express), httpsPort));
  }

  return Promise.all(promises);
}

function configure(context, opts) {
  var methods = opts.execute.reduce(function(o, file) {
    if (typeof(file) === 'string') {
      var filepath;
      try {
        filepath = require.resolve(path.join(opts.root, file));
      } catch (err) {}

      if (filepath) {
        o.push(require(filepath));
      }
    } else if (typeof(file) === 'function') {
      o.push(file);
    }
    return o;
  }, []);

  return methods.reduce(function(lastPromise, method) {
    return lastPromise.then(function() {
      return Promise.resolve(method(context.express, context));
    });
  }, Promise.resolve());
}

function installEngines(context, opts) {
  var engine = context.express.get('view engine');
  if (engine) {
    context.express.engines['.' + engine] = require(path.join(process.cwd(), 'node_modules', engine)).__express;
  }
}

function init(context, opts, steps) {
  return steps.reduce(function(lastPromise, step) {
    return lastPromise.then(function() {
      return Promise.resolve(step(context, opts));
    });
  }, Promise.resolve());
}

function defaultMiddleware(opts) {
  try {
    require.resolve(path.join(opts.root, 'middleware'));
    return 'middleware';
  } catch (err) {}

  return function(app, context) {
    var morgan = require('morgan');
    var bodyParser = require('body-parser');
    var methodOverride = require('method-override');

    app.use(morgan('dev'));
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(methodOverride('X-HTTP-Method-Override'));
    app.use(methodOverride('_method'));
    app.use(methodOverride(function(req, res) {
      if (req.body && typeof(req.body) === 'object' && '_method' in req.body) {
        var method = req.body._method;
        delete req.body._method;
        return method;
      }
    }));
  };
}

function print(context, opts) {
  if (context.httpServer == null && context.httpsServer == null) { return; }

  var lines = [
    '',
    '== ' + chalk.cyan(context.name) + ' =='
  ];
  if (context.version) {
    lines.push('  version:     ' + chalk.cyan([context.version.major, context.version.minor, context.version.patch].join('.')));
  }
  lines.push(
    '  environment: ' + chalk.cyan(context.environment),
    '',
    '== Servers =='
  );
  if (context.httpServer) {
    lines.push('  ' + chalk.magenta('HTTP') + '  listening on port ' + chalk.yellow(context.httpServer.address().port));
  }
  if (context.httpsServer) {
    lines.push('  ' + chalk.magenta('HTTPS') + ' listening on port ' + chalk.yellow(context.httpsServer.address().port));
  }
  lines.push('');
  console.log(lines.join(os.EOL));
}

module.exports = function(opts) {
  return function(context) {
    if (opts == null) { opts = {}; }

    // validate options

    opts.root = opts.root ? path.resolve(path.join(context.root, opts.root)) : context.root;
    if (opts.execute == null) {
      // create default files
      opts.execute = [
        'initialize',
        defaultMiddleware(opts),
        'router'
      ];
    } else if (typeof(opts.execute) === 'string') {
      opts.execute = [opts.execute];
    }

    var steps = [
      create,
      configure,
      installEngines,
      listen,
      print
    ];

    return init(context, opts, steps);
  };
};

module.exports.defaultArgs = {};
