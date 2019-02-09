import {AnyAction} from 'redux'
import {createSelector} from 'reselect'
import * as uuid from 'uuid'
import {ClientId, ConnectionNodeType, IConnectable} from '../common-types'
import {pickRandomArrayElement} from '../common-utils'
import {BuiltInOscillatorType, ShamuOscillatorType} from '../OscillatorTypes'
import {addMultiThing, BROADCASTER_ACTION, createSelectAllOfThingAsArray, deleteThings, IClientRoomState, IMultiState, makeMultiReducer, NetworkActionType, SERVER_ACTION, updateThings} from './index'

export const addBasicSynthesizer = (instrument: BasicSynthesizerState) =>
	addMultiThing(instrument, ConnectionNodeType.basicSynthesizer, NetworkActionType.SERVER_AND_BROADCASTER)

export const deleteBasicSynthesizers = (instrumentIds: string[]) =>
	deleteThings(instrumentIds, ConnectionNodeType.basicSynthesizer, NetworkActionType.SERVER_AND_BROADCASTER)

export const updateBasicSynthesizers = (instruments: IBasicSynthesizers) =>
	updateThings(instruments, ConnectionNodeType.basicSynthesizer, NetworkActionType.BROADCASTER)

export const SET_BASIC_INSTRUMENT_OSCILLATOR_TYPE = 'SET_BASIC_INSTRUMENT_OSCILLATOR_TYPE'
export const setBasicSynthesizerOscillatorType =
	(id: string, oscillatorType: ShamuOscillatorType) => ({
		type: SET_BASIC_INSTRUMENT_OSCILLATOR_TYPE,
		id,
		oscillatorType,
		SERVER_ACTION,
		BROADCASTER_ACTION,
	})

export const SET_BASIC_INSTRUMENT_PARAM = 'SET_BASIC_INSTRUMENT_PARAM'
export const setBasicSynthesizerParam =
	(id: string, paramName: BasicSynthesizerParam, value: any) => ({
		type: SET_BASIC_INSTRUMENT_PARAM,
		id,
		paramName,
		value,
		SERVER_ACTION,
		BROADCASTER_ACTION,
	})

export enum BasicSynthesizerParam {
	pan = 'pan',
	lowPassFilterCutoffFrequency = 'lowPassFilterCutoffFrequency',
	attack = 'attack',
	release = 'release',
	fineTuning = 'fineTuning',
}

export interface BasicSynthesizerAction extends AnyAction {
	instrument?: BasicSynthesizerState
	instruments?: IBasicSynthesizers
}

export interface IBasicSynthesizersState extends IMultiState {
	things: IBasicSynthesizers
}

export interface IBasicSynthesizers {
	[key: string]: BasicSynthesizerState
}

export class BasicSynthesizerState implements IConnectable {
	public static dummy: BasicSynthesizerState = {
		oscillatorType: BuiltInOscillatorType.sine,
		id: 'dummy',
		ownerId: 'dummyOwner',
		pan: 0,
		lowPassFilterCutoffFrequency: 0,
		attack: 0,
		release: 0,
		color: false,
		type: ConnectionNodeType.basicSynthesizer,
		fineTuning: 0,
	}

	public readonly oscillatorType: ShamuOscillatorType
		= pickRandomArrayElement(['sine', 'sawtooth', 'square', 'triangle']) as ShamuOscillatorType
	public readonly id = uuid.v4()
	public readonly ownerId: string
	public readonly pan: number = Math.random() - 0.5
	public readonly lowPassFilterCutoffFrequency: number = Math.random() * 10000 + 1000
	public readonly attack: number = 0.01
	public readonly release: number = 1
	public readonly fineTuning: number = 0
	public readonly color: false = false
	public readonly type = ConnectionNodeType.basicSynthesizer

	constructor(ownerId: ClientId) {
		this.ownerId = ownerId
	}
}

const basicSynthesizerActionTypes = [
	SET_BASIC_INSTRUMENT_OSCILLATOR_TYPE,
	SET_BASIC_INSTRUMENT_PARAM,
]

export const basicSynthesizersReducer = makeMultiReducer<BasicSynthesizerState, IBasicSynthesizersState>(
	basicSynthesizerReducer,
	ConnectionNodeType.basicSynthesizer,
	basicSynthesizerActionTypes,
)

function basicSynthesizerReducer(basicSynthesizer: BasicSynthesizerState, action: AnyAction) {
	switch (action.type) {
		case SET_BASIC_INSTRUMENT_OSCILLATOR_TYPE:
			return {
				...basicSynthesizer,
				oscillatorType: action.oscillatorType,
			}
		case SET_BASIC_INSTRUMENT_PARAM:
			return {
				...basicSynthesizer,
				[action.paramName]: action.value,
			}
		default:
			return basicSynthesizer
	}
}

export const selectAllBasicSynthesizers = (state: IClientRoomState) => state.basicSynthesizers.things

export const selectAllBasicSynthesizersAsArray =
	createSelectAllOfThingAsArray<IBasicSynthesizers, BasicSynthesizerState>(selectAllBasicSynthesizers)

export const selectAllBasicSynthesizerIds = createSelector(
	selectAllBasicSynthesizers,
	basicSynthesizers => Object.keys(basicSynthesizers),
)

export const selectBasicSynthesizersByOwner = (state: IClientRoomState, ownerId: ClientId) =>
	selectAllBasicSynthesizersAsArray(state).filter(x => x.ownerId === ownerId)

export const selectBasicSynthesizer = (state: IClientRoomState, id: string) =>
	selectAllBasicSynthesizers(state)[id] || BasicSynthesizerState.dummy