import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  OAuthProvider,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type UserCredential,
} from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
}

// Initialize Firebase Client safely
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp()
  return initializeApp(firebaseConfig)
}

export const app: FirebaseApp = getFirebaseApp()
export const auth: Auth = getAuth(app)

/**
 * Primary / Preferred SSO: Apple SSO (Sign in with Apple)
 */
export async function signInWithApple(): Promise<UserCredential> {
  const provider = new OAuthProvider("apple.com")
  provider.addScope("email")
  provider.addScope("name")
  return signInWithPopup(auth, provider)
}

/**
 * Google Auth Provider
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

/**
 * GitHub Auth Provider
 */
export async function signInWithGithub(): Promise<UserCredential> {
  const provider = new GithubAuthProvider()
  provider.addScope("read:user")
  provider.addScope("user:email")
  return signInWithPopup(auth, provider)
}

/**
 * Enterprise SSO (SAML / OIDC Provider)
 */
export async function signInWithEnterpriseSSO(providerId: string): Promise<UserCredential> {
  const provider = new OAuthProvider(providerId)
  return signInWithPopup(auth, provider)
}

/**
 * Sign Out
 */
export async function logout(): Promise<void> {
  return signOut(auth)
}
