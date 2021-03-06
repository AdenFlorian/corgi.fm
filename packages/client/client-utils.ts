import packageJson from './package.json'
import {isLocalDevClient, isTestClient} from './is-prod-client'
import {CorgiNumberChangedEvent} from './Experimental/CorgiEvents'

/** @param buttons The buttons property from a mouse event */
export function isLeftMouseButtonDown(buttons: number): boolean {
	// buttons is not implemented in safari :(
	if (buttons === undefined) return false

	return buttons % 2 === 1
}

/** @param buttons The buttons property from a mouse event */
export function isRightMouseButtonDown(buttons: number): boolean {
	// buttons is not implemented in safari :(
	if (buttons === undefined) return false
	if (buttons === 2) return true
	if (buttons === 3) return true

	return false
}

export const valueToPercentageOfMinMax = (value: number, min: number, max: number) => {
	return ((value - min) * 100) / (max - min)
}

export function getMainBoardsRectY() {
	return getMainBoardsRect().y
}

export function getMainBoardsRectX() {
	return getMainBoardsRect().x
}

function getMainBoardsRect() {
	const mainBoardsElement = document.getElementById('mainBoards')

	if (mainBoardsElement) {
		return (mainBoardsElement.getBoundingClientRect() as DOMRect)
	} else {
		return {x: 0, y: 0}
	}
}

export function getCurrentClientVersion() {
	return packageJson.version
}

export function getUrl() {
	if (isLocalDevClient()) {
		return `http://${window.location.hostname}:3000`
	} else {
		return ``
	}
}

export function getCdnUrl() {
	if (isLocalDevClient()) {
		return `https://cdn.test.corgi.fm/dev/`
	} else if (isTestClient()) {
		return `https://cdn.test.corgi.fm/test/`
	} else {
		return `https://cdn.test.corgi.fm/prod/`
	}
}

export function isInputFocused() {
	return document.activeElement
		? ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())
		: false
}

export const constant1 = new CorgiNumberChangedEvent(1)
