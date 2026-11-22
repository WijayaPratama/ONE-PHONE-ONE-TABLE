export function remainingTime(remaining: number, startedAt?: number, running = false, now = Date.now()) {
  if (!running || !startedAt) return Math.max(0, remaining)
  return Math.max(0, remaining - Math.floor((now - startedAt) / 1000))
}

export function pauseTimer(remaining: number, startedAt?: number, running = false) {
  return { remaining: remainingTime(remaining, startedAt, running), running: false, startedAt: undefined }
}
