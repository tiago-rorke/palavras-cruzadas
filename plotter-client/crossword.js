#!/usr/bin/env node
'use strict'; // not sure if this is needed??

const fs = require("fs");


// ---------------------- objects ------------------------- //

class Word {
   constructor(word, x, y, label, horizontal, clue, entrytime, player) {
      this.word = word;
      this.clue = clue;
      this.solved = false;

      // square number and direction in order to label the clue (ie: "14 down" or "12 across")
      this.label = label;
      this.horizontal = horizontal;

      this.x = x;  // coordinates of first letter
      this.y = y;
      this.entrytime = entrytime;      // when word was added
      this.solvedtime = -1;     // when word was solved
      this.solveattempts = 0;  // number of tries at solving the clue
      this.player = player;

      // --------- don't think this is needed, as it is handled in grid[][]
      // for drawing with plotter
      // -1 = nothing to draw
      //  0 = drawn
      //  1 = waiting to be drawn
      // this.drawing = -1;
   }
}


class Square {
   constructor() {

      // letters, empty square is ' '
      this.letter = ' ';
      // number labels. -1 if no label.
      this.label = -1;
      // whether the letter should be drawn or not
      this.solved = false;

      // word ids (word index in words array), empty square is -1
      // each square can be a part of up to two words
      this.id1 = -1;
      this.id2 = -1;
      // for debugging testfit word locations
      this.testfit = 0;

      // for drawing with plotter
      // -1 = nothing to draw
      //  0 = drawn
      //  1 = waiting to be drawn
      this.label_drawing = -1;
      this.letter_drawing = -1;
   }
}


// ========================== CROSSWORD CLASS =============================== //

// using this as a guide to try to export a class:
// https://scotch.io/@groupp/about-classes-in-nodejs

const internal = {};

