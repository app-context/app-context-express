'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _es6require = require('@mattinsler/es6require');

var _es6require2 = _interopRequireDefault(_es6require);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function series(array, fn) {
  return array.reduce(function (lastPromise, item) {
    return lastPromise.then(function () {
      return Promise.resolve(fn(item));
    });
  }, Promise.resolve());
}

function create(context, opts) {
  context.express = (0, _express2.default)();
}

function listen(context, opts) {
  var httpPort = parseInt(opts.port || process.env.PORT || 3000);
  var httpsPort = parseInt(opts.ssl && opts.ssl.port || process.env.HTTPS_PORT || httpPort + 1);

  function startServer(key, server, port) {
    return new Promise(function (resolve, reject) {
      server.on('error', reject);
      server.on('listening', function () {
        server.removeListener('error', reject);
        context[key] = server;
        resolve();
      });

      server.listen(port);
    });
  }

  var promises = [startServer('httpServer', _http2.default.createServer(context.express), httpPort)];

  if (opts.ssl && (opts.ssl.pfx || opts.ssl.key && opts.ssl.cert)) {
    if (opts.ssl.pfx) {
      opts.ssl.pfx = _fs2.default.readFileSync(_path2.default.resolve(context.root, opts.ssl.pfx));
    }
    if (opts.ssl.key) {
      opts.ssl.key = _fs2.default.readFileSync(_path2.default.resolve(context.root, opts.ssl.key));
    }
    if (opts.ssl.cert) {
      opts.ssl.cert = _fs2.default.readFileSync(_path2.default.resolve(context.root, opts.ssl.cert));
    }

    promises.push(startServer('httpsServer', _https2.default.createServer(opts.ssl, context.express), httpsPort));
  }

  return Promise.all(promises);
}

function configure(context, opts) {
  var methods = opts.execute.map(function (filename) {
    if (typeof filename === 'function') {
      return filename;
    }

    if (typeof filename === 'string') {
      return (0, _es6require2.default)(opts.root, filename, { ignoreModuleNotFound: true });
    }
  }).filter(function (a) {
    return a;
  });

  return series(methods, function (method) {
    return method(context.express, context);
  });
}

function installEngines(context, opts) {
  var engine = context.express.get('view engine');
  if (engine && !context.express.engines['.' + engine]) {
    var engineImpl = (0, _es6require2.default)(process.cwd(), 'node_modules', engine, { ignoreModuleNotFound: true });
    if (engineImpl && engineImpl.__express) {
      context.express.engines['.' + engine] = engineImpl.__express;
    }
  }
}

function init(context, opts, steps) {
  return series(steps, function (step) {
    return step(context, opts);
  });
}

function defaultMiddleware(opts) {
  try {
    require.resolve(_path2.default.resolve(opts.root, 'middleware'));
    return 'middleware';
  } catch (err) {}

  return function (app, context) {
    var morgan = require('morgan');
    var bodyParser = require('body-parser');
    var methodOverride = require('method-override');

    app.use(morgan('dev'));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(methodOverride('X-HTTP-Method-Override'));
    app.use(methodOverride('_method'));
    app.use(methodOverride(function (req, res) {
      if (req.body && _typeof(req.body) === 'object' && '_method' in req.body) {
        var method = req.body._method;
        delete req.body._method;
        return method;
      }
    }));
  };
}

function print(context, opts) {
  if (!context.httpServer && !context.httpsServer) {
    return;
  }

  var lines = ['', '== ' + _chalk2.default.cyan(context.name) + ' =='];
  if (context.version) {
    lines.push('  version:     ' + _chalk2.default.cyan([context.version.major, context.version.minor, context.version.patch].join('.')));
  }
  lines.push('  environment: ' + _chalk2.default.cyan(context.environment), '', '== Servers ==');
  if (context.httpServer) {
    lines.push('  ' + _chalk2.default.magenta('HTTP') + '  listening on port ' + _chalk2.default.yellow(context.httpServer.address().port));
  }
  if (context.httpsServer) {
    lines.push('  ' + _chalk2.default.magenta('HTTPS') + ' listening on port ' + _chalk2.default.yellow(context.httpsServer.address().port));
  }
  lines.push('');

  console.log(lines.join(_os2.default.EOL));
}

