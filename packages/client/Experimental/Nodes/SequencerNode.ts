/* eslint-disable no-empty-function */
import {CssColor} from '@corgifm/common/shamu-color'
import {toBeats, fromBeats} from '@corgifm/common/common-utils'
import {preciseSubtract, preciseAdd, midiPrecision} from '@corgifm/common/midi-types'
import {SequencerEvent, midiActions} from '@corgifm/common/common-types'
import {logger} from '../../client-logger'
import {ExpCustomNumberParam, buildCustomNumberParamDesc} from '../ExpParams'
import {ExpMidiOutputPort} from '../ExpMidiPorts'
import {CorgiNode, CorgiNodeArgs} from '../CorgiNode'

interface NextEvent extends SequencerEvent {
	readonly distanceFromMainCursor: number
}

const myPrecision = 1000

// TODO Good candidate for writing in Rust?
class EventStreamReader {
	private _beatCursor = 0
	private readonly _eventStream = new EventStream()
	private _currentEvent: SequencerEvent

	public constructor() {
		this._currentEvent = this._eventStream.getNextEvent()
	}

	public read(beatsToRead: number): readonly NextEvent[] {
		if (beatsToRead <= 0) {
			return []
		}

		const readEvents: NextEvent[] = []

		let distanceFromMainCursor = Math.round((this._currentEvent.beat - this._beatCursor) * midiPrecision) / midiPrecision

		if (distanceFromMainCursor.toString().length > 8) logger.warn('precision error oh no A: ', {distanceFromMainCursor, ceb: this._currentEvent.beat, bc: this._beatCursor})

		while (distanceFromMainCursor < beatsToRead) {
			readEvents.push({
				...this._currentEvent,
				distanceFromMainCursor,
			})
			this._currentEvent = this._eventStream.getNextEvent()
			distanceFromMainCursor = Math.round((this._currentEvent.beat - this._beatCursor) * midiPrecision) / midiPrecision
			if (distanceFromMainCursor.toString().length > 8) logger.warn('precision error oh no B: ', {distanceFromMainCursor, ceb: this._currentEvent.beat, bc: this._beatCursor})
		}

		this._beatCursor = Math.round((this._beatCursor + beatsToRead) * myPrecision) / myPrecision

		return readEvents
	}
}

class EventStream {
	public readonly beatLength = 16
	private _currentIndex = -1
	private _loops = 0
	private readonly _events: readonly SequencerEvent[] = [
		{gate: true, beat: 0, note: 60},
		{gate: true, beat: 2, note: 63},
		{gate: true, beat: 3, note: 67},
		{gate: true, beat: 4, note: 60},
		{gate: true, beat: 6, note: 63},
		{gate: true, beat: 7, note: 67},
		{gate: true, beat: 7.5, note: 70},
		{gate: true, beat: 8, note: 69},
		{gate: true, beat: 9, note: 65},
		{gate: true, beat: 10, note: 63},
		{gate: true, beat: 10.5, note: 65},
		{gate: true, beat: 11, note: 67},
		{gate: true, beat: 12, note: 60},
		{gate: true, beat: 13, note: 58},
		{gate: true, beat: 13.5, note: 62},
		{gate: true, beat: 14, note: 60},
		{gate: false, beat: 15.5},
	]

	public getNextEvent(): SequencerEvent {
		this._currentIndex++

		if (this._currentIndex >= this._events.length) {
			this._loops++
			this._currentIndex = 0
		}

		const nextEvent = this._events[this._currentIndex]

		return {
			...nextEvent,
			beat: nextEvent.beat + (this._loops * this.beatLength),
		}
	}
}

export class SequencerNode extends CorgiNode {
	private _cursor: number
	private readonly _eventStream: EventStreamReader
	private readonly _midiOutputPort: ExpMidiOutputPort
	private _startSongTime: number

	public constructor(
		corgiNodeArgs: CorgiNodeArgs,
	) {
		const midiOutputPort = new ExpMidiOutputPort('output', 'output', () => this)

		super(corgiNodeArgs, {
			ports: [midiOutputPort],
			customNumberParams: new Map<Id, ExpCustomNumberParam>([
				// TODO Store in private class field
				buildCustomNumberParamDesc('tempo', 240, 0.001, 999.99, 3),
			]),
		})

		this._startSongTime = -1

		this._midiOutputPort = midiOutputPort

		this._cursor = 0
		this._eventStream = new EventStreamReader()

		// Make sure to add these to the dispose method!
	}

	public getColor(): string {return CssColor.green}
	public getName() {return 'Sequencer'}

	private get _tempo() {return this._customNumberParams.get('tempo')!.value}

	public render() {return this.getDebugView()}

	public onTick(currentGlobalTime: number, maxReadAhead: number) {
		super.onTick(currentGlobalTime, maxReadAhead)
		if (!this._enabled) return

		if (this._startSongTime < 0) {
			this._startSongTime = Math.ceil((currentGlobalTime + 0.1) * 10) / 10
		}

		const cursor = this._cursor
		const songStartTime = this._startSongTime
		const tempo = this._tempo
		const currentSongTime = preciseSubtract(currentGlobalTime, songStartTime)
		const targetSongTimeToReadTo = Math.ceil(preciseAdd(currentSongTime, maxReadAhead) * myPrecision) / myPrecision
		const distanceSeconds = Math.round(preciseSubtract(targetSongTimeToReadTo, cursor) * myPrecision) / myPrecision

		if (distanceSeconds <= 0) return

		const distanceBeats = toBeats(distanceSeconds, tempo)
		const events = this._eventStream.read(distanceBeats)

		events.forEach(event => {
			const eventDistanceFromCursor = event.distanceFromMainCursor
			const fromBeats_ = fromBeats(eventDistanceFromCursor, tempo)
			const songStartPlusCursor = Math.round((songStartTime + cursor) * myPrecision) / myPrecision
			const eventStart = Math.round((songStartPlusCursor + fromBeats_) * myPrecision) / myPrecision

			if (eventStart.toString().length > 8) logger.warn('precision error oh no: ', {eventDistanceFromCursor, fromBeats_, songStartPlusCursor, eventStart})

			if (event.note) {
				this._midiOutputPort.sendMidiAction(midiActions.note(eventStart, event.gate, event.note, 1))
			} else {
				this._midiOutputPort.sendMidiAction(midiActions.gate(eventStart, event.gate))
			}
		})

		this._cursor = targetSongTimeToReadTo
	}

	protected _enable() {
	}

	protected _disable() {
		this._midiOutputPort.sendMidiAction(midiActions.gate(this._startSongTime + this._cursor, false))
		this._startSongTime = -1
		this._cursor = 0
	}

	protected _dispose() {
	}
}
