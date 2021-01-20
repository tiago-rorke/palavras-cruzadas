"use strict";

const fs = require('fs');
const express = require('express');
const fetch = require('node-fetch');
const socketIO = require('socket.io');
const socketIO_client = require('socket.io-client');

// server for control panel
const app = express();
app.use("/", express.static(__dirname + '/control-panel/'));
app.use("/data/", express.static(__dirname + '/data/'));
app.get('/', function (req, res){
   res.sendFile(__dirname + '/control-panel/plotter.html');
});

// data files
const config_file = "./data/config.json"
const game_file = "./data/game.json";
const grid_file = "./data/game_grid.json";
const drawing_file = "./data/drawing.json";
let config;

try {
   config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
} catch (err) {
   return console.log(err);
}

// websockets connection to server (heroku app)
console.log("connecting to server at", config.server_url);
const server_socket = socketIO_client.connect(config.server_url);

// websockets connection to control panel
const cp_server = app.listen(config.control_panel.port, () => console.log('control panel available at port ' + config.control_panel.port));
const cp_socket = socketIO(cp_server);

const Plotter = require('./plotter');
let plotter = new Plotter(config.plotter.port, config.plotter.baud);

const Crossword = require('./crossword');
let crossword = new Crossword(0,0);
//crossword.init();

const codefont = require('./codefont');

loadConfig();

let random_words = fs.readFileSync('./data/random_words.txt').toString().split('\n');

// standby mode random walk
let word_paths = []; // array of the start and end coordinates of each word
class Word_path {
   constructor(x1, y1, x2, y2) {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
      this.walk_count = 0;
      this.dist = -1;
   }
}

// whether or not we are in standby mode
let active = false;

// debugging hack
let drawing_from_buffer = false;


// --------------------------- STARTUP ----------------------------- //

plotter.init();
//plotter.unlock();

try {
   let game = fs.readFileSync(game_file, 'utf8');
   crossword.load(game, true);
} catch (err) {
   if (err.code === 'ENOENT') {
      console.log('no game file found, starting a new game');
      newGame(30, 20, true);
   } else {
      console.error(err);
      throw err;
   }
}

try {
   let grid = fs.readFileSync(grid_file, 'utf8');
   crossword.loadGrid(grid);
} catch (err) {
   if (err.code === 'ENOENT') {
      console.log('no grid file found, unable to restore grid data');
   } else {
      console.error(err);
      throw err;
   }
}

try {
   let drawing = fs.readFileSync(drawing_file, 'utf8');
   plotter.loadDrawing(drawing);
} catch (err) {
   if (err.code === 'ENOENT') {
      console.log('no drawing file found, unable to restore prevuous drawing');
   } else {
      console.error(err);
      throw err;
   }
}

// ping the plotter to show current position in the preview
pingLoop();

async function pingLoop() {
   while(true) {
      updatePos();
      await new Promise(resolve => setTimeout(resolve, config.plotter.ping_interval));
   }
}



// -------------------- SERVER <> CLIENT COMMS --------------------- //


server_socket.on('connect', () => {
   console.log('connected to server');

   server_socket.on("fileChanged", async () => {
      console.log("updating from server...");
      await fetch(config.server_url + "/game.json")
      .then((res) => res.json())
      .then((out) => {
         fs.writeFileSync(game_file, JSON.stringify(out,null,1));
      })
      .then(() => {
         let game = fs.readFileSync(game_file, 'utf8');
         crossword.load(game, false);
         // not sure if these should be here
         // crossword.update();
         // crossword.saveGrid(grid_file);
         drawCrossword();
         cp_socket.emit('update_crossword');
      })
      .catch((err) => {
         console.log(err);
      });
   });

   server_socket.on("newGame", async () => {
      console.log("new game on server");
      await fetch(config.server_url + "/game.json")
      .then((res) => res.json())
      .then((out) => {
         fs.writeFileSync(game_file, JSON.stringify(out,null,1));
      })
      .then( async () => {
         let game = fs.readFileSync(game_file, 'utf8');
         await crossword.load(game, true)
         console.log(crossword.game_file)
         newGame(0,0,false);
      })
      .catch((err) => {
         console.log(err);
      });
   });

   server_socket.on("endGame", async () => {
      console.log("server says game is over");
      await fetch(config.server_url + "/game.json")
      .then((res) => res.json())
      .then((out) => {
         fs.writeFileSync(game_file, JSON.stringify(out,null,1));
      })
      .then(() => {
         let game = fs.readFileSync(game_file, 'utf8');
         crossword.load(game, false);
         endGame();
      })
      .catch((err) => {
         console.log(err);
      });
   });

});


