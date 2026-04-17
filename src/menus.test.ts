import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WaveformType } from 'lifxware/dist/packets/waveform/waveform';

vi.mock('@inquirer/prompts', () => ({
	input: vi.fn(),
	number: vi.fn(),
	select: vi.fn(),
}));

import { input, number, select } from '@inquirer/prompts';
import { colorMenu, hevCycleMenu, labelMenu, lightsMenu, powerMenu, relayIndexMenu, waveformMenu } from './menus';

const mockedInput = vi.mocked(input);
const mockedNumber = vi.mocked(number);
const mockedSelect = vi.mocked(select);

beforeEach(() => {
	vi.clearAllMocks();
});

describe('labelMenu', () => {
	it('returns the input string', async () => {
		mockedInput.mockResolvedValueOnce('Kitchen');
		expect(await labelMenu()).toBe('Kitchen');
	});
});

describe('powerMenu', () => {
	it('returns true for on', async () => {
		mockedSelect.mockResolvedValueOnce('on');
		expect(await powerMenu()).toBe(true);
	});

	it('returns false for off', async () => {
		mockedSelect.mockResolvedValueOnce('off');
		expect(await powerMenu()).toBe(false);
	});
});

describe('colorMenu', () => {
	it('returns all four color fields', async () => {
		mockedNumber.mockResolvedValueOnce(120);
		mockedNumber.mockResolvedValueOnce(75);
		mockedNumber.mockResolvedValueOnce(80);
		mockedNumber.mockResolvedValueOnce(4000);

		expect(await colorMenu()).toEqual({ hue: 120, saturation: 75, brightness: 80, kelvin: 4000 });
	});
});

describe('waveformMenu', () => {
	function setupBaseAnswers() {
		mockedSelect.mockResolvedValueOnce('false');
		mockedNumber.mockResolvedValueOnce(0);
		mockedNumber.mockResolvedValueOnce(0);
		mockedNumber.mockResolvedValueOnce(100);
		mockedNumber.mockResolvedValueOnce(3500);
		mockedNumber.mockResolvedValueOnce(1000);
		mockedNumber.mockResolvedValueOnce(3);
		mockedNumber.mockResolvedValueOnce(0);
	}

	it.each([
		['SAW', WaveformType.SAW],
		['SINE', WaveformType.SINE],
		['HALF_SINE', WaveformType.HALF_SINE],
		['TRIANGLE', WaveformType.TRIANGLE],
		['PULSE', WaveformType.PULSE],
	])('maps %s to WaveformType %i', async (choice, expected) => {
		setupBaseAnswers();
		mockedSelect.mockResolvedValueOnce(choice);
		const req = await waveformMenu();
		expect(req.waveform).toBe(expected);
	});

	it('sets isTransient to true', async () => {
		mockedSelect.mockResolvedValueOnce('true');
		mockedNumber.mockResolvedValueOnce(0);
		mockedNumber.mockResolvedValueOnce(0);
		mockedNumber.mockResolvedValueOnce(100);
		mockedNumber.mockResolvedValueOnce(3500);
		mockedNumber.mockResolvedValueOnce(1000);
		mockedNumber.mockResolvedValueOnce(3);
		mockedNumber.mockResolvedValueOnce(0);
		mockedSelect.mockResolvedValueOnce('SINE');

		const req = await waveformMenu();
		expect(req.isTransient).toBe(true);
	});

	it('builds the full request object', async () => {
		mockedSelect.mockResolvedValueOnce('false');
		mockedNumber.mockResolvedValueOnce(10);
		mockedNumber.mockResolvedValueOnce(20);
		mockedNumber.mockResolvedValueOnce(50);
		mockedNumber.mockResolvedValueOnce(3200);
		mockedNumber.mockResolvedValueOnce(500);
		mockedNumber.mockResolvedValueOnce(5);
		mockedNumber.mockResolvedValueOnce(-1);
		mockedSelect.mockResolvedValueOnce('PULSE');

		expect(await waveformMenu()).toEqual({
			isTransient: false,
			color: { hue: 10, saturation: 20, brightness: 50, kelvin: 3200 },
			period: 500,
			cycles: 5,
			skewRatio: -1,
			waveform: WaveformType.PULSE,
		});
	});
});

describe('relayIndexMenu', () => {
	it('returns the relay index', async () => {
		mockedNumber.mockResolvedValueOnce(2);
		expect(await relayIndexMenu()).toBe(2);
	});

	it('returns 0 as default', async () => {
		mockedNumber.mockResolvedValueOnce(0);
		expect(await relayIndexMenu()).toBe(0);
	});
});

describe('hevCycleMenu', () => {
	it('returns enable=true with durationS', async () => {
		mockedSelect.mockResolvedValueOnce('true');
		mockedNumber.mockResolvedValueOnce(3600);
		expect(await hevCycleMenu()).toEqual({ enable: true, durationS: 3600 });
	});

	it('returns enable=false with durationS', async () => {
		mockedSelect.mockResolvedValueOnce('false');
		mockedNumber.mockResolvedValueOnce(7200);
		expect(await hevCycleMenu()).toEqual({ enable: false, durationS: 7200 });
	});
});

describe('lightsMenu', () => {
	it('throws when no lights found', async () => {
		const mockClient = { lights: () => [], light: vi.fn() } as any;
		await expect(lightsMenu(mockClient)).rejects.toThrow('No lights found');
	});

	it('returns all lights when All is selected', async () => {
		const lights = [{ id: 'a' }, { id: 'b' }];
		const mockClient = { lights: () => lights, light: vi.fn() } as any;
		mockedSelect.mockResolvedValueOnce('All');
		expect(await lightsMenu(mockClient)).toBe(lights);
	});

	it('returns single light by id', async () => {
		const light = { id: 'abc' };
		const mockClient = { lights: () => [light], light: vi.fn().mockReturnValue(light) } as any;
		mockedSelect.mockResolvedValueOnce('abc');
		expect(await lightsMenu(mockClient)).toEqual([light]);
		expect(mockClient.light).toHaveBeenCalledWith('abc');
	});

	it('excludes All option when singleLight is true', async () => {
		const light = { id: 'abc' };
		const mockClient = { lights: () => [light], light: vi.fn().mockReturnValue(light) } as any;
		mockedSelect.mockResolvedValueOnce('abc');
		await lightsMenu(mockClient, true);
		const choices = mockedSelect.mock.calls[0][0].choices as string[];
		expect(choices).not.toContain('All');
	});
});
