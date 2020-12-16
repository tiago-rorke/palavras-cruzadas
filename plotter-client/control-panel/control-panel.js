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