"use strict";

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

   let home = document.getElementById('home');
   home.onclick = () => {
      console.log('[grbl] home');
      socket.emit('home');
   }
   let unlock = document.getElementById('unlock');
   unlock.onclick = () => {
      console.log('[grbl] unlock');
      socket.emit('unlock');
   }
   let reset = document.getElementById('reset');
   reset.onclick = () => {
      console.log('[grbl] reset');
      socket.emit('reset');
   }
   let play = document.getElementById('play');
   play.onclick = () => {
      console.log('[grbl] play');
      socket.emit('play');
   }
   let feed_hold = document.getElementById('feed_hold');
   feed_hold.onclick = () => {
      console.log('[grbl] feed hold');
      socket.emit('feed_hold');
   }
   let resume = document.getElementById('resume');
   resume.onclick = () => {
      console.log('[grbl] resume');
      socket.emit('resume');
   }

   let send = document.getElementById('send');
   send.onclick = () => {
      let gcode = [document.getElementById('gcode').value];
      console.log('[grbl] send', gcode);
      socket.emit('send', gcode);
   }

   let left_up = document.getElementById('X-_Y+');
   left_up.onclick = () => {
      let d = document.getElementById('jog_dist').value
      let gcode = ['G91','G0 X-' + d + ' Y' + d];
      console.log('[grbl] jog', gcode);
      socket.emit('send', gcode);
   }
   let up = document.getElementById('Y+');
   up.onclick = () => {
      let d = document.getElementById('jog_dist').value
      let gcode = ['G91','G0 Y' + d];
      console.log('[grbl] jog', gcode);
      socket.emit('send', gcode);
   }
   let right_up = document.getElementById('X+_Y+');
   right_up.onclick = () => {
      let d = document.getElementById('jog_dist').value
      let gcode = ['G91','G0 X' + d + ' Y' + d];
      console.log('[grbl] jog', gcode);
      socket.emit('send', gcode);
   }
   let left = document.getElementById('X-');
   left.onclick = () => {
      let d = document.getElementById('jog_dist').value
      let gcode = ['G91','G0 X-' + d];
      console.log('[grbl] jog', gcode);
      socket.emit('send', gcode);
   }
   let right = document.getElementById('X+');
   right.onclick = () => {
      let d = document.getElementById('jog_dist').value
      let gcode = ['G91','G0 X' + d];
      console.log('[grbl] jog', gcode);
      socket.emit('send', gcode);
   }
   let left_down = document.getElementById('X-_Y-');
   left_down.onclick = () => {
      let d = document.getElementById('jog_dist').value
      let gcode = ['G91','G0 X-' + d + ' Y-' + d];
      console.log('[grbl] jog', gcode);
      socket.emit('send', gcode);
   }
   let down = document.getElementById('Y-');
   down.onclick = () => {
      let d = document.getElementById('jog_dist').value
      let gcode = ['G91','G0 Y-' + d];
      console.log('[grbl] jog', gcode);
      socket.emit('send', gcode);
   }
   let right_down = document.getElementById('X+_Y-');
   right_down.onclick = () => {
      let d = document.getElementById('jog_dist').value
      let gcode = ['G91','G0 X' + d + ' Y-' + d];
      console.log('[grbl] jog', gcode);
      socket.emit('send', gcode);
   }
   let set_zero = document.getElementById('set_zero');
   set_zero.onclick = () => {
      let gcode = ['G10 P1 L20 X0 Y0'];
      console.log('[grbl] set work zero', gcode);
      socket.emit('send', gcode);
   }
   let to_zero = document.getElementById('X0_Y0');
   to_zero.onclick = () => {
      let gcode = ['G90','G0 X0 Y0'];
      console.log('[grbl] go to work zero', gcode);
      socket.emit('send', gcode);
   }

   let get_config = document.getElementById('get_config');
   get_config.onclick = () => {
      console.log('[grbl] get config');
      socket.emit('get_config');
   }

   socket.on('get_config', (config) => {
      console.log('got config');
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
      console.log('set_config');
      socket.emit('set_config', {
         travel_speed: travel_speed,
         draw_speed:   draw_speed,
         up_pos:       up_pos,
         down_pos:     down_pos,
         up_delay:     up_delay,
         down_delay:   down_delay
      });
   }

   socket.on('update_drawing', (draw_buffer, draw_log) => {
      console.log('update drawing');
      //console.log(draw_log);
      plotter_render.update(draw_buffer, draw_log);
   });

   let clear = document.getElementById('clear');
   clear.onclick = () => {
      console.log('clear drawing');
      socket.emit('clear');
   }
   let draw = document.getElementById('draw');
   draw.onclick = () => {
      let t = document.getElementById('draw_text').value
      let h = document.getElementById('text_height').value
      let s = document.getElementById('text_spacing').value
      console.log('draw text');
      socket.emit('draw', t, h, s);
   }

   // ------------ CROSSWORD------------ //

   let new_word = document.getElementById('new_word');
   new_word.onclick = () => {
      console.log('adding new word')
      socket.emit('new_word', 'plumbis', 'how is it made?');
   }

   let update_button = document.getElementById('update');
   update_button.onclick = () => {
      update_crossword();
   }

   socket.on("update", () => {
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
      load(out);
      crossword_render.update();
      //printWordlist();
      console.log('updated');
   })
   .catch((err) => {
      throw err;
   });
}
