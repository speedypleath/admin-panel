import { initializeApp, getApps, getApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

if (!getApps().length) {
  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  } else if (projectId) {
    initializeApp({ projectId })
  }
}

export const adminAuth = getApps().length ? getAuth(getApp()) : null

/**
 * Verifies a Firebase ID token (JWT)
 */
export async function verifyFirebaseToken(token: string) {
  if (!adminAuth) return null
  try {
    return await adminAuth.verifyIdToken(token)
  } catch (error) {
    console.error("Failed to verify Firebase ID token:", error)
    return null
  }
}
