// imports
var express = require('express')
var app = express();
var http = require('http').Server(app);
var snek = require("socket.io")(http);

// static files
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/client/play.html");
});

// handle clients
snek.on('connection', function(socket) {
    var snake = new Snake();
    setInterval(function() {
        snake.move(true);
        socket.emit('snake data', snake.squares);
    }, 50);
    socket.on('key down', function(data) {
        snake.tryTurn(data);
    });
});

// boilerplate
app.use(express.static(__dirname + "/client"))
http.listen(8000, "127.0.0.1");

// constants
var directions = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
directions = new Set(directions);
var ySquares = 27;
var xSquares = 36;


var Snake = function() {
    this.squares = [[0, 0], [1, 0], [2, 0], [3, 0],
        [4, 0], [5, 0], [6, 0], [7, 0]];
 
    this.direction = "ArrowRight";
    this.lastMoved = "ArrowRight";

    this.move = function(append) {
        var last = this.squares[this.squares.length - 1];
        var newSquare = [last[0], last[1]];
        if (this.direction == "ArrowUp") {
            newSquare[1]--;
        } else if (this.direction == "ArrowDown") {
            newSquare[1]++;
        } else if (this.direction == "ArrowLeft") {
            newSquare[0]--;
        } else {
            newSquare[0]++;
        }
        if (newSquare[0] < 0 || newSquare[1] < 0 ||
             newSquare[0] >= xSquares || newSquare[1] >= ySquares) {
            return
        }
        if (!append) {
            this.squares.shift();
        }
        this.lastMoved = this.direction;
        this.squares.push(newSquare);
    }

    this.tryTurn = function(direction) {
        if (directions.has(direction)) {
            var valid = direction == "ArrowUp" && this.lastMoved != "ArrowDown";
            valid = valid || direction == "ArrowDown" && this.lastMoved != "ArrowUp";
            valid = valid || direction == "ArrowLeft" && this.lastMoved != "ArrowRight";
            valid = valid || direction == "ArrowRight" && this.lastMoved != "ArrowLeft";
            if (valid) {
                this.direction = direction;
            }
        }
    }
}
