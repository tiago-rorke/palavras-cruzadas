$(function () {

   let socket = io();

   // ------------ GRBL------------ //

   let get_status = document.getElementById('get_status');
   get_status.onclick = function() {
      console.log('[grbl] status');
      socket.emit('get_status');
   }
   let unlock = document.getElementById('unlock');
   unlock.onclick = function() {
      console.log('[grbl] unlock');
      socket.emit('unlock');
   }
   let home = document.getElementById('home');
   home.onclick = function() {
      console.log('[grbl] home');
      socket.emit('home');
   }

   socket.on('status', (data) => {
   console.log(data);
      console.log('[grbl] got status');
      $("#status").text(data.state);
   });

   let send = document.getElementById('send');
   send.onclick = function() {
      let gcode = [
         "M3 S200",
         "G90",
         "G21",
         "G1 F6000",
         "G1 X100 Y100",
         "M3 S700",
         "G4 P0.300",
         "G1 X100 Y200",
         "G1 X200 Y200",
         "G1 X200 Y100",
         "G1 X100 Y100",
         "M3 S200",
         "G4 P0.300 ",
         "G1 F10000",
         "G1 X0 Y0"
      ];
      console.log('[grbl] send', gcode);
      for (let i=0; i<gcode.length; i++) {
         socket.emit('send', gcode[i]);
      }
   }

   // ------------ CROSSWORD------------ //

   let new_word = document.getElementById('new_word');
   new_word.onclick = function() {
      console.log('adding new word')
      socket.emit('new_word', 'plumbis', 'how is it made?');
   }

   let update_button = document.getElementById('update');
   update_button.onclick = function() {
      update();
   }

   socket.on("update", () => {
      update();
   });

   socket.on("new_word_fail", () => {
      console.log('failed to add new word');
   });

});


function update() {

   fetch("/assets/game.json")
   .then((res) => res.json())
   .then((out) => {
      // out.words.forEach((word) => {
      //    console.log(word.word);
      // });
      init(out.grid.width, out.grid.height);
      load(out);
      drawGame();
      //printWordlist();
      console.log('updated');
   })
   .catch((err) => {
      throw err;
   });
}

window.onload = function() {
  update();
};