module.exports = {
    Snake: Snake
};

var DIRS = Object.freeze({
    UP : 'ArrowUp',
    DOWN : 'ArrowDown',
    LEFT : 'ArrowLeft',
    RIGHT : 'ArrowRight',
    set : new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
});

var ySquares = 27;
var xSquares = 36;

function Snake(squares, direction) {
    this.squares = squares;
    this.direction = direction;
    this.lastMoved = direction;
    this.hitEdge = false;
    this.toAppend = 0;
    this.speed = 1;
    this.toMove = 0;

    this.move = function() {
        this.toMove++;
        if (this.toMove % this.speed != 0) {
            return;
        }

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

        if (this.toAppend == 0) {
            this.squares.shift();
        } else {
            this.toAppend--;
        }

        this.lastMoved = this.direction;
        this.squares.push(newSquare);
    };

    this.hitSelf = function() {
        var head = this.squares[this.squares.length - 1];
        for (var i = 0; i < this.squares.length - 1; i++) {
            var curr = this.squares[i];
            if (curr[0] == head[0] && curr[1] == head[1]) {
                return true;
            }
        }
        return false;
    };

    this.hitSnake = function(snake) {
        var head = this.squares[this.squares.length - 1];
        for (var i = 0; i < snake.squares.length; i++) {
            var curr = snake.squares[i];
            if (curr[0] == head[0] && curr[1] == head[1]) {
                return true;
            }
        }
        return false;
    };

    this.tryTurn = function(direction) {
        var valid = direction == DIRS.UP && this.lastMoved != DIRS.DOWN;
        valid = valid || direction == DIRS.DOWN && this.lastMoved != DIRS.UP;
        valid = valid || direction == DIRS.LEFT && this.lastMoved != DIRS.RIGHT;
        valid = valid || direction == DIRS.RIGHT && this.lastMoved != DIRS.LEFT;
        if (valid) {
            this.direction = direction;
        }
    };

    this.collides = function(pos) {
        var head = this.squares[this.squares.length - 1];
        return head[0] == pos[0] && head[1] == pos[1];
    };
}