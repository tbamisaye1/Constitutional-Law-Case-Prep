import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchAuthMe, loginEditor, logoutEditor } from '../api/client'
import { setEditorCanWrite } from '../lib/editorGate'

const AuthContext = createContext(null)

/**
 * Editor lock for the public site.
 *
 * When the API has EDITOR_PASSWORD set, canEdit is false until login. The
 * session lives in an HttpOnly cookie (months), so deploys do not log you out.
 * Local servers with no password keep canEdit true.
 */
export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [lockEnabled, setLockEnabled] = useState(false)
  // Start locked until /auth/me answers so a stranger never gets a writable flash.
  const [canEdit, setCanEdit] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [authError, setAuthError] = useState('')

  const applyMe = useCallback((me) => {
    const locked = Boolean(me?.lockEnabled)
    const edit = me?.canEdit !== false
    setLockEnabled(locked)
    setCanEdit(edit)
    setEditorCanWrite(edit)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const me = await fetchAuthMe()
      applyMe(me)
      setAuthError('')
      return me
    } catch (error) {
      // If /auth/me is missing (old API), keep editing so a partial deploy
      // does not lock Tobi out of his own board.
      applyMe({ lockEnabled: false, canEdit: true })
      setAuthError(error?.message || '')
      return null
    } finally {
      setReady(true)
    }
  }, [applyMe])

  useEffect(() => {
    setEditorCanWrite(false)
    refresh()
  }, [refresh])

  const login = useCallback(
    async (password) => {
      const result = await loginEditor(password)
      applyMe(result)
      setLoginOpen(false)
      setAuthError('')
      // Library sync was refusing writes while locked; flush now.
      try {
        window.dispatchEvent(new CustomEvent('case-prep-editor-unlocked'))
      } catch {
        /* tests */
      }
      return result
    },
    [applyMe]
  )

  const logout = useCallback(async () => {
    const result = await logoutEditor()
    applyMe(result)
    return result
  }, [applyMe])

  const value = useMemo(
    () => ({
      ready,
      lockEnabled,
      canEdit,
      loginOpen,
      setLoginOpen,
      authError,
      refresh,
      login,
      logout,
    }),
    [ready, lockEnabled, canEdit, loginOpen, authError, refresh, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return {
      ready: true,
      lockEnabled: false,
      canEdit: true,
      loginOpen: false,
      setLoginOpen: () => {},
      authError: '',
      refresh: async () => null,
      login: async () => ({ ok: true }),
      logout: async () => ({ ok: true }),
    }
  }
  return ctx
}
