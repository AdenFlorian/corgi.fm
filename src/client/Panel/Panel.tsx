import * as React from 'react'
import {CssColor} from '../../common/shamu-color'
import './Panel.less'

export interface IPanelProps {
	children: any
	className?: string
	color?: string
	id?: string
	label?: string
	labelTitle?: string
	saturate?: boolean
}

export const Panel: React.FunctionComponent<IPanelProps> =
	({children, className, color = CssColor.defaultGray, id, label, labelTitle, saturate = false}) => {

		const renderLabel = label !== undefined && label !== ''

		const margin = 16
		const labelHeight = 20

		return (
			<div
				style={{
					color,
					position: 'relative',
					// marginTop: margin + labelHeight,
				}}
				className={`panelContainer ${saturate ? 'saturate' : ''}`}
			>
				{renderLabel &&
					<div
						className="label colorize"
						title={labelTitle}
						style={{
							position: 'absolute',
							top: -labelHeight,
							width: '100%',
						}}
					>
						{label}
					</div>
				}
				<div
					id={id}
					className={`panel ${className} ${renderLabel ? 'renderLabel' : ''}`}
				>
					{/* <div className="isometricBoxShadow" /> */}
					<ShamuBorder saturate={saturate} />
					{children}
				</div>
			</div>
		)
	}

const ShamuBorder = ({saturate}: {saturate: boolean}) =>
	<svg
		style={{
			position: 'absolute',
			width: '100%',
			height: '100%',
			stroke: 'none',
			fill: 'currentColor',
			strokeWidth: 4,
			top: 2,
			left: -2,
			zIndex: -1,
			filter: saturate ? 'saturate(3)' : 'none',
		}}
	>
		<g>
			<rect x="0" y="0" width="100%" height="100%" />
		</g>
	</svg>
