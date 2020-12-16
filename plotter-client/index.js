
const fs = require('fs');
const express = require('express');
const socketIO = require('socket.io');

const SerialPort = require('serialport')
const { GrblStream } = require('grbl-stream')

//const port = new SerialPort('/dev/ttyUSB0', { baudRate: 115200})
//const grbl = new GrblStream()

const app = express();
const cp_server = app.listen(3001, () => console.log(`Listening on 3001`));
const cp_socket = socketIO(cp_server);
//const server_socket = socketIO(<heroku server>);

//app.use(express.static('/'));
app.use("/", express.static(__dirname + '/control-panel/'));
app.use("/assets/", express.static(__dirname + '/assets/'));
app.get('/', function (req, res){
   res.sendFile(__dirname + '/control-panel/index.html');
});

const Crossword = require('./crossword');

crossword = new Crossword(3,3);
//crossword.init();

let game_file = "./assets/game.json";

// grbl.pipe(port).pipe(grbl)
//    .on('command', cmd => console.log('>', cmd))
//    .on('message', msg => console.log('<', msg))

cp_socket.on('connection', (socket) => {
   console.log('control panel connected');

   socket.on('get_status', async () => {
      console.log('get_status');
      let status = await grbl.status();
      socket.emit('status', status);
   });

   socket.on('unlock', async () => {
      console.log('unlock');
      await grbl.killAlarmLock();
   });

   socket.on('home', async () => {
      console.log('home');
      await grbl.runHomingCycle();
   });

   socket.on('update', () => {
      console.log('update');
      socket.emit('update');
   });

   socket.on('new_word', (word, clue) => {
      console.log('adding new word: ', word + '; ' + clue)
      if(crossword.newWord(word,clue) != false) {
         console.log('failed to add new word');
         crossword.save(game_file);
         cp_socket.emit('update');
      } else {
         console.log('failed to add new word');
         cp_socket.emit('new_word_fail');
      }

   });

});


try {
   let game = fs.readFileSync(game_file, 'utf8');
   crossword.load(game);
   crossword.printWords(false);
   crossword.printLabels();
   crossword.printWordlist();
   // crossword.newWord("help","i'm trapped in a crossword");
   // crossword.save(game_file);
   // cp_socket.emit('update');
   //process.stdout.write('\n');
} catch (err) {
   console.log(err);
}


// grbl.command('?');
// grbl.command('$$');

/*
console.log('status', await grbl.status())
console.log('help', await grbl.help())
console.log('settings', await grbl.settings())

await grbl.runHomingCycle()
await grbl.killAlarmLock()
await grbl.metricCoordinates()
await grbl.incrementalPositioning()
await grbl.position({ x: -100, y: -100 })
*/


/// -------------------- SERVER <> CLIENT COMMS --------------------- //


/*// when we know the gamefile has changed...:
server_socket.on("update", () => {
   nome_lista = "/assets/game.json";
   fetch("/" + nome_lista)
   .then((res) => res.json())
   .then((out) => {
      out.words.forEach((word) => {
         if (word.solved === true) {

         } else {

         }
      });
   })
   .catch((err) => {
      throw err;
   });
});*/
