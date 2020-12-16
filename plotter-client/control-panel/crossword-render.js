


// ---------------------- p5.js ------------------------- //

let square_size = 30;
let canvas_width = 700;
let canvas_height = 500;

// grid size
let max_x = Math.floor(canvas_width/square_size);
let max_y = Math.floor(canvas_height/square_size);

function setup() {

   let canvas = createCanvas(canvas_width, canvas_height);
   canvas.parent('canvas');

   // graphics
   strokeWeight(2);
   textAlign(CENTER, CENTER);
   smooth();
}

// ---------------------- draw functions ------------------------- //


function drawGame() {
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

// ---------------------- objects ------------------------- //

// array of word objects
let words = [];

class Word {
   constructor(word, x, y, label, horizontal, clue) {
      this.word = word;
      this.clue = clue;
      this.solved = false;
      // square number and direction in order to label the clue (ie: "14 down" or "12 across")
      this.label = label;
      this.horizontal = horizontal;
      // coordinates of first letter
      this.x = x;
      this.y = y;
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
function load(game) {
   //let game = json; JSON.parse(json);

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


// ---------------------- debug ------------------------- //

function printWordlist() {
   console.log("WORDLIST:");
   for(let i=0; i<words.length; i++) {
      console.log('[', i, ']', 'x:',words[i].x, 'y:', words[i].y, '|', words[i].label, words[i].horizontal?'across':'down',':', words[i].word, ';', words[i].clue);
   }
   console.log("LIST END.");

}