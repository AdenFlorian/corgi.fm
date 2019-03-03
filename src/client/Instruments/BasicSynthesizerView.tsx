import {Set} from 'immutable'
import * as React from 'react'
import {connect} from 'react-redux'
import {Dispatch} from 'redux'
import {IMidiNotes} from '../../common/MidiNote'
import {ShamuOscillatorType} from '../../common/OscillatorTypes'
import {
	AppOptions, BasicSynthesizerParam, selectBasicSynthesizer, selectOption, setBasicSynthesizerOscillatorType, setBasicSynthesizerParam,
} from '../../common/redux'
import {IClientAppState} from '../../common/redux'
import {
	selectConnectionSourceNotesByTargetId,
} from '../../common/redux'
import {Knob} from '../Knob/Knob'
import {Panel} from '../Panel/Panel'
import {BasicSynthesizerOscillatorTypes} from './BasicSynthesizerOscillatorTypes'
import './BasicSynthesizerView.less'

export type MidiNotes = IMidiNotes

type IBasicSynthesizerViewAllProps = IBasicSynthesizerViewProps & IBasicSynthesizerViewReduxProps & {dispatch: Dispatch}

interface IBasicSynthesizerViewProps {
	color: string
	id: string
}

interface IBasicSynthesizerViewReduxProps {
	rawMidiNotes: MidiNotes
	pan: number
	isPlaying: boolean
	oscillatorType: ShamuOscillatorType
	lowPassFilterCutoffFrequency: number
	attack: number
	release: number
	showSynthNoteSchedulerDebug: boolean
	fineTuning: number
}

export class BasicSynthesizerView
	extends React.PureComponent<IBasicSynthesizerViewAllProps> {

	public static defaultProps = {
		pan: 0,
		rawMidiNotes: Set(),
	}

	public render() {
		const {color, isPlaying, pan, oscillatorType} = this.props

		return (
			<React.Fragment>
				<Panel
					className={`${isPlaying ? 'isPlaying' : 'isNotPlaying'}`}
					color={color}
					saturate={isPlaying}
					id={this.props.id}
				>
					<div className="basicSynthesizer">
						<BasicSynthesizerOscillatorTypes
							handleClick={this._handleOscillatorTypeClicked}
							activeType={oscillatorType}
						/>
						<div className="knobs">
							<Knob
								min={-1}
								max={1}
								value={pan}
								onChange={this._dispatchChangeInstrumentParam}
								label="pan"
								onChangeId={BasicSynthesizerParam.pan}
							/>
							<Knob
								min={0}
								max={10000}
								curve={2}
								value={this.props.lowPassFilterCutoffFrequency}
								onChange={this._dispatchChangeInstrumentParam}
								label="lpf"
								onChangeId={BasicSynthesizerParam.lowPassFilterCutoffFrequency}
							/>
							<Knob
								min={0.01}
								max={10}
								curve={3}
								value={this.props.attack}
								onChange={this._dispatchChangeInstrumentParam}
								label="attack"
								onChangeId={BasicSynthesizerParam.attack}
							/>
							<Knob
								min={0.01}
								max={60}
								curve={2}
								value={this.props.release}
								onChange={this._dispatchChangeInstrumentParam}
								label="release"
								onChangeId={BasicSynthesizerParam.release}
							/>
							<Knob
								min={-100}
								max={100}
								value={this.props.fineTuning}
								onChange={this._dispatchChangeInstrumentParam}
								label="fine"
								onChangeId={BasicSynthesizerParam.fineTuning}
							/>
						</div>
					</div>
				</Panel>
				{this.props.showSynthNoteSchedulerDebug &&
					<div
						id={'scheduleVisual-' + this.props.id}
						style={{
							pointerEvents: 'none',
							position: 'relative',
							top: 2,
							backgroundColor: '#29292f40',
							height: 50,
						}}
					>
					</div>
				}
			</React.Fragment>
		)
	}

	private readonly _handleOscillatorTypeClicked = (type: ShamuOscillatorType) => {
		this.props.dispatch(setBasicSynthesizerOscillatorType(this.props.id, type))
	}

	private readonly _dispatchChangeInstrumentParam = (paramType: BasicSynthesizerParam, value: any) => {
		this.props.dispatch(
			setBasicSynthesizerParam(this.props.id, paramType, value),
		)
	}
}

export const ConnectedBasicSynthesizerView = connect(
	(state: IClientAppState, props: IBasicSynthesizerViewProps): IBasicSynthesizerViewReduxProps => {
		const rawMidiNotes = selectConnectionSourceNotesByTargetId(state.room, props.id)
		const instrumentState = selectBasicSynthesizer(state.room, props.id)

		return {
			rawMidiNotes,
			isPlaying: rawMidiNotes.count() > 0,
			oscillatorType: instrumentState.oscillatorType,
			pan: instrumentState.pan,
			lowPassFilterCutoffFrequency: instrumentState.lowPassFilterCutoffFrequency,
			attack: instrumentState.attack,
			release: instrumentState.release,
			fineTuning: instrumentState.fineTuning,
			showSynthNoteSchedulerDebug: selectOption(state, AppOptions.showSynthNoteSchedulerDebug) as boolean,
		}
	},
)(
	BasicSynthesizerView as React.ComponentClass<IBasicSynthesizerViewAllProps>,
) as React.ComponentClass<IBasicSynthesizerViewProps>
