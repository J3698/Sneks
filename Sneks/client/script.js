var yOffset = 3;
var xOffset = 4;
var ySquares = 27;
var xSquares = 36;
var squareSize = 22;
var colorOne = 'rgb(180, 180, 180)';
var colorTwo = 'rgb(200, 200, 200)';
var snekSquareSize = squareSize - 6;
var snake = new Snek();
var controlKeys = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
controlKeys = new Set(controlKeys);


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

function Snek() {
    this.squares = [[0, 0], [1, 0], [2, 0], [3, 0]];
    this.color = "red";
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
    socket.on('snake data', function(data) {
        snake.squares = data;
    });
    $('#game-canvas').keydown(function(event) {
        if (controlKeys.has(event.key)) {
            socket.emit('key down', event.key);
        }
    });
};

$("document").ready(function() {
    var canvas = document.getElementById("game-canvas");
    canvas.focus();
    var ctx = canvas.getContext('2d');
    setInterval(function() {
        drawBoard(ctx, colorOne, colorTwo);
        snake.draw(ctx);
    }, 50);
    initIO();
});
