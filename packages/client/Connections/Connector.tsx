import React, {useMemo, Fragment} from 'react'
import {CssColor} from '@corgifm/common/shamu-color'

interface ConnectorProps {
	width: number
	height: number
	saturate: boolean
	x?: number
	y?: number
	z?: number
	svgProps?: React.SVGProps<SVGSVGElement>
	isPlaceHolderForNewConnection?: boolean
	title?: string
}

export const Connector: React.FC<ConnectorProps> =
	React.memo(function _Connector({
		width, height, saturate = false, x = 0, y = 0, z = undefined, svgProps = {},
		isPlaceHolderForNewConnection, title,
	}) {
		return (
			<Fragment>
				<svg
					{...svgProps}
					className={`colorize connector ${saturate ? 'saturate' : ''} ${svgProps.className}`}
					xmlns="http://www.w3.org/2000/svg"
					style={{
						width,
						height,
						zIndex: z,
						transform: `translate(${x}px, ${y - (height / 2)}px)`,
						opacity: isPlaceHolderForNewConnection
							? 0.5
							: 1,
						...svgProps.style,
					}}
				>
					{useMemo(() =>
						<Fragment>
							{title && <title>{title}</title>}
							<line
								x1={0}
								y1={height / 2}
								x2={width}
								y2={height / 2}
								strokeWidth={height}
								strokeLinecap="round"
							/>
							{isPlaceHolderForNewConnection &&
							<g
								stroke={CssColor.disabledGray}
								strokeWidth={2}
								className="addConnectionPlusSymbol"
								strokeLinecap="round"
							>
								<line
									x1={5}
									y1={height / 2}
									x2={11}
									y2={height / 2}
								/>
								<line
									x1={width / 2}
									y1={1}
									x2={width / 2}
									y2={7}
								/>
							</g>
							}
						</Fragment>,
					[height, isPlaceHolderForNewConnection, title, width])}
				</svg>
			</Fragment>
		)
	})
