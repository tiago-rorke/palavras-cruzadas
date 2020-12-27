

// ---------------------- p5.js ------------------------- //

// disable the context menu to allow for right-click zoom interaction
//$('body').on('contextmenu', 'crossword_canvas', function(e){ return false; });

const crossword_p5 = (s) => {

   // square size at 0 zoom
   let square_size;

   let draw_unsolved = false;

   s.setup = () => {
      s.initCanvas(30, 100,100);
   }

   s.initCanvas = (sq, w, h) => {
      let canvas = s.createCanvas(w * sq, h * sq);
      canvas.parent('crossword_canvas');
      canvas.style('border', '20px solid white');

      square_size = sq;

      // graphics
      s.strokeWeight(2);
      s.textAlign(s.CENTER, s.CENTER);
      s.smooth();

   }


   // ---------------------- render ------------------------- //

   s.update = () => {
      s.background(255);
      s.drawPoints();
      s.drawLayout();
      //s.drawTestfits();
      s.drawWords();
   }

   s.toggleUnsolved = () => {
      draw_unsolved = !draw_unsolved;
      return(draw_unsolved);
   }

   s.drawPoints = () => {
      s.stroke(0);
      s.noFill();
      for (let x=0; x<=width; x++) {
         for (let y=0; y<=height; y++) {
            s.point(x*square_size, y*square_size);
         }
      }
   }

   s.drawLayout = () => {
      s.textSize(0.4*square_size);
      for (let x=0; x<width; x++) {
         for (let y=0; y<height; y++) {
            if (grid[x][y].letter != ' ') {
               s.stroke(0);
               s.noFill();
               s.rect(x*square_size, y*square_size, square_size, square_size);
            }
            if (grid[x][y].label > 0) {
               s.noStroke();
               s.fill(0);
               s.text(grid[x][y].label, x*square_size+square_size/4, y*square_size+square_size/4);
            }
         }
      }
   }

   /*
   // this doesn't work, because testfit is in the grid, not the word
   s.drawTestfits = () => {
      s.noStroke();
      for (let x=0; x<width; x++) {
         for (let y=0; y<height; y++) {
            let a = grid[x][y].testfit;
            if (a > 0) {
               s.fill(255,0,0,a);
               s.rect(x*square_size, y*square_size, square_size, square_size);
            }
         }
      }
   }
   */

   s.drawWords = () => {
      s.noStroke();
      s.textSize(0.8*square_size);
      for (let x=0; x<width; x++) {
         for (let y=0; y<height; y++) {
            if(!grid[x][y].solved) {
               s.fill(255,0,255);
            } else {
               s.fill(0);
            }
            if(grid[x][y].solved || draw_unsolved) {
               s.text(grid[x][y].letter, x*square_size+2*square_size/3, y*square_size+2*square_size/3);
            }

         }
      }
   }

}

let crossword_render = new p5(crossword_p5);

// ---------------------- objects ------------------------- //

// array of word objects
let words = [];

class Word {
   constructor(word, x, y, label, horizontal, clue) {
      this.word = word;
      this.clue = clue;
      this.solved = false;
      //this.testfit = false;
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
      //w.testfit = game.words[i].testfit; // testfit is in the grid, not the word
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