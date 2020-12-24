"use strict";

let travel_speed = 2000;
let draw_speed = 4000;
let up_pos = 200;
let down_pos = 700;
let up_delay = 300;
let down_delay = 300;

let socket = io();

window.onload = () => {
   socket.emit('get_status');
   socket.emit('get_config');
   socket.emit('update_drawing');
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
      plotter_render.update(draw_buffer, draw_log);
   });

   let clear = document.getElementById('clear');
   clear.onclick = () => {
      console.log('clear drawing');
      socket.emit('clear');
   }
   let draw_text = document.getElementById('draw_text');
   draw_text.onclick = () => {
      console.log('draw text');
      let x = document.getElementById('draw_x').value
      let y = document.getElementById('draw_y').value
      let t = document.getElementById('text_input').value
      let h = document.getElementById('text_height').value
      let s = document.getElementById('text_spacing').value
      socket.emit('draw_text', x, y, t, h, s);
   }
   let draw_crossword = document.getElementById('draw_crossword');
   draw_crossword.onclick = () => {
      console.log('draw crossword');
      let x = document.getElementById('draw_x').value
      let y = document.getElementById('draw_y').value
      let s = document.getElementById('square_size').value;
      let t = document.getElementById('text_height').value;
      let tx = document.getElementById('letter_x').value;
      let ty = document.getElementById('letter_y').value;
      let l = document.getElementById('label_height').value;
      let lx = document.getElementById('label_x').value;
      let ly = document.getElementById('label_y').value;
      let ls = document.getElementById('label_spacing').value;
      let lh = document.getElementById('label_horizontal').checked == true ? true : false;
      let hf = document.getElementById('horizontal_first').checked == true ? true : false;
      let du = document.getElementById('draw_unsolved').checked == true ? true : false;
      socket.emit('draw_crossword', x, y, s, t, tx, ty, l, lx, ly, ls, lh, hf, du);
   }

   let update_button = document.getElementById('update');
   update_button.onclick = () => {
      socket.emit('update_drawing');
   }

});