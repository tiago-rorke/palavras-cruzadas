
const plotter_p5 = (s) => {

   let scale;

   s.setup = () => {
      //s.initCanvas(scale, 750, 550);
      let w = document.getElementById('page_width').value
      let h = document.getElementById('page_height').value
      let rs = document.getElementById('page_scale').value
      s.initCanvas(rs, w, h);
      scale = rs;
   }

   s.initCanvas = (rs, w, h) => {
      //console.log(rs, w, h);
      let canvas = s.createCanvas(w*rs, h*rs);
      scale = rs;
      canvas.parent('plotter_canvas');

      // graphics
      s.smooth();
      s.background(255);
   }

   s.update = (draw_buffer, draw_log, draw_annotations) => {
      s.background(255);

      // drawn lines
      for(let i=0; i<draw_log.length-1; i++) {
         let x1 = scale * draw_log[i].x;
         let x2 = scale * draw_log[i+1].x;
         let y1 = scale * draw_log[i].y;
         let y2 = scale * draw_log[i+1].y;
         let c = draw_log[i].drawing ? 255 : 30;
         let w = draw_log[i].drawing ? 2 : 1;
         s.strokeWeight(w);
         s.stroke(0,0,255, c);
         // invert y to move origin to bottom left corner
         s.line(x1, s.height - y1, x2, s.height - y2);
      }

      // lines still to draw
      for(let i=0; i<draw_buffer.length-1; i++) {
         let x1 = scale * draw_buffer[i].x;
         let x2 = scale * draw_buffer[i+1].x;
         let y1 = scale * draw_buffer[i].y;
         let y2 = scale * draw_buffer[i+1].y;
         let c = draw_buffer[i].drawing ? 255 : 30;
         let w = draw_buffer[i].drawing ? 2 : 1;
         s.strokeWeight(w);
         s.stroke(255,0,255, c);
         s.line(x1, s.height - y1, x2, s.height - y2);
      }

      // annotations that won't be drawn
      for(let i=0; i<draw_annotations.length-1; i++) {
         console.log(i);
         let x1 = scale * draw_annotations[i].x;
         let x2 = scale * draw_annotations[i+1].x;
         let y1 = scale * draw_annotations[i].y;
         let y2 = scale * draw_annotations[i+1].y;
         let c = draw_annotations[i].drawing ? 255 : 30;
         let w = draw_annotations[i].drawing ? 2 : 1;
         s.strokeWeight(w);
         s.stroke(255,255,0, c);
         s.line(x1, s.height - y1, x2, s.height - y2);
      }
   }
}

let plotter_render = new p5(plotter_p5);
