import {Store} from 'redux'
import {logger} from '../common/logger'
import {localMidiKeyPress, localMidiKeyUp} from '../common/redux/local-middleware'

declare global {
	interface Navigator {
		requestMIDIAccess: (any: any) => Promise<any>
	}
}

let _store: Store

export function setupMidiSupport(store: Store) {
	_store = store

	if (navigator.requestMIDIAccess) {
		navigator.requestMIDIAccess({
			sysex: false, // this defaults to 'false' and we won't be covering sysex in this article.
		})
			.then(onMidiSuccess, onMidiFailure)
	} else {
		onMidiNotAvailable()
	}
}

function onMidiNotAvailable() {
	logger.log('No MIDI support in your browser. Try Chrome or Opera.')
}

function onMidiFailure() {
	logger.log('fail')
}

interface MidiAccess {
	onstatechange: (e: MidiStateChangeEvent) => void
	inputs: MIDIInputMap
}

interface MidiStateChangeEvent extends Event {
	port: MIDIInput
}

interface MidiMessageEvent extends Event {
	data: any
}

type MIDIInputMap = Readonly<Map<any, any>>

interface MIDIInput {
	name: string
	manufacturer: string
	state: string,
	type: 'input' | string
	valueOf: () => {
		onmidimessage: (e: MidiMessageEvent) => void,
	}
}

function onMidiSuccess(midiAccess: MidiAccess) {
	logger.log('success: ', midiAccess)

	for (const input of midiAccess.inputs.values()) {
		logger.log('input: ', input)
		input.valueOf().onmidimessage = onMidiMessage
	}

	midiAccess.onstatechange = onStateChange
}

function onStateChange(event: MidiStateChangeEvent) {
	logger.log('midi state change: ', event)

	if (event.port.type === 'input') {
		onInputStateChange(event.port)
	}
}

function onInputStateChange(input: MIDIInput) {
	if (input.state === 'disconnected') {
		onInputDisconnected(input)
	} else if (input.state === 'connected') {
		onInputConnected(input)
	}
}

function onInputDisconnected(input: MIDIInput) {
	logger.log('input disconnected: ', input)
}

function onInputConnected(input: MIDIInput) {
	logger.log('input connected: ', input)
	input.valueOf().onmidimessage = onMidiMessage
}

function onMidiMessage(event: MidiMessageEvent) {
	logger.debug('MIDI MESSAGE!', event.data)
	// const note = message.data[1]
	// const velocity = message.data[0]

	const data = event.data
	// tslint:disable-next-line:no-bitwise
	// const cmd = data[0] >> 4
	// tslint:disable-next-line:no-bitwise
	// const channel = data[0] & 0xf
	// tslint:disable-next-line:no-bitwise
	const type = data[0] & 0xf0
	const note = data[1]
	const velocity = data[2]

	// with pressure and tilt off
	// note off: 128, cmd: 8
	// note on: 144, cmd: 9
	// pressure / tilt on
	// pressure: 176, cmd 11:
	// bend: 224, cmd: 14

	if (velocity === 0) {
		_store.dispatch(localMidiKeyUp(note))
	} else {
		switch (type) {
			case 144:
				_store.dispatch(localMidiKeyPress(note))
				break
			case 128:
				_store.dispatch(localMidiKeyUp(note))
				break
		}
	}
}
