const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('ventpulse_token')
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || `Request failed (${response.status})`)
  return response.json()
}

export async function login(email, password) {
  const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  localStorage.setItem('ventpulse_token', result.token)
  localStorage.setItem('ventpulse_user', JSON.stringify(result.user))
  return result.user
}

export function logout() {
  localStorage.removeItem('ventpulse_token')
  localStorage.removeItem('ventpulse_user')
}

export async function loadDashboard() {
  const [portfolio, alertData, coverage] = await Promise.all([
    request('/portfolio'),
    request('/alerts'),
    request('/telemetry/coverage'),
  ])
  return { buildings: portfolio.buildings, alerts: alertData.alerts, coverage: coverage.coverage }
}

export async function createProperty(payload) {
  return request('/buildings', { method: 'POST', body: JSON.stringify(payload) })
}

export async function createWorkOrder(payload) {
  return request('/work-orders', { method: 'POST', body: JSON.stringify(payload) })
}
