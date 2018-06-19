import React = require('react')
import ReactDOM = require('react-dom')
import {hot} from 'react-hot-loader'
import {Provider} from 'react-redux'
import {Store} from 'redux'
import {ConnectedApp} from './App'

export function renderApp(store: Store) {
	const HotProvider = hot(module)(Provider)
	ReactDOM.render(
		<HotProvider store={store}>
			{getComponentByPath()}
		</HotProvider>,
		document.getElementById('react-app'),
	)
}

function getComponentByPath() {
	switch (window.location.pathname) {
		default: return <ConnectedApp />
	}
}
