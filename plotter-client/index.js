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
   res.sendFile(__dirname + '/control-panel/index.html');
});

// data files
const config_file = "./data/config.json"
const game_file = "./data/game.json";
let config;
try {
   config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
} catch (err) {
   return console.log(err);
}

// websockets connection to server (heroku app)
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


// ----------------------------------------------------------------- //

try {
   let game = fs.readFileSync(game_file, 'utf8');
   crossword.load(game);
   // crossword.printWords(false);
   // crossword.printLabels();
   // crossword.printWordlist();
   // plotter.home();
   // crossword.newWord("help","i'm trapped in a crossword");
   // crossword.save(game_file);
   // cp_socket.emit('update');
   //process.stdout.write('\n');
} catch (err) {
   console.log(err);
}



// -------------------- SERVER <> CLIENT COMMS --------------------- //


server_socket.on('connect', () => {
   console.log('connected to server');

   server_socket.on("fileChanged", () => {
      fetch(config.server_url + "/game.json")
      .then((res) => res.json())
      .then((out) => {
         fs.writeFileSync(game_file, JSON.stringify(out,null,1));
      })
      .catch((err) => {
         console.log(err);
      });
      crossword.load(game_file);
   });
});


// ---------------- CLIENT <> CONTROL PANEL COMMS ------------------ //


cp_socket.on('connection', (socket) => {
   console.log('control panel connected');

   // ------- CROSSWORD ------- //

   socket.on('update', () => {
      console.log('update');
      socket.emit('update');
   });

   socket.on('new_word', (word, clue) => {
      console.log('adding new word: ', word + '; ' + clue)
      let w = crossword.newWord(word,clue)
      if(w != false) {
         console.log(w);
         crossword.save(game_file);
         cp_socket.emit('update');
      } else {
         console.log('failed to add new word');
         cp_socket.emit('new_word_fail');
      }

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
      await draw_from_buffer();
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

   // ------- DRAWING ------- //

   socket.on('set_config', (config) => {
      plotter.travel_speed = config.travel_speed;
      plotter.draw_speed   = config.draw_speed;
      plotter.up_pos       = config.up_pos;
      plotter.down_pos     = config.down_pos;
      plotter.up_delay     = config.up_delay;
      plotter.down_delay   = config.down_delay;

      /*
      console.log("travel_speed:", plotter.travel_speed);
      console.log("draw_speed:", plotter.draw_speed);
      console.log("up_pos:", plotter.up_pos);
      console.log("down_pos:", plotter.down_pos);
      console.log("up_delay:", plotter.up_delay);
      console.log("down_delay:", plotter.down_delay);
      */
   });

   socket.on('get_config', () => {
      console.log("get_config");
      socket.emit('get_config', {
         travel_speed: plotter.travel_speed,
         draw_speed:   plotter.draw_speed,
         up_pos:       plotter.up_pos,
         down_pos:     plotter.down_pos,
         up_delay:     plotter.up_delay,
         down_delay:   plotter.down_delay
      });
   });

   socket.on('clear', () => {
      console.log("clear buffer");
      plotter.draw_buffer = [];
      plotter.draw_log = [];
      update_plotter_render();
   });
   socket.on('draw', async (text, text_height, text_spacing) => {
      let x = 20;
      let y = 20;
      console.log('draw to buffer');
      /*
      plotter.beginDraw();
      plotter.vertex(10,10);
      plotter.vertex(10,30);
      plotter.vertex(30,30);
      plotter.vertex(30,10);
      plotter.vertex(10,10);
      plotter.endDraw();
      plotter.beginDraw();
      plotter.vertex(40,10);
      plotter.vertex(40,30);
      plotter.vertex(60,30);
      plotter.vertex(60,10);
      plotter.vertex(40,10);
      plotter.endDraw();
      */
      //drawChar(char, x, y, text_height);
      drawText(text, x, y, text_height, text_spacing);
      //draw_gridlines(x, y, scale, horizontal_first)

      //drawChar('H', 100, 100, 10);
      //drawText('HELLO MY NAME IS MIMI', 20, 20, 5, 0.15);
      //draw_gridlines(20, 20, text_height, true);

      update_plotter_render();
      //console.log(plotter.draw_log);
   });

});


// ------------------------------ GUI ------------------------------ //


function update_plotter_render() {
   cp_socket.emit('update_drawing', plotter.draw_buffer, plotter.draw_log);
}

async function draw_from_buffer() {

   while(plotter.draw_buffer.length > 0) {

      let p = plotter.draw_buffer.shift();
      plotter.draw_log.push(p);

      if(p.drawing && !plotter.plotting) {
         await plotter.beginPlot(p.x, p.y);
         update_plotter_render();
      } else if(!p.drawing && plotter.plotting) {
         await plotter.vertexPlot(p.x, p.y);
         update_plotter_render();
         await plotter.endPlot();
      } else {
         await plotter.vertexPlot(p.x, p.y);
         update_plotter_render();
      }
   }
}


// ---------------------------- DRAWING ---------------------------- //


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

function drawText(text, x, y, scale, spacing) {
   for(let i=0; i<text.length; i++) {
      drawChar(text.charAt(i), x, y, scale);
      x += (3*scale)*(1 + Number(spacing));
   }
}

function drawWord(w, scale, text_height) {
   for(let i=0; i<w.word.length; i++) {
      // x = ? w.x ...
      // y = ? w.y ...
      drawChar(w.word.charAt(i), x, y, scale);
   }
}

function draw_gridlines(x, y, scale, horizontal_first) {
   if(horizontal_first) {
      draw_gridlines_h(x, y, scale);
      draw_gridlines_v(x, y, scale);
   } else {
      draw_gridlines_v(x, y, scale);
      draw_gridlines_h(x, y, scale);
   }

}

function draw_gridlines_h(px, py, s) {

   for (let x=0; x<crossword.width+1; x++) {
      for (let y=0; y<crossword.height; y++) {
         if(crossword.gridlines_h[x][y] > 0) {

            // if starting a line
            if(x == 0 || (x > 0 && crossword.gridlines_h[x-1][y] < 1)) {
               plotter.beginDraw();
               let vx = x*s + px;
               let vy = y*s + py;
               plotter.vertex(vx, vy);
            }

            // if ending a line
            if(x == crossword.width || (x < crossword.width && crossword.gridlines_h[x+1][y] < 1)) {
               let vx = (x+1)*s + px;
               let vy = y*s + py;
               plotter.vertex(vx, vy);
               plotter.endDraw();
            }

            crossword.gridlines_h[x][y] = 0;
         }
      }
   }
}

function draw_gridlines_v(px, py, s) {

   for (let x=0; x<crossword.width; x++) {
      for (let y=0; y<crossword.height+1; y++) {
         if(crossword.gridlines_v[x][y] > 0) {

            // if starting a line
            if(y == 0 || (y > 0 && crossword.gridlines_v[x][y-1] < 1)) {
               plotter.beginDraw();
               let vx = x*s + px;
               let vy = y*s + py;
               plotter.vertex(vx, vy);
            }

            // if ending a line
            if(x == crossword.width || (x < crossword.width && crossword.gridlines_v[x][y+1] < 1)) {
               let vx = x*s + px;
               let vy = (y+1)*s + py;
               plotter.vertex(vx, vy);
               plotter.endDraw();
            }

            crossword.gridlines_v[x][y] = 0;
         }
      }
   }
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