// Generated by CoffeeScript 1.6.3
(function() {
  var Server, defaultExclusions, defaultExts, defaultPort, fs, http, path, url, version, ws;

  fs = require('fs');

  path = require('path');

  ws = require('websocket.io');

  http = require('http');

  url = require('url');

  version = '1.6';

  defaultPort = 35729;

  defaultExts = ['html', 'css', 'js', 'png', 'gif', 'jpg', 'php', 'php5', 'py', 'rb', 'erb'];

  defaultExclusions = [/\.git\//, /\.svn\//, /\.hg\//];

  Server = (function() {
    function Server(config) {
      var _base, _base1, _base2, _base3, _base4, _base5;
      this.config = config;
      if (this.config == null) {
        this.config = {};
      }
      if ((_base = this.config).version == null) {
        _base.version = version;
      }
      if ((_base1 = this.config).port == null) {
        _base1.port = defaultPort;
      }
      if ((_base2 = this.config).exts == null) {
        _base2.exts = [];
      }
      if ((_base3 = this.config).exclusions == null) {
        _base3.exclusions = [];
      }
      this.config.exts = this.config.exts.concat(defaultExts);
      this.config.exclusions = this.config.exclusions.concat(defaultExclusions);
      if ((_base4 = this.config).applyJSLive == null) {
        _base4.applyJSLive = false;
      }
      if ((_base5 = this.config).applyCSSLive == null) {
        _base5.applyCSSLive = true;
      }
      this.sockets = [];
    }

    Server.prototype.listen = function() {
      this.debug("LiveReload is waiting for browser to connect.");
      if (this.config.server) {
        this.config.server.listen(this.config.port);
        this.server = ws.attach(this.config.server);
      } else {
        this.server = ws.listen(this.config.port);
      }
      this.server.on('connection', this.onConnection.bind(this));
      return this.server.on('close', this.onClose.bind(this));
    };

    Server.prototype.onConnection = function(socket) {
      var _this = this;
      this.debug("Browser connected.");
      socket.send("!!ver:" + this.config.version);
      socket.on('message', function(message) {
        return _this.debug("Browser URL: " + message);
      });
      return this.sockets.push(socket);
    };

    Server.prototype.onClose = function(socket) {
      return this.debug("Browser disconnected.");
    };

    Server.prototype.walkTree = function(dirname, callback) {
      var exclusions, exts, walk;
      exts = this.config.exts;
      exclusions = this.config.exclusions;
      walk = function(dirname) {
        return fs.readdir(dirname, function(err, files) {
          if (err) {
            return callback(err);
          }
          return files.forEach(function(file) {
            var exclusion, filename, _i, _len;
            filename = path.join(dirname, file);
            for (_i = 0, _len = exclusions.length; _i < _len; _i++) {
              exclusion = exclusions[_i];
              if (filename.match(exclusion)) {
                return;
              }
            }
            return fs.stat(filename, function(err, stats) {
              var ext, _j, _len1, _results;
              if (!err && stats.isDirectory()) {
                return walk(filename);
              } else {
                _results = [];
                for (_j = 0, _len1 = exts.length; _j < _len1; _j++) {
                  ext = exts[_j];
                  if (!(filename.match("\." + ext + "$"))) {
                    continue;
                  }
                  callback(err, filename);
                  break;
                }
                return _results;
              }
            });
          });
        });
      };
      return walk(dirname, callback);
    };

    Server.prototype.watch = function(dirname) {
      var _this = this;
      return this.walkTree(dirname, function(err, filename) {
        if (err) {
          throw err;
        }
        return fs.watchFile(filename, {
          interval: 1000
        }, function(curr, prev) {
          if (curr.mtime > prev.mtime) {
            return _this.refresh(filename);
          }
        });
      });
    };

    Server.prototype.refresh = function(path) {
      var data, socket, _i, _len, _ref, _results;
      this.debug("Refresh: " + path);
      data = JSON.stringify([
        'refresh', {
          path: path,
          apply_js_live: this.config.applyJSLive,
          apply_css_live: this.config.applyCSSLive
        }
      ]);
      _ref = this.sockets;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        socket = _ref[_i];
        _results.push(socket.send(data));
      }
      return _results;
    };

    Server.prototype.debug = function(str) {
      if (this.config.debug) {
        return console.log("" + str + "\n");
      }
    };

    return Server;

  })();

  exports.createServer = function(config) {
    var app, server;
    if (config == null) {
      config = {};
    }
    app = http.createServer(function(req, res) {
      if (url.parse(req.url).pathname === '/livereload.js') {
        res.writeHead(200, {
          'Content-Type': 'text/javascript'
        });
        return res.end(fs.readFileSync(__dirname + '/../ext/livereload.js'));
      }
    });
    if (config.server == null) {
      config.server = app;
    }
    server = new Server(config);
    server.listen();
    return server;
  };

}).call(this);