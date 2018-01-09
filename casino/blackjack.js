const table = require('./table.js');

class Card {
  constructor (value, name) {
    this.value = value;
    this.name = name;
    this.hidden = false;
  }
}

const deck52 = [
  new Card([1, 11], "1_heart"),
  new Card([2], "2_heart"),
  new Card([3], "3_heart"),
  new Card([4], "4_heart"),
  new Card([1, 11], "1_spade"),
  new Card([2], "2_spade"),
  new Card([3], "3_spade"),
  new Card([4], "4_spade"),
  new Card([1, 11], "1_diamond"),
  new Card([2], "2_diamond"),
  new Card([3], "3_diamond"),
  new Card([4], "4_diamond"),
  new Card([5], "5_diamond"),
  new Card([6], "6_diamond"),
];

const dealerLimit = 17;

module.exports = {
  Blackjack: class Blackjack extends table.Table {
    constructor(id, automated) {
      super(id);
      this.gameType = "blackjack";
      this.players = new Map();
      this.currentPlayer = null;
      this.turnOrder = [];
      this.automated = automated;
      this.io = null;
      this.started = false;
    }

    init() {
      this.deck = new Deck(deck52, 6);
      this.deck.shuffle();
      this.addPlayer("dealer");
    }

    addPlayer(playerId) {
      if (!this.players.has(playerId)) {
        this.players.set(playerId, new Player(playerId));
      }
    }

    addPlayerBySocket(socket) {
      if (!this.players.has(socket.nickname)) {
        var player = new Player(socket.nickname);
        player.socket = socket;
        this.players.set(socket.nickname, player);
        this.notifyAllPlayers({ author: "table", timestamp: Date.now(), message: player.id + " joined the table." });
      }
    }

    removePlayer(playerId) {
      console.log("removing " + playerId);
      if (this.players.has(playerId)) {
        this.players.delete(playerId);
        console.log("notify left of " + playerId);
        this.notifyAllPlayers({ author: "table", timestamp: Date.now(), message: playerId + " left the table." });
      }
    }

    drawCard(player, hidden) {
      console.log("Draw card for " + player.id + "...");
      let card = this.deck.pickFirstCard();
      player.receivedCard(card, hidden);
      console.log(player.hand);
      console.log(player.handValue());
      if (hidden) {
        player.notify({ author: 'table', timestamp: Date.now(), message: "You received " + card.name, type: 'card', for: player.id, card: { name: card.name, value: card.value }, handValue: player.handValue() })
      } else {
        this.notifyAllPlayers({ author: 'table', timestamp: Date.now(), message: player.id + " received " + card.name, type: 'card', for: player.id, card: { name: card.name, value: card.value }, handValue: player.handValue() });
      }
    }

    firstTurn() {
      // Draw card for each player including dealer.
      for (var player of this.players.values()) {
        this.drawCard(player, false);
      }
      // draw an hidden card for the dealer.
      this.drawCard(this.players.get("dealer"), true);
      // Draw a second card for each player.
      for (var player of this.players.values()) {
        if (player.id !== "dealer") {
          this.drawCard(player, false);
          this.turnOrder.push(player);
        }
      }
    }

    resetGame() {
      for (var player of this.players.values()) {
        player.hand = [];
      }
      this.started = false;
      this.turnOrder = [];
      this.currentPlayer = null;
    }

    startGame() {
      console.log("Starting game with players: " + this.listPlayers());
      this.started = true;
      this.firstTurn();
      if (this.turnOrder.length > 0) {
        this.playerTurn(this.turnOrder[0]);
      }
    }

    playerTurn(player) {
      console.log("Turn of: " + player.id);
      this.currentPlayer = player;
      this.currentPlayer.notify({ author: 'table', timestamp: Date.now(), message: 'This is your turn. Use /card or /stand.', type: 'notification', notification: 'playerturn' });
    }

    nextPlayerTurn() {
      var turn = this.turnOrder.indexOf(this.currentPlayer);
      if (turn < this.turnOrder.length - 1) {
        console.log("Next turn : " + this.turnOrder[turn + 1].id);
        this.playerTurn(this.turnOrder[turn + 1]);
      } else {
        console.log("All players played. This id dealer's last turn.");
        this.dealerTurn(this.players.get("dealer"));
      }
    }

    dealerTurn(dealer) {
      console.log("Turn of: " + dealer.id);
      dealer.showCard(1);
      if (this.automated) {
        // checl value of hand for dealer.
        var draw = true;
        while (draw) {
          for (var value of dealer.handValue()) {
            if (value >= 17) {
              draw = false;
            }
          }
          if (draw) {
            this.drawCard(dealer, false);
          }
        }
      }
    }

    onGameMessage(message, socket) {
      console.log("Received message from " + socket.nickname + ": ");
      console.log(message);
      if (message.type === "command") {
        switch (message.command) {
          case "start":
            console.log("Command : Start the game.");
            if (!this.started) {
              this.startGame();
            } else {
              console.log("Game is already running !");
              socket.emit('game message', { author: 'table', timestamp: Date.now(), message: message.message, type: 'commanderror' });
            }
            break;
          case "reset":
            console.log("Command : Reset Game");
            this.resetGame();
            this.io.in(this.id).emit('game message', { author: 'table', timestamp: Date.now(), message: socket.nickname + " reset the game.", type: 'gamereset'});
            break;
          case "card" :
            console.log("Command : Draw a card for " + socket.nickname);
            if (this.started && this.currentPlayer.id === socket.nickname) {
              this.drawCard(this.currentPlayer, false);
            } else {
              console.log("This is not this player's turn  or game is not launched.");
            }
            break;
          case "stand" :
            console.log("Command : Stand for " + socket.name);
            if (this.started && this.currentPlayer.id === socket.nickname) {
              this.nextPlayerTurn();
            } else {
              console.log("This is not this player's turn or game is not launched.");
            }
          break;
          default:
            console.log("Command : Unkown command : " + message.command);
            break;
        }
      } else {
        this.io.in(this.id).emit('game message', { author: socket.nickname, timestamp: Date.now(), message: message.message });
      }
    }

    notifyAllPlayers(messageObject) {
      this.io.in(this.id).emit('game message', messageObject);
    }
  }
}

