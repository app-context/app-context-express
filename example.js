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
