// imports
var express = require('express')
var app = express();
var http = require('http').Server(app);
var snek = require('socket.io')(http);

// static files
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/play.html');
});

// pair up clients
snek.on('connection', function(socket) {
    if (queue.length) {
        var pair = queue.shift();
        var game = new Game(pair, socket);
        games.add(game);
    } else {
        queue.push(socket);
    }
});
app.use(express.static(__dirname + "/client"))
http.listen(8000, "127.0.0.1");

// enums

var DIRS = Object.freeze({
    UP : 'ArrowUp',
    DOWN : 'ArrowDown',
    LEFT : 'ArrowLeft',
    RIGHT : 'ArrowRight',
    set : new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
});

var IO_EVTS = Object.freeze({
    KEY_DN : 'key down',
    SNAKE_DATA : 'snake data',
    STATE : 'game state',
    SQUP_DATA: 'squp data',
    POINTS : 'points'
});

var GAME_STATE = Object.freeze({
    OVER_TIE : 'tie',
    OVER_LOST : 'lost',
    OVER_WON : 'won'
});

// constants
var ySquares = 27;
var xSquares = 36;
// variables
var queue = [];
var games = new Set();

function Game(first, second) {
    console.log('Paired Off:', first['id'], second['id']);

    // game objects
    this.squp = new SquareUpdater(ySquares, xSquares);
    this.itemFactory = new ItemFactory(this);

    // points
    this.snakeOnePoints = 0;
    this.snakeTwoPoints = 0;
    this.lastSnakeOnePoints = 0;
    this.lastSnakeTwoPoints = 0;

    // init snakes with squares
    var snakeOneSquares = [];
    for (var x = 0; x <= 7; x++) {
        snakeOneSquares.push([x, 0]);
    }
    this.snakeOne = new Snake(snakeOneSquares, DIRS.RIGHT);
    var snakeTwoSquares = []
    for (var x = 0; x <= 7; x++) {
        snakeTwoSquares.push([xSquares - 1 - x, ySquares - 1]);
    }
    this.snakeTwo = new Snake(snakeTwoSquares, DIRS.LEFT);

    var game = this;

    // listen for input
    first.on(IO_EVTS.KEY_DN, function(data) {
        game.snakeOne.tryTurn(data);
    });
    second.on(IO_EVTS.KEY_DN, function(data) {
        game.snakeTwo.tryTurn(data);
    });

    // update timer
    var interval = setInterval(function() {
        // game.snakeOne.move();
        game.snakeTwo.move();

        game.itemFactory.update();

        if (game.snakeOnePoints != game.lastSnakeOnePoints ||
                game.snakeTwoPoints != game.lastSnakeTwoPoints) {
            first.emit(IO_EVTS.POINTS, [game.snakeOnePoints, game.snakeTwoPoints]);
            second.emit(IO_EVTS.POINTS, [game.snakeTwoPoints, game.snakeOnePoints]);
            game.lastSnakeOnePoints = game.snakeOnePoints;
            game.lastSnakeTwoPoints = game.snakeTwoPoints;
        }

        var sqOne = game.snakeOne.squares;
        var sqTwo = game.snakeTwo.squares;
        first.emit(IO_EVTS.SNAKE_DATA, [sqOne, sqTwo]);
        second.emit(IO_EVTS.SNAKE_DATA, [sqTwo, sqOne]);

        first.emit(IO_EVTS.SQUP_DATA, game.squp.changes);
        second.emit(IO_EVTS.SQUP_DATA, game.squp.changes);
        game.squp.clearChanges();


        checkDeaths();
    }, 50);

    function checkDeaths() {
        var oneDead = game.snakeOne.hitEdge || game.snakeOne.hitSelf() || game.snakeOne.hitSnake(game.snakeTwo);
        var twoDead = game.snakeTwo.hitEdge || game.snakeTwo.hitSelf() || game.snakeTwo.hitSnake(game.snakeOne);
        if (oneDead && twoDead) {
            first.emit(IO_EVTS.STATE, GAME_STATE.OVER_TIE);
            second.emit(IO_EVTS.STATE, GAME_STATE.OVER_TIE);
        } else if (oneDead) {
            first.emit(IO_EVTS.STATE, GAME_STATE.OVER_LOST);
            second.emit(IO_EVTS.STATE, GAME_STATE.OVER_WON);
        } else if (twoDead) {
            first.emit(IO_EVTS.STATE, GAME_STATE.OVER_WON);
            second.emit(IO_EVTS.STATE, GAME_STATE.OVER_LOST);
        }
        if (oneDead || twoDead) {
            clearInterval(interval);
            games.delete(this);
        }
    }
}

