/*

REALTIME CROSSWORD-MAKING LOGIC

## 1st WORD

 - random location inside the grid and random rotation.
 *do later* - has maximum distance from center of grid, to put the word roughly in the middle somewhere

## SUBSEQUENT WORDS

 - search through all possible horizontal and vertical positions, based on word-length
   - in an array for each possible position
      - 1D array of the format [ y*width+x (horizontal pos') + (y*width+x (vertical pos') ]
      - for each position, check if any of the letters
         a) overlap with an existing letter or
         b) are adjacent to an existing letter

         if a) check if the letter is the same
            - if false, position = -1 and skip to next position
            - if true, position += 1 and keep checking remaining letters

         if b) position = -1 and skip to next position

       - after checking all positions, position with highest score wins.
         - if a tie, choose randomly from highest score positions
            - if no position has a score higher than 0, word is put in random location in whitespace

 - if all positions are -1, word is rejected.

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

let button;
let textbox;


function setup() {
   let canvas = createCanvas(canvas_width, canvas_height);
   canvas.parent('canvas');
   max_x = floor(canvas_width/square_size);
   max_y = floor(canvas_height/square_size);
   for (let x=0; x<max_x; x++) {
      ids[x] = []
      letters[x] = []
      testfits[x] = []
      for (let y=0; y<max_y; y++) {
         ids[x][y] = -1;
         letters[x][y] = ' ';
         testfits[x][y] = 0;
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
         testfits[x][y] = 0;
      }
   }

   let word = textbox.value();
   let l = word.length;
   console.log(word);

   if (words.length == 0) {
      // if this is the first word, choose a random location
      let dir = random() >= 0.5;
      addWord(word, round(random(0,max_x-l)), round(random(0,max_y-l)), dir)
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

   console.log('starting wordsearch');
   // horizontal positions
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         let score = x<=max_x-l ? testFit(word, x, y, true) : -1;
         positions[y*max_x + x] = score;
      }
   }
   let p = positions.length;
   // vertical positions
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         let score = y<=max_y-l ? testFit(word, x, y, false) : -1;
         positions[positions + y*max_x + x] = score;
      }
   }

   console.log('tested', positions.length, 'positions');
   // find the best scoring positions
   let highscore = -1;
   let best_positions = [];
   for (let i=0; i<positions.length; i++) {
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
   console.log('best position score is: ', highscore);

   if(highscore >= 0) {
      addWord(word, 0, 0, true);
   } else {
      console.log('no place found for this word, sorry');
   }


}


// see if a word fits at a particular location, and see how many letters match
function testFit(word, x, y, horizontal) {
   let l = word.length;
   let score = 0;
   let crossed_ids = [];

   for (let i=0; i<l; i++) {
      if (horizontal) {

         if (letters[x+i][y] == word.charAt(i)) {
            // if the letter matches, check to see if the word has already been crossed
            let crossed_id = ids[x+i][y];
            for (let h=0; h<crossed_ids.length; h++) {
               if (crossed_ids[h] == crossed_id) {
                  // if it has, fail the test
                  score = -1;
                  break;
               }
            }
            // otherwise, increment the score
            score++;
            // and save the id of the crossed word
            crossed_ids.push();
         } else if (ids[x+i][y] >= 0) {
            // otherwise if the square is occupied, fail the test
            score = -1;
            break;
         } else {
            // otherwise, if one the adjacent squares square are occupied also fail the test
            if (
               (y>0 && ids[x+i][y-1] >= 0) || 
               (y<max_y-1 && ids[x+i][y+1] >= 0) ||
               (x>0 && i==0 && ids[x-1][y] >= 0) ||
               (x+l<max_x && i==l-1 && ids[x+l][y] >= 0)
               ) {
               score = -1;
               break;
            }
         }

      } else {

         if (letters[x][y+i] == word.charAt(i)) {
            score ++;
         } else if (ids[x][y+i] >= 0) {
            score = -1;
            break;
         } else {
            if (
               (x>0 && ids[x-1][y+i] >= 0) || 
               (x<max_x-1 && ids[x+1][y+i] >= 0) ||
               (y>0 && i==0 && ids[x][y-1] >= 0) ||
               (y+l<max_y && i==l-1 && ids[x][y+l] >= 0)
               ) {
               score = -1;
               break;
            }
         }

      }
   }

   if (score >= 0) {
      console.log(score);
      for (let i=0; i<l; i++) {
         //let a = score>0 ? 150 : 50;
         let a = score == 0 ? 20 : 0;
         if (horizontal) {
            testfits[x+i][y] += a;
         } else {
            testfits[x][y+i] += a;
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
         ids[x+i][y] = id;
         letters[x+i][y] = word.charAt(i);
      } else {
         ids[x][y+i] = id;
         letters[x][y+i] = word.charAt(i);
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
         if (ids[x][y] >= 0) {
            rect(x*square_size, y*square_size, square_size, square_size);
         }
      }
   }
}


function drawTestfits() {
   noStroke();
   for (let x=0; x<max_x; x++) {
      for (let y=0; y<max_y; y++) {
         let a = testfits[x][y];
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
         text(letters[x][y], x*square_size+square_size/2, y*square_size+square_size/2);
      }
   }
}