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
  if (engine) {
    context.express.engines['.' + engine] = (0, _es6require2.default)(process.cwd(), 'node_modules', engine).__express;
  }
}

function init(context, opts, steps) {
  return series(steps, function (step) {
    return step(context, opts);
  });
}

function defaultMiddleware(opts) {
  try {
    require.resolve(opts.root, 'middleware');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hcHAtY29udGV4dC1leHByZXNzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsU0FBUyxNQUFULENBQWdCLEtBQWhCLEVBQXVCLEVBQXZCLEVBQTJCO0FBQ3pCLFNBQU8sTUFBTSxNQUFOLENBQWEsVUFBUyxXQUFULEVBQXNCLElBQXRCLEVBQTRCO0FBQzlDLFdBQU8sWUFBWSxJQUFaLENBQWlCLFlBQVc7QUFDakMsYUFBTyxRQUFRLE9BQVIsQ0FBZ0IsR0FBRyxJQUFILENBQWhCLENBQVA7QUFDRCxLQUZNLENBQVA7QUFHRCxHQUpNLEVBSUosUUFBUSxPQUFSLEVBSkksQ0FBUDtBQUtEOztBQUlELFNBQVMsTUFBVCxDQUFnQixPQUFoQixFQUF5QixJQUF6QixFQUErQjtBQUM3QixVQUFRLE9BQVIsR0FBa0Isd0JBQWxCO0FBQ0Q7O0FBRUQsU0FBUyxNQUFULENBQWdCLE9BQWhCLEVBQXlCLElBQXpCLEVBQStCO0FBQzdCLE1BQU0sV0FBVyxTQUFTLEtBQUssSUFBTCxJQUFhLFFBQVEsR0FBUixDQUFZLElBQXpCLElBQWlDLElBQTFDLENBQWpCO0FBQ0EsTUFBTSxZQUFZLFNBQVUsS0FBSyxHQUFMLElBQVksS0FBSyxHQUFMLENBQVMsSUFBdEIsSUFBK0IsUUFBUSxHQUFSLENBQVksVUFBM0MsSUFBMEQsV0FBVyxDQUE5RSxDQUFsQjs7QUFFQSxXQUFTLFdBQVQsQ0FBcUIsR0FBckIsRUFBMEIsTUFBMUIsRUFBa0MsSUFBbEMsRUFBd0M7QUFDdEMsV0FBTyxJQUFJLE9BQUosQ0FBWSxVQUFTLE9BQVQsRUFBa0IsTUFBbEIsRUFBMEI7QUFDM0MsYUFBTyxFQUFQLENBQVUsT0FBVixFQUFtQixNQUFuQjtBQUNBLGFBQU8sRUFBUCxDQUFVLFdBQVYsRUFBdUIsWUFBVztBQUNoQyxlQUFPLGNBQVAsQ0FB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a0IsSUFBbEIsQ0FGYSxFQUdiLFFBSGEsQ0FBZjtBQUtELEtBUEQsTUFPTyxJQUFJLE9BQU8sS0FBSyxPQUFaLEtBQXlCLFFBQTdCLEVBQXVDO0FBQzVDLFdBQUssT0FBTCxHQUFlLENBQUMsS0FBSyxPQUFOLENBQWY7QUFDRDs7QUFFRCxRQUFNLFFBQVEsQ0FDWixNQURZLEVBRVosU0FGWSxFQUdaLGNBSFksRUFJWixNQUpZLEVBS1osS0FMWSxDQUFkOztBQVFBLFdBQU8sS0FBSyxPQUFMLEVBQWMsSUFBZCxFQUFvQixLQUFwQixDQUFQO0FBQ0QsR0F4QkQ7QUF5QkQ7O0FBRUQsa0JBQWtCLFdBQWxCLEdBQWdDLEVBQWhDOztrQkFFZSxpQiIsImZpbGUiOiJhcHAtY29udGV4dC1leHByZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0IGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCBlczZyZXF1aXJlIGZyb20gJ0BtYXR0aW5zbGVyL2VzNnJlcXVpcmUnO1xuXG5mdW5jdGlvbiBzZXJpZXMoYXJyYXksIGZuKSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoZnVuY3Rpb24obGFzdFByb21pc2UsIGl0ZW0pIHtcbiAgICByZXR1cm4gbGFzdFByb21pc2UudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZm4oaXRlbSkpO1xuICAgIH0pO1xuICB9LCBQcm9taXNlLnJlc29sdmUoKSk7XG59XG5cblxuXG5mdW5jdGlvbiBjcmVhdGUoY29udGV4dCwgb3B0cykge1xuICBjb250ZXh0LmV4cHJlc3MgPSBleHByZXNzKCk7XG59XG5cbmZ1bmN0aW9uIGxpc3Rlbihjb250ZXh0LCBvcHRzKSB7XG4gIGNvbnN0IGh0dHBQb3J0ID0gcGFyc2VJbnQob3B0cy5wb3J0IHx8IHByb2Nlc3MuZW52LlBPUlQgfHwgMzAwMCk7XG4gIGNvbnN0IGh0dHBzUG9ydCA9IHBhcnNlSW50KChvcHRzLnNzbCAmJiBvcHRzLnNzbC5wb3J0KSB8fCBwcm9jZXNzLmVudi5IVFRQU19QT1JUIHx8IChodHRwUG9ydCArIDEpKTtcblxuICBmdW5jdGlvbiBzdGFydFNlcnZlcihrZXksIHNlcnZlciwgcG9ydCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHNlcnZlci5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgc2VydmVyLm9uKCdsaXN0ZW5pbmcnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2VydmVyLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICAgIGNvbnRleHRba2V5XSA9IHNlcnZlcjtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSk7XG5cbiAgICAgIHNlcnZlci5saXN0ZW4ocG9ydCk7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBwcm9taXNlcyA9IFtcbiAgICBzdGFydFNlcnZlcignaHR0cFNlcnZlcicsIGh0dHAuY3JlYXRlU2VydmVyKGNvbnRleHQuZXhwcmVzcyksIGh0dHBQb3J0KVxuICBdO1xuXG4gIGlmIChvcHRzLnNzbCAmJiAob3B0cy5zc2wucGZ4IHx8IChvcHRzLnNzbC5rZXkgJiYgb3B0cy5zc2wuY2VydCkpKSB7XG4gICAgaWYgKG9wdHMuc3NsLnBmeCkgeyBvcHRzLnNzbC5wZnggPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5yZXNvbHZlKGNvbnRleHQucm9vdCwgb3B0cy5zc2wucGZ4KSk7IH1cbiAgICBpZiAob3B0cy5zc2wua2V5KSB7IG9wdHMuc3NsLmtleSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoY29udGV4dC5yb290LCBvcHRzLnNzbC5rZXkpKTsgfVxuICAgIGlmIChvcHRzLnNzbC5jZXJ0KSB7IG9wdHMuc3NsLmNlcnQgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5yZXNvbHZlKGNvbnRleHQucm9vdCwgb3B0cy5zc2wuY2VydCkpOyB9XG5cbiAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgc3RhcnRTZXJ2ZXIoJ2h0dHBzU2VydmVyJywgaHR0cHMuY3JlYXRlU2VydmVyKG9wdHMuc3NsLCBjb250ZXh0LmV4cHJlc3MpLCBodHRwc1BvcnQpXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG59XG5cbmZ1bmN0aW9uIGNvbmZpZ3VyZShjb250ZXh0LCBvcHRzKSB7XG4gIGNvbnN0IG1ldGhvZHMgPSBvcHRzLmV4ZWN1dGUubWFwKGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gICAgaWYgKHR5cGVvZihmaWxlbmFtZSkgPT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZpbGVuYW1lOyB9XG5cbiAgICBpZiAodHlwZW9mKGZpbGVuYW1lKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBlczZyZXF1aXJlKG9wdHMucm9vdCwgZmlsZW5hbWUsIHsgaWdub3JlTW9kdWxlTm90Rm91bmQ6IHRydWUgfSk7XG4gICAgfVxuICB9KS5maWx0ZXIoKGEpID0+IGEpO1xuXG4gIHJldHVybiBzZXJpZXMobWV0aG9kcywgKG1ldGhvZCkgPT4gbWV0aG9kKGNvbnRleHQuZXhwcmVzcywgY29udGV4dCkpO1xufVxuXG5mdW5jdGlvbiBpbnN0YWxsRW5naW5lcyhjb250ZXh0LCBvcHRzKSB7XG4gIHZhciBlbmdpbmUgPSBjb250ZXh0LmV4cHJlc3MuZ2V0KCd2aWV3IGVuZ2luZScpO1xuICBpZiAoZW5naW5lKSB7XG4gICAgY29udGV4dC5leHByZXNzLmVuZ2luZXNbYC4ke2VuZ2luZX1gXSA9IGVzNnJlcXVpcmUocHJvY2Vzcy5jd2QoKSwgJ25vZGVfbW9kdWxlcycsIGVuZ2luZSkuX19leHByZXNzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluaXQoY29udGV4dCwgb3B0cywgc3RlcHMpIHtcbiAgcmV0dXJuIHNlcmllcyhzdGVwcywgKHN0ZXApID0+IHN0ZXAoY29udGV4dCwgb3B0cykpO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TWlkZGxld2FyZShvcHRzKSB7XG4gIHRyeSB7XG4gICAgcmVxdWlyZS5yZXNvbHZlKG9wdHMucm9vdCwgJ21pZGRsZXdhcmUnKTtcbiAgICByZXR1cm4gJ21pZGRsZXdhcmUnO1xuICB9IGNhdGNoIChlcnIpIHt9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGFwcCwgY29udGV4dCkge1xuICAgIGNvbnN0IG1vcmdhbiA9IHJlcXVpcmUoJ21vcmdhbicpO1xuICAgIGNvbnN0IGJvZHlQYXJzZXIgPSByZXF1aXJlKCdib2R5LXBhcnNlcicpO1xuICAgIGNvbnN0IG1ldGhvZE92ZXJyaWRlID0gcmVxdWlyZSgnbWV0aG9kLW92ZXJyaWRlJyk7XG5cbiAgICBhcHAudXNlKG1vcmdhbignZGV2JykpO1xuICAgIGFwcC51c2UoYm9keVBhcnNlci51cmxlbmNvZGVkKHtleHRlbmRlZDogZmFsc2V9KSk7XG4gICAgYXBwLnVzZShib2R5UGFyc2VyLmpzb24oKSk7XG4gICAgYXBwLnVzZShtZXRob2RPdmVycmlkZSgnWC1IVFRQLU1ldGhvZC1PdmVycmlkZScpKTtcbiAgICBhcHAudXNlKG1ldGhvZE92ZXJyaWRlKCdfbWV0aG9kJykpO1xuICAgIGFwcC51c2UobWV0aG9kT3ZlcnJpZGUoZnVuY3Rpb24ocmVxLCByZXMpIHtcbiAgICAgIGlmIChyZXEuYm9keSAmJiB0eXBlb2YocmVxLmJvZHkpID09PSAnb2JqZWN0JyAmJiAnX21ldGhvZCcgaW4gcmVxLmJvZHkpIHtcbiAgICAgICAgY29uc3QgbWV0aG9kID0gcmVxLmJvZHkuX21ldGhvZDtcbiAgICAgICAgZGVsZXRlIHJlcS5ib2R5Ll9tZXRob2Q7XG4gICAgICAgIHJldHVybiBtZXRob2Q7XG4gICAgICB9XG4gICAgfSkpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcmludChjb250ZXh0LCBvcHRzKSB7XG4gIGlmICghY29udGV4dC5odHRwU2VydmVyICYmICFjb250ZXh0Lmh0dHBzU2VydmVyKSB7IHJldHVybjsgfVxuXG4gIGNvbnN0IGxpbmVzID0gW1xuICAgICcnLFxuICAgICc9PSAnICsgY2hhbGsuY3lhbihjb250ZXh0Lm5hbWUpICsgJyA9PSdcbiAgXTtcbiAgaWYgKGNvbnRleHQudmVyc2lvbikge1xuICAgIGxpbmVzLnB1c2goJyAgdmVyc2lvbjogICAgICcgKyBjaGFsay5jeWFuKFtjb250ZXh0LnZlcnNpb24ubWFqb3IsIGNvbnRleHQudmVyc2lvbi5taW5vciwgY29udGV4dC52ZXJzaW9uLnBhdGNoXS5qb2luKCcuJykpKTtcbiAgfVxuICBsaW5lcy5wdXNoKFxuICAgICcgIGVudmlyb25tZW50OiAnICsgY2hhbGsuY3lhbihjb250ZXh0LmVudmlyb25tZW50KSxcbiAgICAnJyxcbiAgICAnPT0gU2VydmVycyA9PSdcbiAgKTtcbiAgaWYgKGNvbnRleHQuaHR0cFNlcnZlcikge1xuICAgIGxpbmVzLnB1c2goJyAgJyArIGNoYWxrLm1hZ2VudGEoJ0hUVFAnKSArICcgIGxpc3RlbmluZyBvbiBwb3J0ICcgKyBjaGFsay55ZWxsb3coY29udGV4dC5odHRwU2VydmVyLmFkZHJlc3MoKS5wb3J0KSk7XG4gIH1cbiAgaWYgKGNvbnRleHQuaHR0cHNTZXJ2ZXIpIHtcbiAgICBsaW5lcy5wdXNoKCcgICcgKyBjaGFsay5tYWdlbnRhKCdIVFRQUycpICsgJyBsaXN0ZW5pbmcgb24gcG9ydCAnICsgY2hhbGsueWVsbG93KGNvbnRleHQuaHR0cHNTZXJ2ZXIuYWRkcmVzcygpLnBvcnQpKTtcbiAgfVxuICBsaW5lcy5wdXNoKCcnKTtcblxuICBjb25zb2xlLmxvZyhsaW5lcy5qb2luKG9zLkVPTCkpO1xufVxuXG5mdW5jdGlvbiBhcHBDb250ZXh0RXhwcmVzcyhvcHRzID0ge30pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAvLyBUT0RPOiB2YWxpZGF0ZSBvcHRpb25zXG5cbiAgICBvcHRzLnJvb3QgPSBvcHRzLnJvb3QgPyBwYXRoLnJlc29sdmUoY29udGV4dC5yb290LCBvcHRzLnJvb3QpIDogY29udGV4dC5yb290O1xuICAgIGlmICghb3B0cy5leGVjdXRlKSB7XG4gICAgICAvLyBjcmVhdGUgZGVmYXVsdCBmaWxlc1xuICAgICAgb3B0cy5leGVjdXRlID0gW1xuICAgICAgICAnaW5pdGlhbGl6ZScsXG4gICAgICAgIGRlZmF1bHRNaWRkbGV3YXJlKG9wdHMpLFxuICAgICAgICAncm91dGVyJ1xuICAgICAgXTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZihvcHRzLmV4ZWN1dGUpID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0cy5leGVjdXRlID0gW29wdHMuZXhlY3V0ZV07XG4gICAgfVxuXG4gICAgY29uc3Qgc3RlcHMgPSBbXG4gICAgICBjcmVhdGUsXG4gICAgICBjb25maWd1cmUsXG4gICAgICBpbnN0YWxsRW5naW5lcyxcbiAgICAgIGxpc3RlbixcbiAgICAgIHByaW50XG4gICAgXTtcblxuICAgIHJldHVybiBpbml0KGNvbnRleHQsIG9wdHMsIHN0ZXBzKTtcbiAgfTtcbn07XG5cbmFwcENvbnRleHRFeHByZXNzLmRlZmF1bHRBcmdzID0ge307XG5cbmV4cG9ydCBkZWZhdWx0IGFwcENvbnRleHRFeHByZXNzO1xuIl19