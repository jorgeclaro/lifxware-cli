import SimpleTable from 'cli-simple-table';
import { input, number, select } from '@inquirer/prompts';
import { Client, ClientEvents } from 'lifxware';
import { Light } from 'lifxware/dist/light';
import { WaveformRequest, WaveformType } from 'lifxware/dist/packets/waveform/waveform';

const client = new Client({
	startDiscovery: true,
	debug: false
});

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

	const table = new SimpleTable();
	table.header('Id', 'Label', 'Address', 'Port', 'Legacy', 'Connectivity');

	for (const light of lights) {
		table.row(
			light.id,
			light.label,
			light.address,
			light.port ? light.port.toString() : 'N/A',
			light.legacy ? 'true' : 'false',
			light.connectivity ? 'online' : 'offline'
		);
	}

	console.info(table.toString());
}

async function printLightsState(lights: Light[]) {
	console.info('Lights state:');

	for (const light of lights) {
		await light.getState();
	}

	const table = new SimpleTable();
	table.header('Id', 'Connectivity', 'Power', 'Color');


	for (const light of lights) {
		table.row(light.id, light.connectivity ? 'online' : 'offline', light.power ? 'on' : 'off', JSON.stringify(light.color));
	}

	console.info(table.toString());
}

async function lightsMenu(singleLight?: boolean) {
	const lights = client.lights();

	if (lights.length === 0) {
		throw Error('No lights found');
	}

	const lightIds = [];

	for (const light of lights) {
		lightIds.push(light.id);
	}

	if (!singleLight) {
		lightIds.push('All')
	}

	const lightAnswer: string = await select({
		message: 'What light?',
		choices: lightIds
	});

	if (lightAnswer === 'All') {
		return client.lights();
	}

	const light = client.light(lightAnswer);

	return [light];
}

async function labelMenu() {
	const labelAnswer = await input({
		message: 'Label?',
	});

	return labelAnswer;
}

async function powerMenu() {
	const powerAnswer = await select({
		message: 'What power?',
		choices: ['on', 'off']
	});

	return powerAnswer === 'on';
}

async function colorMenu() {
	const hue = await number({
		message: 'hue?',
		default: 0,
		required: true
	});

	const saturation = await number({
		message: 'saturation?',
		default: 50,
		required: true
	});

	const brightness = await number({
		message: 'brightness?',
		default: 50,
		required: true
	});

	const kelvin = await number({
		message: 'kelvin?',
		default: 3500,
		required: true
	});

	const answers = {
		hue,
		saturation,
		brightness,
		kelvin
	};

	return answers;
}

async function waveformMenu() {
	const isTransient = await select({
		message: 'Is Transient?',
		choices: ['true', 'false'],
		default: 'false'
	});

	const hue = await number({
		message: 'hue?',
		default: 0,
		required: true
	});

	const saturation = await number({
		message: 'saturation?',
		default: 0,
		required: true
	});

	const brightness = await number({
		message: 'brightness?',
		default: 100,
		required: true
	});

	const kelvin = await number({
		message: 'kelvin?',
		default: 3500,
		required: true
	});

	const period = await number({
		message: 'Period?',
		default: 1000,
		required: true
	});

	const cycles = await number({
		message: 'Cycles?',
		default: 3,
		required: true
	});

	const skewRatio = await number({
		message: 'Skew Ratio?',
		default: 0,
		required: true
	});

	const waveformAns = await select({
		message: 'Waveform?',
		choices: ['SAW', 'SINE', 'HALF_SINE', 'TRIANGLE', 'PULSE'],
	});

	let waveform: WaveformType;

	switch (waveformAns) {
		case 'SAW':
			waveform = WaveformType.SAW;
			break;
		case 'SINE':
			waveform = WaveformType.SINE;
			break;
		case 'HALF_SINE':
			waveform = WaveformType.HALF_SINE;
			break;
		case 'TRIANGLE':
			waveform = WaveformType.TRIANGLE;
		case 'PULSE':
			waveform = WaveformType.PULSE;
		default:
			throw Error('Unknown Waveform');
	}

	const waveformReq: WaveformRequest = {
		isTransient: isTransient === 'true',
		color: {
			hue,
			saturation,
			brightness,
			kelvin
		},
		period,
		cycles,
		skewRatio,
		waveform,
	};

	return waveformReq;
}

// eslint-disable-next-line complexity
async function mainMenu() {
	const action = await select({
		message: 'What to do?',
		choices: ['GetLightList', 'GetLightState', 'SetLightLabel', 'SetLightPower', 'SetLightColor', 'SetWaveform', 'Exit']
	});

	switch (action) {
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
		case 'SetLightLabel':
			try {
				const light = (await lightsMenu(true))[0];
				console.info(`Current label: ${light.label}`);
				const label = await labelMenu();

				await light.setLabel({label});
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
			try {
				const lights = await lightsMenu();
				const waveform = await waveformMenu();

				for (const light of lights) {
					await light.setWaveform(waveform);
				}
			} catch (err) {
				console.error(err);
			}

			mainMenu();
			break;
		case 'Exit':
			process.exit(0);
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
