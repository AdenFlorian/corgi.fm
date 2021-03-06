import React from 'react'
import * as Immutable from 'immutable'
import {CssColor} from '@corgifm/common/shamu-color'
import {Input, InputEventNoteon, InputEventNoteoff} from 'webmidi'
import {midiActions} from '@corgifm/common/common-types'
import {nodeToNodeActions, NodeToNodeAction} from '@corgifm/common/server-constants'
import {arrayToESIdKeyMap, applyOctave} from '@corgifm/common/common-utils'
import {ExpMidiOutputPort} from '../../ExpMidiPorts'
import {CorgiNode, CorgiNodeArgs, useNodeContext} from '../../CorgiNode'
import {CorgiObjectChangedEvent} from '../../CorgiEvents'
import {ExpPorts} from '../../ExpPorts'
import {KeyboardNodeExtra} from './KeyboardNodeView'
import {ExpCustomNumberParam, ExpCustomNumberParamReadonly, ExpCustomNumberParams,
	ExpReferenceParams, ExpReferenceParam, ExpReferenceParamReadonly} from '../../ExpParams'
import {useNumberChangedEvent, useObjectChangedEvent} from '../../hooks/useCorgiEvent'
import {ExpKeyboardStateRaw, makeExpKeyboardState, expKeyboardsActions} from '@corgifm/common/redux'
import {expKeyboardStateParamId} from '@corgifm/common/common-constants'
import {qwertyKeyboardNotesService} from '../../../QwertyKeyboardNotesService'

export class KeyboardNode extends CorgiNode {
	protected readonly _ports: ExpPorts
	protected readonly _customNumberParams: ExpCustomNumberParams
	protected readonly _referenceParams: ExpReferenceParams
	private readonly _midiOutputPort: ExpMidiOutputPort
	private readonly _onInputChanged = new CorgiObjectChangedEvent<Input | undefined>(undefined)
	private readonly _octave: ExpCustomNumberParam
	public get octave() {return this._octave as ExpCustomNumberParamReadonly}
	private readonly _keyboardState: ExpReferenceParam<ExpKeyboardStateRaw>
	public get keyboardState() {return this._keyboardState as ExpReferenceParamReadonly<ExpKeyboardStateRaw>}
	private currentInput?: Input

	public constructor(corgiNodeArgs: CorgiNodeArgs) {
		super(corgiNodeArgs, {name: 'Keyboard', color: CssColor.yellow})

		this._keyboardState = new ExpReferenceParam(
			expKeyboardStateParamId, makeExpKeyboardState({}) as ExpKeyboardStateRaw, 'keyboardState')
		this._referenceParams = arrayToESIdKeyMap([this._keyboardState] as unknown as ExpReferenceParam[])

		this._midiOutputPort = new ExpMidiOutputPort('output', 'output', this)
		this._ports = arrayToESIdKeyMap([this._midiOutputPort])

		this._octave = new ExpCustomNumberParam('octave', 4, -1, 12)
		this._customNumberParams = arrayToESIdKeyMap([this._octave])

		if (this.isLocallyOwned) qwertyKeyboardNotesService.subscribe(this._onQwertyNote)
	}

	public render() {
		return this.getDebugView(
			<div>
				<KeyboardNodeExtra
					onInputSelected={this._subscribeToInput}
					inputChangedEvent={this._onInputChanged}
				/>
			</div>
		)
	}

	protected _enable() {}
	protected _disable() {}

	protected _dispose() {
		this._unsubscribeFromCurrentInput()
		qwertyKeyboardNotesService.unsubscribe(this._onQwertyNote)
	}

	protected _onMainGraphLoaded() {
		this._keyboardState.value.current.pressedKeys.forEach(x => {
			this.onNoteOn(x, 1, true)
		})
	}

	private readonly _subscribeToInput = (input: Input) => {
		this._unsubscribeFromCurrentInput()

		this.currentInput = input

		input.addListener('noteon', 'all', this._onNoteOn)
		input.addListener('noteoff', 'all', this._onNoteOff)

		this._onInputChanged.invokeImmediately(this.currentInput)
	}

	private _unsubscribeFromCurrentInput() {
		if (!this.currentInput) return

		this.currentInput.removeListener('noteon', 'all', this._onNoteOn)

		delete this.currentInput
		this._onInputChanged.invokeImmediately(this.currentInput)
	}

	private readonly _onNoteOn = (event: InputEventNoteon) => {
		this.onNoteOn(event.note.number, event.velocity)
		this._dispatchKeyDown(event.note.number % 12)
	}

	private readonly _onNoteOff = (event: InputEventNoteoff) => {
		this.onNoteOff(event.note.number)
		this._dispatchKeyUp(event.note.number % 12)
	}

	private readonly _onQwertyNote = (key: number, gate: boolean) => {
		if (gate) {
			this.onNoteOn(key, 1, true)
			this._dispatchKeyDown(key)
		} else {
			this.onNoteOff(key, true)
			this._dispatchKeyUp(key)
		}
	}

	private readonly _dispatchKeyDown = (key: number) => {
		this._dispatch(expKeyboardsActions.keysDown(this.keyboardState.value.current.id, Immutable.Set([key])))
	}

	private readonly _dispatchKeyUp = (key: number) => {
		this._dispatch(expKeyboardsActions.keysUp(this.keyboardState.value.current.id, Immutable.Set([key])))
	}

	public readonly onNoteOn = (note: number, velocity: number, useOctave = false) => {
		if (!this._enabled) return
		const actualNote = useOctave ? applyOctave(note, this.octave.value) : note
		const midiAction = midiActions.note(this._audioContext.currentTime, true, actualNote, velocity)
		this._midiOutputPort.sendMidiAction(midiAction)
		this.singletonContext.webSocketService.nodeToNode(nodeToNodeActions.midi(this.id, midiAction))
	}

	public readonly onNoteOff = (note: number, useOctave = false) => {
		if (!this._enabled) return
		const actualNote = useOctave ? applyOctave(note, this.octave.value) : note
		const midiAction = midiActions.note(this._audioContext.currentTime, false, actualNote, 0)
		this._midiOutputPort.sendMidiAction(midiAction)
		this.singletonContext.webSocketService.nodeToNode(nodeToNodeActions.midi(this.id, midiAction))
	}

	public readonly onNoteOffAndOn = (offNote: number, onNote: number, velocity: number, useOctave = false) => {
		if (!this._enabled) return
		const actualOffNote = useOctave ? applyOctave(offNote, this.octave.value) : offNote
		const actualOnNote = useOctave ? applyOctave(onNote, this.octave.value) : onNote
		const midiActionOn = midiActions.note(this._audioContext.currentTime, true, actualOnNote, velocity, 'all', actualOffNote)
		this._midiOutputPort.sendMidiAction(midiActionOn)
		this.singletonContext.webSocketService.nodeToNode(nodeToNodeActions.midi(this.id, midiActionOn))
	}

	protected readonly _onNodeToNode = (action: NodeToNodeAction) => {
		if (action.type === 'NODE_TO_NODE_MIDI') {
			this._midiOutputPort.sendMidiAction({
				...action.midiAction,
				time: this._audioContext.currentTime,
			})
		}
	}
}

export function useExpKeyboardOctave() {
	const nodeContext = useNodeContext() as KeyboardNode
	return useNumberChangedEvent(nodeContext.octave.onChange)
}

export function useExpKeyboardPressedKeys() {
	const nodeContext = useNodeContext() as KeyboardNode
	return useObjectChangedEvent(nodeContext.keyboardState.value)
}
