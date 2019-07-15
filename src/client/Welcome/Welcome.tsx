import {Fragment} from 'react'
import React from 'react'
import {Dispatch} from 'redux'
import {
	selectAuthState, shamuConnect,
} from '../../common/redux'
import {CssColor} from '../../common/shamu-color'
import {Button} from '../Button/Button'
import {DiscordLink, NewsletterLink, PatreonLink} from '../Links'
import {Modal} from '../Modal/Modal'
import {ConnectedNameChanger} from '../NameChanger'
import {useBoolean} from '../react-hooks'
import './Welcome.less'

interface ReduxProps {
	loggedIn: boolean
}

type AllProps = ReduxProps & {dispatch: Dispatch}

function Welcome({dispatch, loggedIn}: AllProps) {
	const [isModalVisible, showModal, hideModal] = useBoolean(true)

	return (
		<Fragment>
			<Button
				buttonProps={{onClick: showModal}}
			>
				Show Welcome
			</Button>
			{isModalVisible && modal()}
		</Fragment>
	)

	function modal() {
		return (
			<Modal
				onHide={hideModal}
				className="welcomeModal"
			>
				<div className="modalSection login">
					<div className="modalSectionLabel" style={{color: CssColor.brightBlue}}>
						Welcome to corgi.fm!
					</div>
					<div className="modalSectionSubLabel">
						Collaborative Online Real-time Graphical Interface For Music
					</div>
					<div className="modalSectionContent">
						<div className="first">
							<div className="name">
								<label htmlFor="usernameInput">Username</label>
								<ConnectedNameChanger />
							</div>
						</div>
						<div className="left">
							left
						</div>
						<div className="right">
							<div className="links vert-space-16">
								<NewsletterLink />
								<DiscordLink />
								<PatreonLink />
							</div>
						</div>
					</div>
					<div className="modalSectionFooter">
						Remember to take a break and stretch every now and then!
					</div>
				</div>
			</Modal>
		)
	}
}

export const ConnectedWelcome = shamuConnect(
	(state): ReduxProps => {
		const authState = selectAuthState(state)
		return {
			loggedIn: authState.loggedIn,
		}
	},
)(Welcome)