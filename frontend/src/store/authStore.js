import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '../lib/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      initAuth: () => {
        const token = localStorage.getItem('accessToken')
        if (token) {
          get().fetchProfile()
        }
      },

      fetchProfile: async () => {
        try {
          const response = await authAPI.getMe()
          const userData = response?.data?.data?.user
          if (userData) {
            set({ 
              user: userData,
              isAuthenticated: true 
            })
          }
        } catch (error) {
          console.log('Auth check failed, clearing tokens')
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          set({ user: null, isAuthenticated: false })
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authAPI.login({ email, password })
          const { user, tokens } = response.data.data
          
          localStorage.setItem('accessToken', tokens.accessToken)
          localStorage.setItem('refreshToken', tokens.refreshToken)
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
          return { success: true }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Login failed' 
          })
          return { 
            success: false, 
            error: error.response?.data?.message || 'Login failed' 
          }
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authAPI.register(data)
          const { user, tokens } = response.data.data
          
          localStorage.setItem('accessToken', tokens.accessToken)
          localStorage.setItem('refreshToken', tokens.refreshToken)
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
          return { success: true }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Registration failed' 
          })
          return { 
            success: false, 
            error: error.response?.data?.message || 'Registration failed' 
          }
        }
      },

      logout: async () => {
        const refreshToken = localStorage.getItem('refreshToken')
        try {
          if (refreshToken) {
            await authAPI.logout(refreshToken)
          }
        } catch (error) {
          console.error('Logout error:', error)
        }
        
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, isAuthenticated: false, error: null })
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        }))
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
