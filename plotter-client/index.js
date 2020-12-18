"use strict";

const fs = require('fs');
const express = require('express');
const fetch = require('node-fetch');
const socketIO = require('socket.io');
const socketIO_client = require('socket.io-client');

// websockets connection to server (heroku app)
const server_url = "http://localhost:3000";
const server_socket = socketIO_client.connect(server_url);

// websockets connection to control panel
const app = express();
const cp_server = app.listen(3001, () => console.log(`Listening on 3001`));
const cp_socket = socketIO(cp_server);


//app.use(express.static('/'));
app.use("/", express.static(__dirname + '/control-panel/'));
app.use("/assets/", express.static(__dirname + '/assets/'));
app.get('/', function (req, res){
   res.sendFile(__dirname + '/control-panel/index.html');
});

const Crossword = require('./crossword');
let crossword = new Crossword(0,0);
//crossword.init();

let game_file = "./assets/game.json";

const Plotter = require('./plotter');
//let plotter = new Plotter('/dev/ttyUSB0', 115200);
let plotter = new Plotter('/dev/ttyACM0', 115200);

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
      fetch(server_url + "/game.json")
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

   // ------------------- CROSSWORD ---------------------- //

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

   // ---------------------- GBRL ----------------------- //

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

   socket.on('send', async (gcode) => {
      for (let i=0; i<gcode.length; i++) {
         await plotter.send(gcode[i]);
      }
   });

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

   socket.on('test', async () => {
      console.log('test routine');
      await plotter.beginDraw(0,0);
      await plotter.vertex(0,10);
      await plotter.vertex(10,10);
      await plotter.vertex(10,0);
      await plotter.vertex(0,0);
      await plotter.endDraw();
      console.log(plotter.draw_log);
   });

});


// ---------------------------- DRAWING ---------------------------- //


function drawChar(index, x, y, scale) {

   let line = false;

   for (let h=0; h<11; h++) {

      if(codefont[index][0][h] > -1 && !line) {
         plotter.beginDraw();
         line = true;
      }

      if(h>0 && codefont[index][0][h] < 0 && line) {
         plotter.endDraw();
         line = false;
      }

      if(codefont[index][0][h] > -1) {
         let vx = codefont[index][0][h] * scale + x;
         let vy = codefont[index][1][h] * -scale + y;
         plotter.vertex(vx, vy);
      }

      if(h==10) {
         plotter.endDraw();
         line = false;
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

void drawText(float x, float y, String text, float textSize) {
   for(int i=0; i<text.length(); i++) {
      drawChar((int)text.charAt(i)-32, x, y, textSize/5);
      x += (3*textSize/5)*1.15;
   }
}
*/