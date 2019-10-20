export class ToggleGainChain {
	public get input(): AudioNode {return this._inputGain}
	public get output(): AudioNode {return this._outputGain}
	private readonly _inputGain: GainNode
	private readonly _outputGain: GainNode

	public constructor(
		_audioContext: AudioContext,
		startRampSpeed = 0.005,
	) {
		this._inputGain = _audioContext.createGain()
		this._inputGain.gain.setValueAtTime(1, 0)

		this._outputGain = _audioContext.createGain()
		this._outputGain.gain.setValueAtTime(0, 0)
		this._outputGain.gain.setTargetAtTime(1, 0.5, startRampSpeed)

		this._inputGain.connect(this._outputGain)
	}

	public enable() {
		this._inputGain.gain.setTargetAtTime(1, 0, 0.005)
	}

	public disable() {
		this._inputGain.gain.setTargetAtTime(0, 0, 0.005)
	}

	public dispose(callback?: () => void) {
		this._outputGain.gain.setTargetAtTime(0, 0, 0.005)

		setTimeout(() => {
			this._inputGain.disconnect()
			this._outputGain.disconnect()
			if (callback) callback()
		}, 50)
	}
}