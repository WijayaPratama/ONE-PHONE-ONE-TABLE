export function playCue(enabled: boolean, kind: 'night' | 'morning' | 'warning' | 'win') {
  if (!enabled || typeof window === 'undefined') return
  try {
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return
    const context = new Context(); const oscillator = context.createOscillator(); const gain = context.createGain()
    const frequency = kind === 'night' ? 180 : kind === 'morning' ? 520 : kind === 'warning' ? 760 : 620
    oscillator.frequency.value = frequency; oscillator.type = kind === 'night' ? 'sine' : 'triangle'; gain.gain.setValueAtTime(0.05, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22)
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.22)
  } catch { /* Audio can be unavailable until a browser permits it. */ }
}
