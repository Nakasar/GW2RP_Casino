'use strict';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const port = process.env.PORT || 3000;
const io = require('socket.io')(http);

const casino = require("./casino/casino.js");

var myCasino = new casino.Casino("Epeirevine");
console.log(myCasino.id + " created.");
var myTable = myCasino.addTable("blackjack", "Table 1", true);
myTable.io = io;
myTable.init();

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/casino/test.html");
});

io.on('connection', function(socket) {
  console.log("Socket opened.");
  socket.on("logged in", function(req) {
    if (req.nickname && req.nickname.length > 1 && req.nickname !== "dealer") {
      socket.nickname = req.nickname;
      socket.table = myTable;
      socket.join(myTable.id);
      myTable.addPlayerBySocket(socket);
      console.log("Socket logged in as " + socket.nickname);
      socket.emit("log accepted");
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
      console.log("Socket disconnected: " + socket.nickname);
    }
    console.log("Anonymous socket disconnected.");
  });
})

http.listen(port);

console.log('GW2RP Test Casino launched on port: ' + port);
