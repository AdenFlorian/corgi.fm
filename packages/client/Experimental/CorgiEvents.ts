export type NumberChangedDelegate = (newNumber: number) => void

export interface CorgiNumberChangedObservable extends Pick<CorgiNumberChangedEvent, 'subscribe' | 'unsubscribe' | 'current'> {}

export class CorgiNumberChangedEvent {
	private readonly _subscribers = new Set<NumberChangedDelegate>()
	private _frameRequested = false

	public constructor(
		private _currentValue: number,
	) {}

	public get current() {return this._currentValue}

	public get observable() {return this as CorgiNumberChangedObservable}

	public subscribe(delegate: NumberChangedDelegate) {
		this._subscribers.add(delegate)
		delegate(this.current)
	}

	public unsubscribe(delegate: NumberChangedDelegate) {
		this._subscribers.delete(delegate)
	}

	public invokeImmediately(newNumber: number, onlyIfChanged = false) {
		if (onlyIfChanged === true && newNumber === this._currentValue) return
		this._currentValue = newNumber
		this._invoke()
	}

	public invokeNextFrame(newNumber: number, onInvoked?: () => void) {
		this._currentValue = newNumber
		if (this._frameRequested) return
		this._frameRequested = true
		requestAnimationFrame(() => {
			this._frameRequested = false
			this._invoke()
			if (onInvoked) onInvoked()
		})
	}

	private _invoke() {
		this._subscribers.forEach(delegate => delegate(this._currentValue))
	}
}

export type StringChangedDelegate = (newString: string) => void

export class CorgiStringChangedEvent {
	private readonly _subscribers = new Set<StringChangedDelegate>()
	private _frameRequested = false

	public constructor(
		private _currentValue: string,
	) {}

	public get current() {return this._currentValue}

	public subscribe(delegate: StringChangedDelegate): string {
		this._subscribers.add(delegate)
		return this._currentValue
	}

	public unsubscribe(delegate: StringChangedDelegate) {
		this._subscribers.delete(delegate)
	}

	public invokeImmediately(newString: string) {
		this._currentValue = newString
		this._invoke()
	}

	public invokeNextFrame(newString: string, onInvoked?: () => void) {
		this._currentValue = newString
		if (this._frameRequested) return
		this._frameRequested = true
		requestAnimationFrame(() => {
			this._frameRequested = false
			this._invoke()
			if (onInvoked) onInvoked()
		})
	}

	private _invoke() {
		this._subscribers.forEach(delegate => delegate(this._currentValue))
	}
}

export type EnumChangedDelegate<TEnum extends string> = (newEnum: TEnum, didChange: boolean) => void

export class CorgiEnumChangedEvent<TEnum extends string> {
	private readonly _subscribers = new Set<EnumChangedDelegate<TEnum>>()
	private _frameRequested = false

	public constructor(
		private _currentValue: TEnum,
	) {}

	public get current() {return this._currentValue}

	public subscribe(delegate: EnumChangedDelegate<TEnum>): TEnum {
		this._subscribers.add(delegate)
		return this._currentValue
	}

	public unsubscribe(delegate: EnumChangedDelegate<TEnum>) {
		this._subscribers.delete(delegate)
	}

	public invokeImmediately(newEnum: TEnum) {
		const didChange = this._currentValue !== newEnum
		this._currentValue = newEnum
		this._invoke(didChange)
	}

	public invokeNextFrame(newEnum: TEnum, onInvoked?: () => void) {
		const didChange = this._currentValue !== newEnum
		this._currentValue = newEnum
		if (this._frameRequested) return
		this._frameRequested = true
		requestAnimationFrame(() => {
			this._frameRequested = false
			this._invoke(didChange)
			if (onInvoked) onInvoked()
		})
	}

	private _invoke(didChange: boolean) {
		this._subscribers.forEach(delegate => delegate(this._currentValue, didChange))
	}
}

export type CorgiObjectType = object | boolean | undefined | null | string

export type ObjectChangedDelegate<TObject extends CorgiObjectType> = (newObject: TObject) => void

/** Be careful with this */
export function isCorgiObjectChangedEvent<TObject extends CorgiObjectType>(val: unknown): val is CorgiObjectChangedEvent<TObject> {
	return val instanceof CorgiObjectChangedEvent
}

export class CorgiObjectChangedEvent<TObject extends CorgiObjectType> {
	private readonly _subscribers = new Set<ObjectChangedDelegate<TObject>>()
	private _frameRequested = false

	public constructor(
		private currentValue: TObject,
	) {}

	public get current() {return this.currentValue}

	public subscribe(delegate: ObjectChangedDelegate<TObject>) {
		this._subscribers.add(delegate)
		delegate(this.current)
	}

	public unsubscribe(delegate: ObjectChangedDelegate<TObject>) {
		this._subscribers.delete(delegate)
	}

	public invokeImmediately(newObject: TObject) {
		this.currentValue = newObject
		this._invoke()
	}

	public invokeNextFrame(newObject: TObject, onInvoked?: () => void) {
		this.currentValue = newObject
		if (this._frameRequested) return
		this._frameRequested = true
		requestAnimationFrame(() => {
			this._frameRequested = false
			this._invoke()
			if (onInvoked) onInvoked()
		})
	}

	private _invoke() {
		this._subscribers.forEach(delegate => delegate(this.currentValue))
	}
}

export type BooleanChangedDelegate = (newBoolean: boolean) => void

export class BooleanChangedEvent {
	private readonly _subscribers = new Set<ObjectChangedDelegate<boolean>>()
	private _frameRequested = false

	public constructor(
		private _current: boolean,
	) {}

	public get current() {return this._current}

	public subscribe(delegate: ObjectChangedDelegate<boolean>): boolean {
		this._subscribers.add(delegate)
		return this._current
	}

	public unsubscribe(delegate: ObjectChangedDelegate<boolean>) {
		this._subscribers.delete(delegate)
	}

	public invokeImmediately(newBoolean: boolean) {
		if (newBoolean === this._current) return
		this._current = newBoolean
		this._invoke()
	}

	public invokeNextFrame(newBoolean: boolean, onInvoked?: () => void) {
		if (newBoolean === this._current) return
		this._current = newBoolean
		if (this._frameRequested) return
		this._frameRequested = true
		requestAnimationFrame(() => {
			this._frameRequested = false
			this._invoke()
			if (onInvoked) onInvoked()
		})
	}

	private _invoke() {
		this._subscribers.forEach(delegate => delegate(this._current))
	}
}
