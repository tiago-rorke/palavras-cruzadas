"use strict";

const SerialPort = require('serialport')
const { GrblStream } = require('grbl-stream')

// default parameters
const default_travel_speed = 8000;
const default_draw_speed = 4000;
const default_up_delay = 300;
const default_down_delay = 300;
const default_up_pos = 200;
const default_down_pos = 700;



// grbl.command('?');
// grbl.command('$$');

/*
console.log('status', await grbl.status())
console.log('help', await grbl.help())
console.log('settings', await grbl.settings())

await grbl.runHomingCycle()
await grbl.killAlarmLock()
await grbl.metricCoordinates()
await grbl.incrementalPositioning()
await grbl.position({ x: -100, y: -100 })
*/


// ========================== PLOTTER CLASS =============================== //

const internal = {};

internal.Plotter = class {

   constructor(port, baud) {
   	this.port = new SerialPort(port, { baudRate: baud})
		this.grbl = new GrblStream()

      this.travel_speed = default_travel_speed;
      this.draw_speed = default_draw_speed;
      this.up_delay = default_up_delay;
      this.down_delay = default_down_delay;
      this.up_pos = default_up_pos;
      this.down_pos = default_down_pos;

		this.grbl.pipe(this.port).pipe(this.grbl)
		   .on('command', cmd => console.log('>', cmd))
		   .on('message', msg => console.log('<', msg))
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
}
   /*
   await this.grbl.killAlarmLock()
  	await this.grbl.metricCoordinates()
	await this.grbl.incrementalPositioning()
	await this.grbl.position({ x: -100, y: -100 })
   */

// ====================================================== //

module.exports = internal.Plotter;