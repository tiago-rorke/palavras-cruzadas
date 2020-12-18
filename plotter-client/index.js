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


// ---------------- CLIENT <> CONTROL PANEL COMMS ------------------- //


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
      socket.emit('status', await plotter.status());
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

});