// ---------------- CLIENT <> CONTROL PANEL COMMS ------------------ //


cp_socket.on('connection', (socket) => {
   console.log('control panel connected');

   // ------- CROSSWORD ------- //

   socket.on('update_crossword', () => {
      console.log('update crossword');
      socket.emit('update_crossword');
   });

   socket.on('new_game', (w, h) => {
      newGame(w, h, true);
   });

   socket.on('end_game', (w, h) => {
      console.log('end game');
      server_socket.emit('endGame');
   });

   socket.on('reset_server', (w, h) => {
      console.log('reset game on server', w, h);
      server_socket.emit('reset', w, h);
   });

   socket.on('add_word', (word, clue) => {
      console.log('adding new word: ', word + '; ' + clue);
      let w = crossword.newWord(word,clue,'####','####');
      if(w != false) {
         console.log(w);
         crossword.save(game_file);
         crossword.update();
         drawCrossword();
         cp_socket.emit('update_crossword');
      } else {
         console.log('failed to add new word');
         cp_socket.emit('add_word_fail', word);
      }

   });

   socket.on('add_random', (n) => {
      console.log("adding " + n + " random words");
      cp_socket.emit('update_crossword');
      let c = 0;
      for(let i=0; i<n; i++) {
         let a = Math.floor(Math.random() * random_words.length);
         let word = random_words[a];
         console.log(a, word);
         let w = crossword.newWord(word,'####','####','####');
         if(w != false) {
            console.log(w);
            c++;
         } else {
            console.log('failed to add:', word);
         }
      }
      console.log('successfully added ' + c + ' of ' + n + ' words');
      crossword.save(game_file);
      crossword.update();
      drawCrossword();
      cp_socket.emit('update_crossword');
   });

   // ------- GBRL ------- //

   socket.on('get_status', async () => {
      console.log('get_status');
      let stat = await plotter.status();
      console.log(stat);
      socket.emit('status', stat);
   });

   socket.on('home', async () => {
      console.log('home');
      await plotter.home();
   });

   socket.on('unlock', async () => {
      console.log('unlock');
      await plotter.unlock();
   });

   socket.on('reset', async () => {
      console.log('reset');
      plotter.port.close();
      plotter.connect(config.plotter.port, config.plotter.baud);
   });

   socket.on('play', async () => {
      console.log('draw from buffer');
      await drawFromBuffer();
   });

   socket.on('feed_hold', async () => {
      console.log('feed_hold');
      await plotter.feedHold();
   });

   socket.on('resume', async () => {
      console.log('resume');
      await plotter.resume();
   });

   socket.on('send', async (gcode) => {
      for (let i=0; i<gcode.length; i++) {
         await plotter.send(gcode[i]);
      }
   });

   // ------- CONFIG ------- //

   socket.on('load_config', () => {
      console.log("load_config");
      loadConfig();
      socket.emit('load_config',  {
         travel_speed:  plotter.travel_speed,
         standby_speed: plotter.standby_speed,
         draw_speed:    plotter.draw_speed,
         up_pos:        plotter.up_pos,
         down_pos:      plotter.down_pos,
         up_delay:      plotter.up_delay,
         down_delay:    plotter.down_delay,
         draw_x:             config.drawing.x,
         draw_y:             config.drawing.y,
         square_size:        config.drawing.square_size,
         text_height:        config.drawing.text_height,
         letter_x:           config.drawing.letter_x,
         letter_y:           config.drawing.letter_y,
         label_height:       config.drawing.label_height,
         label_x:            config.drawing.label_x,
         label_y:            config.drawing.label_y,
         label_spacing:      config.drawing.label_spacing,
         label_horizontal:   config.drawing.label_horizontal,
         footer_x:           config.drawing.footer_x,
         footer_y:           config.drawing.footer_y,
         footer_text_height: config.drawing.footer_text_height,
         text_line_spacing:  config.drawing.text_line_spacing,
         horizontal_first:   config.drawing.horizontal_first,
         text_spacing:       config.drawing.text_spacing,
         draw_unsolved:      config.drawing.draw_unsolved,
         autoplay:           config.drawing.autoplay,
         standby_x:          config.drawing.standby_x,
         standby_y:          config.drawing.standby_y,
         page_width:         config.page.width,
         page_height:        config.page.height,
         page_scale:         config.page.scale
      });
   });

   socket.on('save_config', (cp_config) => {
      console.log("save_config");
      config.plotter.travel_speed  = cp_config.travel_speed;
      config.plotter.standby_speed = cp_config.standby_speed;
      config.plotter.draw_speed    = cp_config.draw_speed;
      config.plotter.up_pos        = cp_config.up_pos;
      config.plotter.down_pos      = cp_config.down_pos;
      config.plotter.up_delay      = cp_config.up_delay;
      config.plotter.down_delay    = cp_config.down_delay;
      config.drawing.x                  = cp_config.draw_x;
      config.drawing.y                  = cp_config.draw_y;
      config.drawing.square_size        = cp_config.square_size;
      config.drawing.text_height        = cp_config.text_height;
      config.drawing.letter_x           = cp_config.letter_x;
      config.drawing.letter_y           = cp_config.letter_y;
      config.drawing.label_height       = cp_config.label_height;
      config.drawing.label_x            = cp_config.label_x;
      config.drawing.label_y            = cp_config.label_y;
      config.drawing.label_spacing      = cp_config.label_spacing;
      config.drawing.label_horizontal   = cp_config.label_horizontal;
      config.drawing.horizontal_first   = cp_config.horizontal_first;
      config.drawing.footer_x           = cp_config.footer_x;
      config.drawing.footer_y           = cp_config.footer_y;
      config.drawing.footer_text_height = cp_config.footer_text_height;
      config.drawing.text_line_spacing  = cp_config.text_line_spacing;
      config.drawing.text_spacing       = cp_config.text_spacing;
      config.drawing.draw_unsolved      = cp_config.draw_unsolved;
      config.drawing.autoplay           = cp_config.autoplay;
      config.drawing.standby_x          = cp_config.standby_x;
      config.drawing.standby_y          = cp_config.standby_y;
      config.page.width    = cp_config.page_width;
      config.page.height   = cp_config.page_height;
      config.page.scale    = cp_config.page_scale;

      plotter.travel_speed  = config.plotter.travel_speed;
      plotter.standby_speed = config.plotter.standby_speed;
      plotter.draw_speed    = config.plotter.draw_speed;
      plotter.up_pos        = config.plotter.up_pos;
      plotter.down_pos      = config.plotter.down_pos;
      plotter.up_delay      = config.plotter.up_delay;
      plotter.down_delay    = config.plotter.down_delay;

      saveConfig(config_file);
   });

   // ------- DRAWING ------- //

   socket.on('clear_drawing', () => {
      clearDrawing();
   });
   socket.on('clear_draw_buffer', () => {
      clearDrawBuffer();
   });
   socket.on('clear_draw_log', () => {
      clearDrawLog();
   });

   socket.on('update_drawing', () => {
      updatePlotterRender();
   });

   socket.on('draw_text', async (text) => {
      let buf = plotter.draw_buffer.length;
      drawText(
         text,
         config.drawing.x,
         config.drawing.y,
         config.drawing.text_height,
         config.drawing.text_spacing
         );
      updatePlotterRender();
      buf = plotter.draw_buffer.length - buf;
      console.log(buf,'lines drawn to buffer');
   });

   socket.on('draw_crossword', () => {
      drawCrossword();
   });

   socket.on('undraw_crossword', () => {
      console.log("undrawing crossword");
      crossword.undrawGridlines();
      crossword.undrawGrid();
   });

   socket.on('draw_footer_labels', () => {
      console.log("drawing footer labels");
      drawFooterLabels();
      updatePlotterRender();
   });
   socket.on('draw_start_time', () => {
      console.log("drawing start time");
      drawStartTime();
      updatePlotterRender();
   });
   socket.on('draw_end_time', () => {
      console.log("drawing end time");
      drawEndTime();
      updatePlotterRender();
   });


});

