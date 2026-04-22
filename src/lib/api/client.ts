const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

interface ApiErrorPayload {
  success: false
  message: string
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const data = (await response.json()) as T | ApiErrorPayload

  if (!response.ok) {
    const error = data as ApiErrorPayload
    throw new Error(error.message || 'Request failed')
  }

  return data as T
}
