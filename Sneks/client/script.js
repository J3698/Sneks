// draw board variables
var ySquares = 27;
var xSquares = 36;
var width = 600;
var height = 450;
var squareSize = Math.floor(Math.min(width / xSquares, height / ySquares));
var xOffset = (width - squareSize * xSquares) / 2;
var yOffset = (height - squareSize * ySquares) / 2;
// var squareSize = 16; // 22

var colorOne = 'rgb(180, 180, 180)';
var colorTwo = 'rgb(200, 200, 200)';
var snekSquareSize = squareSize - 6;

// enums

var ACTION_KEYS = new Map();
ACTION_KEYS['38'] = 'ArrowUp';
ACTION_KEYS['37'] = 'ArrowLeft';
ACTION_KEYS['40'] = 'ArrowDown';
ACTION_KEYS['39'] = 'ArrowRight';
ACTION_KEYS['49'] = 'ActionOne';
ACTION_KEYS['50'] = 'ActionTwo';
ACTION_KEYS['51'] = 'ActionThree';

var IO_EVTS = Object.freeze({
    KEY_DN : 'key down',
    SNAKE_DATA : 'snake data',
    STATE : "game state",
    SQUP_DATA : 'squp data',
    POINTS : 'points',
    TIME: 'time'
});

var GAME_STATE = Object.freeze({
    START : 'start',
    PLAY : 'play',
    OVER_TIE : 'tie',
    OVER_LOST : 'lost',
    OVER_WON : 'won'
});

var Style = function(styles) {
    this.styles = styles;

    this.applyTo = function(ctx) {
        for (var key in this.styles) {
            if (!this.styles.hasOwnProperty(key)) {
                continue;
            }
            ctx[key] = this.styles[key];
        }
    };
};

var ggStyle = new Style({
    textAlign : 'center',
    fillStyle : 'white',
    font : '60px Arial'
});

// player snakes
var snake = new Snek("black");
var opponent = new Snek("white");

// square update
var squp = new SquareUpdater(xSquares, ySquares);

// game start
var state = GAME_STATE.PLAY;

function drawBoard(ctx, colorOne, colorTwo) {
    var color = colorOne;
    for (var x = 0; x < xSquares; x++) {
        for (var y = 0; y < ySquares; y++) {
            color = (color == colorOne) ? colorTwo : colorOne;
            ctx.fillStyle = color;
            drawSquare(ctx, x, y, squareSize);
        }
    }
}

function drawSquare(ctx, x, y, s) {
    if (x < 0 || y < 0 || x >= xSquares || y >= ySquares) {
        return;
    }
    ctx.fillRect(xOffset + squareSize * x + (squareSize - s) / 2,
                    yOffset + squareSize * y + (squareSize - s) / 2, s, s);
};

function Snek(color) {
    this.squares = [[0, 0], [1, 0], [2, 0], [3, 0]];
    this.color = color;
    this.draw = function(ctx) {
        ctx.fillStyle = this.color;
        for (var i = 0; i < this.squares.length; i++) {
            sq = this.squares[i];
            drawSquare(ctx, sq[0], sq[1], snekSquareSize);
        }
    }
};

function SquareUpdater(xLen, yLen) {
    this.xLen = xLen;
    this.yLen = yLen;
    this.squares = []

    for (var y = 0; y < this.yLen; y++) {
        this.squares.push([]);
        for (var x = 0; x < this.xLen; x++) {
            this.squares[this.squares.length - 1].push([]);
        }
    }

    this.add = function(x, y, color) {
        if (y < 0 || y >= this.yLen || x < 0 || x >= this.xLen) {
            throw Exception('Square out of bounds.');
        }
        this.squares[y][x].push(color);
    };

    this.remove = function(x, y, color) {
        if (y < 0 || y >= this.yLen || x < 0 || x >= this.xLen) {
            throw Exception('Square out of bounds.');
        }
        var pos = this.squares.indexOf(color);
        this.squares[y][x].splice(color, 1);
    }
};

function padScore(score) {
    score += '';
    if (score.length >= 5) {
        return score;
    }
    var defi = '0'.repeat(5 - score.length);
    if (score[0] == '-') {
        return '-' + defi + score.slice(1, score.length);
    }
    return defi + score;
}

function initIO() {
    socket = io();
    socket.on(IO_EVTS.SNAKE_DATA, function(data) {
        snake.squares = data[0];
        opponent.squares = data[1];
    });
    socket.on(IO_EVTS.STATE, function(data) {
        state = data;
    });
    socket.on(IO_EVTS.SQUP_DATA, function(data) {
        for (sq in data) {
            if (data[sq][0] == 'add') {
                squp.add(data[sq][1], data[sq][2], data[sq][3]);
            } else {
                console.log(data[sq]);
                squp.remove(data[sq][1], data[sq][2], data[sq][3]);
            }
        }
    });
    socket.on(IO_EVTS.POINTS, function(data) {
        $('#my-score').text(padScore(data[0]));
        $('#opponent-score').text(padScore(data[1]));
    });
    socket.on(IO_EVTS.TIME, function(data) {
        $('#time').text(data);
    });

    $('#game-canvas').keydown(function(event) {
        var action = ACTION_KEYS['' + event.keyCode];
        if (action != null) {
            console.log("LEGAL STUFF");
            socket.emit(IO_EVTS.KEY_DN, action);
        }
    });
};

$("document").ready(function() {
    $('#game-info').width(squareSize * xSquares);
    $('#info-bar-spot').width(squareSize * xSquares - 90 - 10);

    var canvas = document.getElementById("game-canvas");
    canvas.focus();

    var ctx = canvas.getContext('2d');
    setInterval(function() {
        if (state == GAME_STATE.PLAY) {
            drawBoard(ctx, colorOne, colorTwo);
            snake.draw(ctx);
            opponent.draw(ctx);

            for (var y = 0; y < squp.yLen; y++) {
                for (var x = 0; x < squp.xLen; x++) {
                    for (i in squp.squares[y][x]) {
                        var sq = squp.squares[y][x][i];
                        ctx.fillStyle = squp.squares[y][x][i];
                        drawSquare(ctx, x, y, squareSize);
                    }
                }
            }
        } else if (state == GAME_STATE.OVER_TIE) {
            ctx.fillStyle = "rgb(70, 70, 70)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ggStyle.applyTo(ctx);
            ctx.fillText("You Tied!", canvas.width / 2, canvas.height / 2);
        } else if (state == GAME_STATE.OVER_WON) {
            ctx.fillStyle = "rgb(70, 70, 70)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ggStyle.applyTo(ctx);
            ctx.fillText("You Won!", canvas.width / 2, canvas.height / 2);
        } else if (state == GAME_STATE.OVER_LOST) {
            ctx.fillStyle = "rgb(70, 70, 70)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ggStyle.applyTo(ctx);
            ctx.fillText("You Lost!", canvas.width / 2, canvas.height / 2);
        }
    }, 50);
    initIO();
});

