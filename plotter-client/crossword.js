#!/usr/bin/env node


// ---------------------- objects ------------------------- //

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

      // word ids (word index in words array), empty square is -1
      // each square can be a part of up to two words
      this.id1 = -1;
      this.id2 = -1;
      // for debugging testfit word locations
      this.testfit = 0;
   }
}

// to increment the number label as needed.
let label_index;


// ---------------------- load/init ------------------------- //

function init(w, h) {
   width = w;
   height = h;
   words = []
   grid = [];
   label_index = 0;
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

      // update label_index
      if(w.label > label_index) {
         label_index = w.label;
      }

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


// ---------------------- word functions ------------------------- //

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
function newWord(word_string, clue_string) {

   let l = word_string.length;
   if (l <= 0) {
      console.log('got an empty string...');
   } else {
      console.log('new word:', word_string);

      // clear the testfit debugging array
      for (let x=0; x<width; x++) {
         for (let y=0; y<height; y++) {
            grid[x][y].testfit = 0;
         }
      }

      if (words.length == 0) {
         // if this is the first word, choose a random location
         let dir = Math.random() >= 0.5;
         label_index++;
         addWord(word_string, Math.round(Math.random(0,width-l)), Math.round(Math.random(0,height-l)), dir, label_index, clue_string);
      } else {
         // otherwise search for a suitable location
         wordsearch(word_string, clue_string);
      }
   }
}


// search the current layout for a suitable location for a new word
function wordsearch(word_string, clue_string) {
   let l = word_string.length;
   let positions = [];

   // horizontal positions
   for (let x=0; x<width; x++) {
      for (let y=0; y<height; y++) {
         let score = x<=width-l ? testFit(word_string, x, y, true) : -1;
         positions[y*width + x] = score;
      }
   }
   let p = positions.length;
   // vertical positions
   for (let x=0; x<width; x++) {
      for (let y=0; y<height; y++) {
         let score = y<=height-l ? testFit(word_string, x, y, false) : -1;
         positions[p + y*width + x] = score;
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
   //console.log('best position score is: ', highscore);
   //console.log('total best positions: ', best_positions.length);

   if(highscore >= 0) {
      let new_position;
      if(best_positions.length > 1) {
         let i = Math.floor(Math.random(0,best_positions.length));
         new_position = best_positions[i];
      } else {
         new_position = best_positions[0];
      }
      // get new position direction and coords
      let horizontal = new_position >= width*height ? false : true;
      if (!horizontal) new_position -= width*height;
      let y = Math.floor(new_position / width);
      let x = new_position % width;
      // check if the square already has a label, if not make a new label
      let label;
      if(grid[x][y].label > 0) {
         label = grid[x][y].label;
      } else {
         label_index++;
         label = label_index;
      }
      addWord(word_string, x, y, horizontal, label, clue_string);
   } else {
      console.log('no place found for this word, sorry');
   }

}


// see if a word fits at a particular location, and return a score based on how many letters match
function testFit(word_string, x, y, horizontal) {
   let l = word_string.length;
   let score = 0;
   let crossed_ids = [];

   for (let i=0; i<l; i++) {
      // check for each letter in the new word

      if (horizontal) {

         if (grid[x+i][y].letter == word_string.charAt(i)) {
            // if the letter matches, check to see if the word has already been crossed
            // first get the existing id's
            let crossed_id1 = grid[x+i][y].id1;
            let crossed_id2 = grid[x+i][y].id2;
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
                  grid[x-1][y].id1 == crossed_id1 ||
                  grid[x-1][y].id1 == crossed_id2 ||
                  grid[x-1][y].id2 == crossed_id1 ||
                  grid[x-1][y].id2 == crossed_id2
                  ) {
                  overlap = true;
               }
            }
            if (x+l<width && i==l-1) {
               if(
                  grid[x+l][y].id1 == crossed_id1 ||
                  grid[x+l][y].id1 == crossed_id2 ||
                  grid[x+l][y].id2 == crossed_id1 ||
                  grid[x+l][y].id2 == crossed_id2
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

         } else if (grid[x+i][y].id1 >= 0) {
            // otherwise if the square is occupied, fail the test
            score = -1;
            break;

         } else {
            // otherwise, if one of the adjacent squares are occupied also fail the test
            if (
               (y>0 && grid[x+i][y-1].id1 >= 0) ||
               (y<height-1 && grid[x+i][y+1].id1 >= 0) ||
               (x>0 && i==0 && grid[x-1][y].id1 >= 0) ||
               (x+l<width && i==l-1 && grid[x+l][y].id1 >= 0)
               ) {
               score = -1;
               break;
            }
         }

      } else { // (if vertical)

         if (grid[x][y+i].letter == word_string.charAt(i)) {
            let crossed_id1 = grid[x][y+i].id1;
            let crossed_id2 = grid[x][y+i].id2;
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
                  grid[x][y-1].id1 == crossed_id1 ||
                  grid[x][y-1].id1 == crossed_id2 ||
                  grid[x][y-1].id2 == crossed_id1 ||
                  grid[x][y-1].id2 == crossed_id2
                  ) {
                  overlap = true;
               }
            }
            if (y+l<height && i==l-1) {
               if(
                  grid[x][y+l].id1 == crossed_id1 ||
                  grid[x][y+l].id1 == crossed_id2 ||
                  grid[x][y+l].id2 == crossed_id1 ||
                  grid[x][y+l].id2 == crossed_id2
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

         } else if (grid[x][y+i].id1 >= 0) {
            score = -1;
            break;

         } else {
            if (
               (x>0 && grid[x-1][y+i].id1 >= 0) ||
               (x<width-1 && grid[x+1][y+i].id1 >= 0) ||
               (y>0 && i==0 && grid[x][y-1].id1 >= 0) ||
               (y+l<height && i==l-1 && grid[x][y+l].id1 >= 0)
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
            grid[x+i][y].testfit += 50;
         } else {
            grid[x][y+i].testfit += 50;
         }
      }
   }

   return score;
}


// add a new word at location x,y
function addWord(word_string, x, y, horizontal, label, clue_string) {
   let id = words.length;
   let l = word_string.length;
   if(grid[x][y].label <= 0){
      grid[x][y].label = label;
   } else {
      if(grid[x][y].label != label) {
         console.log("THERE IS A PROBLEM");
      }
   }
   for (let i=0; i<l; i++) {
      if (horizontal) {
         if(x+i < width) {
            if (grid[x+i][y].id1 >= 0) {
               grid[x+i][y].id2 = id;
            } else {
               grid[x+i][y].id1 = id;
            }
            grid[x+i][y].letter = word_string.charAt(i);
         }
      } else {
         if(y+i < height) {
            if (grid[x][y+i].id1 >= 0) {
               grid[x][y+i].id2 = id;
            } else {
               grid[x][y+i].id1 = id;
            }
            grid[x][y+i].letter = word_string.charAt(i);
         }
      }
   }
   word = new Word(word_string, x, y, label, horizontal, clue_string)
   words.push(word);
   console.log(label, horizontal?'across':'down',':', clue_string);
   console.log('total words:', words.length);
}


// ---------------------- debug ------------------------- //

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


// ---------------------- draw functions ------------------------- //


function drawGrid() {
   background(255);
   drawPoints();
   drawLayout();
   //drawTestfits(); // uncommment to show all possible locations when adding a word
   drawWords();
}

function drawPoints() {
   stroke(0);
   noFill();
   for (let x=0; x<=max_x; x++) {
      for (let y=0; y<=max_y; y++) {
         point(x*square_size, y*square_size);
      }
   }
}

function drawLayout() {
   textSize(0.2*square_size);
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         if (grid[x][y].id1 >= 0) {
            stroke(0);
            noFill();
            rect(x*square_size, y*square_size, square_size, square_size);
         }
         if (grid[x][y].label > 0) {
            noStroke();
            fill(0);
            text(grid[x][y].label, x*square_size+square_size/4, y*square_size+square_size/4);
         }
      }
   }
}

function drawTestfits() {
   noStroke();
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         let a = grid[x][y].testfit;
         if (a > 0) {
            fill(255,0,0,a);
            rect(x*square_size, y*square_size, square_size, square_size);
         }
      }
   }
}

function drawWords() {
   noStroke();
   fill(0);
   textSize(0.8*square_size);
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         text(grid[x][y].letter, x*square_size+2*square_size/3, y*square_size+2*square_size/3);
      }
   }
}

function printWordlist() {
   console.log("WORDLIST:");
   for(let i=0; i<words.length; i++) {
      console.log('[', i, ']', 'x:',words[i].x, 'y:', words[i].y, '|', words[i].label, words[i].horizontal?'across':'down',':', words[i].word, ';', words[i].clue);
   }
   console.log("LIST END.");

}

// ---------------------- module exports ------------------------- //

exports.words = words;
exports.grid = grid;
exports.width = width;
exports.height = height;
exports.init = init;
exports.load = load;
exports.printWords = printWords;
exports.printLabels = printLabels;
exports.newWord = newWord;
exports.drawGrid = drawGrid;
exports.printWordlist = printWordlist;