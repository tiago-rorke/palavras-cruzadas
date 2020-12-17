"use strict";

const SerialPort = require('serialport')
const { GrblStream } = require('grbl-stream')


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

   send(gcode) {
      this.grbl.command(gcode);
   }
}
/*		await this.grbl.killAlarmLock()
		await this.grbl.metricCoordinates()
		await this.grbl.incrementalPositioning()
		await this.grbl.position({ x: -100, y: -100 })*/

// ====================================================== //

module.exports = internal.Plotter;