function appContextExpress() {
  var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  return function (context) {
    // TODO: validate options

    opts.root = opts.root ? _path2.default.resolve(context.root, opts.root) : context.root;
    if (!opts.execute) {
      // create default files
      opts.execute = ['initialize', defaultMiddleware(opts), 'router'];
    } else if (typeof opts.execute === 'string') {
      opts.execute = [opts.execute];
    }

    var steps = [create, configure, installEngines, listen, print];

    return init(context, opts, steps);
  };
};

appContextExpress.defaultArgs = {};

exports.default = appContextExpress;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hcHAtY29udGV4dC1leHByZXNzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsU0FBUyxNQUFULENBQWdCLEtBQWhCLEVBQXVCLEVBQXZCLEVBQTJCO0FBQ3pCLFNBQU8sTUFBTSxNQUFOLENBQWEsVUFBUyxXQUFULEVBQXNCLElBQXRCLEVBQTRCO0FBQzlDLFdBQU8sWUFBWSxJQUFaLENBQWlCLFlBQVc7QUFDakMsYUFBTyxRQUFRLE9BQVIsQ0FBZ0IsR0FBRyxJQUFILENBQWhCLENBQVA7QUFDRCxLQUZNLENBQVA7QUFHRCxHQUpNLEVBSUosUUFBUSxPQUFSLEVBSkksQ0FBUDtBQUtEOztBQUlELFNBQVMsTUFBVCxDQUFnQixPQUFoQixFQUF5QixJQUF6QixFQUErQjtBQUM3QixVQUFRLE9BQVIsR0FBa0Isd0JBQWxCO0FBQ0Q7O0FBRUQsU0FBUyxNQUFULENBQWdCLE9BQWhCLEVBQXlCLElBQXpCLEVBQStCO0FBQzdCLE1BQU0sV0FBVyxTQUFTLEtBQUssSUFBTCxJQUFhLFFBQVEsR0FBUixDQUFZLElBQXpCLElBQWlDLElBQTFDLENBQWpCO0FBQ0EsTUFBTSxZQUFZLFNBQVUsS0FBSyxHQUFMLElBQVksS0FBSyxHQUFMLENBQVMsSUFBdEIsSUFBK0IsUUFBUSxHQUFSLENBQVksVUFBM0MsSUFBMEQsV0FBVyxDQUE5RSxDQUFsQjs7QUFFQSxXQUFTLFdBQVQsQ0FBcUIsR0FBckIsRUFBMEIsTUFBMUIsRUFBa0MsSUFBbEMsRUFBd0M7QUFDdEMsV0FBTyxJQUFJLE9BQUosQ0FBWSxVQUFTLE9BQVQsRUFBa0IsTUFBbEIsRUFBMEI7QUFDM0MsYUFBTyxFQUFQLENBQVUsT0FBVixFQUFtQixNQUFuQjtBQUNBLGFBQU8sRUFBUCxDQUFVLFdBQVYsRUFBdUIsWUFBVztBQUNoQyxlQUFPLGNBQVAsQ0FB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WSxLQUFLLElBQUwsR0FBWSxlQUFLLE9BQUwsQ0FBYSxRQUFRLElBQXJCLEVBQTJCLEtBQUssSUFBaEMsQ0FBWixHQUFvRCxRQUFRLElBQXhFO0FBQ0EsUUFBSSxDQUFDLEtBQUssT0FBVixFQUFtQjs7QUFFakIsV0FBSyxPQUFMLEdBQWUsQ0FDYixZQURhLEVBRWIsa0JBQWtCLElBQWxCLENBRmEsRUFHYixRQUhhLENBQWY7QUFLRCxLQVBELE1BT08sSUFBSSxPQUFPLEtBQUssT0FBWixLQUF5QixRQUE3QixFQUF1QztBQUM1QyxXQUFLLE9BQUwsR0FBZSxDQUFDLEtBQUssT0FBTixDQUFmO0FBQ0Q7O0FBRUQsUUFBTSxRQUFRLENBQ1osTUFEWSxFQUVaLFNBRlksRUFHWixjQUhZLEVBSVosTUFKWSxFQUtaLEtBTFksQ0FBZDs7QUFRQSxXQUFPLEtBQUssT0FBTCxFQUFjLElBQWQsRUFBb0IsS0FBcEIsQ0FBUDtBQUNELEdBeEJEO0FBeUJEOztBQUVELGtCQUFrQixXQUFsQixHQUFnQyxFQUFoQzs7a0JBRWUsaUIiLCJmaWxlIjoiYXBwLWNvbnRleHQtZXhwcmVzcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCBodHRwcyBmcm9tICdodHRwcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgZXM2cmVxdWlyZSBmcm9tICdAbWF0dGluc2xlci9lczZyZXF1aXJlJztcblxuZnVuY3Rpb24gc2VyaWVzKGFycmF5LCBmbikge1xuICByZXR1cm4gYXJyYXkucmVkdWNlKGZ1bmN0aW9uKGxhc3RQcm9taXNlLCBpdGVtKSB7XG4gICAgcmV0dXJuIGxhc3RQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZuKGl0ZW0pKTtcbiAgICB9KTtcbiAgfSwgUHJvbWlzZS5yZXNvbHZlKCkpO1xufVxuXG5cblxuZnVuY3Rpb24gY3JlYXRlKGNvbnRleHQsIG9wdHMpIHtcbiAgY29udGV4dC5leHByZXNzID0gZXhwcmVzcygpO1xufVxuXG5mdW5jdGlvbiBsaXN0ZW4oY29udGV4dCwgb3B0cykge1xuICBjb25zdCBodHRwUG9ydCA9IHBhcnNlSW50KG9wdHMucG9ydCB8fCBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDApO1xuICBjb25zdCBodHRwc1BvcnQgPSBwYXJzZUludCgob3B0cy5zc2wgJiYgb3B0cy5zc2wucG9ydCkgfHwgcHJvY2Vzcy5lbnYuSFRUUFNfUE9SVCB8fCAoaHR0cFBvcnQgKyAxKSk7XG5cbiAgZnVuY3Rpb24gc3RhcnRTZXJ2ZXIoa2V5LCBzZXJ2ZXIsIHBvcnQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBzZXJ2ZXIub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICAgIHNlcnZlci5vbignbGlzdGVuaW5nJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlcnZlci5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCByZWplY3QpO1xuICAgICAgICBjb250ZXh0W2tleV0gPSBzZXJ2ZXI7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pO1xuXG4gICAgICBzZXJ2ZXIubGlzdGVuKHBvcnQpO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgcHJvbWlzZXMgPSBbXG4gICAgc3RhcnRTZXJ2ZXIoJ2h0dHBTZXJ2ZXInLCBodHRwLmNyZWF0ZVNlcnZlcihjb250ZXh0LmV4cHJlc3MpLCBodHRwUG9ydClcbiAgXTtcblxuICBpZiAob3B0cy5zc2wgJiYgKG9wdHMuc3NsLnBmeCB8fCAob3B0cy5zc2wua2V5ICYmIG9wdHMuc3NsLmNlcnQpKSkge1xuICAgIGlmIChvcHRzLnNzbC5wZngpIHsgb3B0cy5zc2wucGZ4ID0gZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShjb250ZXh0LnJvb3QsIG9wdHMuc3NsLnBmeCkpOyB9XG4gICAgaWYgKG9wdHMuc3NsLmtleSkgeyBvcHRzLnNzbC5rZXkgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5yZXNvbHZlKGNvbnRleHQucm9vdCwgb3B0cy5zc2wua2V5KSk7IH1cbiAgICBpZiAob3B0cy5zc2wuY2VydCkgeyBvcHRzLnNzbC5jZXJ0ID0gZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShjb250ZXh0LnJvb3QsIG9wdHMuc3NsLmNlcnQpKTsgfVxuXG4gICAgcHJvbWlzZXMucHVzaChcbiAgICAgIHN0YXJ0U2VydmVyKCdodHRwc1NlcnZlcicsIGh0dHBzLmNyZWF0ZVNlcnZlcihvcHRzLnNzbCwgY29udGV4dC5leHByZXNzKSwgaHR0cHNQb3J0KVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xufVxuXG5mdW5jdGlvbiBjb25maWd1cmUoY29udGV4dCwgb3B0cykge1xuICBjb25zdCBtZXRob2RzID0gb3B0cy5leGVjdXRlLm1hcChmdW5jdGlvbihmaWxlbmFtZSkge1xuICAgIGlmICh0eXBlb2YoZmlsZW5hbWUpID09PSAnZnVuY3Rpb24nKSB7IHJldHVybiBmaWxlbmFtZTsgfVxuXG4gICAgaWYgKHR5cGVvZihmaWxlbmFtZSkgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZXM2cmVxdWlyZShvcHRzLnJvb3QsIGZpbGVuYW1lLCB7IGlnbm9yZU1vZHVsZU5vdEZvdW5kOiB0cnVlIH0pO1xuICAgIH1cbiAgfSkuZmlsdGVyKChhKSA9PiBhKTtcblxuICByZXR1cm4gc2VyaWVzKG1ldGhvZHMsIChtZXRob2QpID0+IG1ldGhvZChjb250ZXh0LmV4cHJlc3MsIGNvbnRleHQpKTtcbn1cblxuZnVuY3Rpb24gaW5zdGFsbEVuZ2luZXMoY29udGV4dCwgb3B0cykge1xuICB2YXIgZW5naW5lID0gY29udGV4dC5leHByZXNzLmdldCgndmlldyBlbmdpbmUnKTtcbiAgaWYgKGVuZ2luZSAmJiAhY29udGV4dC5leHByZXNzLmVuZ2luZXNbYC4ke2VuZ2luZX1gXSkge1xuICAgIGNvbnN0IGVuZ2luZUltcGwgPSBlczZyZXF1aXJlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMnLCBlbmdpbmUsIHsgaWdub3JlTW9kdWxlTm90Rm91bmQ6IHRydWUgfSk7XG4gICAgaWYgKGVuZ2luZUltcGwgJiYgZW5naW5lSW1wbC5fX2V4cHJlc3MpIHtcbiAgICAgIGNvbnRleHQuZXhwcmVzcy5lbmdpbmVzW2AuJHtlbmdpbmV9YF0gPSBlbmdpbmVJbXBsLl9fZXhwcmVzcztcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdChjb250ZXh0LCBvcHRzLCBzdGVwcykge1xuICByZXR1cm4gc2VyaWVzKHN0ZXBzLCAoc3RlcCkgPT4gc3RlcChjb250ZXh0LCBvcHRzKSk7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRNaWRkbGV3YXJlKG9wdHMpIHtcbiAgdHJ5IHtcbiAgICByZXF1aXJlLnJlc29sdmUocGF0aC5yZXNvbHZlKG9wdHMucm9vdCwgJ21pZGRsZXdhcmUnKSk7XG4gICAgcmV0dXJuICdtaWRkbGV3YXJlJztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oYXBwLCBjb250ZXh0KSB7XG4gICAgY29uc3QgbW9yZ2FuID0gcmVxdWlyZSgnbW9yZ2FuJyk7XG4gICAgY29uc3QgYm9keVBhcnNlciA9IHJlcXVpcmUoJ2JvZHktcGFyc2VyJyk7XG4gICAgY29uc3QgbWV0aG9kT3ZlcnJpZGUgPSByZXF1aXJlKCdtZXRob2Qtb3ZlcnJpZGUnKTtcblxuICAgIGFwcC51c2UobW9yZ2FuKCdkZXYnKSk7XG4gICAgYXBwLnVzZShib2R5UGFyc2VyLnVybGVuY29kZWQoe2V4dGVuZGVkOiBmYWxzZX0pKTtcbiAgICBhcHAudXNlKGJvZHlQYXJzZXIuanNvbigpKTtcbiAgICBhcHAudXNlKG1ldGhvZE92ZXJyaWRlKCdYLUhUVFAtTWV0aG9kLU92ZXJyaWRlJykpO1xuICAgIGFwcC51c2UobWV0aG9kT3ZlcnJpZGUoJ19tZXRob2QnKSk7XG4gICAgYXBwLnVzZShtZXRob2RPdmVycmlkZShmdW5jdGlvbihyZXEsIHJlcykge1xuICAgICAgaWYgKHJlcS5ib2R5ICYmIHR5cGVvZihyZXEuYm9keSkgPT09ICdvYmplY3QnICYmICdfbWV0aG9kJyBpbiByZXEuYm9keSkge1xuICAgICAgICBjb25zdCBtZXRob2QgPSByZXEuYm9keS5fbWV0aG9kO1xuICAgICAgICBkZWxldGUgcmVxLmJvZHkuX21ldGhvZDtcbiAgICAgICAgcmV0dXJuIG1ldGhvZDtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByaW50KGNvbnRleHQsIG9wdHMpIHtcbiAgaWYgKCFjb250ZXh0Lmh0dHBTZXJ2ZXIgJiYgIWNvbnRleHQuaHR0cHNTZXJ2ZXIpIHsgcmV0dXJuOyB9XG5cbiAgY29uc3QgbGluZXMgPSBbXG4gICAgJycsXG4gICAgJz09ICcgKyBjaGFsay5jeWFuKGNvbnRleHQubmFtZSkgKyAnID09J1xuICBdO1xuICBpZiAoY29udGV4dC52ZXJzaW9uKSB7XG4gICAgbGluZXMucHVzaCgnICB2ZXJzaW9uOiAgICAgJyArIGNoYWxrLmN5YW4oW2NvbnRleHQudmVyc2lvbi5tYWpvciwgY29udGV4dC52ZXJzaW9uLm1pbm9yLCBjb250ZXh0LnZlcnNpb24ucGF0Y2hdLmpvaW4oJy4nKSkpO1xuICB9XG4gIGxpbmVzLnB1c2goXG4gICAgJyAgZW52aXJvbm1lbnQ6ICcgKyBjaGFsay5jeWFuKGNvbnRleHQuZW52aXJvbm1lbnQpLFxuICAgICcnLFxuICAgICc9PSBTZXJ2ZXJzID09J1xuICApO1xuICBpZiAoY29udGV4dC5odHRwU2VydmVyKSB7XG4gICAgbGluZXMucHVzaCgnICAnICsgY2hhbGsubWFnZW50YSgnSFRUUCcpICsgJyAgbGlzdGVuaW5nIG9uIHBvcnQgJyArIGNoYWxrLnllbGxvdyhjb250ZXh0Lmh0dHBTZXJ2ZXIuYWRkcmVzcygpLnBvcnQpKTtcbiAgfVxuICBpZiAoY29udGV4dC5odHRwc1NlcnZlcikge1xuICAgIGxpbmVzLnB1c2goJyAgJyArIGNoYWxrLm1hZ2VudGEoJ0hUVFBTJykgKyAnIGxpc3RlbmluZyBvbiBwb3J0ICcgKyBjaGFsay55ZWxsb3coY29udGV4dC5odHRwc1NlcnZlci5hZGRyZXNzKCkucG9ydCkpO1xuICB9XG4gIGxpbmVzLnB1c2goJycpO1xuXG4gIGNvbnNvbGUubG9nKGxpbmVzLmpvaW4ob3MuRU9MKSk7XG59XG5cbmZ1bmN0aW9uIGFwcENvbnRleHRFeHByZXNzKG9wdHMgPSB7fSkge1xuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIC8vIFRPRE86IHZhbGlkYXRlIG9wdGlvbnNcblxuICAgIG9wdHMucm9vdCA9IG9wdHMucm9vdCA/IHBhdGgucmVzb2x2ZShjb250ZXh0LnJvb3QsIG9wdHMucm9vdCkgOiBjb250ZXh0LnJvb3Q7XG4gICAgaWYgKCFvcHRzLmV4ZWN1dGUpIHtcbiAgICAgIC8vIGNyZWF0ZSBkZWZhdWx0IGZpbGVzXG4gICAgICBvcHRzLmV4ZWN1dGUgPSBbXG4gICAgICAgICdpbml0aWFsaXplJyxcbiAgICAgICAgZGVmYXVsdE1pZGRsZXdhcmUob3B0cyksXG4gICAgICAgICdyb3V0ZXInXG4gICAgICBdO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mKG9wdHMuZXhlY3V0ZSkgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvcHRzLmV4ZWN1dGUgPSBbb3B0cy5leGVjdXRlXTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgIGNyZWF0ZSxcbiAgICAgIGNvbmZpZ3VyZSxcbiAgICAgIGluc3RhbGxFbmdpbmVzLFxuICAgICAgbGlzdGVuLFxuICAgICAgcHJpbnRcbiAgICBdO1xuXG4gICAgcmV0dXJuIGluaXQoY29udGV4dCwgb3B0cywgc3RlcHMpO1xuICB9O1xufTtcblxuYXBwQ29udGV4dEV4cHJlc3MuZGVmYXVsdEFyZ3MgPSB7fTtcblxuZXhwb3J0IGRlZmF1bHQgYXBwQ29udGV4dEV4cHJlc3M7XG4iXX0=