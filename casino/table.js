module.exports = {
  Table: class Table {
    constructor(id) {
      this.id = id;
      this.players = new Map();
      this.gameType = "none"
    }

    listPlayers() {
      var string = "";
      this.players.forEach(function(player, playerId, players) {
        string = string + playerId + ", ";
      })
      return string;
    }

    playerArray() {
      var players = [];
      for (var player of this.players.values()) {
        players.push({ nickname: player.id, bot: player.bot });
      }
      return players;
    }
  }
}
