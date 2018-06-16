import * as React from 'react'
import {Component} from 'react'
import {connect} from 'react-redux'
import {IAppState} from '../redux/configureStore'
import './BasicInstrumentView.less'

export class BasicInstrumentView extends Component {
	public render() {
		return (
			<div>basic</div>
		)
	}
}

export const ConnectedBasicInstrumentView = connect((state: IAppState) => ({
	daw: state.daw,
}))(BasicInstrumentView)
