// src/lib/api.ts
import axios from 'axios'

// Create base axios instance
const api = axios.create({
  baseURL: 'http://localhost:3000', // Our backend URL from docker-compose
  timeout: 10000,
  withCredentials: true // Important for session handling
})

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized access')
    }
    return Promise.reject(error)
  }
)

// Chat endpoints
export const chatApi = {
  sendMessage: async (message: string) => {
    const response = await api.post('/api/chat', { message })
    return response.data
  }
}

// Export the base instance for other uses
export default api