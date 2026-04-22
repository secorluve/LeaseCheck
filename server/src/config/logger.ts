type LogLevel = 'info' | 'warn' | 'error'

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  }

  const text = JSON.stringify(payload)
  if (level === 'error') {
    console.error(text)
    return
  }

  if (level === 'warn') {
    console.warn(text)
    return
  }

  console.log(text)
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    write('info', message, meta)
  },
  warn(message: string, meta?: Record<string, unknown>) {
    write('warn', message, meta)
  },
  error(message: string, meta?: Record<string, unknown>) {
    write('error', message, meta)
  },
}