// ------------------------------ CONFIG ------------------------------ //

function saveConfig(file) {
   fs.writeFile(
      file,
      JSON.stringify(config, null, 1),
      function (err) {
         if (err) return console.log(err);
      }
   );
   return true;
}

function loadConfig() {

   try {
      config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
      //console.log(config);
   } catch (err) {
      return console.log(err);
   }

   plotter.travel_speed  = config.plotter.travel_speed;
   plotter.standby_speed = config.plotter.standby_speed;
   plotter.draw_speed    = config.plotter.draw_speed;
   plotter.up_pos        = config.plotter.up_pos;
   plotter.down_pos      = config.plotter.down_pos;
   plotter.up_delay      = config.plotter.up_delay;
   plotter.down_delay    = config.plotter.down_delay;
}

// --------------------------- CROSSWORD --------------------------- //

function newGame(w, h, local_reset) {
   console.log('new game');
   if(local_reset) {
      console.log('local reset, grid size:' +  w + ' x ' + h);
      crossword = new Crossword(w,h);
      crossword.save(game_file);
   }
   // not sure if this should be here
   // crossword.update();
   // crossword.saveGrid(grid_file);
   clearDrawing();
   annotateGridBounds();
   annotateFooterBounds();
   drawFooterLabels();
   drawStartTime();
   cp_socket.emit('update_crossword');
}

