import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (refreshToken && !originalRequest._retry) {
        originalRequest._retry = true
        
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          })
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', newRefreshToken)
          
          api.defaults.headers.Authorization = `Bearer ${accessToken}`
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          
          return api(originalRequest)
        } catch (refreshError) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
}

// Articles API
export const articlesAPI = {
  list: (params) => api.get('/articles', { params }),
  getBySlug: (slug) => api.get(`/articles/${slug}`),
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  publish: (id) => api.put(`/articles/${id}/publish`),
  delete: (id) => api.delete(`/articles/${id}`),
}

// Feed API
export const feedAPI = {
  forYou: (params) => api.get('/feed/for-you', { params }),
  trending: (params) => api.get('/feed/trending', { params }),
  following: (params) => api.get('/feed/following', { params }),
}

// Engagement API
export const engagementAPI = {
  clap: (articleId, count) => api.post(`/engagement/articles/${articleId}/clap`, { count }),
  unclap: (articleId) => api.delete(`/engagement/articles/${articleId}/clap`),
  bookmark: (articleId) => api.post(`/engagement/articles/${articleId}/bookmark`),
  unbookmark: (articleId) => api.delete(`/engagement/articles/${articleId}/bookmark`),
  getComments: (articleId) => api.get(`/engagement/articles/${articleId}/comments`),
  addComment: (articleId, data) => api.post(`/engagement/articles/${articleId}/comments`, data),
  deleteComment: (commentId) => api.delete(`/engagement/comments/${commentId}`),
}

// Users API
export const usersAPI = {
  getProfile: (username) => api.get(`/users/${username}`),
  updateProfile: (data) => api.put('/users/me', data),
  getMyArticles: (params) => api.get('/users/me/articles', { params }),
  getMyBookmarks: (params) => api.get('/users/me/bookmarks', { params }),
  follow: (userId) => api.post(`/users/${userId}/follow`),
  unfollow: (userId) => api.delete(`/users/${userId}/follow`),
  getFollowers: (userId, params) => api.get(`/users/${userId}/followers`, { params }),
  getFollowing: (userId, params) => api.get(`/users/${userId}/following`, { params }),
}

export default api
