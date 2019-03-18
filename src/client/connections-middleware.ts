import {Middleware} from 'redux'
import {calculatePositionsGivenConnections} from '../common/compute-positions'
import {logger} from '../common/logger'
import {OrganizeGraphAction} from '../common/redux/common-actions'
import {BroadcastAction} from '../common/redux/common-redux-types'
import {
	DELETE_CONNECTIONS, IClientAppState,
	IConnectionAction, ORGANIZE_GRAPH,
	selectAllConnections, selectAllPositions, selectConnection,
	STOP_DRAGGING_GHOST_CONNECTOR, updatePositions,
} from '../common/redux/index'
import {handleStopDraggingGhostConnector} from './dragging-connections'
import {getAllInstruments} from './instrument-manager'

export const connectionsClientMiddleware: Middleware<{}, IClientAppState> =
	({dispatch, getState}) => next => (action: IConnectionAction | OrganizeGraphAction) => {

		const beforeState = getState()

		next(action)

		const afterState = getState()

		switch (action.type) {
			case STOP_DRAGGING_GHOST_CONNECTOR: {
				if ((action as unknown as BroadcastAction).alreadyBroadcasted) return

				try {
					handleStopDraggingGhostConnector(beforeState.room, dispatch, action.id)
				} catch (error) {
					logger.warn('Caught error (will ignore) when handling ' + STOP_DRAGGING_GHOST_CONNECTOR + ': ', error)
					return
				}

				return
			}
			case ORGANIZE_GRAPH:
				return dispatch(
					updatePositions(
						calculatePositionsGivenConnections(
							selectAllPositions(afterState.room),
							selectAllConnections(afterState.room),
						),
					),
				)
			// case ADD_CONNECTION:
			// 	return handleAddConnection(afterState.room, dispatch, action.connection)
			case DELETE_CONNECTIONS: {
				const instruments = getAllInstruments()
				action.connectionIds.forEach(x => {
					const connection = selectConnection(beforeState.room, x)
					const instrument = instruments.get(connection.targetId)
					if (instrument) {
						instrument.releaseAllScheduledFromSourceId(connection.sourceId)
					}
				})
				// return handleDeleteConnection(beforeState.room, dispatch, action.connectionIds)
			}
			default: return
		}
	}