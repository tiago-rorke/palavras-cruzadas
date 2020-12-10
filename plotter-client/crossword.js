#!/usr/bin/env node

// array of word objects
let words = [];

class Word {
   constructor(word, x, y, label, horizontal, clue) {
      this.word = word;
      this.solved = false;
      // square number and direction in order to label the clue (ie: "14 down" or "12 across")
      this.label = label;
      this.horizontal = horizontal;
      this.clue = clue;

      // new
      this.x = x;  // coordinates of first letter
      this.y = y;
      this.entrytime;      // when word was added
      this.solvedtime;     // when word was solved
      this.solveattempts;  // number of tries at solving the clue
   }
}

// 2d array of square objects
let grid = [];
let width, height;

class Square {
   constructor() {
      // letters, empty square is ' '
      this.letter = ' ';
      // number labels. -1 if no label.
      this.label = -1;
      // whether the letter should be drawn or not
      this.solved = false;
   }
}

function init(w, h) {
   width = w;
   height = h;
   words = []
   grid = [];
   for (let x=0; x<width; x++) {
      grid[x] = []
      for (let y=0; y<height; y++) {
         //console.log(x,y);
         grid[x][y] = new Square();
      }
   }
}

// initialise the words and grid arrays and fill them with the data from the json file
function load(json) {
   let game = JSON.parse(json);

   // initialise
   init(game.grid.width, game.grid.height);

   for(let i=0; i<game.words.length; i++) {

      // create new word objects
      let w = new Word(
         game.words[i].word,
         game.words[i].x,
         game.words[i].y,
         game.words[i].label,
         game.words[i].horizontal,
         game.words[i].clue);
      w.solved = game.words[i].solved;
      w.entrytime = game.words[i].entrytime;
      w.solvedtime = game.words[i].solvedtime;
      w.solveattempts = game.words[i].solveattempts;
      words.push(w);

      // update the grid
      grid[w.x][w.y].label = w.label;
      for(let h=0; h<w.word.length; h++) {
         if(w.horizontal) {
            grid[w.x + h][w.y].letter = w.word.charAt(h);
            if(!grid[w.x + h][w.y].solved) {
               grid[w.x + h][w.y].solved = w.solved;
            }
         } else {
            grid[w.x][w.y + h].letter = w.word.charAt(h);
            if(!grid[w.x][w.y + h].solved) {
               grid[w.x][w.y + h].solved = w.solved;
            }
         }
      }
   }
}

// print the crossword to the console
function printWords(print_unsolved) {
   for(let y=0; y<height; y++) {
      for(let x=0; x<width; x++) {
         process.stdout.write('|');
         if(grid[x][y].solved || print_unsolved) {
            process.stdout.write(grid[x][y].letter);
         } else if (grid[x][y].letter != ' ') {
            process.stdout.write('_');
         } else {
            process.stdout.write(' ');
         }
      }
      process.stdout.write('|');
      process.stdout.write('\n');
   }
}

// print the crossword showing only the labels
function printLabels() {
   for(let y=0; y<height; y++) {
      for(let x=0; x<width; x++) {
         process.stdout.write('|');
         if(grid[x][y].label > -1) {
            process.stdout.write(grid[x][y].label.toString());
         } else if (grid[x][y].letter != ' ') {
            process.stdout.write('_');
         } else {
            process.stdout.write(' ');
         }
      }
      process.stdout.write('|');
      process.stdout.write('\n');
   }
}


// MODULE EXPORTS

exports.words = words;
exports.grid = grid;
exports.width = width;
exports.height = height;
exports.init = init;
exports.load = load;
exports.printWords = printWords;
exports.printLabels = printLabels;