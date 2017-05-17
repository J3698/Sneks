module.exports = {
  ItemFactory: ItemFactory
};

var ySquares = 27;
var xSquares = 36;

function ItemFactory(game) {
    this.game = game;
    this.items = [];

    this.update = function() {
        this.checkCollisions(this.game, this.game.snakeOne, this.game.snakeTwo);
        this.createObjects();
    };

    this.checkCollisions = function(game, snakeOne, snaketwo) {
        for (var i = this.items.length - 1; i >= 0; i--) {
            if (this.game.snakeOne.collides(this.items[i].pos)) {
                var item = this.items[i];
                item.collideSnake = this.game.snakeOne;
                item.otherSnake = this.game.snakeTwo;
                item.onCollide(game, this.game.snakeOne, this.game.snakeTwo);
                if (item.actionable) {

                }
                this.game.squp.removeItem(item);
                this.items.splice(i, 1);
            } else if (this.game.snakeTwo.collides(this.items[i].pos)) {
                var item = this.items[i];
                item.collideSnake = this.game.snakeTwo;
                item.otherSnake = this.game.snakeOne;
                item.onCollide(game, this.game.snakeTwo, this.game.snakeOne);
                if (item.actionable) {

                }
                this.game.squp.removeItem(item);
                this.items.splice(i, 1);
            }
        }
    };

    this.createObjects = function() {
        if (this.items.length == 0) {
            var pt = new Point(randomPos());
            this.game.squp.addItem(pt);
            this.items.push(pt);
        }
    };
}

function Point(pos) {
    this.pos = pos;
    this.color = 'rgb(255, 0, 255)';
    this.collideSnake;
    this.otherSnake;

    this.onCollide = function(game) {
        this.collideSnake.toAppend += 3;
        if (this.collideSnake == game.snakeOne) {
            game.snakeOnePoints += 10;
            game.snakeTwoPoints -= 3;
        } else {
            game.snakeTwoPoints += 10;
            game.snakeOnePoints -= 3;
        }
    };
}


function randomPos() {
    var x = Math.floor(xSquares * Math.random());
    var y = Math.floor(ySquares * Math.random());
    return [x, y];
}