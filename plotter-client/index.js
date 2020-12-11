
const fs = require('fs');
const express = require('express');
const socketIO = require('socket.io');

const SerialPort = require('serialport')
const { GrblStream } = require('grbl-stream')

const port = new SerialPort('/dev/ttyUSB0', { baudRate: 115200})
const grbl = new GrblStream()

const app = express();
const server = app
	.listen(3000, () => console.log(`Listening on 3000`));

const io = socketIO(server);

const crossword = require('./crossword.js');

crossword.init(3,3);

try {
	let game = fs.readFileSync('./game.json', 'utf8');
	crossword.load(game);
	//console.log(crossword.grid);
	//console.log(crossword.words);

	crossword.newWord("help","i'm trapped in a crossword");

	crossword.printWords(false);
   process.stdout.write('\n');
	crossword.printLabels();
} catch (err) {
    console.log(`error reading game json file: ${err}`);
}

app.use(express.static('/'));
app.get('/', function (req, res){
	 res.sendFile(__dirname + '/index.html');
});


grbl.pipe(port).pipe(grbl)
  .on('command', cmd => console.log('>', cmd))
  .on('message', msg => console.log('<', msg))

io.on('connection', (socket) => {
	console.log('Client connected');

	socket.on('get_status', async () => {
		console.log('get_status');
		let status = await grbl.status();
		io.emit('status', status);
	});

	socket.on('unlock', async () => {
		console.log('unlock');
		await grbl.killAlarmLock();
	});

	socket.on('home', async () => {
		console.log('home');
		await grbl.runHomingCycle();
	});

});


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
await grbl.position({ x: -100, y: -100 })*/

