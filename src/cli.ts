import inquirer from 'inquirer';
import Table from 'cli-table';
import { Client, ClientEvents } from 'lifxware';
import { Light } from 'lifxware/dist/light';
import { WaveformType } from 'lifxware/dist/packets/waveform/waveform';

const client = new Client({ debug: false });

client.on(ClientEvents.LISTENING, async () => {
	const address = client.getAddress();

	console.info('Started LIFX listening on ' + address.address + ':' + address.port);
	await mainMenu();
});

client.on(ClientEvents.ERROR, (err: Error) => {
	console.error(err);
	client.destroy();
});

function printLights() {
	console.info('Lights:');

	const lights = client.lights();

	const table = new Table({
		head: ['Id', 'Label', 'Address', 'Port', 'Legacy', 'Connectivity'],
		colWidths: [20, 20, 20, 15, 15, 15]
	});

	for (const light of lights) {
		table.push([
			light.id,
			light.label,
			light.address,
			light.port,
			light.legacy ? 'true' : 'false',
			light.connectivity ? 'online' : 'offline'
		]);
	}

	console.info(table.toString());
}

async function printLightsState(lights: Light[]) {
	console.info('Lights state:');

	for (const light of lights) {
		await light.getState();
	}

	const table = new Table({
		head: ['Id', 'Connectivity', 'Power', 'Color'],
		colWidths: [20, 15, 15, 70]
	});

	for (const light of lights) {
		table.push([light.id, light.connectivity, light.power ? 'on' : 'off', JSON.stringify(light.color)]);
	}

	console.info(table.toString());
}

async function lightsMenu() {
	const lights = client.lights();
	const lightIds = [];

	for (const light of lights) {
		lightIds.push(light.id);
	}

	lightIds.push('All');

	const lightAnswer = await inquirer.prompt({
		type: 'list',
		name: 'lightId',
		message: 'What light?',
		choices: lightIds
	});

	if (lightAnswer.lightId === 'All') {
		return client.lights();
	}

	const light = client.light(lightAnswer.lightId);

	return [light];
}

async function powerMenu() {
	const powerAnswer = await inquirer.prompt({
		type: 'list',
		name: 'power',
		message: 'What power?',
		choices: ['on', 'off']
	});

	return powerAnswer.power === 'on';
}

async function colorMenu() {
	const answers = await inquirer.prompt( [
		{
			type: 'number',
			name: 'hue',
			message: 'hue?',
			default: 0
		},
		{
			type: 'number',
			name: 'saturation',
			message: 'saturation?',
			default: 50
		},
		{
			type: 'number',
			name: 'brightness',
			message: 'brightness?',
			default: 50
		},
		{
			type: 'number',
			name: 'kelvin',
			message: 'kelvin?',
			default: 3500
		}
	]);

	return answers;
}

async function waveformMenu() {
	const answers = await inquirer.prompt([
		{
			type: 'boolean',
			name: 'isTransient',
			message: 'Is Transient?',
			default: false
		},
		{
			type: 'number',
			name: 'hue',
			message: 'hue?',
			default: 0
		},
		{
			type: 'number',
			name: 'saturation',
			message: 'saturation?',
			default: 0
		},
		{
			type: 'number',
			name: 'brightness',
			message: 'brightness?',
			default: 100
		},
		{
			type: 'number',
			name: 'kelvin',
			message: 'kelvin?',
			default: 3500
		},
		{
			type: 'number',
			name: 'period',
			message: 'Period?',
			default: 1000
		},
		{
			type: 'number',
			name: 'cycles',
			message: 'Cycles?',
			default: 3
		},
		{
			type: 'number',
			name: 'skewRatio',
			message: 'Skew Ratio?',
			default: 0
		},
		{
			type: 'list',
			name: 'waveform',
			message: 'Waveform?',
			choices: ['SAW', 'SINE', 'HALF_SINE', 'TRIANGLE', 'PULSE']
		}
	] as any);

	let waveformType: WaveformType;

	switch (answers.waveform) {
		case 'SAW':
			waveformType = WaveformType.SAW;
			break;
		case 'SINE':
			waveformType = WaveformType.SINE;
			break;
		case 'HALF_SINE':
			waveformType = WaveformType.HALF_SINE;
			break;
		case 'TRIANGLE':
			waveformType = WaveformType.TRIANGLE;
		case 'PULSE':
			waveformType = WaveformType.PULSE;
		default:
			throw Error('Unknown Waveform');
	}

	const waveform = {
		isTransient: answers.isTransient,
		color: {
			hue: answers.hue,
			saturation: answers.saturation,
			brightness: answers.brightness,
			kelvin: answers.kelvin
		},
		period: answers.period,
		cycles: answers.cycles,
		skewRatio: answers.skewRatio,
		waveform: waveformType
	};

	return waveform;
}

// eslint-disable-next-line complexity
async function mainMenu() {
	const answers = await inquirer.prompt( {
		type: 'list',
		name: 'client',
		message: 'What to do?',
		choices: ['GetLightList', 'GetLightState', 'SetLightPower', 'SetLightColor', 'SetWaveform', 'Exit']
	});

	switch (answers.client) {
		case 'GetLightList':
			printLights();
			mainMenu();
			break;
		case 'GetLightState':
			try {
				const lights = await lightsMenu();

				await printLightsState(lights);
			} catch (err) {
				console.error(err);
			}

			mainMenu();
			break;
		case 'SetLightPower':
			try {
				const lights = await lightsMenu();
				const power = await powerMenu();

				for (const light of lights) {
					await light.setPower(power);
				}
			} catch (err) {
				console.error(err);
			}

			mainMenu();
			break;
		case 'SetLightColor':
			try {
				const lights = await lightsMenu();
				const color = await colorMenu();

				for (const light of lights) {
					await light.setColor(color.hue, color.saturation, color.brightness, color.kelvin);
				}
			} catch (err) {
				console.error(err);
			}

			mainMenu();
			break;
		case 'SetWaveform':
			const lights = await lightsMenu();
			const waveform = await waveformMenu();

			for (const light of lights) {
				await light.setWaveform(waveform);
			}

			mainMenu();
			break;
		case 'Exit':
			process.exit(0);
			break;
		default:
			console.error('Unknown option');
			mainMenu();
	}
}

function errorHandler(err: Error) {
	console.error(err);
}

function signalHandler(){
	process.exit(0);
}

process.on('uncaughtException', errorHandler);
process.on('unhandledRejection', errorHandler);
process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);
