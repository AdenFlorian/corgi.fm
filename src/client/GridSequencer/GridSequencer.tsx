import * as React from 'react'
import {Panel} from '../Panel/Panel'
import {GridSequencerControlsConnected} from './GridSequencerControls'
import {GridSequencerNotesConnected} from './GridSequencerNotes'

interface IGridSequencerProps {
	color: string
	id: string
	isPlaying: boolean
	name: string
}

export const GridSequencer = (props: IGridSequencerProps) => {
	const {id, color, isPlaying, name} = props

	return (
		<Panel
			id={id}
			color={color}
			label={name}
			className={`gridSequencer ${isPlaying ? 'isPlaying' : 'isNotPlaying'}`}
			saturate={isPlaying}
		>
			<GridSequencerControlsConnected
				id={id}
			/>
			<GridSequencerNotesConnected
				id={id}
			/>
		</Panel>
	)
}