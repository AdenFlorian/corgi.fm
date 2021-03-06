import {CssColor} from '@corgifm/common/shamu-color'
import {MidiAction} from '@corgifm/common/common-types'
import {oscillatorFreqCurveFunctions, arrayToESIdKeyMap} from '@corgifm/common/common-utils'
import {maxPitchFrequency} from '@corgifm/common/common-constants'
import {adsrValueToString} from '../../client-constants'
import {ExpCustomNumberParam, ExpCustomNumberParams} from '../ExpParams'
import {ExpMidiOutputPort, ExpMidiInputPort} from '../ExpMidiPorts'
import {CorgiNode, CorgiNodeArgs} from '../CorgiNode'
import {ExpNodeAudioOutputPort, ExpPorts} from '../ExpPorts'
import {midiNoteToFrequency} from '../../WebAudio'
import {PolyAlgorithm, RoundRobin, VoiceIndex} from './NodeHelpers/PolyAlgorithms'
import {LabWaveShaperNode, LabConstantSourceNode} from './PugAudioNode/Lab'

const maxVoiceCount = 4

export class ManualPolyphonicMidiConverterNode extends CorgiNode {
	protected readonly _ports: ExpPorts
	protected readonly _customNumberParams: ExpCustomNumberParams
	private readonly _midiOutputPorts: readonly ExpMidiOutputPort[]
	private readonly _pitchOutputPorts: readonly ExpNodeAudioOutputPort[]
	private readonly _pitchSources: readonly LabConstantSourceNode[]
	private readonly _waveShapers: readonly LabWaveShaperNode[]
	private readonly _portamento: ExpCustomNumberParam
	private readonly _voiceCount: ExpCustomNumberParam
	private readonly _algorithm: PolyAlgorithm

	public constructor(corgiNodeArgs: CorgiNodeArgs) {
		super(corgiNodeArgs, {name: 'Manual Polyphonic Midi Converter', color: CssColor.yellow})

		this._pitchSources = new Array(maxVoiceCount).fill(0).map(() => new LabConstantSourceNode({audioContext: this._audioContext, voiceMode: 1, creatorName: 'ManualPolyphonicMidiConverterNode'}))
		this._pitchSources.forEach(voice => {
			voice.offset.onMakeVoice = offset => offset.setValueAtTime(0, 0)
		})
		this._waveShapers = new Array(maxVoiceCount).fill(0).map(() => new LabWaveShaperNode({audioContext: this._audioContext, voiceMode: 'autoPoly', creatorName: 'ManualPolyphonicMidiConverterNode'}))
		this._waveShapers.forEach(waveShaper => {
			// eslint-disable-next-line no-param-reassign
			waveShaper.curve = new Float32Array([-3, 1])
		})

		const midiInputPort = new ExpMidiInputPort('input', 'input', this, midiAction => this._onMidiMessage.bind(this)(midiAction))
		this._midiOutputPorts = this._pitchSources.map((_, index) => {
			return new ExpMidiOutputPort('gate' + index, 'gate' + index, this)
		})
		this._pitchOutputPorts = this._pitchSources.map((_, index) => {
			return new ExpNodeAudioOutputPort('pitch' + index, 'pitch' + index, this, this._pitchSources[index].connect(this._waveShapers[index]))
		})
		this._ports = arrayToESIdKeyMap([midiInputPort, ...this._midiOutputPorts, ...this._pitchOutputPorts])

		this._portamento = new ExpCustomNumberParam('portamento', 0, 0, 8, {curve: 3, valueString: adsrValueToString})
		this._voiceCount = new ExpCustomNumberParam('voiceCount', 4, 1, maxVoiceCount, {valueString: val => Math.round(val).toString()})
		this._customNumberParams = arrayToESIdKeyMap([this._portamento, this._voiceCount])
		
		this._algorithm = new RoundRobin(this._voiceCount.onChange)
		this._voiceCount.onChange.subscribe(this._onVoiceCountChange)
	}

	public render = () => this.getDebugView()

	protected _enable() {}
	protected _disable() {}

	protected _dispose() {
		this._pitchSources.forEach(voice => {
			voice.dispose()
		})
		this._waveShapers.forEach(waveShaper => {
			waveShaper.dispose()
		})
		this._voiceCount.onChange.unsubscribe(this._onVoiceCountChange)
	}

	private readonly _onVoiceCountChange = (newVoiceCount: number) => {
		const realVoiceCount = Math.round(newVoiceCount)
		for (let i = 0; i < maxVoiceCount; i++) {
			if (i < realVoiceCount) {
				this._midiOutputPorts[i].enable()
				this._pitchOutputPorts[i].enable()
			} else {
				this._midiOutputPorts[i].disable()
				this._pitchOutputPorts[i].disable()
			}
		}
	}

	private _onMidiMessage(midiAction: MidiAction) {
		if (!this._enabled && midiAction.type !== 'VOICE_COUNT_CHANGE') return

		if (midiAction.type === 'MIDI_NOTE') {
			this._onMidiNoteAction(midiAction)
		}
	}

	private _onMidiNoteAction(midiAction: Extract<MidiAction, {type: 'MIDI_NOTE'}>) {
		if (midiAction.gate === true) {
			if (midiAction.offNote !== undefined) this._onMidiNoteOff({...midiAction, note: midiAction.offNote, velocity: 0, gate: false})
			this._onMidiNoteOn(midiAction)
		} else {
			this._onMidiNoteOff(midiAction)
		}
	}

	private _onMidiNoteOn(midiAction: Extract<MidiAction, {type: 'MIDI_NOTE'}>) {
		const voiceIndex = this._algorithm.getVoiceForNoteOn(midiAction.note)

		this._updatePitch(midiAction.note, midiAction.time, voiceIndex)
		this._midiOutputPorts[voiceIndex as number].sendMidiAction(midiAction)
	}

	private _onMidiNoteOff(midiAction: Extract<MidiAction, {type: 'MIDI_NOTE'}>) {
		const voiceIndex = this._algorithm.getVoiceForNoteOff(midiAction.note)

		if (voiceIndex === undefined) return

		this._midiOutputPorts[voiceIndex as number].sendMidiAction(midiAction)
	}

	private _updatePitch(note: number, time: number, voiceIndex: VoiceIndex) {
		const frequency = midiNoteToFrequency(note)
		const normalized = oscillatorFreqCurveFunctions.unCurve(frequency / maxPitchFrequency)
		this._pitchSources[voiceIndex as number].offset.setTargetAtTime(normalized, time, this._portamento.value)
	}
}
