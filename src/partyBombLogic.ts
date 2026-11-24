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
    const excludes = (text: string, predicate: (i: number) => boolean) => {
      const allowed = positions.filter(predicate)
      if (allowed.length < wires.length) clues.push({ order, text: `${label} ${text}`, allowed })
    }
    excludes(`berada di posisi ${target % 2 === 0 ? 'ganjil' : 'genap'}.`, i => i % 2 === target % 2)
    const neighbor = wires[target === 0 ? 1 : target - 1]
    excludes(`bersebelahan dengan kabel ${neighbor.toUpperCase()}.`, i => wires[i - 1] === neighbor || wires[i + 1] === neighbor)
    positions.filter(i => i !== target).forEach(i => {
      const color = wires[i]
      excludes(color === wires[target] ? `bukan kabel #${i + 1}.` : `bukan ${color.toUpperCase()} pada posisi #${i + 1}.`, j => j !== i)
    })
  })
  const pinFacts = [
    { digit: serial[0], text: 'Digit PIN ke-1 adalah angka pertama nomor seri.' },
    { digit: String((wires.filter(color => color === 'Merah').length + 2) % 10), text: 'Digit PIN ke-2 adalah jumlah kabel MERAH ditambah 2.' },
    { digit: serial[2], text: 'Digit PIN ke-3 adalah angka terakhir nomor seri.' },
  ].slice(0, config.digits)
  const facts = [...clues, ...pinFacts]
  if (facts.length < agents) facts.push({ text: `Nomor seri misi ini berakhir dengan ${serial[2]}.` })
  const hands = Array.from({ length: agents }, () => [] as string[])
  const offset = index(agents)
  facts.forEach((clue, i) => hands[(i + offset) % agents].push(clue.text))
  return { wires, serial, targets, pin: pinFacts.map(fact => fact.digit).join(''), clues, hands }
}

export type Mission = ReturnType<typeof createMission>
export const solved = (mission: Mission, cuts: number, pinDone: boolean) => cuts === mission.targets.length && (!mission.pin || pinDone)
