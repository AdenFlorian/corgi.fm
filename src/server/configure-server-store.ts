import {combineReducers, createStore} from 'redux'
import {basicInstrumentsReducer} from '../common/redux/basic-instruments-redux'
import {clientsReducer} from '../common/redux/clients-redux'
import {connectionsReducer} from '../common/redux/connections-redux'
import {simpleTrackReducer} from '../common/redux/simple-track-redux'
import {virtualKeyboardsReducer} from '../common/redux/virtual-keyboard-redux'
import {getInitialServerState} from './initial-server-redux-state'

export function configureServerStore() {
	return createStore(
		combineReducers({
			basicInstruments: basicInstrumentsReducer,
			clients: clientsReducer,
			connections: connectionsReducer,
			simpleTrack: simpleTrackReducer,
			virtualKeyboards: virtualKeyboardsReducer,
		}),
		getInitialServerState(),
	)
}
