import axios from 'axios'

// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        })

        const { access } = response.data
        localStorage.setItem('access_token', access)

        originalRequest.headers.Authorization = `Bearer ${access}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_data')
        window.location.href = '/'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default {
  // Auth endpoints
  auth: {
    register(userData) {
      return apiClient.post('/auth/register/', userData)
    },
    login(credentials) {
      return apiClient.post('/auth/login/', credentials)
    },
    getProfile() {
      return apiClient.get('/auth/profile/')
    },
    updateProfile(userData) {
      return apiClient.patch('/auth/profile/update/', userData)
    },
  },

  // Task endpoints
  tasks: {
    getAll(params = {}) {
      return apiClient.get('/tasks/', { params })
    },
    getById(id) {
      return apiClient.get(`/tasks/${id}/`)
    },
    getToday() {
      return apiClient.get('/tasks/today/')
    },
    getCompleted() {
      return apiClient.get('/tasks/completed/')
    },
    getPending() {
      return apiClient.get('/tasks/pending/')
    },
    getStatistics() {
      return apiClient.get('/tasks/statistics/')
    },
    create(taskData) {
      return apiClient.post('/tasks/', taskData)
    },
    update(id, taskData) {
      return apiClient.put(`/tasks/${id}/`, taskData)
    },
    partialUpdate(id, taskData) {
      return apiClient.patch(`/tasks/${id}/`, taskData)
    },
    delete(id) {
      return apiClient.delete(`/tasks/${id}/`)
    },
    toggleStatus(id) {
      return apiClient.patch(`/tasks/${id}/toggle_status/`)
    },
    uploadAttachment(id, file) {
      const formData = new FormData()
      formData.append('file', file)
      return apiClient.post(`/tasks/${id}/upload_attachment/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
    deleteAttachment(taskId, attachmentId) {
      return apiClient.delete(`/tasks/${taskId}/delete_attachment/?attachment_id=${attachmentId}`)
    },
  },

  // Category endpoints
  categories: {
    getAll() {
      return apiClient.get('/categories/')
    },
    create(categoryData) {
      return apiClient.post('/categories/', categoryData)
    },
    update(id, categoryData) {
      return apiClient.put(`/categories/${id}/`, categoryData)
    },
    delete(id) {
      return apiClient.delete(`/categories/${id}/`)
    },
  },
}