"use client"

import React, { useState } from "react"
import {
  signInWithApple,
  signInWithGoogle,
  signInWithGithub,
  signInWithEnterpriseSSO,
} from "@/lib/firebase-client"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [enterpriseDomain, setEnterpriseDomain] = useState("")

  if (!isOpen) return null

  const handleAppleLogin = async () => {
    try {
      setLoading("apple")
      setError(null)
      await signInWithApple()
      onClose()
    } catch (err: unknown) {
      console.error("Apple SSO login failed:", err)
      setError(err instanceof Error ? err.message : "Apple sign-in failed")
    } finally {
      setLoading(null)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading("google")
      setError(null)
      await signInWithGoogle()
      onClose()
    } catch (err: unknown) {
      console.error("Google login failed:", err)
      setError(err instanceof Error ? err.message : "Google sign-in failed")
    } finally {
      setLoading(null)
    }
  }

  const handleGithubLogin = async () => {
    try {
      setLoading("github")
      setError(null)
      await signInWithGithub()
      onClose()
    } catch (err: unknown) {
      console.error("GitHub login failed:", err)
      setError(err instanceof Error ? err.message : "GitHub sign-in failed")
    } finally {
      setLoading(null)
    }
  }

  const handleEnterpriseSSO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enterpriseDomain.trim()) return
    try {
      setLoading("sso")
      setError(null)
      const providerId = `saml.${enterpriseDomain.trim().toLowerCase()}`
      await signInWithEnterpriseSSO(providerId)
      onClose()
    } catch (err: unknown) {
      console.error("Enterprise SSO failed:", err)
      setError(err instanceof Error ? err.message : "Enterprise SSO sign-in failed")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-neutral-100">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <h2 className="text-xl font-semibold tracking-tight text-white">Sign In</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors text-lg p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-800/80 rounded-lg text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {/* Primary / Preferred: Apple SSO */}
          <button
            onClick={handleAppleLogin}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-3 px-4 rounded-xl hover:bg-neutral-200 transition-colors shadow disabled:opacity-50"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-5.02.24-9.87-1.8-14.57-6.11-3.25-2.88-7.13-7.61-11.64-14.19-6.42-9.33-11.42-19.78-15.01-31.35-3.59-11.57-5.38-22.75-5.38-33.54 0-14.4 3.73-26.31 11.19-35.73 7.46-9.42 16.71-14.28 27.75-14.57 4.54 0 9.87 1.25 16 3.75 6.13 2.5 10.51 3.75 13.14 3.75 2.14 0 6.64-1.35 13.5-4.05 6.86-2.7 12.35-3.9 16.47-3.6 11.95.73 21.6 4.9 28.95 12.52-10.45 6.32-15.53 15.3-15.24 26.94.3 9.17 3.86 16.89 10.68 23.16 6.82 6.27 15.07 9.87 24.75 10.8-2.61 7.78-6.19 15.22-10.74 22.32zM119.22 31.81c0-6.95 2.5-13.62 7.5-20.01 5-6.39 11.45-10.45 19.35-12.18.73 7.07-1.47 13.78-6.6 20.13-5.13 6.35-11.58 10.36-19.35 12.06h-.9z"/>
            </svg>
            {loading === "apple" ? "Signing in..." : "Sign in with Apple (SSO)"}
          </button>

          {/* Google Auth */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-xl border border-neutral-700 transition-colors shadow disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {loading === "google" ? "Signing in..." : "Sign in with Google"}
          </button>

          {/* GitHub Auth */}
          <button
            onClick={handleGithubLogin}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-xl border border-neutral-700 transition-colors shadow disabled:opacity-50"
          >
            <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            {loading === "github" ? "Signing in..." : "Sign in with GitHub"}
          </button>
        </div>

        {/* Enterprise SSO Divider & Form */}
        <div className="mt-6 pt-6 border-t border-neutral-800">
          <p className="text-xs text-neutral-400 font-medium mb-3 uppercase tracking-wider">Enterprise SSO</p>
          <form onSubmit={handleEnterpriseSSO} className="flex gap-2">
            <input
              type="text"
              placeholder="company-domain.com"
              value={enterpriseDomain}
              onChange={(e) => setEnterpriseDomain(e.target.value)}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
            <button
              type="submit"
              disabled={loading !== null || !enterpriseDomain.trim()}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm px-4 py-2 rounded-xl border border-neutral-700 transition-colors disabled:opacity-50"
            >
              {loading === "sso" ? "Redirecting..." : "SSO Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