function endGame() {
   drawEndTime();
   updatePlotterRender();
}


// ------------------------------ GUI ------------------------------ //


function updatePlotterRender(refresh_annotations = true) {
   if(refresh_annotations) {
      clearAnnotations();
      annotateGridBounds();
      annotateFooterBounds();
   }
   cp_socket.emit('update_drawing',
      plotter.draw_buffer,
      plotter.draw_log,
      plotter.draw_annotations,
      plotter.current_pos,
      plotter.work_offset
      );
}

async function drawFromBuffer() {

   if(!drawing_from_buffer) {
      drawing_from_buffer = true;
      active = true;
      console.log("drawing from buffer");
      await plotter.endPlot(); // just in case
      let i = 0;
      let n = plotter.draw_buffer.length;

      while(plotter.draw_buffer.length > 0) {

         console.log("drawing line", i, "of", n);
         let p = plotter.draw_buffer.shift();
         plotter.draw_log.push(p);

         if(p.drawing && !plotter.plotting) {
            await plotter.beginPlot(p.x, p.y);
            updatePlotterRender();
         } else if(!p.drawing && plotter.plotting) {
            await plotter.vertexPlot(p.x, p.y);
            updatePlotterRender();
            await plotter.endPlot();
         } else {
            await plotter.vertexPlot(p.x, p.y);
            updatePlotterRender();
         }

         i++;
         plotter.saveDrawing(drawing_file);
      }
      drawing_from_buffer = false;
      active = false;
      standby();

   } else {
      "already drawing from buffer...";
   }

   return new Promise((resolve, reject) => {
      resolve(true);
   });
}


// ---------------------------- DRAWING ---------------------------- //


async function updatePos() {
   let status = await plotter.status();
   plotter.current_pos = status.machinePosition;
   if(status.workCoordinateOffset !== undefined) {
      plotter.work_offset = status.workCoordinateOffset;
   }
   updatePlotterRender(false);
   //console.log(status);
   //console.log(status.machinePosition.x, status.machinePosition.y);
}

