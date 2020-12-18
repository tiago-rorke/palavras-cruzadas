let travel_speed = 2000;
let draw_speed = 4000;
let up_pos = 200;
let down_pos = 700;
let up_delay = 300;
let down_delay = 300;

let socket = io();

window.onload = () => {
   update_crossword();
   socket.emit('get_status');
   socket.emit('get_config');
};


$(function () {

   // ------------ GRBL------------ //

   let get_status = document.getElementById('get_status');
   get_status.onclick = () => {
      console.log('[grbl] status');
      socket.emit('get_status');
   }
   socket.on('status', (data) => {
   console.log(data);
      console.log('[grbl] got status');
      $("#status").text(data.state);
   });

   let unlock = document.getElementById('unlock');
   unlock.onclick = () => {
      console.log('[grbl] unlock');
      socket.emit('unlock');
   }
   let home = document.getElementById('home');
   home.onclick = () => {
      console.log('[grbl] home');
      socket.emit('home');
   }


   let send = document.getElementById('send');
   send.onclick = () => {
      /*
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
      */
      let gcode = [document.getElementById('gcode').value];
      console.log('[grbl] send', gcode);
      socket.emit('send', gcode);
   }


   /*
   let get_config = document.getElementById('get_config');
   get_config.onclick = () => {
      console.log('[grbl] get config');
      socket.emit('get_config');
   }
   */
   socket.on('get_config', (config) => {
      console.log('[grbl] got config');
      travel_speed = config.travel_speed;
      draw_speed   = config.draw_speed;
      up_pos       = config.up_pos;
      down_pos     = config.down_pos;
      up_delay     = config.up_delay;
      down_delay   = config.down_delay;
      document.getElementById('travel_speed').value = travel_speed;
      document.getElementById('draw_speed').value   = draw_speed;
      document.getElementById('up_pos').value       = up_pos;
      document.getElementById('down_pos').value     = down_pos;
      document.getElementById('up_delay').value     = up_delay;
      document.getElementById('down_delay').value   = down_delay;
   });

   let set_config = document.getElementById('set_config');
   set_config.onclick = () => {
      travel_speed = document.getElementById('travel_speed').value;
      draw_speed   = document.getElementById('draw_speed').value;
      up_pos       = document.getElementById('up_pos').value;
      down_pos     = document.getElementById('down_pos').value;
      up_delay     = document.getElementById('up_delay').value;
      down_delay   = document.getElementById('down_delay').value;
      console.log('[grbl] set_config');
      socket.emit('set_config', {
         travel_speed: travel_speed,
         draw_speed:   draw_speed,
         up_pos:       up_pos,
         down_pos:     down_pos,
         up_delay:     up_delay,
         down_delay:   down_delay
      });
   }

   // ------------ CROSSWORD------------ //

   let new_word = document.getElementById('new_word');
   new_word.onclick = () => {
      console.log('adding new word')
      socket.emit('new_word', 'plumbis', 'how is it made?');
   }

   let update_button = document.getElementById('update');
   update_button.onclick = () => {
      update();
   }

   socket.on("update", () => {
      update();
   });

   socket.on("new_word_fail", () => {
      console.log('failed to add new word');
   });

});


function update_crossword() {

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
