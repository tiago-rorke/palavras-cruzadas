"use strict";

const SerialPort = require('serialport')
const { GrblStream } = require('grbl-stream')

// default parameters
// const default_travel_speed = 8000;
// const default_draw_speed = 4000;
// const default_up_delay = 300;
// const default_down_delay = 300;
// const default_up_pos = 200;
// const default_down_pos = 700;

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

      this.draw_buffer = [];
      this.draw_log = [];
      this.drawing = false; // draw state when adding vertices to draw_buffer
      this.plotting = false; // draw state when sending commands to plotter
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
      await this.grbl.metricCoordinates();
      await this.grbl.absolutePositioning();
      await this.send("M3 S" + this.up_pos);
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

   // beginPlot, endPlot, vertexPlot; sends drawing commmands to plotter

   async beginPlot(x, y) {
      //this.vertex(x,y);
      await vertexPlot(x,y);
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
      if (this.drawing) {
         await this.send("G1 X" + x + " Y" + y + " F" + this.draw_speed);
         //await this.send("G1 F" + this.draw_speed);
         //await this.grbl.position({ x: x, y: y })
      } else {
         await this.send("G1 X" + x + " Y" + y + " F" + this.travel_speed);
      }
   }
}

// ====================================================== //

module.exports = internal.Plotter;