function clearDrawing() {
   console.log("clearing drawing");
   plotter.draw_buffer = [];
   plotter.draw_log = [];
   plotter.draw_annotations = [];
   updatePlotterRender();
   plotter.saveDrawing(drawing_file);
}

function clearDrawBuffer() {
   console.log("clearing draw buffer");
   plotter.draw_buffer = [];
   updatePlotterRender();
   plotter.saveDrawing(drawing_file);
}

function clearDrawLog() {
   console.log("clearing draw buffer");
   plotter.draw_log = [];
   updatePlotterRender();
   plotter.saveDrawing(drawing_file);
}

function clearAnnotations() {
   plotter.draw_annotations = [];
}

async function drawCrossword() {
   let buf = plotter.draw_buffer.length;
   // debugging only
   // crossword.undrawGridlines();
   drawGridlines(
      config.drawing.x,
      config.drawing.y,
      config.drawing.square_size,
      config.drawing.horizontal_first
      );
   drawLabels(
      config.drawing.x,
      config.drawing.y,
      config.drawing.square_size,
      config.drawing.label_height,
      config.drawing.label_x,
      config.drawing.label_y,
      config.drawing.label_spacing,
      config.drawing.label_horizontal
      );
   drawLetters(
      config.drawing.x,
      config.drawing.y,
      config.drawing.square_size,
      config.drawing.text_height,
      config.drawing.letter_x,
      config.drawing.letter_y,
      config.drawing.draw_unsolved
      );
   updatePlotterRender();
   buf = plotter.draw_buffer.length - buf;
   console.log(buf, 'lines drawn to buffer');
   console.log("saving grid...");
   crossword.saveGrid(grid_file);
   console.log("grid saved.");
   console.log("saving draw buffers...");
   plotter.saveDrawing(drawing_file);
   console.log("draw buffers saved.");
   if(config.drawing.autoplay && plotter.draw_buffer.length > 0) {
      await drawFromBuffer();
   }

   return new Promise((resolve, reject) => {
      resolve(true);
   });
}

function footerWidth() {
   return config.drawing.footer_label_start.length * charWidth(config.drawing.footer_text_height);
}


async function drawFooterLabels() {

   let x = config.drawing.x + config.drawing.footer_x;
   let y = config.drawing.y + config.drawing.footer_y;
   let l = config.drawing.text_line_spacing + config.drawing.footer_text_height;
   y -= config.drawing.footer_text_height;
   drawText(config.drawing.footer_label_start, x, y, config.drawing.footer_text_height, config.drawing.text_spacing);
   y -= l;
   drawText(config.drawing.footer_label_end, x, y, config.drawing.footer_text_height, config.drawing.text_spacing);

   // upcoming feature! draw player count
   // y -= l;
   //drawText(config.drawing.footer_label_player_count, x, y, config.drawing.footer_text_height, config.drawing.text_spacing);
}

function annotateFooterBounds() {

   let x1 = config.drawing.x + config.drawing.footer_x;
   let y1 = config.drawing.y + config.drawing.footer_y;
   let y2 = y1 - (2 * config.drawing.text_line_spacing) - (3 * config.drawing.footer_text_height);
   let x2 = x1 + footerWidth();

   plotter.beginAnnotate();
   plotter.vertexAnnotate(x1,y1);
   plotter.vertexAnnotate(x2,y1);
   plotter.vertexAnnotate(x2,y2);
   plotter.vertexAnnotate(x1,y2);
   plotter.vertexAnnotate(x1,y1);
   plotter.endAnnotate();
}


async function drawStartTime() {

   let timestamp = crossword.start_time.substring(0, 16);
   drawText(
      timestamp,
      config.drawing.x + config.drawing.footer_x + footerWidth(),
      config.drawing.y + config.drawing.footer_y - config.drawing.footer_text_height,
      config.drawing.footer_text_height,
      config.drawing.text_spacing
      );

}

