"use strict";

let socket = io();

window.onload = () => {
   update_crossword();
};


$(function () {

   let add_word = document.getElementById('add_word');
   add_word.onclick = () => {
      let word = document.getElementById('new_word').value;
      if(word.length > 0) {
         console.log('adding new word', word)
         socket.emit('add_word', word, '####');
      }
   }

   let update_button = document.getElementById('update');
   update_button.onclick = () => {
      update_crossword();
   }

   let reset_server = document.getElementById('reset_server');
   reset_server.onclick = () => {
      if (window.confirm("Are you sure you want to start a new game on the server?  the current game will be archived.")) {
         console.log("reset server");
         socket.emit('reset_server');
      }
   }

   let new_game = document.getElementById('new_game');
   new_game.onclick = () => {
      if (window.confirm("Are you sure you want to delete everything and start a new game?")) {
         console.log("new game");
         socket.emit('new_game', Number(document.getElementById('width').value), Number(document.getElementById('height').value));
      }
   }

   let toggle_show_unsolved = document.getElementById('toggle_show_unsolved');
   toggle_show_unsolved.onclick = () => {
      if(crossword_render.toggleUnsolved()) {
         toggle_show_unsolved.textContent = "hide unsolved words";
      } else {
         toggle_show_unsolved.textContent = "show unsolved words";
      }
      crossword_render.update();
   }

   let add_random = document.getElementById('add_random');
   add_random.onclick = () => {
      let n = Number(document.getElementById('random_count').value);
      console.log("adding " + n + " random words");
      socket.emit('add_random', n);
   }

   socket.on('update_crossword', () => {
      update_crossword();
   });

   socket.on("add_word_fail", (word) => {
      console.log('failed to add new word', word);
   });

});


function update_crossword() {

   fetch("/data/game.json")
   .then((res) => res.json())
   .then((out) => {
      // out.words.forEach((word) => {
      //    console.log(word.word);
      // });
      init(out.grid.width, out.grid.height);
      crossword_render.initCanvas(30, out.grid.width, out.grid.height)
      load(out);
      crossword_render.update();
      //printWordlist();
      console.log('updated');
   })
   .catch((err) => {
      throw err;
   });
}
