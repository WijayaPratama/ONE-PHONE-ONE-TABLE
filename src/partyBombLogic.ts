export const modes = {
  Easy: { wires: 5, cuts: 1, digits: 0 },
  Medium: { wires: 5, cuts: 2, digits: 0 },
  Hard: { wires: 6, cuts: 1, digits: 2 },
  Impossible: { wires: 6, cuts: 2, digits: 3 },
} as const
export type Difficulty = keyof typeof modes
export const tempos = { Santai: 75, Normal: 45, Panik: 30 } as const
export type Tempo = keyof typeof tempos
const colors = ['Merah', 'Biru', 'Kuning', 'Hijau', 'Ungu', 'Putih'] as const
export const wireColors = { Merah: '#f87171', Biru: '#60a5fa', Kuning: '#facc15', Hijau: '#34d399', Ungu: '#c084fc', Putih: '#e2e8f0' }
export type WireColor = typeof colors[number]
export const wireLabel = (index: number) => String.fromCharCode(65 + index)

export interface Clue {
  text: string
  order?: number
  allowed?: number[]
}

export function createMission(difficulty: Difficulty, agents: number, random = Math.random) {
  const config = modes[difficulty]
  const index = (length: number) => Math.floor(random() * length)
  const wires = Array.from({ length: config.wires }, () => colors[index(colors.length)])
  const serial = String(100 + index(900))
  const positions = wires.map((_, i) => i)
  const first = index(wires.length)
  const others = positions.filter(i => i !== first)
  const targets = config.cuts === 1 ? [first] : [first, others[index(others.length)]]
  const clues: Clue[] = []
  targets.forEach((target, order) => {
    const label = `Kabel ke-${order + 1}`
    const neighbor = wires[target === 0 ? 1 : target - 1]
    const patterns = [
      { text: `berada di posisi ${target % 2 === 0 ? 'ganjil' : 'genap'}.`, allowed: positions.filter(i => i % 2 === target % 2) },
      { text: `bersebelahan langsung dengan kabel ${neighbor.toUpperCase()}.`, allowed: positions.filter(i => wires[i - 1] === neighbor || wires[i + 1] === neighbor) },
    ].filter(pattern => pattern.allowed.length > 1 && pattern.allowed.length < positions.length)
    const pattern = patterns[index(patterns.length)]
    clues.push({ order, text: `${label} ${pattern.text}`, allowed: pattern.allowed })
    const alternatives = pattern.allowed.filter(i => i !== target)
    const groups = Array.from({ length: Math.min(agents - 1, alternatives.length) }, () => [] as number[])
    for (let i = 0; alternatives.length; i++) {
      const [alternative] = alternatives.splice(index(alternatives.length), 1)
      groups[i % groups.length].push(alternative)
    }
    // Each group goes to a different agent, and every group removes a separate set of alternatives.
    groups.forEach(group => {
      const labels = group.sort((a, b) => a - b).map(wireLabel).join(' atau ')
      clues.push({ order, text: `${label} bukan kabel ${labels}.`, allowed: positions.filter(i => !group.includes(i)) })
    })
  })
  const pinFacts = [
    { digit: serial[0], text: 'Digit PIN ke-1 adalah angka pertama nomor seri.' },
    { digit: String((wires.filter(color => color === 'Merah').length + 2) % 10), text: 'Digit PIN ke-2 adalah jumlah kabel MERAH ditambah 2.' },
    { digit: serial[2], text: 'Digit PIN ke-3 adalah angka terakhir nomor seri.' },
  ].slice(0, config.digits)
  const facts = [...clues, ...pinFacts]
  // Small puzzles may need corroborating clues so every agent receives a card.
  for (let i = 0; facts.length < agents; i++) facts.push(clues[i % clues.length])
  const hands = Array.from({ length: agents }, () => [] as string[])
  const offset = index(agents)
  facts.forEach((clue, i) => hands[(i + offset) % agents].push(clue.text))
  return { wires, serial, targets, pin: pinFacts.map(fact => fact.digit).join(''), clues, hands }
}

export type Mission = ReturnType<typeof createMission>
export const solved = (mission: Mission, cuts: number, pinDone: boolean) => cuts === mission.targets.length && (!mission.pin || pinDone)
