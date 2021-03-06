import {Middleware, Dispatch} from 'redux'
import {
	IClientAppState, IClientState, selectLocalClient, setClientName,
	uploadActions,
	basicSamplerActions,
	chatSystemMessage,
	localUserActions,
} from '@corgifm/common/redux'
import {User, UserUpdate} from '@corgifm/common/models/User'
import {SampleUpload} from '@corgifm/common/models/OtherModels'
import {Header} from '@corgifm/common/common-types'
import {ActionType} from 'typesafe-actions'
import {debounce} from 'lodash'
import {
	transformAndValidate, transformAndValidateArray,
} from '@corgifm/common/validation'
import {ContentType} from '@corgifm/common/common-constants'
import {FirebaseContextStuff} from '../Firebase/FirebaseContext'
import {getUrl} from '../client-utils'
import {logger} from '../client-logger'
import {SamplesManager} from '../WebAudio'

const prefix = 'CORGI_API_'

export const corgiApiActions = {
	loadLocalUser: () => ({
		type: 'CORGI_API_LOAD_LOCAL_USER',
	} as const),
	loadLocalUserSamples: () => ({
		type: 'CORGI_API_LOAD_LOCAL_USER_SAMPLES',
	} as const),
	saveLocalUser: () => ({
		type: 'CORGI_API_SAVE_LOCAL_USER',
	} as const),
	uploadSample: (parentId: Id, childId: number, file: File) => ({
		type: 'CORGI_API_UPLOAD_SAMPLE',
		parentId,
		childId,
		file,
	} as const),
} as const

type CorgiApiAction = ActionType<typeof corgiApiActions>

export function createCorgiApiMiddleware(
	firebase: FirebaseContextStuff,
	samplesManager: SamplesManager,
): Middleware<{}, IClientAppState> {

	let localUid: Id
	let jwt: string

	const putUserDebounced = debounce(_putUser, 2000)

	return ({dispatch, getState}) => next => async function _corgiApiMiddleware(action: CorgiApiAction) {
		next(action)

		if (!action.type.startsWith(prefix)) return

		const {currentUser} = firebase.auth

		if (!currentUser) {
			return logger.error('[createCorgiApiMiddleware] expected a user')
		}

		localUid = currentUser.uid
		jwt = await currentUser.getIdToken()

		switch (action.type) {
			case 'CORGI_API_LOAD_LOCAL_USER': {
				const localClient = selectLocalClient(getState())
				const user = await getUserByUid(localUid, localClient)
				return dispatch(setClientName(localClient.id, user.displayName))
			}
			case 'CORGI_API_LOAD_LOCAL_USER_SAMPLES': {
				const userSamples = await getLocalUserSamples()
				return dispatch(localUserActions.setSamples(userSamples))
			}
			case 'CORGI_API_SAVE_LOCAL_USER': {
				const user = makeUserFromClient(selectLocalClient(getState()))
				return putUserDebounced(localUid, user)
			}
			case 'CORGI_API_UPLOAD_SAMPLE': {
				return uploadSample(dispatch, action)
			}
		}
	}

	async function getUserByUid(
		uid: Id, localClient?: IClientState,
	): Promise<User> {
		const headers = {
			[Header.Authorization]: getAuthHeader(),
		} as const

		return fetch(`${getUrl()}/api/users/${uid}`, {headers})
			.then(async response => {
				if (response.status === 200) {
					return response.json()
				} else if (response.status === 204) {
					if (localClient) {
						// Try to update user if they don't already exist
						return _putUser(uid, makeUserFromClient(localClient))
							.then(async () => getUserByUid(uid))
					} else {
						throw new Error(`[getUserByUid] still a 204 after putting user`)
					}
				} else {
					throw new Error(`[getUserByUid] unexpected status ${response.status}`)
				}
			})
			.then(async data => transformAndValidate(User, data))
	}

	async function getLocalUserSamples(): Promise<SampleUpload[]> {
		const headers = {
			[Header.Authorization]: getAuthHeader(),
		} as const

		return fetch(`${getUrl()}/api/samples/mine`, {headers})
			.then(async response => {
				if (response.status === 200) {
					return response.json()
				} else {
					throw new Error(
						`[getUserSamplesByUid] unexpected status ${response.status}`)
				}
			})
			.then(async data => transformAndValidateArray(SampleUpload, data))
	}

	async function _putUser(
		uid: Id, user: UserUpdate,
	): Promise<void> {
		const headers = {
			[Header.Authorization]: getAuthHeader(),
			[Header.ContentType]: ContentType.ApplicationJson,
		} as const

		const options: RequestInit = {
			method: 'PUT',
			headers,
			body: JSON.stringify(user),
		}

		return fetch(`${getUrl()}/api/users/${uid}`, options)
			.then(response => {
				if (response.status !== 204) {
					throw new Error(`[putUser] unexpected status ${response.status}`)
				}
			})
	}

	// TODO Cleanup
	async function uploadSample(
		dispatch: Dispatch, action: ReturnType<typeof corgiApiActions.uploadSample>,
	): Promise<void> {

		dispatch(uploadActions.setStatus(
			action.parentId, action.childId, 'started'))

		const isValid = await samplesManager.validateAudioSampleAsync(
			await new Response(action.file).arrayBuffer())

		if (!isValid) {
			dispatch(chatSystemMessage('Could not decode audio file', 'warning'))
			dispatch(
				uploadActions.setStatus(action.parentId, action.childId, 'failed'))
			return
		}

		const headers = {
			[Header.Authorization]: getAuthHeader(),
		} as const

		const formData = new FormData()
		formData.append('file', action.file)

		const options: RequestInit = {
			method: 'POST',
			headers,
			body: formData,
		}

		return fetch(`${getUrl()}/api/samples`, options)
			.then(async response => {
				switch (response.status) {
					case 200: return response.json()
					case 400: {
						dispatch(uploadActions.setStatus(
							action.parentId, action.childId, 'failed'))
						const body = await response.json()
						if (body && typeof body.message === 'string') {
							return dispatch(
								chatSystemMessage('Bad upload: ' + body.message, 'warning'))
						} else {
							throw new Error(`unexpected status msg ${response.status}`)
						}
					}
					default: throw new Error(`unexpected status ${response.status}`)
				}
			})
			.then(async data => transformAndValidate(SampleUpload, data))
			.then(sampleLocator => {
				dispatch(uploadActions.setStatus(
					action.parentId, action.childId, 'complete'))
				dispatch(basicSamplerActions.setSample(
					action.parentId,
					action.childId,
					{
						path: sampleLocator.path,
						label: sampleLocator.label,
						color: sampleLocator.color,
					}))
				dispatch(corgiApiActions.loadLocalUserSamples())
			})
			.catch(error => {
				logger.error('uploadSample fetch error: ',
					JSON.stringify(error, null, 2))
				dispatch(uploadActions.setStatus(
					action.parentId, action.childId, 'failed'))
			})
	}

	function getAuthHeader() {
		return `Bearer ${jwt}`
	}

	function makeUserFromClient(client: IClientState): UserUpdate {
		return {
			displayName: client.name,
			color: client.color,
		}
	}
}
