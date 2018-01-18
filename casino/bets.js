var Bets = {
  tokenValues: ["10 po", "5 po", "2 po", "1 po", "50 pa", "25 pa", "5 pa", "1 pa"],
  tokenExchangeRates: new Map([
    [ "10 po", {
      tokens : [
        { token: "5 po", quantity: 2 }
      ]
    } ],
    [ "5 po", {
      tokens : [
        { token: "2 po", quantity: 2 },
        { token: "1 po", quantity: 1 }
      ]
    } ],
    [ "2 po", {
      tokens : [
        { token: "1 po", quantity: 2 }
      ]
    } ],
    [ "1 po", {
      tokens : [
        { token: "50 pa", quantity: 2 }
      ]
    } ],
    [ "50 pa", {
      tokens : [
        { token: "25 pa", quantity: 2 }
      ]
    } ],
    [ "25 pa", {
      tokens : [
        { token: "5 pa", quantity: 5 }
      ]
    } ],
    [ "5 pa", {
      tokens : [
        { token: "1 pa", quantity: 5 }
      ]
    } ]
  ]),

  getTokenValue: function getTokenValue(token) {
    var [value, unit] = token.split(" ");
    return value * (unit === "po" ? 100 : 1);
  },

  valueToTokens: function valueToTokens(value) {
    var tokens = new Map();
    var remains = value;
    var amount = 0;
    amount = Math.floor(remains/1000);
    remains = remains - amount * 1000;
    tokens.set("10 po", amount);
    amount = Math.floor(remains/500);
    remains = remains - amount * 500;
    tokens.set("5 po", amount);
    amount = Math.floor(remains/200);
    remains = remains - amount * 200;
    tokens.set("2 po", amount);
    amount = Math.floor(remains/100);
    remains = remains - amount * 100;
    tokens.set("1 po", amount);
    amount = Math.floor(remains/50);
    remains = remains - amount * 50;
    tokens.set("50 pa", amount);
    amount = Math.floor(remains/25);
    remains = remains - amount * 25;
    tokens.set("25 pa", amount);
    amount = Math.floor(remains/5);
    remains = remains - amount * 5;
    tokens.set("5 pa", amount);
    tokens.set("1 pa", remains);
    return tokens;
  },

  getBetObject: function getBetObject(bet) {
    var po = Math.floor(bet/100);
    var pa = bet - po * 100;
    return { total: bet, po: po, pa: pa };
  },

  tokensURL: "https://gw2rp-tools.ovh/casino/tokens/",

  PlayerBank: class PlayerBank {
    constructor(elementId) {
      this.elementId = elementId;
      this.tokens = new Map();
    }

    addValue(value) {
      this.addTokensMap(Bets.valueToTokens(value));
    }

    addTokensMap(tokensMap) {
      for (var [token, amount] of tokensMap) {
        this.addTokens(token, amount);
      }
    }

    addTokens(tokenValue, quantity) {
      if (this.tokens.has(tokenValue)) {
        var newQuantity = this.tokens.get(tokenValue) + quantity;
        this.tokens.set(tokenValue, newQuantity)
        $('#' + this.elementId + ' #token-' + tokenValue.replace(" ", "-")).attr('title', newQuantity + " tokens of value " + tokenValue);
        if (newQuantity < 0) {
          console.log("ERROR : Token pile of value " + tokenValue + " in negative !");
          this.tokens.set(tokenValue, 0)
        }
        if (newQuantity <= 0) {
          $('#' + this.elementId + ' #token-' + tokenValue.replace(" ", "-")).addClass('empty');
          $('#' + this.elementId + ' #token-' + tokenValue.replace(" ", "-")).attr('draggable', false);
        } else {
          $('#' + this.elementId + ' #token-' + tokenValue.replace(" ", "-")).removeClass('empty');
          $('#' + this.elementId + ' #token-' + tokenValue.replace(" ", "-")).attr('draggable', true);
          $('#' + this.elementId + ' #token-' + tokenValue.replace(" ", "-")).attr('ondragstart', "tokenDragStarthandler(event)");
        }
      }
    }

    display() {
      for (var [token, amount] of this.tokens) {
        if (amount > 0) {
          $('#' + this.elementId).append('<img id=token-' + token.replace(" ", "-") + ' title="' + amount + ' tokens of value ' + token + '" alt="' + amount + ' tokens of value ' + token + '" width="40px" height="40px" src="https://gw2rp-tools.ovh/casino/tokens/' + token.replace(" ", "") + '" tokenvalue="' + token + '" draggable="true" ondragstart="tokenDragStarthandler(event)" />');
        } else {
          $('#' + this.elementId).append('<img class="empty" id=token-' + token.replace(" ", "-") + ' title="' + amount + ' tokens of value ' + token + '" alt="' + amount + ' tokens of value ' + token + '" width="40px" height="40px" src="https://gw2rp-tools.ovh/casino/tokens/' + token.replace(" ", "") + '" tokenvalue="' + token + '" draggable="false" />');
        }
      }
    }

    create(value) {
      var remains = value;
      var amount = 0;
      amount = Math.floor(remains/1000);
      remains = remains - amount * 1000;
      this.tokens.set("10 po", amount);
      amount = Math.floor(remains/500);
      remains = remains - amount * 500;
      this.tokens.set("5 po", amount);
      amount = Math.floor(remains/200);
      remains = remains - amount * 200;
      this.tokens.set("2 po", amount);
      amount = Math.floor(remains/100);
      remains = remains - amount * 100;
      this.tokens.set("1 po", amount);
      amount = Math.floor(remains/50);
      remains = remains - amount * 50;
      this.tokens.set("50 pa", amount);
      amount = Math.floor(remains/25);
      remains = remains - amount * 25;
      this.tokens.set("25 pa", amount);
      amount = Math.floor(remains/5);
      remains = remains - amount * 5;
      this.tokens.set("5 pa", amount);
      this.tokens.set("1 pa", remains);
    }

    getValue() {
      var sum = 0;
      for (var [token, amount] of this.tokens) {
        sum += Bets.getTokenValue(token) * amount;
      }
      return sum;
    }

    exchangeToken(tokenValue) {
      if (Bets.tokenExchangeRates.has(tokenValue) && this.tokens.get(tokenValue) > 0) {
        this.addTokens(tokenValue, -1)
        var returns = Bets.tokenExchangeRates.get(tokenValue);
        for (var token of returns.tokens) {
          this.addTokens(token.token, token.quantity)
        }
      }
    }
  },

  BetTemporary: class BetTemporary {
    constructor(elementId) {
      this.elementId = elementId;
      this.tokens = new Map();
    }

    getValue() {
      var sum = 0;
      for (var token of this.tokens.values()) {
        sum += Bets.getTokenValue(token.value);
      }
      return sum;
    }

    getBetParsed() {
      return Bets.getBetObject(this.getValue());
    }

    addTokens(tokenValue, quantity) {
      var id = this.tokens.size;
      var token = { value: tokenValue, id:id };
      this.tokens.set(id, token);
      $('#' + this.elementId).append('<img id="' + token.id + '" title="' + tokenValue + '" alt="' + tokenValue + '" width="40px" height="40px" src="https://gw2rp-tools.ovh/casino/tokens/' + token.value.replace(" ", "") + '" tokenvalue="' + tokenValue + '" draggable="true" ondragstart="tokenDragStarthandler(event)" />');
    }

    removeToken(tokenId) {
      this.tokens.delete(tokenId);
      $('#' + this.elementId + " #" + tokenId).remove();
    }

    clear() {
      this.tokens = new Map();
      $('#' + this.elementId).empty();
    }
  }
}
