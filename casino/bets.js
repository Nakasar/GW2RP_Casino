var Bets = {
  getTokenValue: function getTokenValue(token) {
    var [value, unit] = token.split(" ");
    return value * (unit === "po" ? 100 : 1);
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
