"use strict";

let socket = io();

window.onload = () => {
   socket.emit('get_status');
   socket.emit('load_config');
   socket.emit('update_drawing');
   updatePage();
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

   // --------------- JOGGING ----------------- //

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

   // --------------- DRAW CONFIG ----------------- //

   let load_config = document.getElementById('load_config');
   load_config.onclick = () => {
      console.log('[grbl] get config');
      socket.emit('load_config');
   }

   socket.on('load_config', (config) => {
      console.log('got config');
      console.log(config);
      document.getElementById('travel_speed').value       = config.travel_speed;
      document.getElementById('draw_speed').value         = config.draw_speed;
      document.getElementById('up_pos').value             = config.up_pos;
      document.getElementById('down_pos').value           = config.down_pos;
      document.getElementById('up_delay').value           = config.up_delay;
      document.getElementById('down_delay').value         = config.down_delay;
      document.getElementById('draw_x').value             = config.draw_x;
      document.getElementById('draw_y').value             = config.draw_y;
      document.getElementById('square_size').value        = config.square_size;
      document.getElementById('text_height').value        = config.text_height;
      document.getElementById('text_spacing').value       = config.text_spacing;
      document.getElementById('letter_x').value           = config.letter_x;
      document.getElementById('letter_y').value           = config.letter_y;
      document.getElementById('label_height').value       = config.label_height;
      document.getElementById('label_x').value            = config.label_x;
      document.getElementById('label_y').value            = config.label_y;
      document.getElementById('label_spacing').value      = config.label_spacing;
      document.getElementById('label_horizontal').checked = config.label_horizontal;
      document.getElementById('label_vertical').checked   = !config.label_horizontal;
      document.getElementById('horizontal_first').checked = config.horizontal_first;
      document.getElementById('vertical_first').checked   = !config.horizontal_first;
      document.getElementById('draw_unsolved').checked    = config.draw_unsolved;
      document.getElementById('page_width').value         = config.page_width;
      document.getElementById('page_height').value        = config.page_height;
      document.getElementById('page_scale').value         = config.page_scale;
   });

   let save_config = document.getElementById('save_config');
   save_config.onclick = () => {
      console.log('save_config');
      socket.emit('save_config', {
         travel_speed     : Number(document.getElementById('travel_speed').value),
         draw_speed       : Number(document.getElementById('draw_speed').value),
         up_pos           : Number(document.getElementById('up_pos').value),
         down_pos         : Number(document.getElementById('down_pos').value),
         up_delay         : Number(document.getElementById('up_delay').value),
         down_delay       : Number(document.getElementById('down_delay').value),
         draw_x           : Number(document.getElementById('draw_x').value),
         draw_y           : Number(document.getElementById('draw_y').value),
         square_size      : Number(document.getElementById('square_size').value),
         text_height      : Number(document.getElementById('text_height').value),
         text_spacing     : Number(document.getElementById('text_spacing').value),
         letter_x         : Number(document.getElementById('letter_x').value),
         letter_y         : Number(document.getElementById('letter_y').value),
         label_height     : Number(document.getElementById('label_height').value),
         label_x          : Number(document.getElementById('label_x').value),
         label_y          : Number(document.getElementById('label_y').value),
         label_spacing    : Number(document.getElementById('label_spacing').value),
         label_horizontal : document.getElementById('label_horizontal').checked,
         horizontal_first : document.getElementById('horizontal_first').checked,
         draw_unsolved    : document.getElementById('draw_unsolved').checked,
         page_width       : Number(document.getElementById('page_width').value),
         page_height      : Number(document.getElementById('page_height').value),
         page_scale       : Number(document.getElementById('page_scale').value)
      });
   }

   socket.on('update_drawing', (draw_buffer, draw_log) => {
      console.log('update drawing');
      plotter_render.update(draw_buffer, draw_log);
   });

   // --------------- DRAWING ----------------- //


   let clear = document.getElementById('clear');
   clear.onclick = () => {
      console.log('clear drawing');
      socket.emit('clear');
   }
   let draw_text = document.getElementById('draw_text');
   draw_text.onclick = () => {
      console.log('draw text');
      socket.emit('draw_text', document.getElementById('text_input').value);
   }
   let draw_crossword = document.getElementById('draw_crossword');
   draw_crossword.onclick = () => {
      console.log('draw crossword');
      socket.emit('draw_crossword');
   }

   let update_button = document.getElementById('update');
   update_button.onclick = () => {
      socket.emit('update_drawing');
   }

   // --------------- VISUALISATION ----------------- //

   let update_page = document.getElementById('update_page');
   update_page.onclick = () => {
      updatePage();
      socket.emit('update_drawing');
   }

});

function updatePage() {
   let w = document.getElementById('page_width').value
   let h = document.getElementById('page_height').value
   let s = document.getElementById('page_scale').value
   console.log('update page', s, w, h);
   plotter_render.initCanvas(s, w, h);
}