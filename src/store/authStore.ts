import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserState {
  id: string
  email: string
  full_name: string | null
  role: string
  email_verified: boolean
  is_active: boolean
  created_at: string
}

interface AuthStore {
  user: UserState | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: UserState, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  updateRole: (role: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true
        })
      },
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        })
      },
      updateRole: (role) => {
        set((state) => ({
          user: state.user ? { ...state.user, role } : null
        }))
      }
    }),
    {
      name: 'wordcount-auth-storage'
    }
  )
)
