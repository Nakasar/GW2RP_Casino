'use strict';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const port = process.env.PORT || 3050;
const io = require('socket.io')(http);

const casino = require("./casino/casino.js");

var myCasino = new casino.Casino("Epeirevine");
console.log(myCasino.id + " created.");

app.use('/imgs', express.static('public/src/img'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/casino/test.html");
});

app.get('/:tableId', function(req, res) {
  res.sendFile(__dirname + "/casino/test.html");
});

io.on('connection', function(socket) {
  console.log("Socket opened.");
  socket.on("logged in", function(req) {
    console.log("Request for log : ");
    console.log(req);
    if (req.nickname && req.nickname.length > 1 && req.nickname !== "dealer" && req.table && req.table.length > 1) {
      socket.nickname = req.nickname;
      if (myCasino.hasTable(req.table)) {
        // Table already exists, join it.
        socket.table = myCasino.getTable(req.table);
      } else {
        // Create the table.
        var newTable = myCasino.addTable("blackjack", req.table, true);
        newTable.io = io;
        newTable.init();
        socket.table = newTable;
      }
      socket.join(socket.table.id);
      if (socket.table.players.has(socket.nickname)) {
        var i = 1;
        var nickname = socket.nickname + "_00" + i;
        while (socket.table.players.has(nickname)) {
          nickname = socket.nickname + "_00" + i;
        }
        socket.nickname = nickname;
      }
      socket.emit("log accepted", { nickname: socket.nickname, tableId: socket.table.id, currentPlayers: socket.table.playerArray(), motd: "" });
      socket.table.addPlayerBySocket(socket);
      console.log("Socket logged in as " + socket.nickname + " on table " + socket.table.id);
    } else {
      socket.emit("log rejected");
    }
    socket.on("game message", function(message) {
      socket.table.onGameMessage(message, socket);
    });
  });
  socket.on('disconnect', function() {
    if (socket.nickname) {
      socket.table.removePlayer(socket.nickname);
      if (socket.table.players.size == 1) {
        console.log("Delete table: " + socket.table.id);
        myCasino.removeTable(socket.table.id);
      }
      console.log("Socket disconnected: " + socket.nickname);
    }
    console.log("Anonymous socket disconnected.");
  });
})

http.listen(port);

console.log('GW2RP Test Casino launched on port: ' + port);
