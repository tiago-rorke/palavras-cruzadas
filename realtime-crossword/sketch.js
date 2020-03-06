/*


***** BUG *****

squares have to retain up to 2 ids!

***************


REALTIME CROSSWORD-MAKING LOGIC

## 1st WORD

 - random location inside the grid and random rotation.

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
         - if a tie, choose randomly from highest score positions
            - if no position has a score higher than 0, word is put in random location in whitespace

 - if all position scores are -1, word is rejected.

## RANDOM LOCATION IN WHITESPACE

*todo* 
- maximise distance to margins/existing words 
   - in the case of the first word, puts it roughly in the middle somewhere

*/



let square_size = 20;
let canvas_width = 700;
let canvas_height = 500;
let max_x;
let max_y;

// 2D array of word ids, empty square is -1
let ids = [];
// 2D array of letters, empty square is ' '
let letters = [];
// list of all words, index is word id
let words = [];
// 2D array for debugging testfit word locations
let testfits = [];

let grid = [];

let button;
let textbox;

class square {
   constructor() {
      this.id1 = -1;
      this.id2 = -1;
      this.letter = ' ';
      this.testfit = 0;
   }

}


function setup() {
   let canvas = createCanvas(canvas_width, canvas_height);
   canvas.parent('canvas');
   max_x = floor(canvas_width/square_size);
   max_y = floor(canvas_height/square_size);
   for (let x=0; x<max_x; x++) {
      grid[x] = []
      /*
      ids[x] = []
      letters[x] = []
      testfits[x] = []
      */
      for (let y=0; y<max_y; y++) {
         grid[x][y] = new square();
         /*
         ids[x][y] = -1;
         letters[x][y] = ' ';
         testfits[x][y] = 0;
         */
      }
   }
   button = createButton('add word');
   textbox = createInput('');
   textbox.input(myInputEvent);
   textbox.position(20, height + 50);
   button.position(20, height + 100);
   button.mousePressed(newWord);
   strokeWeight(2);
   textSize(0.8*square_size);
   textAlign(CENTER, CENTER);
   smooth();
   updateGrid();
}

function myInputEvent() {
   //console.log('you are typing: ', this.value());
}


function draw() {
}


// ---------------------- word functions ------------------------- //


// receive newly input word and decide what to do with it
function newWord() {

   // clear the testfit debugging array
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         grid[x][y].testfit = 0;
         //testfits[x][y] = 0;
      }
   }

   let word = textbox.value();
   let l = word.length;
   console.log('new word:', word);

   if (words.length == 0) {
      // if this is the first word, choose a random location
      let dir = random() >= 0.5;
      //addWord(word, round(random(0,max_x-l)), round(random(0,max_y-l)), dir)
      addWord(word, 15, 15, false)
   } else {
      // otherwise search for a suitable location
      wordsearch(word);
      //addWord(10,10,textbox.value(),l,true);
   }

}

// search the current layout for a suitable location for a new word
function wordsearch(word) {
   let l = word.length;
   let positions = [];

   console.log('starting wordsearch for:', word);
   // horizontal positions
   //console.log('horizontals:');
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         let score = x<=max_x-l ? testFit(word, x, y, true) : -1;
         positions[y*max_x + x] = score;
         //if(score>0) console.log('h', score);
      }
   }
   let p = positions.length;
   //console.log('h-search done', positions.length);
   // vertical positions
   //console.log('verticals:');
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         let score = y<=max_y-l ? testFit(word, x, y, false) : -1;
         positions[p + y*max_x + x] = score;
         //if(score>0) console.log('v', score);
      }
   }
   //console.log('v-search done', positions.length);

   //console.log('tested', positions.length, 'positions');
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
         let i = round(random(0,best_positions.length));
         new_position = best_positions[i];
      } else {
         new_position = best_positions[0];
      }
      // get new position direction and coords
      let horizontal = new_position >= max_x*max_y ? false : true;
      if (!horizontal) new_position -= max_x*max_y;
      let y = floor(new_position / max_x);
      let x = new_position % max_x;
      addWord(word, x, y, horizontal);
   } else {
      console.log('no place found for this word, sorry');
   }

}


