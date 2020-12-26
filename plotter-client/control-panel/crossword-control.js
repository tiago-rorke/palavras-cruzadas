"use strict";

let socket = io();

window.onload = () => {
   update_crossword();
};


$(function () {

   let new_word = document.getElementById('new_word');
   new_word.onclick = () => {
      console.log('adding new word')
      socket.emit('new_word', 'plumbis', 'how is it made?');
   }

   let update_button = document.getElementById('update');
   update_button.onclick = () => {
      update_crossword();
   }

   let new_game = document.getElementById('new_game');
   new_game.onclick = () => {
      if (window.confirm("Are you sure you want to delete everything and start a new game?")) {
         console.log("new game");
         socket.emit('new_game');
         update_crossword();
      }
   }

   socket.on('update_crossword', () => {
      update_crossword();
   });

   socket.on("new_word_fail", () => {
      console.log('failed to add new word');
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
      crossword_render.init_canvas(30, out.grid.width, out.grid.height)
      load(out);
      crossword_render.update();
      //printWordlist();
      console.log('updated');
   })
   .catch((err) => {
      throw err;
   });
}
