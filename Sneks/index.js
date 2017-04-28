// imports
var express = require('express')
var app = express();
var http = require('http').Server(app);
var snek = require('socket.io')(http);

// static files
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/play.html');
});

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
    STATE : "game state"
});

var GAME_STATE = Object.freeze({
    OVER : 'over'
});


var queue = [];
var games = new Set();

var Game = function(first, second) {
    console.log('Paired Off:', first['id'], second['id']);

    // init snakes with squares
    var snakeOneSquares = [];
    for (var x = 0; x <= 7; x++) {
        snakeOneSquares.push([x, 0]);
    }
    var snakeOne = new Snake(snakeOneSquares, DIRS.RIGHT);
    var snakeTwoSquares = []
    for (var x = 0; x <= 7; x++) {
        snakeTwoSquares.push([xSquares - 1 - x, ySquares - 1]);
    }
    var snakeTwo = new Snake(snakeTwoSquares, DIRS.LEFT);

    // listen for input
    first.on(IO_EVTS.KEY_DN, function(data) {
        snakeOne.tryTurn(data);
    });
    second.on(IO_EVTS.KEY_DN, function(data) {
        snakeTwo.tryTurn(data);
    });

    // update timer
    var interval = setInterval(function() {
        snakeOne.move(false);
        snakeTwo.move(false);

        var sqOne = snakeOne.squares;
        var sqTwo = snakeTwo.squares;
        first.emit(IO_EVTS.SNAKE_DATA, [sqOne, sqTwo]);
        second.emit(IO_EVTS.SNAKE_DATA, [sqTwo, sqOne]);

        var oneDead = snakeOne.hitEdge || snakeOne.hitSelf() || snakeOne.hitSnake(snakeTwo);
        var twoDead = snakeTwo.hitEdge || snakeTwo.hitSelf() || snakeTwo.hitSnake(snakeOne);

        if (oneDead || twoDead) {
            first.emit(IO_EVTS.STATE, GAME_STATE.OVER);
            second.emit(IO_EVTS.STATE, GAME_STATE.OVER);
            clearInterval(interval);
            games.delete(this);
        }
    }, 50);
}

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

// boilerplate
app.use(express.static(__dirname + "/client"))
http.listen(8000, "127.0.0.1");

// constants
var ySquares = 27;
var xSquares = 36;

var Snake = function(squares, direction) {
    this.squares = squares; 
    this.direction = direction;
    this.lastMoved = direction;
    this.hitEdge = false;

    this.move = function(append) {
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
        if (!append) {
            this.squares.shift();
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
}