async function drawEndTime() {

   let timestamp = crossword.end_time.substring(0, 16);
   drawText(
      timestamp,
      config.drawing.x + config.drawing.footer_x + footerWidth(),
      config.drawing.y + config.drawing.footer_y - (2*config.drawing.footer_text_height) - config.drawing.text_line_spacing,
      config.drawing.footer_text_height,
      config.drawing.text_spacing
      );

}

async function drawPlayerCount() {


}

function drawChar(char, x, y, scale) {

   let index = char.charCodeAt(0) - 32;
   let line = false;

   for (let h=0; h<11; h++) {

      if(codefont.font[index][0][h] > -1 && !line) {
         plotter.beginDraw();
         line = true;
      }

      if(h>0 && codefont.font[index][0][h] < 0 && line) {
         plotter.endDraw();
         line = false;
      }

      if(codefont.font[index][0][h] > -1) {
         let vx = codefont.font[index][0][h] * scale + x;
         let vy = codefont.font[index][1][h] * scale + y;
         plotter.vertex(vx, vy);
      }

      if(h==10) {
         plotter.endDraw();
         line = false;
      }
   }
}

function charWidth(text_height) {
   return (text_height/2)*(1 + config.drawing.text_spacing);
}

function drawText(text, x, y, text_height, spacing) {
   for(let i=0; i<text.length; i++) {
      drawChar(text.charAt(i), x, y, text_height/4);
      x += charWidth(text_height);
   }
}

function drawLetters(ox, oy, square_size, text_height, letter_x, letter_y, draw_unsolved) {

   oy += crossword.height * square_size;

   for (let y=0; y<crossword.height; y++) {
      //process.stdout.write('|');
      for (let x=0; x<crossword.width; x++) {
         let a = crossword.grid[x][y].letter;
         if(a != ' ') {
            if((crossword.grid[x][y].solved && crossword.grid[x][y].letter_drawing > 0) ||
               (draw_unsolved && crossword.grid[x][y].letter_drawing != 0)) {
               let cx = ox + x*square_size + square_size/2 + letter_x - text_height/4;
               let cy = oy + -(y+1)*square_size + square_size/2 + letter_y - text_height/2;
               drawChar(a, cx, cy, text_height/4);
               //process.stdout.write(a);
               crossword.grid[x][y].letter_drawing = 0;
            } else {
               //process.stdout.write('.');
            }
         } else {
            //process.stdout.write('.');
         }
      }
      //process.stdout.write('|' + '\n');
   }
}

function drawLabels(ox, oy, square_size, label_height, label_x, label_y, label_spacing, label_horizontal) {

   oy += crossword.height * square_size;

   for (let y=0; y<crossword.height; y++) {
      //process.stdout.write('|');
      for (let x=0; x<crossword.width; x++) {
         if(crossword.grid[x][y].label_drawing > 0) {
            let n = crossword.grid[x][y].label;
            n = String(n);
            let cx = ox + x*square_size + label_x;
            let cy = oy + -y*square_size  - label_y - label_height;
            for (let c=0; c<n.length; c++) {
               if(label_horizontal && c>0) {
                  cx +=  (3*label_height/4 * (1 + label_spacing));
               } else if (c>0) {
                  cy -=  (label_height * (1 + label_spacing));
               }
               drawChar(n.charAt(c), cx, cy, label_height/4)
            }
            //process.stdout.write(String(n));
            crossword.grid[x][y].label_drawing = 0;
         } else {
            //process.stdout.write('.');
         }
      }
      //process.stdout.write('|' + '\n');
   }
}

function drawGridlines(x, y, square_size, horizontal_first) {

   y += crossword.height * square_size;

   if(horizontal_first) {
      drawGridlinesH(x, y, square_size);
      drawGridlinesV(x, y, square_size);
   } else {
      drawGridlinesV(x, y, square_size);
      drawGridlinesH(x, y, square_size);
   }

}

