# app-context-express

[express](http://expressjs.com/) initializer for [app-context](https://www.npmjs.com/package/app-context)

The express initailizer takes a small amount of configuration and will load certain files
in succession. The express app will be attached to `APP.express` and the HTTP server will
be attached to `APP.httpServer`.

#### Configuration

Configuration is very simple. The config object only takes a `port`. Look at the example
below to see how it's used.

#### Loading and configuring express

The express initializer will first create an express app and then pass it into a few files
found in the configured `root`. These files are `initialize.js`, `middleware.js`, and `router.js`.
All files are optional and can return a promise if they need to be asynchronous.

### Installation

```bash
$ npm install --save app-context-express
```

### Usage

##### context.js
```javascript
var AppContext = require('app-context');
var express = require('app-context-express');

module.exports = AppContext.createContext({
  configure: function() {
    this.use(
      AppContext.RunLevel.Running,
      // create an express instance using port 3000 and the files found in app/server
      express({
        root: 'app/server',
        config: {
          port: 3000
        }
      })
    );

    // you can optionally use app-context-express through app-context-initialize
    var initialize = require('app-context-initialize');
    this.use(
      AppContext.RunLevel.Running,
      initialize({
        express: {
          root: 'app/server',
          config: '$server'
        }
      })
    );
  }
});
```

##### initialize.js
```javascript
// This file is rarely used, but allows you to do something here that
// you want complete before the middleware is run. Maybe something async.

var request = require('request-promise');

module.exports = function(app) {
  return request('http://myserver.com/authCredentials?key=' + APP.config.credKey).then(function(creds) {
    app.set('creds') = creds;
  });
};
```

##### middleware.js
```javascript
var cors = require('cors');
var morgan = require('morgan');
var bodyParser = require('body-parser');

module.exports = function(app) {
  app.use(morgan('dev'));
  app.use(cors({origin: true}));
  app.use(bodyParser.json());
};
```

##### router.js
```javascript
module.exports = function(app) {
  app.get('/', require('./routes/index'));
};
```
