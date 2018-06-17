import {ISimpleTrackEvent, SimpleTrackEventAction, SimpleTrackPlayer} from '../SimpleTrackPlayer'
import {IAppState} from './configureStore'
import {makeActionCreator} from './redux-utils'
import {ISimpleTrackNote, selectSimpleTrackNotes} from './simple-track-redux'

export const PLAY_SIMPLE_TRACK = 'PLAY_SIMPLE_TRACK'
export const playSimpleTrack = makeActionCreator(PLAY_SIMPLE_TRACK)

export const STOP_SIMPLE_TRACK = 'STOP_SIMPLE_TRACK'
export const stopSimpleTrack = makeActionCreator(STOP_SIMPLE_TRACK)

let simpleTrackPlayer: SimpleTrackPlayer

export const trackPlayerMiddleware = store => next => action => {
	const state: IAppState = store.getState()

	switch (action.type) {
		case PLAY_SIMPLE_TRACK:
			if (simpleTrackPlayer === undefined) {
				simpleTrackPlayer = new SimpleTrackPlayer(store.dispatch, state.audio.context)
			}
			const notes = selectSimpleTrackNotes(state)
			simpleTrackPlayer.play(notesToEvents(notes))
			return next(action)
		case STOP_SIMPLE_TRACK:
			if (simpleTrackPlayer === undefined) {
				simpleTrackPlayer = new SimpleTrackPlayer(store.dispatch, state.audio.context)
			}
			simpleTrackPlayer.stop()
			return next(action)
		default:
			return next(action)
	}
}

function notesToEvents(events: ISimpleTrackNote[]): ISimpleTrackEvent[] {
	return events.reduce((foo, event, index) => {
		if (event.notes.length === 0) return foo
		foo.push({
			time: index / 5,
			action: SimpleTrackEventAction.playNote,
			notes: event.notes,
		})
		foo.push({
			time: (index / 5) + (1 / 5),
			action: SimpleTrackEventAction.stopNote,
			notes: event.notes,
		})
		return foo
	}, []).concat({time: events.length / 5, action: SimpleTrackEventAction.endTrack, notes: []})
}
