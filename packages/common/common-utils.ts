import * as path from 'path'
import {debounce} from 'lodash'
import * as immutable from 'immutable'
import {
	allowedSampleUploadFileExtensions, MAX_MIDI_NOTE_NUMBER_127,
	MIN_MIDI_NOTE_NUMBER_0,
	maxRoomNameLength,
} from './common-constants'
import {MidiClipEvents, preciseDivide, preciseMultiply} from './midi-types'
import {SignalRange} from './common-types'

import uuid = require('uuid')

export function pickRandomArrayElement<T>(array: readonly T[]): T {
	return array[Math.floor(Math.random() * array.length)]
}

export function randomBoolean(chance = 0.5): boolean {
	return Math.random() < chance
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getKeyByValue(object: any, value: unknown) {
	return Object.keys(object).find(key => object[key] === value)
}

export function assertArrayHasNoUndefinedElements(array: unknown[]): void {
	array.forEach(x => {
		if (x === undefined) {
			throw new Error('assertArrayHasNoUndefinedElements failed: ' + JSON.stringify(array))
		}
	})
}

export const createThisShouldntHappenError = () => new Error(`this shouldn't happen`)

export const rateLimitedDebounce = <T extends (...args: any[]) => unknown>(
	func: T,
	intervalMs: number,
) => debounce(
	func,
	intervalMs,
	{
		leading: true,
		trailing: true,
		maxWait: intervalMs,
	},
)

export const rateLimitedDebounceNoTrail = <T extends (...args: unknown[]) => unknown>(
	func: T,
	intervalMs: number,
) => debounce(
	func,
	intervalMs,
	{
		leading: true,
		trailing: false,
		maxWait: intervalMs,
	},
)

/** Returns a number from 0 to length - 1 */
export function getNumberInRangeFromString(str: string, length: number) {
	return str
		.split('')
		.reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
		% length
}

export function createNodeId() {
	return uuid.v4()
}

export const clamp = (val: number, min: number, max: number) =>
	Math.min(max || 0, Math.max(min || 0, val || 0))

export const clampMidiNote = (note: number) =>
	clamp(note, MIN_MIDI_NOTE_NUMBER_0, MAX_MIDI_NOTE_NUMBER_127)

const polarizedClamps = {
	bipolar: (x: number) => clamp(x, -1, 1),
	unipolar: (x: number) => clamp(x, 0, 1),
}

export function clampPolarized(val: number, polarity: SignalRange): number {
	return polarizedClamps[polarity](val)
}

export const incrementalRound = (v: number, increment: number) =>
	Math.round(v / increment) * increment

export function applyOctave(midiNumber: number, octave: number) {
	if (octave === -1) return midiNumber

	return midiNumber + (octave * 12) + 12
}

export function removeOctave(midiNumber: number) {
	return midiNumber % 12
}

// eslint-disable-next-line no-empty-function
export const noop = () => {}

export const emptyList = immutable.List()

export const emptyMap = immutable.Map()

// https://stackoverflow.com/a/30835667
export function multilineRegExp(regExps: RegExp[], flags?: string) {
	return new RegExp(
		regExps.map(reg => reg.source).join(''),
		flags
	)
}

export function convertToNumberKeyMap<T>(obj: immutable.Map<string, T>): immutable.Map<number, T> {
	return obj.reduce((result, value, key) => {
		return result.set(Number.parseInt(key), value)
	}, immutable.Map<number, T>())
}

export function capitalizeFirstLetter(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

/** Megabytes to bytes */
export function MBtoBytes(MB: number) {
	return MB * 1000 * 1000
}

/** Bytes to megabytes */
export function bytesToMB(bytes: number) {
	return bytes / 1000 / 1000
}

export function validateSampleFilenameExtension(filename: string) {
	const extension = path.extname(filename)
	// must have extension
	if (extension === '') {
		return {
			error: 'Filename is missing extension',
			extension,
		}
	}
	// extension must match allowed extensions
	if (!allowedSampleUploadFileExtensions.includes(extension.replace('.', '').toLowerCase())) {
		return {
			error: `Invalid extension (${extension}), must be one of the following: `
				+ JSON.stringify(allowedSampleUploadFileExtensions),
			extension,
		}
	}
	return {extension}
}

export function removeExtension(fileName: string) {
	return fileName.replace(/\.[^/.]+$/, '')
}

export type IKeyToMidiMap = immutable.Map<string, number>

export const keyToMidiMap: IKeyToMidiMap = immutable.Map<number>({
	'a': 0,
	'w': 1,
	's': 2,
	'e': 3,
	'd': 4,
	'f': 5,
	't': 6,
	'g': 7,
	'y': 8,
	'h': 9,
	'u': 10,
	'j': 11,
	'k': 12,
	'o': 13,
	'l': 14,
	'p': 15,
	';': 16,
})

export const colorRegex = multilineRegExp([
	/^/,
	/(#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|hsl\(\d{1,3}, ?\d{1,3}%, ?\d{1,3}%\))/,
	/$/,
])

export function findLowestAndHighestNotes(events: immutable.OrderedMap<Id, {note: number}>) {
	return {
		lowestNote: findLowestNote(events),
		highestNote: findHighestNote(events),
	}
}

export function findLowestNote(events: immutable.OrderedMap<Id, {note: number}>): number {
	let lowest = Number.MAX_VALUE

	events.forEach(event => {
		if (event.note < lowest) {
			lowest = event.note
		}
	})

	if (lowest === Number.MAX_VALUE) {
		return 0
	}

	return lowest
}

export function findHighestNote(events: immutable.OrderedMap<Id, {note: number}>): number {
	let highest = Number.MIN_VALUE

	events.forEach(event => {
		if (event.note > highest) {
			highest = event.note
		}
	})

	if (highest === Number.MIN_VALUE) {
		return 127
	}

	return highest
}

export function sumPoints(...points: Point[]) {
	return points.reduce(_sumPoints)
}

function _sumPoints(a: Point, b: Point) {
	return {
		x: a.x + b.x,
		y: a.y + b.y,
	}
}

export function roomNameCleaner(name: string): string {
	return name
		.replace(/^\//, '')
		.replace(/%3F.*/, '')
		.replace(/\/.*/, '')
		.trim()
		.replace(/(%20)+/g, ' ')
		.replace(/ +/g, '-')
		.substring(0, maxRoomNameLength)
}

export function isId(val: unknown): val is Id {
	return typeof val === 'string' && val.length > 0
}

export function toBeats(seconds: number, bpm: number) {
	return preciseMultiply(seconds, preciseDivide(bpm, 60))
}

export function fromBeats(beats: number, bpm: number) {
	return preciseMultiply(beats, preciseDivide(60, bpm))
}

export function arrayToESMap<T, U extends keyof T>(array: readonly T[] = [], idKey: U): Map<T[typeof idKey], T> {
	return array.reduce((map, item) => {
		return map.set(item[idKey], item)
	}, new Map<T[typeof idKey], T>())
}

export function arrayToESIdKeyMap<T extends {id: Id}>(array: readonly T[] = []): Map<Id, T> {
	return arrayToESMap(array, 'id')
}

// Curve functions
const length = 65535
const halfLength = Math.floor(length / 2) // 32767

/** b is value when input is 0 */
function createExpWaveShaperCurve(b: number) {
	return new Float32Array(length).map((_, i) => {
		if (i < halfLength) {
			return b
		} else {
			const x = (i - halfLength) / halfLength
			return b ** (-x + 1)
		}
	})
}

function createExpCurveFunctions(b: number): CurveFunctions {
	return {
		curve: (x: number) => b ** (-x + 1),
		unCurve: (x: number) => (-Math.log(x) / Math.log(b)) + 1,
		waveShaperCurve: createExpWaveShaperCurve(b),
	}
}

export interface CurveFunctions {
	readonly curve: (x: number) => number
	readonly unCurve: (x: number) => number
	readonly waveShaperCurve: Float32Array | null
}

export const filterFreqCurveFunctions = createExpCurveFunctions(0.001)

export const oscillatorFreqCurveFunctions = createExpCurveFunctions(0.001)

export const lfoFreqCurveFunctions = createExpCurveFunctions(0.0001)

export const defaultBipolarCurveFunctions: CurveFunctions = {
	curve: (x: number) => x,
	unCurve: (x: number) => x,
	waveShaperCurve: new Float32Array([-1, 1]),
}

export const defaultUnipolarCurveFunctions: CurveFunctions = {
	curve: (x: number) => x,
	unCurve: (x: number) => x,
	waveShaperCurve: new Float32Array([0, 0, 1]),
}

// Standard curve functions
export function applyCurve(value: number, curve: number) {
	return value ** curve
}

export function reverseCurve(value: number, curve: number) {
	return clamp(value ** (1 / curve), 0, 1)
}

// Other
export function assertUnreachable(x: never): never {
	throw new Error(`Didn't expect to get here`)
}
