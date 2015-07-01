var q = require('q');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var chalk = require('chalk');
var express = require('express');

var createServer = function(context, rootDir) {
  var appDir = path.join(context.get('root'), rootDir);
  var scripts = ['initialize', 'middleware', 'router'];
  
  context.express = express();
  
  return scripts.reduce(function(lastPromise, script) {
    var newPromise = lastPromise.then(function() {
      var scriptPath;
      try {
        scriptPath = require.resolve(path.join(appDir, script));
      } catch (err) {}
      
      if (scriptPath) {
        return require(scriptPath)(context.express, context);
      }
    });
    
    if (script === 'router') {
      newPromise = newPromise.then(function(router) {
        if (router) {
          context.express.use(router);
        }
      });
    }
    
    return newPromise;
  }, q());
};

var httpListen = function(context) {
  var d = q.defer();
  var port = (context.config.server && context.config.server.port) || 3010;

  context.httpServer = http.createServer(context.express).listen(port, function() {
    d.resolve();
  });

  return d.promise;
};

var httpsListen = function(context) {
  if (context.config.server && context.config.server.https) {
    var config = context.config.server.https;
    if (!config.keyFile || !config.certFile) {
      throw new Error('HTTPS server requires "keyFile" and "certFile" to be defined in the server.http config');
    }
    
    var d = q.defer();
    var opts = {
      key: fs.readFileSync(path.resolve(context.get('root'), config.keyFile)),
      cert: fs.readFileSync(path.resolve(context.get('root'), config.certFile))
    };
    
    context.httpsServer = https.createServer(opts, context.express).listen(config.port || 3443, function() {
      d.resolve();
    });
    
    return d.promise;
  }
};

var listen = function(context) {
  return q.all([
    q.when(httpListen(context)),
    q.when(httpsListen(context))
  ]);
};

var printServers = function(context) {
  if (context.httpServer || context.httpsServer) {
    console.log([
      '',
      '== ' + chalk.cyan(context.name) + ' ==',
      '  version:     ' + chalk.cyan([context.version.major, context.version.minor, context.version.patch].join('.')),
      '  environment: ' + chalk.cyan(context.environment),
      '',
      '== Servers =='
    ].join('\n'));
    if (context.httpServer) console.log('  ' + chalk.magenta('HTTP') + '  listening on port ' + chalk.yellow(context.httpServer.address().port));
    if (context.httpsServer) console.log('  ' + chalk.magenta('HTTPS') + ' listening on port ' + chalk.yellow(context.httpsServer.address().port));
    console.log('');
  }
};

module.exports = function(config) {
  return function(context) {
    return createServer(context, config.root).then(function() {
      return listen(context);
    }).then(function() {
      return printServers(context);
    });
  };
};
