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
   }
}


module.exports = {

   words,
   grid,
   width,
   height,

   init: function(w, h) {
      module.exports.width = w;
      module.exports.height = h;
      module.exports.words = []
      module.exports.grid = [];
      for (let x=0; x<module.exports.width; x++) {
         module.exports.grid[x] = []
         for (let y=0; y<module.exports.height; y++) {
            //console.log(x,y);
            module.exports.grid[x][y] = new Square();
         }
      }
   },

   // initialise the words and grid arrays and fill them with the data from the json file
   load: function(json) {
      let game = JSON.parse(json);

      // initialise
      module.exports.init(game.grid.width, game.grid.height);

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
         module.exports.words.push(w);

         // update the grid
         module.exports.grid[w.x][w.y].label = w.label;
         for(let h=0; h<w.word.length; h++) {
            if(w.horizontal) {
               module.exports.grid[w.x + h][w.y].letter = w.word.charAt(h);
            } else {
               module.exports.grid[w.x][w.y + h].letter = w.word.charAt(h);
            }
         }
      }
   },

   // print the crossword to the console
   printWords: function() {
      for(let y=0; y<module.exports.height; y++) {
         for(let x=0; x<module.exports.width; x++) {
            process.stdout.write('|');
            process.stdout.write(module.exports.grid[x][y].letter);
         }
         process.stdout.write('|');
         process.stdout.write('\n');
      }
   },

   // print the crossword showing only the labels
   printLabels: function() {
      for(let y=0; y<module.exports.height; y++) {
         for(let x=0; x<module.exports.width; x++) {
            process.stdout.write('|');
            if(module.exports.grid[x][y].label > -1) {
               process.stdout.write(module.exports.grid[x][y].label.toString());
            } else {
               process.stdout.write(' ');
            }
         }
         process.stdout.write('|');
         process.stdout.write('\n');
      }
   }

};
