import * as React from 'react'
import ReactSVG from 'react-svg'
import NoiseWave from './NoiseWave.svg'
import {ShamuOscillatorType} from './OscillatorTypes'
import SawWave from './SawWave.svg'
import SineWave from './SineWave.svg'
import SquareWave from './SquareWave.svg'
import TriangleWave from './TriangleWave.svg'

interface IBasicInstrumentOscillatorTypesProps {
	handleClick: (type: ShamuOscillatorType) => void
	activeType: ShamuOscillatorType
}

const oscillatorTypes = [
	{type: 'sine', svgPath: SineWave},
	{type: 'triangle', svgPath: TriangleWave},
	{type: 'sawtooth', svgPath: SawWave},
	{type: 'square', svgPath: SquareWave},
	{type: 'noise', svgPath: NoiseWave},
]

export class BasicInstrumentOscillatorTypes extends React.PureComponent<IBasicInstrumentOscillatorTypesProps> {
	public render() {
		const {activeType, handleClick} = this.props

		return (
			<div className="oscillatorTypes">
				{oscillatorTypes.map(({type, svgPath}) =>
					<div key={type} onClick={handleClick.bind(undefined, type)} style={{width: 40, height: 40}}>
						<ReactSVG
							path={svgPath}
							className={activeType === type ? 'active colorize' : undefined}
						/>
					</div>,
				)}
			</div>
		)
	}
}
