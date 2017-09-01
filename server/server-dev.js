'use strict';

const chokidar = require('chokidar');
const morgan = require('morgan');
const config = require('./config.development.json');
const WebpackDevServer = require('webpack-dev-server');

function clearRequireCache() {
  Object.keys(require.cache).forEach(function (key) {
    delete require.cache[key];
  });
}

let server, baseUrl;

function start() {
  const loopback = require('loopback');
  const boot = require('loopback-boot');

  let app = module.exports = loopback();
  boot(app, __dirname, function(err) {
    if (err) throw err;

    // start the server if `$ node server.js`
    if (require.main === module) {
      server = app.listen(function() {
        app.emit('started');
        baseUrl = app.get('url').replace(/\/$/, '');

        console.log('Web server listening at: %s', baseUrl);
        if (app.get('loopback-component-explorer')) {
          var explorerPath = app.get('loopback-component-explorer').mountPath;
          console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
        }
      });
    }
  });
}

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
start();

const watcher = chokidar.watch(__dirname, {ignored: /(^|[/\\])\../});
watcher
  .on('change', filePath => {
    server.close();
    clearRequireCache();
    start();
  });

const webpackConfig = require('../webpack.config');
webpackConfig.entry.hotreload = [
  'webpack-dev-server/client?http://localhost:' + config.front.port
];
const webpack = require('webpack');
const compiler = webpack(webpackConfig);
const webpackDevServer = new WebpackDevServer(compiler, {
  historyApiFallback: true,
  proxy: {
    '/explorer': 'http://localhost:' + config.port,
    '/api': 'http://localhost:' + config.port,
  },
  stats: {
    colors: true,
  },
  setup: function(app) {
    app.use(morgan('dev'));
  },
});

webpackDevServer.listen(config.front.port, () => {
  console.log('Server started on port ' + config.front.port);
});
