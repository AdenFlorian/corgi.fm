import {IMidiNote} from '../../common/MidiNote'
import {getFrequencyUsingHalfStepsFromA4} from '../music/music-functions'

export interface IBasicInstrumentOptions {
	destination: any
	audioContext: AudioContext
	voiceCount: number
	oscillatorType: OscillatorType
}

export class BasicInstrument {
	private _panNode: StereoPannerNode
	private _audioContext: AudioContext
	private _gain: GainNode
	private _lowPassFilter: BiquadFilterNode
	private _previousNotes: number[] = []
	private _oscillatorType: OscillatorType
	private _attackTimeInSeconds: number = 0.01
	private _releaseTimeInSeconds: number = 3
	private _voices: Voices

	constructor(options: IBasicInstrumentOptions) {
		this._audioContext = options.audioContext

		this._panNode = this._audioContext.createStereoPanner()

		this._lowPassFilter = this._audioContext.createBiquadFilter()
		this._lowPassFilter.type = 'lowpass'
		this._lowPassFilter.frequency.value = 10000

		this._gain = this._audioContext.createGain()
		this._gain.gain.value = 1

		// this._lfo.connect(lfoGain)
		// 	.connect(this._gain.gain)

		this._panNode.connect(this._lowPassFilter)
		this._lowPassFilter.connect(this._gain)
		this._gain.connect(options.destination)

		if (module.hot) {
			module.hot.dispose(this.dispose)
		}

		this._oscillatorType = options.oscillatorType

		this._voices = new Voices(options.voiceCount, this._audioContext, this._panNode, this._oscillatorType)
	}

	public setPan = (pan: number) => this._panNode.pan.setValueAtTime(pan, this._audioContext.currentTime)

	public setLowPassFilterCutoffFrequency = (frequency: number) =>
		this._lowPassFilter.frequency.setValueAtTime(frequency, this._audioContext.currentTime)

	public setOscillatorType = (type: OscillatorType) => {
		this._oscillatorType = type
		this._voices.setOscillatorType(type)
	}

	public setAttack = (attackTimeInSeconds: number) => this._attackTimeInSeconds = attackTimeInSeconds

	public setRelease = (releaseTimeInSeconds: number) => this._releaseTimeInSeconds = releaseTimeInSeconds

	public setMidiNotes = (midiNotes: IMidiNote[]) => {
		const newNotes = midiNotes.filter(x => this._previousNotes.includes(x) === false)
		const offNotes = this._previousNotes.filter(x => midiNotes.includes(x) === false)

		offNotes.forEach(note => {
			this._voices.releaseNote(note, this._releaseTimeInSeconds)
		})

		newNotes.forEach(note => {
			this._voices.playNote(note, this._oscillatorType, this._attackTimeInSeconds)
		})

		this._previousNotes = midiNotes
	}

	public dispose = () => undefined
}

const A4 = 69

function midiNoteToFrequency(midiNote: IMidiNote): number {
	if (midiNote === undefined) return 0

	const halfStepsFromA4 = midiNote - A4
	return getFrequencyUsingHalfStepsFromA4(halfStepsFromA4)
}

class Voices {
	private _availableVoices: Voice[] = []

	constructor(voiceCount: number, audioContext: AudioContext, destination: AudioNode, oscType: OscillatorType) {
		for (let i = 0; i < voiceCount; i++) {
			this._availableVoices.push(new Voice(audioContext, destination, oscType))
		}
	}

	public playNote(note: number, oscType: OscillatorType, attackTimeInSeconds: number) {
		const voice = this._getVoice()

		voice.playNote(note, oscType, attackTimeInSeconds)
	}

	public releaseNote = (note: number, timeToReleaseInSeconds: number) => {
		const voice = this._availableVoices.find(x => x.playingNote === note)

		if (voice) {
			voice.release(timeToReleaseInSeconds)
			// this._availableVoices = this._availableVoices.filter(x => x !== voice)
			// this._availableVoices.unshift(voice)
		}
	}

	public setOscillatorType(type: OscillatorType) {
		this._availableVoices.forEach(x => x.setOscillatorType(type))
	}

	private _getVoice(): Voice {
		// TODO Pick voice that was played last
		const voice = this._availableVoices.shift()
		this._availableVoices.push(voice)
		return voice
	}
}

class Voice {
	public playingNote: number = -1
	public playStartTime: number = 0
	private _oscillator: OscillatorNode
	private _gain: GainNode
	private _audioContext: AudioContext

	constructor(audioContext: AudioContext, destination: AudioNode, oscType: OscillatorType) {
		this._audioContext = audioContext
		this._oscillator = audioContext.createOscillator()
		this._oscillator.start()
		this._oscillator.type = oscType
		this._oscillator.frequency.setValueAtTime(0, this._audioContext.currentTime)

		this._gain = audioContext.createGain()
		this._gain.gain.setValueAtTime(0, this._audioContext.currentTime)

		this._oscillator.connect(this._gain)
			.connect(destination)
	}

	public playNote(note: number, oscType: OscillatorType, attackTimeInSeconds: number) {
		this._cancelAndHoldOrJustCancel()
		this._gain.gain.setValueAtTime(0, this._audioContext.currentTime)
		this._gain.gain.linearRampToValueAtTime(1, this._audioContext.currentTime + attackTimeInSeconds)

		this._oscillator.type = oscType
		this._oscillator.frequency.value = midiNoteToFrequency(note)

		this.playStartTime = this._audioContext.currentTime

		this.playingNote = note
	}

	public release = (timeToReleaseInSeconds: number) => {
		this._cancelAndHoldOrJustCancel()
		this._gain.gain.setValueAtTime(this._gain.gain.value, this._audioContext.currentTime)
		this._gain.gain.exponentialRampToValueAtTime(0.00001, this._audioContext.currentTime + timeToReleaseInSeconds)

		this.playingNote = -1
	}

	public setOscillatorType = (oscType: OscillatorType) => {
		if (this._oscillator.type !== oscType) {
			this._oscillator.type = oscType
		}
	}

	public dispose = () => {
		this._oscillator.stop()
		this._oscillator.disconnect()
		delete this._oscillator
		this._gain.disconnect()
		delete this._gain
	}

	private _cancelAndHoldOrJustCancel = () => {
		const gain = this._gain.gain as any
		// cancelAndHoldAtTime is not implemented in firefox
		if (gain.cancelAndHoldAtTime) {
			gain.cancelAndHoldAtTime(this._audioContext.currentTime)
		} else {
			this._gain.gain.cancelScheduledValues(this._audioContext.currentTime)
		}
	}
}
