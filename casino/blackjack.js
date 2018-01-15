const table = require('./table.js');

class Card {
  constructor (value, name) {
    this.value = value;
    this.name = name;
    this.hidden = false;
  }

  static createFromName(name) {
    var number = name.split("_")[0];
    var value = [];
    if (number == 1) {
      value = [1, 11];
    } else if (number <= 10) {
      value = [parseInt(number)];
    } else {
      value = [10]
    }
    var card = new Card(value, name);
    return card;
  }
}

const cards = new Map();
const colors = ["diamond", "heart", "spade", "clover"];
const values = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const deck52 = [];

for (var color of colors) {
  for (var value of values) {
    deck52.push(Card.createFromName(value + "_" + color));
  }
}

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
      var dealer = this.addPlayer("dealer");
      dealer.hand = new Hand("dealer");
      dealer.hand.bet = 0;
      dealer.entered = true;
      dealer.bot = true;
    }

    addPlayer(playerId) {
      if (!this.players.has(playerId)) {
        var player = new Player(playerId);
        this.players.set(playerId, player);
        return player;
      }
    }

    addPlayerBySocket(socket) {
      if (!this.players.has(socket.nickname)) {
        var player = new Player(socket.nickname);
        player.socket = socket;
        this.players.set(socket.nickname, player);
        this.notifyAllPlayers({ author: "table", timestamp: Date.now(), message: player.id + " joined the table.", type: 'social', social: 'playerjoined', nickname: socket.nickname, bot: player.bot });
      }
    }

    removePlayer(playerId) {
      console.log("removing " + playerId);
      if (this.players.has(playerId)) {
        this.players.delete(playerId);
        console.log("notify left of " + playerId);
        this.notifyAllPlayers({ author: "table", timestamp: Date.now(), message: playerId + " left the table.", type: 'social', social: "playerleft", nickname: playerId });
      }
    }

    drawCard(player, hidden) {
      console.log("Draw card for " + player.id + "...");
      let card = this.deck.pickFirstCard();
      player.receivedCard(card, hidden);
      var handValue = player.handValue();

      if (hidden) {
        player.notify({ author: 'table', timestamp: Date.now(), message: "You received " + card.name, type: 'card', for: player.id, card: { name: card.name, value: card.value }, handValue: handValue, handBet: player.hand.bet })
      } else {
        this.notifyAllPlayers({ author: 'table', timestamp: Date.now(), message: player.id + " received " + card.name, type: 'card', for: player.id, card: { name: card.name, value: card.value }, handValue: handValue, handBet: player.hand.bet });
      }

      if (handValue.burned) {
        if (player.id !== "dealer") {
          this.nextPlayerTurn();
        }
      }
    }

    firstTurn() {
      // Draw card for each player including dealer.
      for (var player of this.players.values()) {
        if (player.entered) {
          this.drawCard(player, false);
        }
      }
      // draw an hidden card for the dealer.
      this.drawCard(this.players.get("dealer"), true);
      // Draw a second card for each player.
      for (var player of this.players.values()) {
        if (player.id !== "dealer" && player.entered) {
          this.drawCard(player, false);
          this.turnOrder.push(player);
        }
      }
    }

    resetGame() {
      for (var player of this.players.values()) {
        player.hand = null;
        player.entered = false;
      }
      var dealer = this.players.get("dealer");
      dealer.hand = new Hand("dealer");
      dealer.hand.bet = 0;
      dealer.entered = true;
      dealer.bot = true;
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
      this.notifyAllPlayers({ author: 'table', timestamp: Date.now(), message: 'This turn of ' + player.id +  ' for hand ' + player.hand.id +  '.', type: 'notification', notification: 'playerturn', player: player.id, hand: player.hand.id });
    }

    nextPlayerTurn() {
      this.currentPlayer.notify({ author: 'table', timestamp: Date.now(), message: 'This is the end of your turn.', type: 'notification', notification: 'endplayerturn' });
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
      this.notifyAllPlayers({ author: 'table', timestamp: Date.now(), message: 'This turn of ' + dealer.id +  ' for hand ' + dealer.id +  '.', type: 'notification', notification: 'playerturn', player: dealer.id, hand: dealer.id });
      var card = dealer.showCard(1);
      this.notifyAllPlayers({ author: 'table', timestamp: Date.now(), message: "Dealer shows " + card.name, type: 'card', for: "dealer", hand: "dealer", card: { name: card.name, value: card.value }, handValue: dealer.handValue(), handBet: dealer.hand.bet });
      this.currentPlayer = null;
      //this.started = false;
      if (this.automated) {
        // check value of hand for dealer.
        var draw = true;
        while (draw) {
          for (var value of dealer.handValue().values) {
            if (value >= 17) {
              draw = false;
            }
          }
          if (draw) {
            this.drawCard(dealer, false);
          }
        }
      }
      this.endGame();
    }

    endGame() {
      console.log("Game is finished. Resolve bets.");
      var dealerResult = this.players.get("dealer").hand.getResult();
      for (var player of this.turnOrder) {
        if (!player.burned) {
          var hand = player.hand;
          var handResult = hand.getResult();
          console.log(handResult);
          console.log(dealerResult);
          if (dealerResult.burned) {
            player.notify({ author: 'table', timestamp: Date.now(), message: "Game is a win.", type: 'result', result: "win", handBet: hand.bet });
          } else if (handResult.blackjack && dealerResult.blackjack) {
            player.notify({ author: 'table', timestamp: Date.now(), message: "Game is a draw.", type: 'result', result: "draw", handBet: hand.bet });
          } else if (handResult.blackjack && !dealerResult.blackjack) {
            // Player wins
            player.notify({ author: 'table', timestamp: Date.now(), message: "Game is a win.", type: 'result', result: "win", handBet: hand.bet });
          } else if (!handResult.blackJack && dealerResult.blackjack) {
            // player loses
            player.notify({ author: 'table', timestamp: Date.now(), message: "Game is a lost.", type: 'result', result: "lost", handBet: hand.bet });
          } else if (handResult.value > dealerResult.value) {
            // player wins
            player.notify({ author: 'table', timestamp: Date.now(), message: "Game is a win.", type: 'result', result: "win", handBet: hand.bet });
          } else if (handResult.value < dealerResult.value) {
            // player losess
            player.notify({ author: 'table', timestamp: Date.now(), message: "Game is a lost.", type: 'result', result: "lost", handBet: hand.bet });
          } else {
            player.notify({ author: 'table', timestamp: Date.now(), message: "Game is a draw.", type: 'result', result: "draw", handBet: hand.bet });
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
              socket.emit('game message', { author: 'table', timestamp: Date.now(), message: "Game is already running.", type: 'commanderror' });
            }
            break;
          case "reset":
            console.log("Command : Reset Game");
            this.resetGame();
            this.io.in(this.id).emit('game message', { author: 'table', timestamp: Date.now(), message: socket.nickname + " reset the game.", type: 'gamereset'});
            break;
          case "card" :
            console.log("Command : Draw a card for " + socket.nickname);
            console.log(this.started);
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
          case "bet":
            console.log("Command : Bet " + message.bet + " for " + socket.nickname);
            if (!this.started && !this.players.get(socket.nickname).entered) {
              var player = this.players.get(socket.nickname);
              if (player.wallet >= message.bet) {
                player.bet(message.bet);
                this.io.in(this.id).emit('game message', { author: 'table', timestamp: Date.now(), message: socket.nickname + " bet " +  message.bet, type: 'betaccepted', bet: message.bet, for: socket.nickname, hand: socket.nickname });
              } else {
                socket.emit('game message', { author: 'table', timestamp: Date.now(), message: "Bet rejected : over current wallet.", type: 'betrejected' });
              }
            } else {
              socket.emit('game message', { author: 'table', timestamp: Date.now(), message: "Bet rejected.", type: 'betrejected' });
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

class Hand {
  constructor(playerId, handId) {
    this.id = handId;
    this.playerId = playerId;
    this.cards = [];
    this.value = [];
    this.bet = 0;
  }

  addCard(card) {
    this.cards.push(card);
  }

  getValues() {
    var possibleValues = [0];
    for (var card of this.cards) {
      var newValues = [];
      for (var i = 0; i < possibleValues.length; i++) {
        newValues[i] = possibleValues[i] + card.value[0];
      }
      if (card.value.length == 2) {
        var newValues2 = [];
        for (var i = 0; i < possibleValues.length; i++) {
          newValues2[i] = possibleValues[i] + card.value[1];
        }
        possibleValues = newValues.concat(newValues2);
      } else {
        possibleValues = newValues;
      }
    }
    var burned = false;
    if (Math.min.apply(null, possibleValues) > 21) {
      burned = true;
    }

    return { values: possibleValues, burned: burned };
  }

  getResult() {
    var values = this.getValues();
    var max = Math.max.apply(null, values.values);
    var blackJack = (this.cards.length == 2 && values.values.includes(21)) ? true : false;
    return { value: max, blackjack: blackJack, burned: values.burned };
  }

  getCard(index) {
    return this.cards[index];
  }
}

class Player {
  constructor(id) {
    this.id = id;
    this.wallet = 0;
    this.hand = null;
    this.bot = false;
    this.socket = null;
    this.entered = false;
  }

  bet(bet) {
    if (this.wallet >= bet) {
      this.hand = new Hand(this.id, this.id);
      this.hand.bet = bet;
      this.wallet -= bet;
      this.entered = true;
    } else {
      console.log(this.id + " tried to bet over his/her wallet.");
    }
  }

  receivedCard(card, hidden) {
    if (hidden) {
      console.log("Drawed an hidden " + card.name);
      card.hidden = true;
      this.hand.addCard(card);
    } else {
      console.log("Drawed " + card.name);
      this.hand.addCard(card);
      var value = this.handValue();
      if (value.burned) {
        this.hand.burned = true;
      }
      console.log(this.id + " hand is now of value " + this.handValue());
    }
  }

  showCard(cardindex) {
    if (this.hand.getCard(cardindex).hidden) {
      console.log(this.id + " shows " + this.hand.getCard(cardindex).name)
      console.log(this.id + " hand is now of value " + this.handValue());
      return this.hand.getCard(cardindex);
    }
  }

  handValue() {
    return this.hand.getValues();
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
