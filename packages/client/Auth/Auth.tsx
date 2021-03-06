import * as firebase from 'firebase/app'
import React, {Fragment, useCallback, useState} from 'react'
import {
	// IoLogoFacebook as Facebook,
	IoLogoGoogle as Google,
} from 'react-icons/io'
import {
	FiLogIn, FiLogOut,
} from 'react-icons/fi'
import {useDispatch} from 'react-redux'
import {AuthConstants} from '@corgifm/common/auth-constants'
import {
	authActions, chatSystemMessage, ModalId, modalsAction, useLoggedIn,
} from '@corgifm/common/redux'
import {Button} from '../Button/Button'
import {
	FirebaseAuthError, FirebaseAuthErrorCode,
} from '../Firebase/firebase-types'
import {useFirebase} from '../Firebase/FirebaseContext'
import {ModalContent} from '../Modal/ModalManager'
import {useBoolean, useResettableState} from '../react-hooks'
import './Auth.less'

export function AuthModalButton() {
	const loggedIn = useLoggedIn()
	const firebaseContext = useFirebase()
	const dispatch = useDispatch()
	const onClick = useCallback(
		loggedIn ? logout : showModal,
		[loggedIn],
	)

	return (
		<Button
			onClick={onClick}
			background="medium"
			shadow={true}
		>
			{loggedIn
				? <Fragment><FiLogOut />Log Out</Fragment>
				: <Fragment><FiLogIn />Register / Login</Fragment>}
		</Button>
	)

	async function logout() {
		await firebaseContext.auth.signOut()
		dispatch(chatSystemMessage('Logged out!'))
	}

	function showModal() {
		dispatch(modalsAction.set(ModalId.Auth))
	}
}

export const AuthModalContent: ModalContent = ({hideModal}) => {
	const [email, setEmail] = useState('')
	const [password, setPassword, clearPassword] = useResettableState('')
	const [authInfo, setAuthInfo, clearAuthInfo] = useResettableState<[string, 'error' | 'info']>(['', 'error'])
	const [inputsDisabled, disableInputs, enableInputs] = useBoolean(false)
	const firebaseContext = useFirebase()
	const dispatch = useDispatch()

	return (
		<Fragment>
			<div className="modalSection authModal login">
				<div className="modalSectionLabel">
					Register or Login
				</div>
				<div className="modalSectionSubLabel">
					Remember to drink water!
				</div>
				<div className="modalSectionContent">
					<form onSubmit={handleLogin}>
						<input
							type="email"
							placeholder="Email"
							className="email blob"
							value={email}
							onChange={e => setEmail(e.target.value)}
							disabled={inputsDisabled}
							required
						/>
						<input
							type="password"
							placeholder="Password"
							className="password blob"
							value={password}
							onChange={e => setPassword(e.target.value)}
							disabled={inputsDisabled}
							required
							{...AuthConstants.password}
						/>
						<div className="submitRow">
							<input
								type="submit"
								className="button register blob"
								value="Register / Login"
								disabled={inputsDisabled}
							/>
							<input
								type="button"
								className="button resetPassword blob"
								value="Reset Password"
								disabled={inputsDisabled}
								onClick={handleResetPassword}
								readOnly
							/>
						</div>
					</form>
				</div>
				{authInfo[0] &&
					<div className="modalSectionFooter">
						<div className={`bottom ${authInfo[1]}`}>
							{authInfo[0]}
						</div>
					</div>
				}
			</div>
			<div className="modalSection authModal other">
				<div className="modalSectionLabel">
					Other Login Methods
				</div>
				<div className="modalSectionSubLabel">
					Woof
				</div>
				<div className="modalSectionContent providers">
					<button
						type="button"
						className="button google corgiButton"
						disabled={inputsDisabled}
						onClick={async () => handleProviderLogin(
							firebase.auth.GoogleAuthProvider)}
					>
						<Google />
						<span>Sign in with Google</span>
					</button>
					{/* <button
						type="button"
						className="button facebook corgiButton"
						disabled={inputsDisabled}
						onClick={async () => handleProviderLogin(
							firebase.auth.FacebookAuthProvider)}
					>
						<Facebook />
						<span>Sign in with Facebook</span>
					</button> */}
				</div>
			</div>
		</Fragment>
	)

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault()
		disableInputs()

		return handleLoginPromise(
			firebaseContext.auth.signInWithEmailAndPassword(email, password))
	}

	async function handleProviderLogin(AuthProviderMaker: AuthProviderMaker) {
		disableInputs()

		return handleLoginPromise(
			firebaseContext.auth.signInWithPopup(
				new AuthProviderMaker()))
	}

	async function handleLoginPromise(
		promise: Promise<firebase.auth.UserCredential>,
	) {
		return promise
			.then(() => dispatch(chatSystemMessage('Logged in!', 'success')))
			.then(handleAuthSuccess)
			.catch(handleAuthError)
	}

	async function handleResetPassword() {
		disableInputs()

		return firebaseContext.auth
			.sendPasswordResetEmail(email)
			.then(() => setAuthInfo(['Password reset email sent!', 'info']))
			.then(enableInputs)
			.catch(handleAuthError)
	}

	async function handleAuthError(error: FirebaseAuthError): Promise<any> {
		clearAuthInfo()
		enableInputs()

		switch (error.code) {
			case FirebaseAuthErrorCode.USER_DELETED: return handleRegister()
			default: return setAuthInfo([error.message, 'error'])
		}
	}

	async function handleRegister() {
		return firebaseContext.auth
			.createUserWithEmailAndPassword(email, password)
			.then(dispatchOnRegister)
			.then(handleAuthSuccess)
			.catch(handleAuthError)
	}

	function dispatchOnRegister() {
		dispatch(authActions.onRegister())
	}

	function handleAuthSuccess() {
		enableInputs()
		_hideModal()
	}

	function _hideModal() {
		clearPassword()
		clearAuthInfo()
		hideModal()
	}
}

type AuthProviderMaker = new () => firebase.auth.AuthProvider
