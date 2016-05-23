import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import https from 'https';
import chalk from 'chalk';
import express from 'express';
import es6require from '@mattinsler/es6require';

function series(array, fn) {
  return array.reduce(function(lastPromise, item) {
    return lastPromise.then(function() {
      return Promise.resolve(fn(item));
    });
  }, Promise.resolve());
}



function create(context, opts) {
  context.express = express();
}

function listen(context, opts) {
  const httpPort = parseInt(opts.port || process.env.PORT || 3000);
  const httpsPort = parseInt((opts.ssl && opts.ssl.port) || process.env.HTTPS_PORT || (httpPort + 1));

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

  const promises = [
    startServer('httpServer', http.createServer(context.express), httpPort)
  ];

  if (opts.ssl && (opts.ssl.pfx || (opts.ssl.key && opts.ssl.cert))) {
    if (opts.ssl.pfx) { opts.ssl.pfx = fs.readFileSync(path.resolve(context.root, opts.ssl.pfx)); }
    if (opts.ssl.key) { opts.ssl.key = fs.readFileSync(path.resolve(context.root, opts.ssl.key)); }
    if (opts.ssl.cert) { opts.ssl.cert = fs.readFileSync(path.resolve(context.root, opts.ssl.cert)); }

    promises.push(
      startServer('httpsServer', https.createServer(opts.ssl, context.express), httpsPort)
    );
  }

  return Promise.all(promises);
}

function configure(context, opts) {
  const methods = opts.execute.map(function(filename) {
    if (typeof(filename) === 'function') { return filename; }

    if (typeof(filename) === 'string') {
      return es6require(opts.root, filename, { ignoreModuleNotFound: true });
    }
  }).filter((a) => a);

  return series(methods, (method) => method(context.express, context));
}

function installEngines(context, opts) {
  var engine = context.express.get('view engine');
  if (engine) {
    context.express.engines[`.${engine}`] = es6require(process.cwd(), 'node_modules', engine).__express;
  }
}

function init(context, opts, steps) {
  return series(steps, (step) => step(context, opts));
}

function defaultMiddleware(opts) {
  try {
    require.resolve(path.resolve(opts.root, 'middleware'));
    return 'middleware';
  } catch (err) {
  }

  return function(app, context) {
    const morgan = require('morgan');
    const bodyParser = require('body-parser');
    const methodOverride = require('method-override');

    app.use(morgan('dev'));
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(methodOverride('X-HTTP-Method-Override'));
    app.use(methodOverride('_method'));
    app.use(methodOverride(function(req, res) {
      if (req.body && typeof(req.body) === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        return method;
      }
    }));
  };
}

function print(context, opts) {
  if (!context.httpServer && !context.httpsServer) { return; }

  const lines = [
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

function appContextExpress(opts = {}) {
  return function(context) {
    // TODO: validate options

    opts.root = opts.root ? path.resolve(context.root, opts.root) : context.root;
    if (!opts.execute) {
      // create default files
      opts.execute = [
        'initialize',
        defaultMiddleware(opts),
        'router'
      ];
    } else if (typeof(opts.execute) === 'string') {
      opts.execute = [opts.execute];
    }

    const steps = [
      create,
      configure,
      installEngines,
      listen,
      print
    ];

    return init(context, opts, steps);
  };
};

appContextExpress.defaultArgs = {};

export default appContextExpress;
