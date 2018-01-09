'use strict';
const express = require('express');
const app = express();
const http = require('http').Server(app);
const port = process.env.PORT || 3000;
const io = require('socket.io')(http);

class Table {
  constructor (id, type) {
    this.id = id;
    this.type = type;
    this.users = new Map();
    this.chat = [];
    this.admin = "";
  }

  publishMessage(userId, message) {
    if (this.users.has(userId)) {
      let user = this.users.get(userId);
      let message = { author: { id: userId, nickname: user.nickname }, message: message, timestamp: Date.now() };
      this.chat.append(message);
      io.in(this.id).emit("chat message", message);
    } else {
      console.log("User " + userId + " is not part of the table " + this.id);
    }
  }
}

class User {
  constructor (nickname) {
    this.nickname = nickname;
  }
}

var tables = new Map();

app.use('/static', express.static('public'));
app.use('/imgs', express.static('public/src/img'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/Client/index.html");
});

app.get('/table', function(req, res) {
  res.sendFile(__dirname + "/public/pages/table.html");
})

app.get('/:tableId', function(req, res) {
  console.log("A user requested table " + req.params.tableId);
  if (tables.has(req.params.tableId)) {
    res.sendFile(__dirname + "/public/tables/poker.html");
  } else {
    res.sendFile(__dirname + "/Client/index.html");
  }
});

io.on('connection', function(socket) {
  console.log("A user connected.");
  socket.on('disconnect', function() {
    console.log('A user disconnected');
  });

  socket.on('request join table', function(req) {
    if (req.nickname && req.tableId) {
      if (tables.has(req.tableId)) {
        socket.emit('complete join table', { tableId: req.tableId, nickname: req.nickname, asAdmin: false });
      } else {
        let table = new Table(req.tableId, "empty");
        tables.set(table.id, table);
        socket.emit('complete join table', { tableId: req.tableId, nickname: req.nickname, asAdmin: true });
      }
    } else {
      socket.emit('declined join table', { code: "unknown", message: "Invalid parameters (nickname and tableId)." });
    }
  });

  socket.on('join table', function(req) {
    console.log('User ' + req.nickname + ' joined room: ' + req.tableId);
    if (tables.has(req.tableId)) {
      var table = tables.get(req.tableId);
      if (!table.users.has(req.nickname)) {
        socket.nickname = req.nickname;
      } else {
        var i = 1;
        var new_nickname = req.nickname + "_" + i;
        while (tables.get(req.tableId).users.has(new_nickname)) {
          new_nickname = req.nickname + "_" + i;
        }
        socket.nickname = new_nickname;
      }
      socket.tableId = req.tableId;
      table.users.set(socket.nickname, new User(socket.nickname));
      tables.set(table.id, table);
      socket.join(socket.tableId);
      socket.emit('room joined', { tableId: req.tableId, nickname: socket.nickname });
      io.in(req.tableId).emit('server message', socket.nickname + " joined the table.");
    } else {
      console.log('Room ' + req.tableId + " does not exist.");
      socket.emit('room can not join', { message: 'room does not exist' });
    }
  });

  socket.on('chat message', function(message) {
    console.log("Received message from " + socket.nickname + " on " + socket.tableId);
    console.log(message);
    io.in(socket.tableId).emit('chat message', { timestamp: Date.now(), author: socket.nickname, content: message.content });
  })
});

http.listen(port);

console.log('GW2RP Virtual Casino launched on port: ' + port);
