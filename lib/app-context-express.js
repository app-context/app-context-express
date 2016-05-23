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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hcHAtY29udGV4dC1leHByZXNzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsU0FBUyxNQUFULENBQWdCLEtBQWhCLEVBQXVCLEVBQXZCLEVBQTJCO0FBQ3pCLFNBQU8sTUFBTSxNQUFOLENBQWEsVUFBUyxXQUFULEVBQXNCLElBQXRCLEVBQTRCO0FBQzlDLFdBQU8sWUFBWSxJQUFaLENBQWlCLFlBQVc7QUFDakMsYUFBTyxRQUFRLE9BQVIsQ0FBZ0IsR0FBRyxJQUFILENBQWhCLENBQVA7QUFDRCxLQUZNLENBQVA7QUFHRCxHQUpNLEVBSUosUUFBUSxPQUFSLEVBSkksQ0FBUDtBQUtEOztBQUlELFNBQVMsTUFBVCxDQUFnQixPQUFoQixFQUF5QixJQUF6QixFQUErQjtBQUM3QixVQUFRLE9BQVIsR0FBa0Isd0JBQWxCO0FBQ0Q7O0FBRUQsU0FBUyxNQUFULENBQWdCLE9BQWhCLEVBQXlCLElBQXpCLEVBQStCO0FBQzdCLE1BQU0sV0FBVyxTQUFTLEtBQUssSUFBTCxJQUFhLFFBQVEsR0FBUixDQUFZLElBQXpCLElBQWlDLElBQTFDLENBQWpCO0FBQ0EsTUFBTSxZQUFZLFNBQVUsS0FBSyxHQUFMLElBQVksS0FBSyxHQUFMLENBQVMsSUFBdEIsSUFBK0IsUUFBUSxHQUFSLENBQVksVUFBM0MsSUFBMEQsV0FBVyxDQUE5RSxDQUFsQjs7QUFFQSxXQUFTLFdBQVQsQ0FBcUIsR0FBckIsRUFBMEIsTUFBMUIsRUFBa0MsSUFBbEMsRUFBd0M7QUFDdEMsV0FBTyxJQUFJLE9BQUosQ0FBWSxVQUFTLE9BQVQsRUFBa0IsTUFBbEIsRUFBMEI7QUFDM0MsYUFBTyxFQUFQLENBQVUsT0FBVixFQUFtQixNQUFuQjtBQUNBLGFBQU8sRUFBUCxDQUFVLFdBQVYsRUFBdUIsWUFBVztBQUNoQyxlQUFPLGNBQVAsQ0FB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LENBQ2IsWUFEYSxFQUViLGtCQUFrQixJQUFsQixDQUZhLEVBR2IsUUFIYSxDQUFmO0FBS0QsS0FQRCxNQU9PLElBQUksT0FBTyxLQUFLLE9BQVosS0FBeUIsUUFBN0IsRUFBdUM7QUFDNUMsV0FBSyxPQUFMLEdBQWUsQ0FBQyxLQUFLLE9BQU4sQ0FBZjtBQUNEOztBQUVELFFBQU0sUUFBUSxDQUNaLE1BRFksRUFFWixTQUZZLEVBR1osY0FIWSxFQUlaLE1BSlksRUFLWixLQUxZLENBQWQ7O0FBUUEsV0FBTyxLQUFLLE9BQUwsRUFBYyxJQUFkLEVBQW9CLEtBQXBCLENBQVA7QUFDRCxHQXhCRDtBQXlCRDs7QUFFRCxrQkFBa0IsV0FBbEIsR0FBZ0MsRUFBaEM7O2tCQUVlLGlCIiwiZmlsZSI6ImFwcC1jb250ZXh0LWV4cHJlc3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGVzNnJlcXVpcmUgZnJvbSAnQG1hdHRpbnNsZXIvZXM2cmVxdWlyZSc7XG5cbmZ1bmN0aW9uIHNlcmllcyhhcnJheSwgZm4pIHtcbiAgcmV0dXJuIGFycmF5LnJlZHVjZShmdW5jdGlvbihsYXN0UHJvbWlzZSwgaXRlbSkge1xuICAgIHJldHVybiBsYXN0UHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmbihpdGVtKSk7XG4gICAgfSk7XG4gIH0sIFByb21pc2UucmVzb2x2ZSgpKTtcbn1cblxuXG5cbmZ1bmN0aW9uIGNyZWF0ZShjb250ZXh0LCBvcHRzKSB7XG4gIGNvbnRleHQuZXhwcmVzcyA9IGV4cHJlc3MoKTtcbn1cblxuZnVuY3Rpb24gbGlzdGVuKGNvbnRleHQsIG9wdHMpIHtcbiAgY29uc3QgaHR0cFBvcnQgPSBwYXJzZUludChvcHRzLnBvcnQgfHwgcHJvY2Vzcy5lbnYuUE9SVCB8fCAzMDAwKTtcbiAgY29uc3QgaHR0cHNQb3J0ID0gcGFyc2VJbnQoKG9wdHMuc3NsICYmIG9wdHMuc3NsLnBvcnQpIHx8IHByb2Nlc3MuZW52LkhUVFBTX1BPUlQgfHwgKGh0dHBQb3J0ICsgMSkpO1xuXG4gIGZ1bmN0aW9uIHN0YXJ0U2VydmVyKGtleSwgc2VydmVyLCBwb3J0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgc2VydmVyLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICBzZXJ2ZXIub24oJ2xpc3RlbmluZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXJ2ZXIucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgcmVqZWN0KTtcbiAgICAgICAgY29udGV4dFtrZXldID0gc2VydmVyO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KTtcblxuICAgICAgc2VydmVyLmxpc3Rlbihwb3J0KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHByb21pc2VzID0gW1xuICAgIHN0YXJ0U2VydmVyKCdodHRwU2VydmVyJywgaHR0cC5jcmVhdGVTZXJ2ZXIoY29udGV4dC5leHByZXNzKSwgaHR0cFBvcnQpXG4gIF07XG5cbiAgaWYgKG9wdHMuc3NsICYmIChvcHRzLnNzbC5wZnggfHwgKG9wdHMuc3NsLmtleSAmJiBvcHRzLnNzbC5jZXJ0KSkpIHtcbiAgICBpZiAob3B0cy5zc2wucGZ4KSB7IG9wdHMuc3NsLnBmeCA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoY29udGV4dC5yb290LCBvcHRzLnNzbC5wZngpKTsgfVxuICAgIGlmIChvcHRzLnNzbC5rZXkpIHsgb3B0cy5zc2wua2V5ID0gZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShjb250ZXh0LnJvb3QsIG9wdHMuc3NsLmtleSkpOyB9XG4gICAgaWYgKG9wdHMuc3NsLmNlcnQpIHsgb3B0cy5zc2wuY2VydCA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoY29udGV4dC5yb290LCBvcHRzLnNzbC5jZXJ0KSk7IH1cblxuICAgIHByb21pc2VzLnB1c2goXG4gICAgICBzdGFydFNlcnZlcignaHR0cHNTZXJ2ZXInLCBodHRwcy5jcmVhdGVTZXJ2ZXIob3B0cy5zc2wsIGNvbnRleHQuZXhwcmVzcyksIGh0dHBzUG9ydClcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbn1cblxuZnVuY3Rpb24gY29uZmlndXJlKGNvbnRleHQsIG9wdHMpIHtcbiAgY29uc3QgbWV0aG9kcyA9IG9wdHMuZXhlY3V0ZS5tYXAoZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgICBpZiAodHlwZW9mKGZpbGVuYW1lKSA9PT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmlsZW5hbWU7IH1cblxuICAgIGlmICh0eXBlb2YoZmlsZW5hbWUpID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGVzNnJlcXVpcmUob3B0cy5yb290LCBmaWxlbmFtZSwgeyBpZ25vcmVNb2R1bGVOb3RGb3VuZDogdHJ1ZSB9KTtcbiAgICB9XG4gIH0pLmZpbHRlcigoYSkgPT4gYSk7XG5cbiAgcmV0dXJuIHNlcmllcyhtZXRob2RzLCAobWV0aG9kKSA9PiBtZXRob2QoY29udGV4dC5leHByZXNzLCBjb250ZXh0KSk7XG59XG5cbmZ1bmN0aW9uIGluc3RhbGxFbmdpbmVzKGNvbnRleHQsIG9wdHMpIHtcbiAgdmFyIGVuZ2luZSA9IGNvbnRleHQuZXhwcmVzcy5nZXQoJ3ZpZXcgZW5naW5lJyk7XG4gIGlmIChlbmdpbmUpIHtcbiAgICBjb250ZXh0LmV4cHJlc3MuZW5naW5lc1tgLiR7ZW5naW5lfWBdID0gZXM2cmVxdWlyZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJywgZW5naW5lKS5fX2V4cHJlc3M7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdChjb250ZXh0LCBvcHRzLCBzdGVwcykge1xuICByZXR1cm4gc2VyaWVzKHN0ZXBzLCAoc3RlcCkgPT4gc3RlcChjb250ZXh0LCBvcHRzKSk7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRNaWRkbGV3YXJlKG9wdHMpIHtcbiAgdHJ5IHtcbiAgICByZXF1aXJlLnJlc29sdmUocGF0aC5yZXNvbHZlKG9wdHMucm9vdCwgJ21pZGRsZXdhcmUnKSk7XG4gICAgcmV0dXJuICdtaWRkbGV3YXJlJztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oYXBwLCBjb250ZXh0KSB7XG4gICAgY29uc3QgbW9yZ2FuID0gcmVxdWlyZSgnbW9yZ2FuJyk7XG4gICAgY29uc3QgYm9keVBhcnNlciA9IHJlcXVpcmUoJ2JvZHktcGFyc2VyJyk7XG4gICAgY29uc3QgbWV0aG9kT3ZlcnJpZGUgPSByZXF1aXJlKCdtZXRob2Qtb3ZlcnJpZGUnKTtcblxuICAgIGFwcC51c2UobW9yZ2FuKCdkZXYnKSk7XG4gICAgYXBwLnVzZShib2R5UGFyc2VyLnVybGVuY29kZWQoe2V4dGVuZGVkOiBmYWxzZX0pKTtcbiAgICBhcHAudXNlKGJvZHlQYXJzZXIuanNvbigpKTtcbiAgICBhcHAudXNlKG1ldGhvZE92ZXJyaWRlKCdYLUhUVFAtTWV0aG9kLU92ZXJyaWRlJykpO1xuICAgIGFwcC51c2UobWV0aG9kT3ZlcnJpZGUoJ19tZXRob2QnKSk7XG4gICAgYXBwLnVzZShtZXRob2RPdmVycmlkZShmdW5jdGlvbihyZXEsIHJlcykge1xuICAgICAgaWYgKHJlcS5ib2R5ICYmIHR5cGVvZihyZXEuYm9keSkgPT09ICdvYmplY3QnICYmICdfbWV0aG9kJyBpbiByZXEuYm9keSkge1xuICAgICAgICBjb25zdCBtZXRob2QgPSByZXEuYm9keS5fbWV0aG9kO1xuICAgICAgICBkZWxldGUgcmVxLmJvZHkuX21ldGhvZDtcbiAgICAgICAgcmV0dXJuIG1ldGhvZDtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByaW50KGNvbnRleHQsIG9wdHMpIHtcbiAgaWYgKCFjb250ZXh0Lmh0dHBTZXJ2ZXIgJiYgIWNvbnRleHQuaHR0cHNTZXJ2ZXIpIHsgcmV0dXJuOyB9XG5cbiAgY29uc3QgbGluZXMgPSBbXG4gICAgJycsXG4gICAgJz09ICcgKyBjaGFsay5jeWFuKGNvbnRleHQubmFtZSkgKyAnID09J1xuICBdO1xuICBpZiAoY29udGV4dC52ZXJzaW9uKSB7XG4gICAgbGluZXMucHVzaCgnICB2ZXJzaW9uOiAgICAgJyArIGNoYWxrLmN5YW4oW2NvbnRleHQudmVyc2lvbi5tYWpvciwgY29udGV4dC52ZXJzaW9uLm1pbm9yLCBjb250ZXh0LnZlcnNpb24ucGF0Y2hdLmpvaW4oJy4nKSkpO1xuICB9XG4gIGxpbmVzLnB1c2goXG4gICAgJyAgZW52aXJvbm1lbnQ6ICcgKyBjaGFsay5jeWFuKGNvbnRleHQuZW52aXJvbm1lbnQpLFxuICAgICcnLFxuICAgICc9PSBTZXJ2ZXJzID09J1xuICApO1xuICBpZiAoY29udGV4dC5odHRwU2VydmVyKSB7XG4gICAgbGluZXMucHVzaCgnICAnICsgY2hhbGsubWFnZW50YSgnSFRUUCcpICsgJyAgbGlzdGVuaW5nIG9uIHBvcnQgJyArIGNoYWxrLnllbGxvdyhjb250ZXh0Lmh0dHBTZXJ2ZXIuYWRkcmVzcygpLnBvcnQpKTtcbiAgfVxuICBpZiAoY29udGV4dC5odHRwc1NlcnZlcikge1xuICAgIGxpbmVzLnB1c2goJyAgJyArIGNoYWxrLm1hZ2VudGEoJ0hUVFBTJykgKyAnIGxpc3RlbmluZyBvbiBwb3J0ICcgKyBjaGFsay55ZWxsb3coY29udGV4dC5odHRwc1NlcnZlci5hZGRyZXNzKCkucG9ydCkpO1xuICB9XG4gIGxpbmVzLnB1c2goJycpO1xuXG4gIGNvbnNvbGUubG9nKGxpbmVzLmpvaW4ob3MuRU9MKSk7XG59XG5cbmZ1bmN0aW9uIGFwcENvbnRleHRFeHByZXNzKG9wdHMgPSB7fSkge1xuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIC8vIFRPRE86IHZhbGlkYXRlIG9wdGlvbnNcblxuICAgIG9wdHMucm9vdCA9IG9wdHMucm9vdCA/IHBhdGgucmVzb2x2ZShjb250ZXh0LnJvb3QsIG9wdHMucm9vdCkgOiBjb250ZXh0LnJvb3Q7XG4gICAgaWYgKCFvcHRzLmV4ZWN1dGUpIHtcbiAgICAgIC8vIGNyZWF0ZSBkZWZhdWx0IGZpbGVzXG4gICAgICBvcHRzLmV4ZWN1dGUgPSBbXG4gICAgICAgICdpbml0aWFsaXplJyxcbiAgICAgICAgZGVmYXVsdE1pZGRsZXdhcmUob3B0cyksXG4gICAgICAgICdyb3V0ZXInXG4gICAgICBdO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mKG9wdHMuZXhlY3V0ZSkgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvcHRzLmV4ZWN1dGUgPSBbb3B0cy5leGVjdXRlXTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgIGNyZWF0ZSxcbiAgICAgIGNvbmZpZ3VyZSxcbiAgICAgIGluc3RhbGxFbmdpbmVzLFxuICAgICAgbGlzdGVuLFxuICAgICAgcHJpbnRcbiAgICBdO1xuXG4gICAgcmV0dXJuIGluaXQoY29udGV4dCwgb3B0cywgc3RlcHMpO1xuICB9O1xufTtcblxuYXBwQ29udGV4dEV4cHJlc3MuZGVmYXVsdEFyZ3MgPSB7fTtcblxuZXhwb3J0IGRlZmF1bHQgYXBwQ29udGV4dEV4cHJlc3M7XG4iXX0=