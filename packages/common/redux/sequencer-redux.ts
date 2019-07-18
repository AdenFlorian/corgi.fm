import {List, Map, Set} from 'immutable'
import {createSelector} from 'reselect'
import {ActionType} from 'typesafe-actions'
import {
	ConnectionNodeType, Id, IMultiStateThing, isSequencerNodeType,
} from '../common-types'
import {
	makeMidiClip, makeMidiClipEvent, MidiClip, MidiClipEvent, MidiClipEvents,
} from '../midi-types'
import {emptyMidiNotes, IMidiNote, MidiNotes} from '../MidiNote'
import {
	selectAllConnections, selectConnectionsWithSourceIds,
	selectConnectionsWithTargetIds,
} from './connections-redux'
import {selectGlobalClockIsPlaying} from './global-clock-redux'
import {NodeSpecialState} from './shamu-graph'
import {BROADCASTER_ACTION, IClientRoomState, SERVER_ACTION} from '.'

import uuid = require('uuid')

export const sequencerActions = {
	clear: (id: string) => ({
		type: 'CLEAR_SEQUENCER',
		id,
		SERVER_ACTION,
		BROADCASTER_ACTION,
	} as const),
	undo: (id: string) => ({
		type: 'UNDO_SEQUENCER',
		id,
		SERVER_ACTION,
		BROADCASTER_ACTION,
	} as const),
	skipNote: () => ({
		type: 'SKIP_NOTE',
	} as const),
	recordRest: (id: string) => ({
		type: 'RECORD_SEQUENCER_REST',
		id,
		BROADCASTER_ACTION,
		SERVER_ACTION,
	} as const),
	play: (id: string) => ({
		type: 'PLAY_SEQUENCER',
		id,
		BROADCASTER_ACTION,
		SERVER_ACTION,
	} as const),
	stop: (id: string) => ({
		type: 'STOP_SEQUENCER',
		id,
		BROADCASTER_ACTION,
		SERVER_ACTION,
	} as const),
	playAll: () => ({
		type: 'PLAY_ALL',
		BROADCASTER_ACTION,
		SERVER_ACTION,
	} as const),
	stopAll: () => ({
		type: 'STOP_ALL',
		BROADCASTER_ACTION,
		SERVER_ACTION,
	} as const),
	exportMidi: (id: string) => ({
		type: 'EXPORT_SEQUENCER_MIDI',
		id,
	} as const),
	recordNote: (id: string, note: IMidiNote, index?: number) => ({
		type: 'RECORD_SEQUENCER_NOTE',
		id,
		note,
		index,
		BROADCASTER_ACTION,
		SERVER_ACTION,
	} as const),
	toggleRecording: (id: Id, isRecording: boolean) => ({
		type: 'TOGGLE_SEQUENCER_RECORDING',
		id,
		isRecording,
		BROADCASTER_ACTION,
		SERVER_ACTION,
	} as const),
} as const

export type SequencerAction = ActionType<typeof sequencerActions>

export const createSequencerEvents = (length: number, ratio = 1): MidiClipEvents => {
	return makeSequencerEvents(
		new Array(length)
			.fill(0)
			.map((_, i) => makeMidiClipEvent({notes: emptyMidiNotes, startBeat: i * ratio, durationBeats: 1 * ratio})),
	)
}

export const makeSequencerEvents =
	(x: MidiClipEvent[] | List<MidiClipEvent> = List<MidiClipEvent>()): MidiClipEvents => List<MidiClipEvent>(x)

export function deserializeEvents(events: MidiClipEvents): MidiClipEvents {
	return makeSequencerEvents(events.map(x => ({...x, notes: MidiNotes(x.notes)})))
}

export interface ISequencerState extends IMultiStateThing, NodeSpecialState {
	readonly midiClip: MidiClip
	readonly index: number
	readonly isPlaying: boolean
	readonly id: string
	readonly color: string | false
	readonly name: string
	readonly isRecording: boolean
	readonly previousEvents: List<MidiClipEvents>
	readonly width: number
	readonly height: number
	readonly rate: number
	readonly gate: number
	readonly pitch: number
	readonly notesDisplayStartX: number
	readonly notesDisplayWidth: number
}

