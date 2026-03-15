import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Use a plain axios instance WITHOUT auth interceptors for public endpoints
const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getPublicPlans = async () => {
  const response = await publicClient.get('/api/public/plans/')
  return response.data
}

export const getLandingInfo = async () => {
  const response = await publicClient.get('/api/public/landing/')
  return response.data
}

export default {
  getPublicPlans,
  getLandingInfo,
}
