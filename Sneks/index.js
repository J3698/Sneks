/*
TODO

Tell why you won / lost
*/

// imports
var express = require('express');
var app = express();
var http = require('http').Server(app);
var snek = require('socket.io')(http);
var heapq = require('heapq');

// local imports
var itemfact = require('./ItemFact');
var snake = require('./Snake');


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
app.use(express.static(__dirname + "/client"));
http.listen(process.env.PORT, process.env.IP);



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
    POINTS : 'points',
    TIME: 'time'
});

var GAME_STATE = Object.freeze({
    OVER_TIE : 'tie',
    OVER_LOST : 'lost',
    OVER_WON : 'won'
});

// constants
var ySquares = 27;
var xSquares = 36;
var FPS = 20;
// variables
var queue = [];
var games = new Set();

function Game(first, second) {
    // game objects
    this.squp = new SquareUpdater(xSquares, ySquares);
    this.itemFactory = new itemfact.ItemFactory(this);
    this.evtHandler = new EventHandler();

    this.time = 10;
    this.ticksToSecond = FPS; 

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
    this.snakeOne = new snake.Snake(snakeOneSquares, DIRS.RIGHT);
    var snakeTwoSquares = [];
    for (var x = 0; x <= 7; x++) {
        snakeTwoSquares.push([xSquares - 1 - x, ySquares - 1]);
    }
    this.snakeTwo = new snake.Snake(snakeTwoSquares, DIRS.LEFT);

    var game = this;

    // listen for input
    first.on(IO_EVTS.KEY_DN, function(data) {
        if (DIRS.set.has(data)) {
            game.snakeOne.tryTurn(data);
        }
    });
    second.on(IO_EVTS.KEY_DN, function(data) {
        if (DIRS.set.has(data)) {
            game.snakeTwo.tryTurn(data);
        }
    });

    first.emit(IO_EVTS.TIME, formatTime(this.time));
    second.emit(IO_EVTS.TIME, formatTime(this.time));

    // update timer
    var interval = setInterval(function() {
        game.snakeOne.move();
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
        checkTime();
    }, 1000 / FPS);

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

    function checkTime() {
        game.ticksToSecond--;
        if (game.ticksToSecond == 0) {
            game.ticksToSecond = FPS;
            game.time--;
            var formatted = formatTime(game.time);
            first.emit(IO_EVTS.TIME, formatted);
            second.emit(IO_EVTS.TIME, formatted);
            if (game.time == 0) {
                if (game.snakeOnePoints > game.snakeTwoPoints) {
                    first.emit(IO_EVTS.STATE, GAME_STATE.OVER_WON);
                    second.emit(IO_EVTS.STATE, GAME_STATE.OVER_LOST);
                } else if (game.snakeTwoPoints > game.snakeOnePoints) {
                    first.emit(IO_EVTS.STATE, GAME_STATE.OVER_LOST);
                    second.emit(IO_EVTS.STATE, GAME_STATE.OVER_WON);
                } else {
                    first.emit(IO_EVTS.STATE, GAME_STATE.OVER_TIE);
                    second.emit(IO_EVTS.STATE, GAME_STATE.OVER_TIE);
                }
                clearInterval(interval);
                games.delete(this);
            }
        }
    }

    function formatTime(time) {
        var minutes = Math.floor(time / 60);
        var seconds = time % 60;
        if (('' + minutes).length < 2) {
            minutes = '0' + minutes;
        }
        if (('' + seconds).length < 2) {
            seconds = '0' + seconds;
        }
        return minutes + ':' + seconds;
    }
}

function EventHandler() {
    this.events = [];

    this.cmpEvents = function(evt1, evt2) {
        return evt1[1] < evt2[1];
    };

    this.addEvent = function(func, time) {
        time = Date.now() + time * 1000;
        heapq.push(this.events, [func, time], this.cmpEvents);
    };

    this.checkEvents = function() {
        while (this.events.length != 0) {
            if (heapq.top(this.events)[1] <= Date.now()) {
                var first = heapq.pop(this.events, this.cmpEvents());
                first[0]();
            } else {
                break;
            }
        }
    };
}

// keep track of board changes to send to client
function SquareUpdater(xLen, yLen) {
    this.xLen = xLen;
    this.yLen = yLen;
    this.squares = [];
    this.changes = [];

    // create matrix of positions
    for (var y = 0; y < this.yLen; y++) {
        this.squares.push([]);
        for (var x = 0; x < this.xLen; x++) {
            this.squares[this.squares.length - 1].push([]);
        }
    }

    this.addItem = function(item) {
        this.add(item.pos[0], item.pos[1], item.color);
    };

    this.add = function(x, y, color) {
        if (y < 0 || y >= this.yLen || x < 0 || x >= this.xLen) {
            throw Exception('Square out of bounds.');
        }
        this.squares[y][x].push(color);
        this.changes.push(['add', x, y, color]);
    };

    this.removeItem = function(item) {
        this.remove(item.pos[0], item.pos[1], item.color);
    };

    this.remove = function(x, y, color) {
        if (y < 0 || y >= this.yLen || x < 0 || x >= this.xLen) {
            throw Exception('Square out of bounds.');
        }
        var pos = this.squares.indexOf(color);
        this.squares[y][x].splice(pos, 1);
        this.changes.push(['del', x, y, color]);
    };

    this.clearChanges = function() {
        this.changes = [];
    };
}