export const dummySequencerState: SequencerStateBase = {
	index: -1,
	id: 'dummy sequencer id',
	color: 'black',
	isRecording: false,
	previousEvents: List<MidiClipEvents>(),
	rate: 1,
	pitch: 0,
	name: 'dummy sequencer name',
	midiClip: makeMidiClip(),
	width: 0,
	height: 0,
	ownerId: 'dummy owner id',
	type: ConnectionNodeType.gridSequencer,
	notesDisplayStartX: 1,
	notesDisplayWidth: 1,
	isPlaying: false,
	gate: 1,
	enabled: false,
}

export abstract class SequencerStateBase implements ISequencerState {
	public readonly index: number = -1
	public readonly id = uuid.v4()
	public readonly color: string | false = false
	public readonly isRecording: boolean = false
	public readonly previousEvents: List<MidiClipEvents> = List<MidiClipEvents>()
	public readonly pitch: number = 0
	public readonly enabled: boolean = true

	public constructor(
		public readonly name: string,
		public readonly midiClip: MidiClip,
		public readonly width: number,
		public readonly height: number,
		public readonly ownerId: string,
		public readonly type: ConnectionNodeType,
		public readonly notesDisplayStartX: number,
		public readonly notesDisplayWidth: number,
		public readonly isPlaying: boolean = false,
		public readonly gate: number = 1,
		public readonly rate: number = 1,
	) {
		// this.color = colorFunc(hashbow(this.id)).desaturate(0.2).hsl().string()
	}
}

export function isEmptyEvents(events: MidiClipEvents) {
	return events.some(x => x.notes.count() > 0) === false
}

export function deserializeSequencerState<T extends ISequencerState>(state: IMultiStateThing): T {
	const x = state as T
	const y: T = {
		...x,
		midiClip: new MidiClip({
			length: x.midiClip.length,
			loop: x.midiClip.loop,
			events: deserializeEvents(x.midiClip.events),
		}),
		previousEvents: List(x.previousEvents.map(deserializeEvents)),
	}
	return y
}

export const selectAllGridSequencers = (state: IClientRoomState) => state.shamuGraph.nodes.gridSequencers.things

export const selectAllInfiniteSequencers = (state: IClientRoomState) => state.shamuGraph.nodes.infiniteSequencers.things

export const selectAllSequencers = createSelector(
	[selectAllGridSequencers, selectAllInfiniteSequencers],
	(gridSeqs, infSeqs) => ({...gridSeqs, ...infSeqs}),
)

export function selectSequencer(state: IClientRoomState, id: string) {
	return selectAllSequencers(state)[id] || dummySequencerState
}

export const selectIsAnythingPlaying = createSelector(
	[selectAllSequencers],
	allSeqs => Map(allSeqs).some(x => x.isPlaying),
)

export const selectSequencerIsPlaying = (state: IClientRoomState, id: string): boolean => {
	if (selectSequencer(state, id).isPlaying === false) return false
	if (selectGlobalClockIsPlaying(state) === false) return false

	return memoizedIsUpstreamClockFromNode(state, id)
}

let previousConnectionsState = {}
let previousResults = Map<string, boolean>()

function memoizedIsUpstreamClockFromNode(state: IClientRoomState, nodeId: string) {
	const newConnectionsState = selectAllConnections(state)

	if (newConnectionsState === previousConnectionsState && previousResults.has(nodeId)) {
		return previousResults.get(nodeId)!
	} else {
		previousConnectionsState = newConnectionsState

		previousResults = previousResults.clear().withMutations(mutable => {
			Map(selectAllSequencers(state)).forEach(sequencer => {
				mutable.set(sequencer.id, isUpstreamClockFromNode(state, sequencer.id))
			})
		})

		return previousResults.get(nodeId)!
	}
}

function isUpstreamClockFromNode(
	state: IClientRoomState, nodeId: string, processedNodeIds = Set<string>(),
): boolean {
	if (processedNodeIds.includes(nodeId)) return false

	return selectConnectionsWithTargetIds(state, [nodeId])
		.some(connection => {
			if (connection.sourceType === ConnectionNodeType.masterClock) {
				return true
			} else {
				return isUpstreamClockFromNode(state, connection.sourceId, processedNodeIds.add(nodeId))
			}
		})
}

export const selectDirectDownstreamSequencerIds = (state: IClientRoomState, id: string): List<SequencerId> => {
	return _getDirectDownstreamSequencerIds(state, id)
}

type SequencerId = string

function _getDirectDownstreamSequencerIds(
	state: IClientRoomState, nodeId: string,
): List<SequencerId> {
	return selectConnectionsWithSourceIds(state, [nodeId])
		.filter(connection => isSequencerNodeType(connection.targetType))
		.map(x => x.targetId).toList()
}
