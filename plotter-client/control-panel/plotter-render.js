
const plotter_p5 = (s) => {

   let canvas_width = 700;
   let canvas_height = 200;

   s.setup = () => {

      let canvas = s.createCanvas(canvas_width, canvas_height);
      canvas.parent('plotter_canvas');

      // graphics
      s.smooth();
      s.background(255);
   }

   s.update = (draw_buffer, draw_log) => {
      s.background(255);
      for(let i=0; i<draw_log.length-1; i++) {
         let x1 = draw_log[i].x;
         let x2 = draw_log[i+1].x;
         let y1 = draw_log[i].y;
         let y2 = draw_log[i+1].y;
         let c = draw_log[i].drawing ? 255 : 150;
         let w = draw_log[i].drawing ? 2 : 1;
         s.strokeWeight(w);
         s.stroke(0,0,255, c);
         // invert y to move origin to bottom left corner
         s.line(x1, canvas_height - y1, x2, canvas_height - y2);
      }
      for(let i=0; i<draw_buffer.length-1; i++) {
         let x1 = draw_buffer[i].x;
         let x2 = draw_buffer[i+1].x;
         let y1 = draw_buffer[i].y;
         let y2 = draw_buffer[i+1].y;
         let c = draw_buffer[i].drawing ? 255 : 150;
         let w = draw_buffer[i].drawing ? 2 : 1;
         s.strokeWeight(w);
         s.stroke(255,0,255, c);
         s.line(x1, canvas_height - y1, x2, canvas_height - y2);
      }
   }
}

let plotter_render = new p5(plotter_p5);
