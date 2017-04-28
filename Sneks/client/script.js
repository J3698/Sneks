// draw board variables
var yOffset = 3;
var xOffset = 4;
var ySquares = 27;
var xSquares = 36;
var squareSize = 22;
var colorOne = 'rgb(180, 180, 180)';
var colorTwo = 'rgb(200, 200, 200)';
var snekSquareSize = squareSize - 6;

// controls
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
    START : 'start',
    PLAY : 'play',
    OVER : 'over'
});


// player snakes
var snake = new Snek("black");
var opponent = new Snek("white");

// game starte
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

function initIO() {
    socket = io();
    socket.on(IO_EVTS.SNAKE_DATA, function(data) {
        snake.squares = data[0];
        opponent.squares = data[1];
    });
    socket.on(IO_EVTS.STATE, function(data) {
        state = data;
    });
    $('#game-canvas').keydown(function(event) {
        if (DIRS.set.has(event.key)) {
            socket.emit(IO_EVTS.KEY_DN, event.key);
        }
    });
};

$("document").ready(function() {
    var canvas = document.getElementById("game-canvas");
    canvas.focus();

    var ctx = canvas.getContext('2d');
    setInterval(function() {
        if (state == GAME_STATE.PLAY) {
            drawBoard(ctx, colorOne, colorTwo);
            snake.draw(ctx);
            opponent.draw(ctx);
        } else if (state == GAME_STATE.OVER) {
            ctx.fillStyle = "rgb(70, 70, 70)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = "center";
            ctx.fillStyle = "white";
            ctx.font = '60px Arial';
            ctx.fillText("Game Over D:", canvas.width / 2, canvas.height / 2);
        }
    }, 50);
    initIO();
});

