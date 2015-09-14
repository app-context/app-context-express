# app-context-express

[express](http://expressjs.com/) initializer for [app-context](http://app-contextjs.com)

The express initializer provides structure to your express server initialization
and removes boilerplate.

## Usage

Using this initializer in your context file will automatically install it.

After this initializer, the express app will be attached to `APP.express`, the
HTTP server to `APP.httpServer`, and the HTTPS server to `APP.httpsServer`.

```javascript
module.exports = function() {
  this.runlevel('running')
    // use all defaults
    .use('express')

    // listen on port 8000 and execute scripts server/initialize.js, server/middleware.js, server/router.js
    .use('express', {
      port: 8000,
      root: 'server'
    })

    // use port and ssl settings from config
    // specify custom scripts to execute before listening, which are located in the server directory
    .use('express', {
      port: '$server.port',
      ssl: '$server.ssl',
      root: 'server',
      execute: [
        'middleware',
        'internal-router',
        'external-router'
      ]
    })
};
```

## Options

**`root`** - directory to find execute scripts in (defaults to the project root)

**`execute`** - string or array of scripts to run, in order, to setup the express server (defaults to `initialize`, `middleware`, `router`)

**`port`** - port for the HTTP server to listen on (defaults to `process.env.PORT` or `3000`)

#### SSL Options

An HTTPS server will be started if you include either a key and cert, or a pfx
file.

**`ssl.port`** - port for the HTTPS server to listen on (defaults to `process.env.HTTPS_PORT` or **`port`** + 1)

**`ssl.key`**, **`ssl.cert`** - path of the key and certificate files relative to project root

**`ssl.pfx`** - path of the pfx file relative to project root

## Discussion

The express initializer takes 3 distinct steps.

- Create express app and assign it to `context.express` (or `APP.express`).
- Load and execute the scripts listed in the `execute` option in order, passing the express app and
current context into each script. Missing scripts will be ignored.
- Create HTTP and optionally HTTPS servers and tell each to listen on their respective ports.

Steps 1 and 3 are simple enough. Step 2 needs a little more detail. This is where
the main separation and structure is created, by separating the steps in which you
configure your server.

Each script in the `execute` list is expected to export a method that takes an
express app and optionally the current context. The app is the app created by the
initializer and the context is the current app-context instance (also accessible via `APP`).

```javascript
module.exports = function(app, context) {

};
```

You can decide which scripts to execute to customize your process by specifying
either a single filename or an array of filenames.

### The default `execute` behavior

By default a preset list of scripts will be used. These are `initialize`, `middleware`, and
`router`. Additionally, if no middleware file is found, a default set of middleware
will be configured for you. The default `middleware.js` file is:

```javascript
module.exports = function(app, context) {
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
```
