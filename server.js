/**
 * @fileoverview This is the server app script.
 * @author alvin.lin.dev@gmail.com (Alvin Lin)
 */

// Constants
var CHAT_TAG = '[Browsercraft]';
var DEV_MODE = false;
var FRAME_RATE = 1000.0 / 60.0;
var IP = process.env.IP || 'localhost';
var PORT_NUMBER = process.env.PORT || 5000;

// Sets the DEV_MODE constant during development if we run 'node server --dev'
process.argv.forEach(function(value, index, array) {
  if (value == '--dev' || value == '--development') {
    DEV_MODE = true;
  }
});

// Dependencies.
var assert = require('assert');
var bodyParser = require('body-parser');
var express = require('express');
var http = require('http');
var morgan = require('morgan');
var session = require('express-session');
var sharedSession = require('express-socket.io-session');
var socketIO = require('socket.io');
var swig = require('swig');
var mongodb = require('mongodb');

var router = require('./router/router');
var GameManager = require('./lib/GameManager');
var LobbyManager = require('./lib/LobbyManager');

// Initialization.
var app = express();
var server = http.Server(app);
var sessionConfig = session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
});
var io = socketIO(server);
var gameManager = GameManager.create();
var lobbyManager = LobbyManager.create();

app.engine('html', swig.renderFile);

app.set('port', PORT_NUMBER);
app.set('view engine', 'html');

app.use(sessionConfig);

app.use(morgan(':date[web] :method :url :req[header] :remote-addr :status'));
app.use('/public',
        express.static(__dirname + '/public'));
app.use('/shared',
        express.static(__dirname + '/shared'));

// Use request.query for GET request params.
// Use request.body for POST request params.
app.use(bodyParser.urlencoded({ extended: true }));

app.locals.dev_mode = DEV_MODE;
app.use('/', router);

// Allows the sockets to access the session data.
io.use(sharedSession(sessionConfig, {
  autoSave: true
}));

/**
 * Server side input handler, modifies the state of the players and the
 * game based on the input it receives. Everything runs asynchronously with
 * the game loop.
 */
io.on('connection', function(socket) {

  /**
   * When a new player joins, the server adds them to the lobby and sends back
   * their username through the callback.
   */
  socket.on('new-player', function(data, callback) {
    var username = socket.handshake.session.username;
    if (!username) {
      socket.emit('no-username');
      return;
    }
    lobbyManager.addNewPlayer(username, socket.id);
    callback(username);
  });

  // Update the internal object states every time a player sends an intent
  // packet.

  socket.on('chat-client-to-server', function(data) {
    var username = socket.handshake.session.username;
    if (!username) {
      socket.emit('no-username');
    }
    io.sockets.emit('chat-server-to-clients', {
      name: game.getPlayerNameBySocketId(socket.id),
      message: data
    });
  });

  // When a player disconnects, remove them from the game.
  socket.on('disconnect', function() {
  });
});

// Server side game loop, runs at 60Hz and sends out update packets to all
// clients every tick.
setInterval(function() {

}, FRAME_RATE);

// Starts the server.
server.listen(PORT_NUMBER, function() {
  if (DEV_MODE) {
  console.log('STARTING SERVER ON PORT ' + PORT_NUMBER);
    console.log('DEVELOPMENT MODE ENABLED: SERVING UNCOMPILED JAVASCRIPT!');
  }
});