internal.Crossword = class {

   constructor(w, h) {

      // dimensions of the grid
      this.width = w;
      this.height = h;

      this.words = []; // array of word objects
      this.grid = []; // 2d array of square objects

      // for drawing with plotter
      // -1 = nothing to draw
      //  0 = drawn
      //  1 = waiting to be drawn
      this.gridlines_h = []; // [x][y+1]
      this.gridlines_v = []; // [x+1][y]

      // to increment the number label as needed.
      this.label_index = 0;

      // game metadata
      this.start_time = "";
      this.end_time = "";

      this.initGrid();
   }


   // ---------------------- load/init ------------------------- //

   // set vars same as in constructor
   init(w, h) {
      this.width = w;
      this.height = h;
      this.words = [];
      this.grid = [];
      this.gridlines_h = [];
      this.gridlines_v = [];
      this.label_index = 0;
      this.start_time = "";
      this.end_time = "";
      this.initGrid();
   }

   initGrid() {
      // init the crossword grid
      for (let x=0; x<this.width; x++) {
         this.grid[x] = [];
         for (let y=0; y<this.height; y++) {
            this.grid[x][y] = new Square();
         }
      }
      // init the gridlines
      for (let x=0; x<this.width; x++) {
         this.gridlines_h[x] = [];
         for (let y=0; y<this.height+1; y++) {
           this.gridlines_h[x][y] = -1;
         }
      }
      for (let x=0; x<this.width+1; x++) {
         this.gridlines_v[x] = [];
         for (let y=0; y<this.height; y++) {
           this.gridlines_v[x][y] = -1;
         }
      }
   }

   // load data from the json file into the word and grid arrays
   load(file, init) {

      let data;
      try {
         data = JSON.parse(file);
      } catch (err) {
         return console.log(err);
      }

      // if we want to start a new game
      if(init){
         this.init(data.grid.width, data.grid.height);
      }

      // load metadata
      this.start_time = data.start_time;
      this.end_time = data.end_time;

      this.words = [];

      for(let i=0; i<data.words.length; i++) {

         // create new word objects
         let w = new Word(
            data.words[i].word,
            data.words[i].x,
            data.words[i].y,
            data.words[i].label,
            data.words[i].horizontal,
            data.words[i].clue);
         w.solved = data.words[i].solved;
         w.entrytime = data.words[i].entrytime;
         w.solvedtime = data.words[i].solvedtime;
         w.solveattempts = data.words[i].solveattempts;
         w.player = data.words[i].player;
         this.words.push(w);

         // update label_index
         if(w.label > this.label_index) {
            this.label_index = w.label;
         }
      }

      this.update();

      // not sure if should be an async function...
      // return new Promise((resolve, reject) => {
      //    resolve(true);
      // });
      return true;
   }

   save(file) {
      fs.writeFileSync(
         file,
         JSON.stringify(
            {
               start_time: this.start_time,
               end_time: this.start_time,
               grid:
                  {
                     width: this.width,
                     height: this.height,
                  },
               words: this.words
            },
            null,
            1
         ),
         function (err) {
            if (err) return console.log(err);
         }
      );
      return true;
   }

   update() {
      console.log("updating grid");
      this.updateGrid();
      this.updateGridlines();
   }

   // update the crossword grid based on words[]
   updateGrid() {
      for(let i=0; i<this.words.length; i++) {
         let w = this.words[i];
         this.grid[w.x][w.y].label = w.label;
         if(this.grid[w.x][w.y].label_drawing < 0) {
            this.grid[w.x][w.y].label_drawing = 1;
         }
         for(let h=0; h<w.word.length; h++) {
            if(w.horizontal) {
               this.grid[w.x + h][w.y].letter = w.word.charAt(h);
               if(w.solved) {
                  this.grid[w.x + h][w.y].solved = true;
                  if(this.grid[w.x + h][w.y].letter_drawing < 0) {
                     this.grid[w.x + h][w.y].letter_drawing = 1;
                  }
               }
               if (this.grid[w.x+h][w.y].id1 >= 0) {
                  this.grid[w.x+h][w.y].id2 = i;
               } else {
                  this.grid[w.x+h][w.y].id1 = i;
               }
            } else {
               this.grid[w.x][w.y + h].letter = w.word.charAt(h);
               if(w.solved) {
                  this.grid[w.x][w.y + h].solved = true;
                  if(this.grid[w.x][w.y + h].letter_drawing < 0) {
                     this.grid[w.x][w.y + h].letter_drawing = 1;
                  }
               }
               if (this.grid[w.x][w.y+h].id1 >= 0) {
                  this.grid[w.x][w.y+h].id2 = i;
               } else {
                  this.grid[w.x][w.y+h].id1 = i;
               }
            }
         }
      }
   }

   updateGridlines() {
      for (let x=0; x<this.width; x++) {
         for (let y=0; y<this.height; y++) {
            if (this.grid[x][y].letter != ' ') {
               // mark for drawing if not already drawn
               this.gridlines_v[x][y]   = this.gridlines_v[x][y]   == 0 ? 0 : 1;
               this.gridlines_v[x+1][y] = this.gridlines_v[x+1][y] == 0 ? 0 : 1;
               this.gridlines_h[x][y]   = this.gridlines_h[x][y]   == 0 ? 0 : 1;
               this.gridlines_h[x][y+1] = this.gridlines_h[x][y+1] == 0 ? 0 : 1;
            }
         }
      }
   }

   undrawGridlines() {
      for (let x=0; x<this.width; x++) {
         for (let y=0; y<this.height+1; y++) {
            if(this.gridlines_h[x][y] == 0) {
               this.gridlines_h[x][y] = 1;
            }
         }
      }
      for (let x=0; x<this.width+1; x++) {
         for (let y=0; y<this.height; y++) {
            if(this.gridlines_v[x][y] == 0) {
               this.gridlines_v[x][y] = 1;
            }
         }
      }
   }

   undrawGrid() {
      for (let x=0; x<this.width; x++) {
         for (let y=0; y<this.height; y++) {
            if (this.grid[x][y].letter_drawing == 0) {
               this.grid[x][y].letter_drawing = 1;
            }
            if(this.grid[x][y].label_drawing == 0) {
               this.grid[x][y].label_drawing = 1;
            }
         }
      }
   }

   saveGrid(file) {
      fs.writeFileSync(
         file,
         JSON.stringify(
            {
               width: this.width,
               height: this.height,
               grid: this.grid,
               gridlines_v: this.gridlines_v,
               gridlines_h: this.gridlines_h
            },
            null,
            1
         ),
         function (err) {
            if (err) return console.log(err);
         }
      );
      return true;
   }

   loadGrid(file) {
      let data;
      try {
         data = JSON.parse(file);
      } catch (err) {
         return console.log(err);
      }

      if(this.width != data.width || this.height != data.height) {
         console.log("game file and grid file have different grid sizes!");
      } else {

         // load grid
         for (let x=0; x<this.width; x++) {
            for (let y=0; y<this.height; y++) {
               this.grid[x][y] = new Square();
               this.grid[x][y].letter = data.grid[x][y].letter;
               this.grid[x][y].label = data.grid[x][y].label;
               this.grid[x][y].solved = data.grid[x][y].solved;
               this.grid[x][y].id1 = data.grid[x][y].id1;
               this.grid[x][y].id2 = data.grid[x][y].id2;
               this.grid[x][y].testfit = data.grid[x][y].testfit;
               this.grid[x][y].label_drawing = data.grid[x][y].label_drawing;
               this.grid[x][y].letter_drawing = data.grid[x][y].letter_drawing;
            }
         }

         // load gridlines
         for (let x=0; x<this.width; x++) {
            for (let y=0; y<this.height+1; y++) {
               this.gridlines_h[x][y] = data.gridlines_h[x][y];
            }
         }
         for (let x=0; x<this.width+1; x++) {
            for (let y=0; y<this.height; y++) {
               this.gridlines_v[x][y] = data.gridlines_v[x][y];
            }
         }
      }
   }

   // ---------------------- word functiosn ------------------------- //

   /*

   REALTIME CROSSWORD-MAKING LOGIC

   ## 1st WORD

    - Math.random location inside the grid and Math.random rotation.

   ## SUBSEQUENT WORDS

    - search through all possible horizontal and vertical positions, based on word-length
      - in an array for each possible position
         - 1D array of the format [ y*width+x (horizontal pos') + (y*width+x (vertical pos') ]
         - for each position, give it a score by checking if any of the letters:
            a) overlap with an existing letter or
            b) are adjacent to an existing letter

            if a) check if the overlapping letters are the same
               - if false, score = -1 and skip to next position
               - if true,
                  - score += 1 and keep checking remaining letters
                  - save the id of the word that has been crossed
                  - if the id matches an existing saved id, the word is colinear/overlapping
                     score = -1 and skip to next position

            if b) score = -1 and skip to next position

          - after checking all positions, position with highest score wins.
            - if a tie, choose Math.randomly from highest score positions
               - if no position has a score higher than 0, word is put in Math.random location in whitespace

    - if all position scores are -1, word is rejected.


   ## Math.random LOCATION IN WHITESPACE

   *todo ???*
   - maximise distance to margins/existing words
      - in the case of the first word, puts it roughly in the middle somewhere

   */

   // receive newly input word and decide what to do with it
   newWord(word_string, clue_string, entrytime, player) {

      let l = word_string.length;
      if (l <= 0) {
         return console.log('got an empty word string', err);
      } else {
         //console.log('new word:', word_string);

         // clear the testfit debugging array
         for (let x=0; x<this.width; x++) {
            for (let y=0; y<this.height; y++) {
               this.grid[x][y].testfit = 0;
            }
         }

         if (this.words.length == 0) {
            // console.log('first word!');
            // if this is the first word, choose a random location
            let dir = Math.random() >= 0.5;
            this.label_index++;
            return this.addWord(
               word_string,
               Math.round(Math.random() * (this.width-l)),
               Math.round(Math.random() * (this.height-l)),
               dir,
               this.label_index,
               clue_string,
               entrytime,
               player
               );
         } else {
            //console.log('running wordsearch...');
            // otherwise search for a suitable location
            return this.wordsearch(word_string, clue_string, entrytime, player);
         }
      }
   }


   // search the current layout for a suitable location for a new word
   wordsearch(word_string, clue_string, entrytime, player) {
      let l = word_string.length;
      let positions = [];

      // horizontal positions
      for (let x=0; x<this.width; x++) {
         for (let y=0; y<this.height; y++) {
            let score = x<=this.width-l ? this.testFit(word_string, x, y, true) : -1;
            positions[y*this.width + x] = score;
         }
      }
      let p = positions.length;
      // vertical positions
      for (let x=0; x<this.width; x++) {
         for (let y=0; y<this.height; y++) {
            let score = y<=this.height-l ? this.testFit(word_string, x, y, false) : -1;
            positions[p + y*this.width + x] = score;
         }
      }

      // find the best scoring positions
      let highscore = -1;
      let best_positions = [];
      for (let i=0; i<positions.length; i++) {
         if(positions[i] >= 0)
         if (positions[i] >= 0) {
            if (positions[i] == highscore) {
               best_positions.push(i);
            } else if (positions[i] > highscore) {
               highscore = positions[i];
               best_positions = [];
               best_positions.push(i);
            }
         }
      }
      // console.log('best position score is: ', highscore);
      // console.log('total best positions: ', best_positions.length);

      if(highscore >= 0) {
         let new_position;
         if(best_positions.length > 1) {
            let i = Math.floor(Math.random() * best_positions.length);
            new_position = best_positions[i];
         } else {
            new_position = best_positions[0];
         }
         // get new position direction and coords
         let horizontal = new_position >= this.width*this.height ? false : true;
         if (!horizontal) new_position -= this.width*this.height;
         let y = Math.floor(new_position / this.width);
         let x = new_position % this.width;
         // check if the square already has a label, if not make a new label
         let label;
         if(this.grid[x][y].label > 0) {
            label = this.grid[x][y].label;
         } else {
            this.label_index++;
            label = this.label_index;
         }
         return this.addWord(word_string, x, y, horizontal, label, clue_string, entrytime, player);
      } else {
         // console.log('no place found for this word, sorry');
         return false;
      }

   }


   // see if a word fits at a particular location, and return a score based on how many letters match
   testFit(word_string, x, y, horizontal) {
      let l = word_string.length;
      let score = 0;
      let crossed_ids = [];

      for (let i=0; i<l; i++) {
         // check for each letter in the new word

         if (horizontal) {

            if (this.grid[x+i][y].letter == word_string.charAt(i)) {
               // if the letter matches, check to see if the word has already been crossed
               // first get the existing id's
               let crossed_id1 = this.grid[x+i][y].id1;
               let crossed_id2 = this.grid[x+i][y].id2;
               // if one of the square's id's -1 (unused slot), replace with -2 to not produce false positives in the affix test
               if (crossed_id1 < 0) crossed_id1 = -2;
               if (crossed_id2 < 0) crossed_id2 = -2;

               // then check against the previously stored id's
               let overlap = false;
               for (let h=0; h<crossed_ids.length; h++) {
                  if (
                     crossed_ids[h] == crossed_id1 ||
                     crossed_ids[h] == crossed_id2
                     ) {
                     overlap = true;
                  }
               }
               // if it is the first or last letter, also check to see if the word is being affixed
               if (x>0 && i==0) {
                  if (
                     this.grid[x-1][y].id1 == crossed_id1 ||
                     this.grid[x-1][y].id1 == crossed_id2 ||
                     this.grid[x-1][y].id2 == crossed_id1 ||
                     this.grid[x-1][y].id2 == crossed_id2
                     ) {
                     overlap = true;
                  }
               }
               if (x+l<this.width && i==l-1) {
                  if(
                     this.grid[x+l][y].id1 == crossed_id1 ||
                     this.grid[x+l][y].id1 == crossed_id2 ||
                     this.grid[x+l][y].id2 == crossed_id1 ||
                     this.grid[x+l][y].id2 == crossed_id2
                     ) {
                     overlap = true;
                  }
               }
               // if it has, fail the test
               if(overlap) {
                  score = -1;
                  break;
               }
               // otherwise, increment the score
               score++;
               // and save the id of the crossed word
               if(crossed_id1 >= 0) {
                  crossed_ids.push(crossed_id1);
               }
               if(crossed_id2 >= 0) {
                  crossed_ids.push(crossed_id2);
               }

            } else if (this.grid[x+i][y].id1 >= 0) {
               // otherwise if the square is occupied, fail the test
               score = -1;
               break;

            } else {
               // otherwise, if one of the adjacent squares are occupied also fail the test
               if (
                  (y>0 && this.grid[x+i][y-1].id1 >= 0) ||
                  (y<this.height-1 && this.grid[x+i][y+1].id1 >= 0) ||
                  (x>0 && i==0 && this.grid[x-1][y].id1 >= 0) ||
                  (x+l<this.width && i==l-1 && this.grid[x+l][y].id1 >= 0)
                  ) {
                  score = -1;
                  break;
               }
            }

         } else { // (if vertical)

            if (this.grid[x][y+i].letter == word_string.charAt(i)) {
               let crossed_id1 = this.grid[x][y+i].id1;
               let crossed_id2 = this.grid[x][y+i].id2;
               if (crossed_id1 < 0) crossed_id1 = -2;
               if (crossed_id2 < 0) crossed_id2 = -2;
               let overlap = false;
               for (let h=0; h<crossed_ids.length; h++) {
                  if (
                     crossed_ids[h] == crossed_id1 ||
                     crossed_ids[h] == crossed_id2
                     ) {
                     overlap = true;
                  }
               }

               if (y>0 && i==0) {
                  if(
                     this.grid[x][y-1].id1 == crossed_id1 ||
                     this.grid[x][y-1].id1 == crossed_id2 ||
                     this.grid[x][y-1].id2 == crossed_id1 ||
                     this.grid[x][y-1].id2 == crossed_id2
                     ) {
                     overlap = true;
                  }
               }
               if (y+l<this.height && i==l-1) {
                  if(
                     this.grid[x][y+l].id1 == crossed_id1 ||
                     this.grid[x][y+l].id1 == crossed_id2 ||
                     this.grid[x][y+l].id2 == crossed_id1 ||
                     this.grid[x][y+l].id2 == crossed_id2
                     ) {
                     overlap = true;
                  }
               }
               if(overlap) {
                  score = -1;
                  break;
               }
               score ++;
               if(crossed_id1 >= 0) {
                  crossed_ids.push(crossed_id1);
               }
               if(crossed_id2 >= 0) {
                  crossed_ids.push(crossed_id2);
               }

            } else if (this.grid[x][y+i].id1 >= 0) {
               score = -1;
               break;

            } else {
               if (
                  (x>0 && this.grid[x-1][y+i].id1 >= 0) ||
                  (x<this.width-1 && this.grid[x+1][y+i].id1 >= 0) ||
                  (y>0 && i==0 && this.grid[x][y-1].id1 >= 0) ||
                  (y+l<this.height && i==l-1 && this.grid[x][y+l].id1 >= 0)
                  ) {
                  score = -1;
                  break;
               }
            }

         }
      }

      // fill testfit array with alpha values
      if (score > 0) { // show valid positions that cross existing words
      // if (score == 0) { // show new valid positions in empty space
         for (let i=0; i<l; i++) {
            if (horizontal) {
               this.grid[x+i][y].testfit += 50;
            } else {
               this.grid[x][y+i].testfit += 50;
            }
         }
      }

      return score;
   }


   // add a new word at location x,y
   addWord(word_string, x, y, horizontal, label, clue_string, entrytime, player) {
      let word = new Word(word_string, x, y, label, horizontal, clue_string, entrytime, player);
      //console.log(word);
      this.words.push(word);
      this.update();
      // console.log(label, horizontal?'across':'down',':', clue_string);
      // console.log('total words:', this.words.length);
      return word;
   }

   // ---------------------- debug ------------------------- //

   // print the crossword to the console
   printWords(print_unsolved) {
      for(let x=0; x<this.width; x++) {
         process.stdout.write('--');
      }
      process.stdout.write('-\n');
      for(let y=0; y<this.height; y++) {
         for(let x=0; x<this.width; x++) {
            process.stdout.write('|');
            if(this.grid[x][y].solved || print_unsolved) {
               process.stdout.write(this.grid[x][y].letter);
            } else if (this.grid[x][y].letter != ' ') {
               process.stdout.write('_');
            } else {
               process.stdout.write(' ');
            }
         }
         process.stdout.write('|');
         process.stdout.write('\n');
      }
      for(let x=0; x<this.width; x++) {
         process.stdout.write('--');
      }
      process.stdout.write('-\n');
   }

   // print the grid showing only the labels
   printLabels() {
      for(let x=0; x<this.width; x++) {
         process.stdout.write('--');
      }
      process.stdout.write('-\n');
      for(let y=0; y<this.height; y++) {
         for(let x=0; x<this.width; x++) {
            process.stdout.write('|');
            if(this.grid[x][y].label > -1) {
               process.stdout.write(this.grid[x][y].label.toString());
            } else if (this.grid[x][y].letter != ' ') {
               process.stdout.write('_');
            } else {
               process.stdout.write(' ');
            }
         }
         process.stdout.write('|');
         process.stdout.write('\n');
      }
      for(let x=0; x<this.width; x++) {
         process.stdout.write('--');
      }
      process.stdout.write('-\n');
   }

   // print the wordlist showing index, position, labels and orientations
   printWordlist() {
      console.log("------------------");
      for(let i=0; i<this.words.length; i++) {
         console.log('[', i, ']', 'x:',this.words[i].x, 'y:', this.words[i].y, '|', this.words[i].label, this.words[i].horizontal?'across':'down',':', this.words[i].word, ';', this.words[i].clue);
      }
      console.log("------------------");
   }

}

// ====================================================== //

module.exports = internal.Crossword;