function Snake(squares, direction) {
    this.squares = squares; 
    this.direction = direction;
    this.lastMoved = direction;
    this.hitEdge = false;
    this.append = false;

    this.move = function() {
        var head = this.squares[this.squares.length - 1];
        var newSquare = [head[0], head[1]];

        if (this.direction == DIRS.UP) {
            newSquare[1]--;
        } else if (this.direction == DIRS.DOWN) {
            newSquare[1]++;
        } else if (this.direction == DIRS.LEFT) {
            newSquare[0]--;
        } else {
            newSquare[0]++;
        }

        if (newSquare[0] < 0 || newSquare[1] < 0 ||
             newSquare[0] >= xSquares || newSquare[1] >= ySquares) {
            this.hitEdge = true;
        }

        if (!this.append) {
            this.squares.shift();
        } else {
            this.append = false;
        }

        this.lastMoved = this.direction;
        this.squares.push(newSquare);
    }

    this.hitSelf = function() {
        var head = this.squares[this.squares.length - 1];
        for (var i = 0; i < this.squares.length - 1; i++) {
            var curr = this.squares[i];
            if (curr[0] == head[0] && curr[1] == head[1]) {
                return true;
            }
        }
        return false;
    }

    this.hitSnake = function(snake) {
        var head = this.squares[this.squares.length - 1];
        for (var i = 0; i < snake.squares.length; i++) {
            var curr = snake.squares[i];
            if (curr[0] == head[0] && curr[1] == head[1]) {
                return true;
            }
        }
        return false;
    }

    this.tryTurn = function(direction) {
        if (DIRS.set.has(direction)) {
            var valid = direction == DIRS.UP && this.lastMoved != DIRS.DOWN;
            valid = valid || direction == DIRS.DOWN && this.lastMoved != DIRS.UP;
            valid = valid || direction == DIRS.LEFT && this.lastMoved != DIRS.RIGHT;
            valid = valid || direction == DIRS.RIGHT && this.lastMoved != DIRS.LEFT;
            if (valid) {
                this.direction = direction;
            }
        }
    }

    this.collides = function(pos) {
        var head = this.squares[this.squares.length - 1];
        return head[0] == pos[0] && head[1] == pos[1];
    }
}

// keep track of board changes to send to client
function SquareUpdater(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.squares = [];
    this.changes = [];

    // create matrix of positions
    for (var y = 0; y < this.rows; y++) {
        this.squares.push([]);
        for (var x = 0; x < this.cols; x++) {
            this.squares[this.squares.length - 1].push([]);
        }
    }

    this.addItem = function(item) {
        var row = item.pos[1];
        var col = item.pos[0];
        var color = item.color;
        this.add(row, col, color);
    }


    this.add = function(row, col, color) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            throw Exception('Square out of bounds.');
        }
        this.squares[row][col].push(color);
        this.changes.push(['add', row, col, color]);
    };

    this.removeItem = function(item) {
        var row = item.pos[1];
        var col = item.pos[0];
        var color = item.color;
        this.remove(row, col, color);
    }

    this.remove = function(row, col, color) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            throw Exception('Square out of bounds.');
        }
        var pos = this.squares.indexOf(color);
        this.squares[row][col].splice(color, 1);
        this.changes.push(['del', row, col, color]);
    }

    this.clearChanges = function() {
        this.changes = [];
    }
};


function ItemFactory(game) {
    this.game = game;
    this.items = [];
    var fact = this;

    this.update = function() {
        this.checkCollisions(this.game, this.game.snakeOne, this.game.snakeTwo);
        this.createObjects();
    }

    this.checkCollisions = function(game, snakeOne, snaketwo) {
        for (var i = this.items.length - 1; i >= 0; i--) {
            if (this.game.snakeOne.collides(this.items[i].pos)) {
                this.items[i].onCollide(game, this.game.snakeOne, this.game.snakeTwo);
                this.game.squp.removeItem(this.items[i]);
                this.items.splice(i, 1);
            } else if (this.game.snakeTwo.collides(this.items[i].pos)) {
                this.items[i].onCollide(game, this.game.snakeTwo, this.game.snakeOne);
                this.game.squp.removeItem(this.items[i]);
                this.items.splice(i, 1);
            }
        }
    }

    this.createObjects = function() {
        if (this.items.length == 0) {
            var pt = new Point([10, 10]);
            this.game.squp.addItem(pt);
            this.items.push(pt);
        }
    }
}

function Point(pos) {
    this.pos = pos;
    this.color = 'rgb(255, 0, 255)';

    this.onCollide = function(game, collideSnake, otherSnake) {
        if (collideSnake == game.snakeOne) {
            game.snakeOne.append = true;
            game.snakeOnePoints += 10;
            game.snakeTwoPoints -= 3;
        } else {
            game.snakeTwo.append = true;
            game.snakeTwoPoints += 10;
            game.snakeOnePoints -= 3;
        }
    };
}







