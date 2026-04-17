import { input, number, select } from '@inquirer/prompts';
import { Client } from 'lifxware';
import { WaveformRequest, WaveformType } from 'lifxware/dist/packets/waveform/waveform';

export async function labelMenu(): Promise<string> {
	return input({ message: 'Label?' });
}

export async function powerMenu(): Promise<boolean> {
	const answer = await select({ message: 'What power?', choices: ['on', 'off'] });
	return answer === 'on';
}

export async function colorMenu() {
	const hue = await number({ message: 'hue?', default: 0, required: true });
	const saturation = await number({ message: 'saturation?', default: 50, required: true });
	const brightness = await number({ message: 'brightness?', default: 50, required: true });
	const kelvin = await number({ message: 'kelvin?', default: 3500, required: true });
	return { hue: hue!, saturation: saturation!, brightness: brightness!, kelvin: kelvin! };
}

export async function waveformMenu(): Promise<WaveformRequest> {
	const isTransient = await select({
		message: 'Is Transient?',
		choices: ['true', 'false'],
		default: 'false'
	});

	const hue = await number({ message: 'hue?', default: 0, required: true });
	const saturation = await number({ message: 'saturation?', default: 0, required: true });
	const brightness = await number({ message: 'brightness?', default: 100, required: true });
	const kelvin = await number({ message: 'kelvin?', default: 3500, required: true });
	const period = await number({ message: 'Period?', default: 1000, required: true });
	const cycles = await number({ message: 'Cycles?', default: 3, required: true });
	const skewRatio = await number({ message: 'Skew Ratio?', default: 0, required: true });

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
			break;
		case 'PULSE':
			waveform = WaveformType.PULSE;
			break;
		default:
			throw Error('Unknown Waveform');
	}

	return {
		isTransient: isTransient === 'true',
		color: { hue: hue!, saturation: saturation!, brightness: brightness!, kelvin: kelvin! },
		period: period!,
		cycles: cycles!,
		skewRatio: skewRatio!,
		waveform,
	};
}

export async function relayIndexMenu(): Promise<number> {
	const index = await number({ message: 'Relay index?', default: 0, required: true });
	return index!;
}

export async function hevCycleMenu(): Promise<{ enable: boolean; durationS: number }> {
	const enableAnswer = await select({
		message: 'Enable HEV cycle?',
		choices: ['true', 'false'],
		default: 'true'
	});
	const durationS = await number({ message: 'Duration (seconds)?', default: 7200, required: true });
	return { enable: enableAnswer === 'true', durationS: durationS! };
}

export async function lightsMenu(client: Client, singleLight?: boolean) {
	const lights = client.lights();

	if (lights.length === 0) {
		throw Error('No lights found');
	}

	const lightIds = lights.map(l => l.id);
	if (!singleLight) {
		lightIds.push('All');
	}

	const answer: string = await select({ message: 'What light?', choices: lightIds });

	if (answer === 'All') {
		return client.lights();
	}

	return [client.light(answer)];
}
