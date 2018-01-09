const blackjack = require('./blackjack.js');

module.exports = {
  Casino : class Casino {
    constructor(id) {
      this.id = id;
      this.tables = new Map();
    }

    addTable(gameType, id, automated) {
      switch (gameType) {
        case "blackjack":
          var table = new blackjack.Blackjack(id, automated)
          this.tables.set(id, table);
          return table;
          break;
        default:
          console.log("Could not create table, gameType " + gameType + " does not exists.");
          return null;
          break;
      }
    }

    removeTable(tableId) {
      if (this.tables.has(tableId)) {
        this.tables.delete(tableId);
      }
    }

    hasTable(tableId) {
      return this.tables.has(tableId);
    }

    getTable(tableId) {
      if (this.tables.has(tableId)) {
        return this.tables.get(tableId);
      } else {
        return null;
      }
    }
  }
}
