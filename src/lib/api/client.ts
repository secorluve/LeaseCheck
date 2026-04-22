const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
const apiBaseUrl = configuredApiBaseUrl ?? (import.meta.env.DEV ? '/api' : null)

interface ApiErrorPayload {
  success: false
  message: string
}

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function looksLikeHtml(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized.startsWith('<!doctype html') || normalized.startsWith('<html') || normalized.includes('</html>')
}

function getHtmlApiErrorMessage(status: number): string {
  return `Frontend получил HTML вместо JSON от API${status ? ` (HTTP ${status})` : ''}. Проверьте VITE_API_BASE_URL и доступность backend.`
}

function getApiErrorMessage(
  response: Response,
  rawBody: string,
  parsedBody: ApiErrorPayload | Record<string, unknown> | null,
): string {
  if (parsedBody && typeof parsedBody === 'object' && 'message' in parsedBody && typeof parsedBody.message === 'string') {
    return parsedBody.message
  }

  if (rawBody && looksLikeHtml(rawBody)) {
    return getHtmlApiErrorMessage(response.status)
  }

  if (rawBody.trim()) {
    return rawBody.trim()
  }

  return `API request failed with status ${response.status}`
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('Не задан VITE_API_BASE_URL. Укажите адрес backend API в настройках Vercel.')
  }

  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new Error('Не удалось связаться с backend API. Проверьте VITE_API_BASE_URL и доступность сервера.')
  }

  const rawBody = await response.text()
  const parsedBody = rawBody ? tryParseJson<T | ApiErrorPayload>(rawBody) : null

  if (!response.ok) {
    throw new Error(getApiErrorMessage(response, rawBody, parsedBody as ApiErrorPayload | Record<string, unknown> | null))
  }

  if (parsedBody !== null) {
    return parsedBody as T
  }

  if (!rawBody.trim()) {
    throw new Error('API вернул пустой ответ.')
  }

  if (looksLikeHtml(rawBody)) {
    throw new Error(getHtmlApiErrorMessage(response.status))
  }

  throw new Error('API вернул невалидный JSON.')
}