function drawGridlinesH(px, py, s) {

   //console.log('hrz ' + crossword.gridlines_h.length);
   //console.log('vrt ' + crossword.gridlines_v.length);

   for (let y=0; y<crossword.height+1; y++) {
      //process.stdout.write('|');
      for (let x=0; x<crossword.width; x++) {

         //console.log(crossword.gridlines_h[x][y]);
         if(crossword.gridlines_h[x][y] > 0) {

            //process.stdout.write('o');
            // if starting a line
            if(x == 0 || (x > 0 && crossword.gridlines_h[x-1][y] < 1)) {
               plotter.beginDraw();
               let vx = x*s + px;
               let vy = -y*s + py;
               plotter.vertex(vx, vy);
            }

            // if ending a line
            if(x == crossword.width-1 || (x < crossword.width-1 && crossword.gridlines_h[x+1][y] < 1)) {
               let vx = (x+1)*s + px;
               let vy = -y*s + py;
               plotter.vertex(vx, vy);
               plotter.endDraw();
               //process.stdout.write('\'');
            }

            crossword.gridlines_h[x][y] = 0;
         } else {
            //process.stdout.write('.');
         }
      }
      //process.stdout.write('|' + plotter.draw_buffer.length + '\n');
   }
}

function drawGridlinesV(px, py, s) {

   for (let x=0; x<crossword.width+1; x++) {
      for (let y=0; y<crossword.height; y++) {
         if(crossword.gridlines_v[x][y] > 0) {

            // if starting a line
            if(y == 0 || (y > 0 && crossword.gridlines_v[x][y-1] < 1)) {
               plotter.beginDraw();
               let vx = x*s + px;
               let vy = -y*s + py;
               plotter.vertex(vx, vy);
            }

            // if ending a line
            if(y == crossword.height-1 || (y < crossword.height-1 && crossword.gridlines_v[x][y+1] < 1)) {
               let vx = x*s + px;
               let vy = -(y+1)*s + py;
               plotter.vertex(vx, vy);
               plotter.endDraw();
            }

            crossword.gridlines_v[x][y] = 0;
         }
      }
   }
}

function annotateGridBounds(px, py, s) {

   let x1 = config.drawing.x;
   let y1 = config.drawing.y;
   let x2 = x1 + crossword.width * config.drawing.square_size;
   let y2 = y1 + crossword.height * config.drawing.square_size;

   plotter.beginAnnotate();
   plotter.vertexAnnotate(x1,y1);
   plotter.vertexAnnotate(x2,y1);
   plotter.vertexAnnotate(x2,y2);
   plotter.vertexAnnotate(x1,y2);
   plotter.vertexAnnotate(x1,y1);
   plotter.endAnnotate();
}


// move pen outside the drawing somehwere
async function standby() {
   console.log("starting random walk...");
   randomWalkUpdate();
   while(!active) {
      await randomWalk();
   }

   /*
   console.log("moving to standby.");
   await plotter.endPlot(); // just in case
   let x = config.drawing.x; // - 20;
   let y = config.drawing.y; // + Math.random() * crossword.height * config.drawing.square_size;
   await plotter.vertexPlot(x,y);
   */
}


// rebuild word_paths[] based on crossword.words[]
function randomWalkUpdate() {
   word_paths = [];
   for (let i=0; i<crossword.words.length; i++) {
      let w = crossword.words[i];
      let x2 = w.horizontal ? w.x + w.word.length : w.x;
      let y2 = w.horizontal ? w.y : w.y + w.word.length;
      let wp = new Word_path(w.x,w.y, x2, y2);
      word_paths.push(wp);
   }
}

