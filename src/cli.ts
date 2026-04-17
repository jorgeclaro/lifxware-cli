import SimpleTable from 'cli-simple-table';
import { select } from '@inquirer/prompts';
import { Client, ClientEvents } from 'lifxware';
import { Light } from 'lifxware/dist/light';
import { colorMenu, hevCycleMenu, labelMenu, lightsMenu, powerMenu, relayIndexMenu, waveformMenu } from './menus';

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

// eslint-disable-next-line complexity
async function mainMenu() {
	const action = await select({
		message: 'What to do?',
		choices: [
			'GetLightList',
			'GetLightState',
			'SetLightLabel',
			'SetLightPower',
			'SetLightColor',
			'SetWaveform',
			'GetRelayPower',
			'SetRelayPower',
			'GetHevCycle',
			'SetHevCycle',
			'Exit',
		]
	});

	switch (action) {
		case 'GetLightList':
			printLights();
			mainMenu();
			break;
		case 'GetLightState':
			try {
				const lights = await lightsMenu(client);
				await printLightsState(lights);
			} catch (err) {
				console.error(err);
			}
			mainMenu();
			break;
		case 'SetLightLabel':
			try {
				const light = (await lightsMenu(client, true))[0];
				console.info(`Current label: ${light.label}`);
				const label = await labelMenu();
				await light.setLabel({ label });
			} catch (err) {
				console.error(err);
			}
			mainMenu();
			break;
		case 'SetLightPower':
			try {
				const lights = await lightsMenu(client);
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
				const lights = await lightsMenu(client);
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
				const lights = await lightsMenu(client);
				const waveform = await waveformMenu();
				for (const light of lights) {
					await light.setWaveform(waveform);
				}
			} catch (err) {
				console.error(err);
			}
			mainMenu();
			break;
		case 'GetRelayPower':
			try {
				const light = (await lightsMenu(client, true))[0];
				const relayIndex = await relayIndexMenu();
				const state = await light.getRelayPower(relayIndex);
				console.info(`Relay ${state.relayIndex}: ${state.level > 0 ? 'on' : 'off'} (level: ${state.level})`);
			} catch (err) {
				console.error(err);
			}
			mainMenu();
			break;
		case 'SetRelayPower':
			try {
				const lights = await lightsMenu(client);
				const relayIndex = await relayIndexMenu();
				const power = await powerMenu();
				for (const light of lights) {
					await light.setRelayPower(relayIndex, power);
				}
			} catch (err) {
				console.error(err);
			}
			mainMenu();
			break;
		case 'GetHevCycle':
			try {
				const light = (await lightsMenu(client, true))[0];
				const state = await light.getHevCycle();
				console.info(`HEV cycle — duration: ${state.durationS}s, remaining: ${state.remainingS}s, last power: ${state.lastPower ? 'on' : 'off'}`);
			} catch (err) {
				console.error(err);
			}
			mainMenu();
			break;
		case 'SetHevCycle':
			try {
				const lights = await lightsMenu(client);
				const hevCycle = await hevCycleMenu();
				for (const light of lights) {
					await light.setHevCycle(hevCycle);
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

function signalHandler() {
	process.exit(0);
}

process.on('uncaughtException', errorHandler);
process.on('unhandledRejection', errorHandler);
process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);