// see if a word fits at a particular location, and return a score based on how many letters match
function testFit(word, x, y, horizontal) {
   let l = word.length;
   let score = 0;
   let crossed_ids = [];

   for (let i=0; i<l; i++) {
      if (horizontal) {

         //if (letters[x+i][y] == word.charAt(i)) {
         if (grid[x+i][y].letter == word.charAt(i)) {
            // if the letter matches, check to see if the word has already been crossed
            //let crossed_id = ids[x+i][y];
            let crossed_id = grid[x+i][y].id1;
            let overlap = false;
            //console.log('checking for letter: ', word.charAt(i))
            //console.log('h cross found with id:', crossed_id);
            for (let h=0; h<crossed_ids.length; h++) {
               if (crossed_ids[h] == crossed_id) {
                  overlap = true;
               }
            }
            // if it is the first or last letter, also check to see if the word is being affixed
            if (i==0) {
               //if(x>0 && ids[x-1][y] == crossed_id) {
               if(x>0 && grid[x-1][y].id1 == crossed_id) {
                  overlap = true;
               }
            }
            if (x+l<max_x && i==l-1) {
               //if(ids[x+l][y] == crossed_id) {
               if(grid[x+l][y].id1 == crossed_id) {
                  overlap = true;
               }
            }
            // if it has, fail the test
            if(overlap) {
               score = -1;
               break;
            }
            //console.log('overlap block');
            // otherwise, increment the score
            score++;
            // and save the id of the crossed word
            crossed_ids.push(crossed_id);
            //console.log('h crossed word', score);
         //} else if (ids[x+i][y] >= 0) {
         } else if (grid[x+i][y].id1 >= 0) {
            // otherwise if the square is occupied, fail the test
            score = -1;
            break;
         } else {
            // otherwise, if one of the adjacent squares are occupied also fail the test
            if (
               /*
               (y>0 && ids[x+i][y-1] >= 0) || 
               (y<max_y-1 && ids[x+i][y+1] >= 0) ||
               (x>0 && i==0 && ids[x-1][y] >= 0) ||
               (x+l<max_x && i==l-1 && ids[x+l][y] >= 0)*/
               
               (y>0 && grid[x+i][y-1].id1 >= 0) || 
               (y<max_y-1 && grid[x+i][y+1].id1 >= 0) ||
               (x>0 && i==0 && grid[x-1][y].id1 >= 0) ||
               (x+l<max_x && i==l-1 && grid[x+l][y].id1 >= 0)
               ) {
               score = -1;
               break;
            }
         }

      } else {

         //if (letters[x][y+i] == word.charAt(i)) {
         if (grid[x][y+i].letter == word.charAt(i)) {
            //let crossed_id = ids[x][y+i];
            let crossed_id = grid[x][y+i].id1;
            let overlap = false;
            //console.log('checking for letter: ', word.charAt(i))
            //console.log('v cross found with id:', crossed_id);
            for (let h=0; h<crossed_ids.length; h++) {
               if (crossed_ids[h] == crossed_id) {
                  overlap = true;
               }
            }
            
            if (y>0 && i==0) {
               //if(ids[x][y-1] == crossed_id) {
               if(grid[x][y-1].id1 == crossed_id) {
                  overlap = true;
               }
            }
            if (y+l<max_y && i==l-1) {
               //if(ids[x][y+l] == crossed_id) {
               if(grid[x][y+l].id1 == crossed_id) {
                  overlap = true;
               }
            }
            if(overlap) {
               score = -1;
               break;
            }
            score ++;
            crossed_ids.push(crossed_id);
            //console.log('v crossed word', score);
         //} else if (ids[x][y+i] >= 0) {
         } else if (grid[x][y+i].id1 >= 0) {            
            score = -1;
            break;
         } else {
            if (
               /*
               (x>0 && ids[x-1][y+i] >= 0) || 
               (x<max_x-1 && ids[x+1][y+i] >= 0) ||
               (y>0 && i==0 && ids[x][y-1] >= 0) ||
               (y+l<max_y && i==l-1 && ids[x][y+l] >= 0)
               */
               (x>0 && grid[x-1][y+i].id1 >= 0) || 
               (x<max_x-1 && grid[x+1][y+i].id1 >= 0) ||
               (y>0 && i==0 && grid[x][y-1].id1 >= 0) ||
               (y+l<max_y && i==l-1 && grid[x][y+l].id1 >= 0)
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
      //console.log(score);
      for (let i=0; i<l; i++) {
         if (horizontal) {
            //testfits[x+i][y] += 50;
            grid[x+i][y].testfit += 50;
         } else {
            //testfits[x][y+i] += 50;
            grid[x][y+i].testfit += 50;
         }
      }
   }

   return score;
}


// add a new word at location x,y
function addWord(word, x, y, horizontal) {
   let id = words.length;
   let l = word.length;
   //console.log(x,y);
   //console.log(l);
   for (let i=0; i<l; i++) {
      if (horizontal) {
         //ids[x+i][y] = id;
         grid[x+i][y].id1 = id;
         //letters[x+i][y] = word.charAt(i);
         grid[x+i][y].letter = word.charAt(i);
      } else {
         //ids[x][y+i] = id;
         grid[x][y+i].id1 = id;
         //letters[x][y+i] = word.charAt(i);
         grid[x][y+i].letter = word.charAt(i);
      }
   }
   words.push(word);
   console.log('added:', word, 'total words:', words.length);
   updateGrid();
}


// ---------------------- draw functions ------------------------- //


function updateGrid() {
   background(255);
   drawGrid();
   drawLayout();
   drawTestfits();
   drawWords();
}

function drawGrid() {
   stroke(0);
   noFill();
   for (let x=0; x<=max_x; x++) {
      for (let y=0; y<=max_y; y++) {
         point(x*square_size, y*square_size);
      }
   }
}

function drawLayout() {
   stroke(0);
   noFill();
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         //if (ids[x][y] >= 0) {
         if (grid[x][y].id1 >= 0) {
            rect(x*square_size, y*square_size, square_size, square_size);
         }
      }
   }
}

function drawTestfits() {
   noStroke();
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         //let a = testfits[x][y];
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
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         //text(letters[x][y], x*square_size+square_size/2, y*square_size+square_size/2);
         text(grid[x][y].letter, x*square_size+square_size/2, y*square_size+square_size/2);
      }
   }
}