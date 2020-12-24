

// ---------------------- p5.js ------------------------- //

// disable the context menu to allow for right-click zoom interaction
//$('body').on('contextmenu', 'crossword_canvas', function(e){ return false; });

const crossword_p5 = (s) => {

   // square size at 0 zoom
   let square_size = 30;
   let canvas_width = 750;
   let canvas_height = 550;

   let pan_x = 0;
   let pan_y = 0;
   let zoom = 0;
   let zoom_ref = 1;
   let min_zoom = 0.1;
   let max_zoom = 5;

   s.setup = () => {
      let canvas = s.createCanvas(canvas_width, canvas_height);
      canvas.parent('crossword_canvas');

      // graphics
      s.strokeWeight(2);
      s.textAlign(s.CENTER, s.CENTER);
      s.smooth();

      // save 0 transformation position
      s.push();
      s.translate(s.width/2, s.height/2);
   }

   s.mouseDragged = () => {
      if(s.mouseX > 0 && s.mouseX < s.width &&
         s.mouseY > 0 && s.mouseY < s.height) {
         if (s.mouseButton === s.LEFT) {
            pan_x += s.mouseX - s.pmouseX;
            pan_y += s.mouseY - s.pmouseY;
         } else {
            zoom += (s.mouseY - s.pmouseY);
         }
      }
      return false;
   }

   s.mouseReleased = () => {
      s.update();
      pan_x = 0;
      pan_y = 0;
      zoom = 0;
   }

   s.resetPanZoom = () => {
      s.pop();
      zoom_ref = 1;
      s.push();
      s.translate(s.width/2, s.height/2);
      s.update();
   }
   s.keyPressed = () => {
      s.resetPanZoom();
   }

   s.update = () => {
      s.background(255);

      // transformations
      let z = 1 + 0.005* zoom;
      pzoom_ref = zoom_ref;
      zoom_ref *= z;
      if (zoom_ref > max_zoom) {
         zoom_ref = max_zoom;
         z = zoom_ref/pzoom_ref;
      }
      if (zoom_ref < min_zoom) {
         zoom_ref = min_zoom;
         z = zoom_ref/pzoom_ref;
      }
      s.scale(z);
      s.translate(pan_x, pan_y);
      s.push();

      // drawing
      s.translate(-s.width/2, -s.height/2);
      s.drawPoints();
      s.drawLayout();
      s.drawTestfits();
      s.drawWords();

      s.pop();
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

   s.drawWords = () => {
      s.noStroke();
      s.fill(0);
      s.textSize(0.8*square_size);
      for (let x=0; x<width; x++) {
         for (let y=0; y<height; y++) {
            if(grid[x][y].solved) {
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
      this.testfit = false;
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
      w.testfit = game.words[i].testfit;
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