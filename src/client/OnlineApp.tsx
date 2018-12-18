import {Fragment} from 'react'
import * as React from 'react'
import {connect} from 'react-redux'
import {selectAllInstrumentIds} from '../common/redux/basic-instruments-redux'
import {IClientState, selectAllClients, selectClientCount, selectLocalClient} from '../common/redux/clients-redux'
import {IClientAppState} from '../common/redux/common-redux-types'
import {IConnection, selectAllConnectionsAsArray} from '../common/redux/connections-redux'
import {selectMemberCount} from '../common/redux/room-members-redux'
import {selectAllTrackIds} from '../common/redux/tracks-redux'
import {selectAllVirtualKeyboardIds} from '../common/redux/virtual-keyboard-redux'
import {getColorHslByHex} from '../common/shamu-color'
import './App.less'
import {ConnectedChat} from './Chat'
import {ConnectionsContainer} from './Connections/Connections'
import './css-reset.css'
import {ConnectedBasicInstrumentView} from './Instruments/BasicInstrumentView'
import {ConnectedKeyboard} from './Keyboard/Keyboard'
import {MousePointers} from './MousePointers'
import {ConnectedOption} from './Option'
import {ConnectedRoomSelector} from './RoomSelector'
import {ConnectedTrackContainer} from './Track/TrackContainer'
import {ConnectedVolumeControl} from './Volume/VolumeControl'

interface IOnlineAppProps {
	clientCount: number
	connections: IConnection[]
	info: string
	instrumentIds: string[]
	keyboardIds: string[]
	memberCount: number
	myClient: IClientState
	trackIds: string[]
}

const TRACK_1_BASE_COLOR = '#4077bf'
const MASTER_VOLUME_COLOR = getColorHslByHex(TRACK_1_BASE_COLOR)

export const mainBoardsId = 'mainBoards'

class OnlineApp extends React.Component<IOnlineAppProps> {
	public render() {
		const {clientCount, info, memberCount, myClient} = this.props

		return (
			<Fragment>
				{myClient &&
					<Fragment>
						<MousePointers />
						<ConnectionsContainer />
						<ConnectedChat />

						<div id="topDiv" style={{marginBottom: 'auto'}}>
							<div className="left">
								<ConnectedOption
									option={'showNoteNamesOnKeyboard'}
									label="show names on keyboard"
								/>
								<div>{info}</div>
								<div id="fps">FPS</div>
							</div>
							<div className="right">
								<div className="buttonContainer">
									<div className="isometricBoxShadow" />
									<button onClick={() => window.location.pathname = '/newsletter'}>Newsletter Signup</button>
								</div>
								<ConnectedRoomSelector />
								<div style={{margin: 8}}>{memberCount} room member{memberCount > 1 ? 's' : ''}</div>
								<div style={{margin: 8}}>{clientCount} total user{clientCount > 1 ? 's' : ''}</div>
							</div>
						</div>

						<div id={mainBoardsId} className="boards">
							<div className="boardRow">
								<div className="board connected">
									<ConnectedVolumeControl color={MASTER_VOLUME_COLOR} />
								</div>
							</div>
							{this.props.connections
								.sort(sortConnection)
								.map(connection => {
									return (
										<div className="boardRow" key={connection.id}>
											<div
												key={connection.sourceId}
												className="board connected"
											>
												{
													connection.sourceType === 'track'
														? <ConnectedTrackContainer id={connection.sourceId} />
														: <ConnectedKeyboard id={connection.sourceId} />
												}
											</div>
											<div
												key={connection.targetId}
												className="board connected"
											>
												<ConnectedBasicInstrumentView id={connection.targetId} />
											</div>
										</div>
									)
								})
							}
						</div>
					</Fragment>
				}

				<div
					id="info"
				>
				</div>
			</Fragment>
		)
	}
}

function sortConnection(connA: IConnection, connB: IConnection) {
	if (connA.sourceType !== connB.sourceType) {
		return connA.sourceType === 'track' ? -1 : 1
	} else {
		return 0
	}
}

const mapStateToProps = (state: IClientAppState): IOnlineAppProps => ({
	clientCount: selectClientCount(state),
	myClient: selectLocalClient(state),
	info: state.websocket.info,
	keyboardIds: selectAllVirtualKeyboardIds(state.room),
	instrumentIds: selectAllInstrumentIds(state.room),
	trackIds: selectAllTrackIds(state.room),
	connections: selectAllConnectionsAsArray(state.room),
	memberCount: selectMemberCount(state.room),
})

export const ConnectedOnlineApp = connect(mapStateToProps)(OnlineApp)