import {List, Record} from 'immutable'
import {createThisShouldntHappenError} from '../common/common-utils'
import {logger} from '../common/logger'

/*
looping is hard
i would like a way to abstract away the fact that it loops from as much of this logic as possible
i got looping kind of working, but its not perfect and has edge cases that fail
the only thing that really needs to know about looping is the thing that reads the events, or provides the events
i wonder if i can make some kind of  stream that has events fed in from the original clip
	but with the times altered according to bpm and looping and stuff

midiClipStreamReader
- getNextEvent() => {startBeat: 1/4, note: 60}
- readBeats(0.5 beats) => {startBeat: 1/4, note: 60}
- getEventsInRange(range) => [{startTime: 1230.0, note: 60}, {startTime: 1231.5, note: 62}]
should the reader return events in the context of the midi clip or in the context of the song/app/scheduler?
what is needed to convert from clip context to global?
- current time
- bpm
- clip length?

clip
- length: 2
- events: [0.0, 0.25, 1.0, 1.5, 1.99]

g = global time
c = clip time
L - clip length

g    | c
0.00 | 0.00
0.25 | 0.25
1.00 | 1.00
1.50 | 1.50
1.99 | 1.99
2.00 | 0.00
2.25 | 0.25
3.00 | 1.00
3.99 | 1.99
4.00 | 0.00
5.00 | 1.00
6.00 | 0.00

c = f(g) = g % L

midiClipStreamReader needs to keep track of loop count

a system that use the midiClipStreamReader
scheduler

*/

const precision = 1000000

export class Range {
	/** exclusive */
	public static readonly maxSafeNumber = 100000000
	public readonly end: number

	constructor(
		/** Always 0 or greater, defaults to 0 */
		public readonly start = 0,
		/** Always 0 or greater, defaults to 0 */
		public readonly length = 0,
	) {
		if (start < 0) throw new Error('start must be >= 0')
		if (length < 0) throw new Error('length must be >= 0')
		if (Math.max(this.start, this.start + this.length) >= Range.maxSafeNumber) {
			throw new Error('too big')
		}
		this.end = ((this.start * precision) + (this.length * precision)) / precision
	}

	public normalize(max: number) {
		return new Range(
			((this.start * precision) % (max * precision) / precision),
			this.length,
		)
	}
}

export interface MidiEvent {
	startBeat: number,
	note: number
}

export const makeMidiClip = Record({
	length: 4,
	loop: true,
	events: List<MidiEvent>(),
})

export type MidiEvents = MidiClip['events']

export type MidiClip = ReturnType<typeof makeMidiClip>

// TODO * 1000 is gonna fail eventually, need something more robust
export class NoteScheduler {
	constructor(
		private readonly _clip: MidiClip,
	) {
		if (this._clip.length <= 0) throw new Error(`clipLength must be > 0`)
	}

	// Maybe range should only ever be a simple number, divisible by 10 or something
	public getNotes(range: Range): MidiEvents {
		// logger.log('getNotes')
		// logger.log('range.start: ', range.start)
		// logger.log('range.end: ', range.end)
		// logger.log('range.length: ', range.length)
		if (range.length === 0) {
			return this._checkSingleBeat(range.start)
		}

		if (range.length > 0) {
			return this._checkBeatRange(range)
		}

		throw createThisShouldntHappenError()
	}

	private _checkSingleBeat(start: number): MidiEvents {
		logger.log('_checkSingleBeat')
		const clipEventStart = (start * 1000) % (this._clip.length * 1000)

		return this._clip.events.filter(x => {
			return x.startBeat * 1000 === clipEventStart
		})
	}

	private _checkBeatRange(range: Range): MidiEvents {
		if (this._rangeIsWithinBounds(range)) {
			return this._checkWithinClipBounds(range.normalize(this._clip.length))
		} else {
			return this._checkCrossingClipBounds(range.normalize(this._clip.length))
		}
	}

	private _rangeIsWithinBounds(range: Range) {
		if (range.length <= this._clip.length) {
			const {start, end} = range.normalize(this._clip.length)

			return 0 <= start && end <= this._clip.length
		} else {
			return false
		}
		// return range.length <= this._clip.length
		// 	&& (range.start === 0 || range.end <= this._clip.length)
	}

	private _checkWithinClipBounds({start, end}: Range): MidiEvents {
		logger.log('_checkWithinClipBounds')
		return this._clip.events.filter(x => {
			return start <= x.startBeat && x.startBeat < end
		})
	}

	private _checkCrossingClipBounds(range: Range): MidiEvents {
		logger.log('_checkCrossingClipBounds')
		const length = this._clip.length - range.start
		const newEnd = range.start + length
		const excess = range.end - newEnd
		// console.log('range.start: ', range.start)
		// console.log('end: ', range.end)
		// console.log('this._clip.length: ', this._clip.length)
		// console.log('length: ', length)
		// console.log('newEnd: ', newEnd)
		// console.log('excess: ', excess)

		const events = this._clip.events.filter(x => {
			return range.start <= x.startBeat && x.startBeat < newEnd
		})

		if (excess === 0) {
			return events
		} else {
			return events.concat(this.getNotes(new Range(0, excess)))
		}

		// it crosses bound
		// where is start going to be?
		// is the range normalized?
		// should it be?
		// yes?
		// might have to normalize each time it loops
		// this will have some kind of loop or recursion
		// might be useful to be able to debug here
		// need to split into multiple normalized ranges,
		//   then check each range against the notes
		// now need to loop, while excess > 0

		// start: 1.00, length: 30.00,
		// start: 0.00, length: 29.00,
	}
}
