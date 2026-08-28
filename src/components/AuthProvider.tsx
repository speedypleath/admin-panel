"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase-client"

interface AuthContextType {
  user: User | null
  idToken: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  idToken: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        const token = await currentUser.getIdToken()
        setIdToken(token)
        document.cookie = `firebaseToken=${token}; path=/; max-age=3600; SameSite=Lax`
      } else {
        setIdToken(null)
        document.cookie = "firebaseToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, idToken, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
