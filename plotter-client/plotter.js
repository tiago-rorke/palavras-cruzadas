"use strict";

const fs = require("fs");
const SerialPort = require('serialport')
const { GrblStream } = require('grbl-stream')

/*
console.log('help', await grbl.help())
console.log('settings', await grbl.settings())
*/



// ========================== PLOTTER CLASS =============================== //

const internal = {};

internal.Plotter = class {

   constructor(port, baud) {
      this.connect(port, baud);
		this.grbl = new GrblStream()

      this.travel_speed;
      this.draw_speed;
      this.up_delay;
      this.down_delay;
      this.up_pos;
      this.down_pos;

      this.draw_buffer = [];      // lines to draw
      this.draw_log = [];         // lines already drawn
      this.draw_annotations = []; // lines to render in preview but never draw
      this.drawing = false;       // draw state when adding vertices to draw_buffer
      this.plotting = false;      // draw state when sending commands to plotter
      this.annotating = false;    // draw state when adding vertices to draw_annotations
      //this.init();

		this.grbl.pipe(this.port).pipe(this.grbl)
		   .on('command', cmd => console.log('>', cmd))
		   .on('message', msg => console.log('<', msg))
   }

   connect(port, baud) {
      console.log("connecting plotter at port: " + port)
      this.port = new SerialPort(port, { baudRate: baud})
   }

   async home() {
   	await this.grbl.runHomingCycle();
   	return new Promise((resolve, reject) => {
         resolve(true);
      });
   }
	async unlock() {
   	await this.grbl.killAlarmLock();
   	return new Promise((resolve, reject) => {
         resolve(true);
      });
      this.init();
   }
   async status() {
      let status = await this.grbl.status();
      return new Promise((resolve, reject) => {
         resolve(status);
      });
   }

   async send(gcode) {
      await this.grbl.command(gcode);
      return new Promise((resolve, reject) => {
         resolve(true);
      });
   }

   feedHold(gcode) {
      this.grbl.command('!');
   }

   resume(gcode) {
      this.grbl.command('~');
   }

   async init() {
      await this.unlock();
      await this.grbl.metricCoordinates();
      await this.grbl.absolutePositioning();

      // not sure which of these is better, but M5 seems to not work sometimes
      //await this.send('M5');
      //await this.send("M3 S" + this.up_pos);
      this.send("M3 S0");
      this.send("G4 P2"); // 2s too much?

      this.home();
      this.send('G90');
      this.send('G0 X0 Y0');
   }

   // beginDraw, endDraw, vertex; loads drawing into draw_buffer

   beginDraw() {
      this.drawing = true;
   }

   endDraw() {
      this.draw_buffer[this.draw_buffer.length - 1].drawing = false;
      this.drawing = false;
   }

   vertex(x, y) {
      this.draw_buffer.push({
         x: x,
         y: y,
         drawing: this.drawing
      });
   }

   // beginAnnotate, endAnnotate, vertexAnnotate; loads drawing into draw_annotations

   beginAnnotate() {
      this.annotating = true;
   }

   endAnnotate() {
      this.draw_annotations[this.draw_annotations.length - 1].drawing = false;
      this.annotating = false;
   }

   vertexAnnotate(x, y) {
      this.draw_annotations.push({
         x: x,
         y: y,
         drawing: this.annotating
      });
   }

   // beginPlot, endPlot, vertexPlot; sends drawing commmands to plotter

   async beginPlot(x, y) {
      //this.vertex(x,y);
      await this.vertexPlot(x,y);
      await this.send("M3 S" + this.down_pos);
      await this.send("G4 P" + this.down_delay/1000);
      this.plotting = true;
   }

   async endPlot() {
      await this.send("M3 S" + this.up_pos);
      await this.send("G4 P" + this.up_delay/1000);
      this.plotting = false;
   }

   async vertexPlot(x, y) {
      await this.send("G90"); // always make sure we are in absolute coords
      if (this.plotting) {
         await this.send("G1 X" + x + " Y" + y + " F" + this.draw_speed);
         //await this.send("G1 F" + this.draw_speed);
         //await this.grbl.position({ x: x, y: y })
      } else {
         await this.send("G1 X" + x + " Y" + y + " F" + this.travel_speed);
      }
   }

   saveDrawing(file) {
      fs.writeFile(
         file,
         JSON.stringify(
            {
               draw_buffer: this.draw_buffer,
               draw_log: this.draw_log
            },
            null,
            1
         ),
         function (err) {
            if (err) return console.log(err);
         }
      );
      return true;
   }

   loadDrawing(file) {
      let data;
      try {
         data = JSON.parse(file);
      } catch (err) {
         return console.log(err);
      }

      this.draw_buffer = [];
      this.draw_log = [];

      for(let i=0; i<data.draw_buffer.length; i++) {
         this.draw_buffer.push(data.draw_buffer[i]);
      }

      for(let i=0; i<data.draw_log.length; i++) {
         this.draw_log.push(data.draw_log[i]);
      }
   }
}

// ====================================================== //

module.exports = internal.Plotter;