class Player {
  constructor(id) {
    this.id = id;
    this.hand = [];
    this.socket = null;
  }

  receivedCard(card, hidden) {
    if (hidden) {
      console.log("Drawed an hidden " + card.name);
      card.hidden = true;
      this.hand.push(card);
    } else {
      console.log("Drawed " + card.name);
      this.hand.push(card);
      console.log(this.id + " hand is now of value " + this.handValue());
    }
  }

  showCard(cardindex) {
    if (this.hand[cardindex].hidden) {
      console.log(this.id + " shows " + this.hand[cardindex].name)
      console.log(this.id + " hand is now of value " + this.handValue());
    }
  }

  handValue() {
    var possibleValues = [0];
    for (var card of this.hand) {
      var newValues = [];
      for (var i = 0; i < possibleValues.length; i++) {
        newValues[i] = possibleValues[i] + card.value[0];
      }
      possibleValues = newValues;
      if (card.value.length == 2) {
        var newValues2 = [];
        for (var i = 0; i < possibleValues.length; i++) {
          newValues2[i] = possibleValues[i] + card.value[1];
        }
        possibleValues = newValues.concat(newValues2);
      }
    }
    return possibleValues;
  }

  notify(message) {
    if (this.socket) {
      this.socket.emit('game message', message);
    }
  }
}



class Deck {
  constructor(cardsPerDeck, numberOfDecks) {
    this.cards = [];
    for (var i = 0; i < numberOfDecks; i++) {
      for (var card of cardsPerDeck) {
        this.cards.push(card);
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  pickFirstCard() {
    return this.cards.pop();
  }
}