async function randomWalk() {
   randomWalkSort(getPosInGrid(true));

   let max_walks = 0;
   for (let i=0; i<word_paths.length; i++) {
      max_walks = word_paths[i].walk_count > max_walks ? word_paths[i].walk_count : max_walks;
   }

   let w;
   for (let i=0; i<word_paths.length; i++) {
      if(word_paths[i].walk_count < max_walks) {
         w = word_paths[i];
         word_paths[i].walk_count++;
         break;
      }
   }
   if(w == undefined) {
      w = word_paths[0];
      word_paths[0].walk_count++;
   }

   let x1 = config.drawing.x + w.x1 * config.drawing.square_size;
   let y1 = config.drawing.y + (crossword.height - w.y1) * config.drawing.square_size;
   let x2 = config.drawing.x + w.x2 * config.drawing.square_size;
   let y2 = config.drawing.y + (crossword.height - w.y2) * config.drawing.square_size;

   x1 += config.drawing.standby_x;
   y1 += config.drawing.standby_y;
   x2 += config.drawing.standby_x;
   y2 += config.drawing.standby_y;

   await plotter.endPlot(); // just in case
   await plotter.vertexPlot(x1,y1,true);
   await plotter.vertexPlot(x2,y2,true);

   // how to see if the plotter has finished walking the current word?
   // for some reason is always in idle state instead of run, otherwise could have used state for this
   // small hack to see when it has reached its destination
   let d = 9999;
   while (d > 0.1) {
      let p = getPosInGrid(true);
      d = dist(p.x, p.y, w.x2, w.y2);
      // wait for the ping interval
      await new Promise(resolve => setTimeout(resolve, config.plotter.ping_interval));
   }
}

// sort word_paths[] based on distance to the current position x,y of the plotter
function randomWalkSort(current_pos) {

   // calculate the distance to every path
   for (let i=0; i<word_paths.length; i++) {
      let d1 = dist(current_pos.x, current_pos.y, word_paths[i].x1, word_paths[i].y1);
      let d2 = dist(current_pos.x, current_pos.y, word_paths[i].x2, word_paths[i].y2);
      if(d1 < d2) {
         word_paths[i].dist = d1;
      } else {
         word_paths[i].dist = d2;
         // flip the path direction if x2,y2 is closer
         let x = word_paths[i].x1;
         let y = word_paths[i].y1;
         word_paths[i].x1 = word_paths[i].x2;
         word_paths[i].y1 = word_paths[i].y2;
         word_paths[i].x2 = x;
         word_paths[i].y2 = y;
      }
   }
   // sort the paths by distance
   let buffer = [];
   for (let i=0; i<word_paths.length; i++) {
      let p = word_paths[i];
      let h = 0;
      while (h<buffer.length) {
         if(buffer[h].dist > p.dist) {
            buffer.splice(h,0,p);
            break;
         }
         h++;
      }
      if(buffer.length == 0 || h >= buffer.length) {
         buffer.push(p);
      }
   }
   word_paths = buffer;
}

// get the current position of the plotter inside the game grid based on grbl x,y position
function getPosInGrid(standby_offset = false) {

   // position relative to work offset
   let x = plotter.current_pos.x - plotter.work_offset.x;
   let y = plotter.current_pos.y - plotter.work_offset.y;

   // subtract standby offset if in standby mode
   if(standby_offset) {
      x -= config.drawing.standby_x;
      y -= config.drawing.standby_y;
   }

   // relative to grid position
   x -= config.drawing.x;
   y -= config.drawing.y;

   // scaled to grid square size;
   x /= config.drawing.square_size;
   y /= config.drawing.square_size;

   // constrain to grid
   x = x > crossword.width ? crossword.width : x;
   x = x < 0 ? 0 : x;
   y = y > crossword.width ? crossword.width : y;
   y = y < 0 ? 0 : y;

   // flip y axis
   y = crossword.height - y;

   let pos = {x: x, y: y};
   return pos;
}


function dist(x1,y1,x2,y2) {
   let d = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
   return d;
}



/*
function drawAlphabet(float x, float y, float fontScale) {
   for (int i=0; i<94; i++) {
      drawChar(i, x, y, fontScale);
      x += fontScale * 3;
   }
}

void drawScaledAlphabets(float x, float y) {
   drawAlphabet(x, y+30, 2);
   drawAlphabet(x, y+72, 1.5);
   drawAlphabet(x, y+105, 1);
   drawAlphabet(x, y+130, 0.75);
   drawAlphabet(x, y+152, 0.6);
   drawAlphabet(x, y+170, 0.45);
}

*/