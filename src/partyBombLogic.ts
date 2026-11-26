export const modes = {
  Easy: { wires: 5, cuts: 1, digits: 0 },
  Medium: { wires: 5, cuts: 2, digits: 0 },
  Hard: { wires: 6, cuts: 1, digits: 3 },
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
  accepts: (sequence: number[]) => boolean
}

export function possibleCuts(wireCount: number, cuts: number): number[][] {
  const positions = Array.from({ length: wireCount }, (_, i) => i)
  return positions.flatMap(first => cuts === 1 ? [[first]] : positions.filter(second => second !== first).map(second => [first, second]))
}

export function createMission(difficulty: Difficulty, agents: number, random = Math.random) {
  const config = modes[difficulty]
  const index = (length: number) => Math.floor(random() * length)
  const positions = Array.from({ length: config.wires }, (_, i) => i)
  const wires = positions.map(() => colors[index(colors.length)])
  const serial = String(100 + index(900))
  const sequences = possibleCuts(config.wires, config.cuts)
  const targets = sequences[index(sequences.length)]
  const total = config.digits ? (agents <= 4 ? 9 : agents * 2) : agents <= 4 ? agents * 2 : 7
  const offset = index(agents)
  const capacity = positionsForAgents().map((_, i) => Math.floor(total / agents) + (i < total % agents ? 1 : 0))
  const hands: string[][] = positionsForAgents().map(() => [])
  const cards: Clue[][] = positionsForAgents().map(() => [])
  const clues: Clue[] = []
  const used = new Set<string>()
  function positionsForAgents() { return Array.from({ length: agents }, (_, i) => (i + offset) % agents) }

  const redCount = wires.filter(color => color === 'Merah').length
  const yellow = wires.indexOf('Kuning')
  const pinFacts = [
    { digit: String(redCount), text: 'Digit ke-1 PIN adalah jumlah kabel Merah.' },
    yellow >= 0 && wires.lastIndexOf('Kuning') === yellow
      ? { digit: String(yellow + 1), text: 'Digit ke-2 PIN adalah posisi kabel Kuning.' }
      : { digit: serial[1], text: 'Digit ke-2 PIN adalah angka tengah nomor seri.' },
    { digit: serial[2], text: 'Digit ke-3 PIN adalah angka terakhir nomor seri.' },
  ].slice(0, config.digits)
  pinFacts.forEach((fact, agent) => hands[agent].push(fact.text))

  const signatures = new Map<Clue, string>()
  const signature = (clue: Clue) => {
    const cached = signatures.get(clue)
    if (cached !== undefined) return cached
    const value = sequences.map(sequence => clue.accepts(sequence) ? '1' : '0').join('')
    signatures.set(clue, value)
    return value
  }
  const canAdd = (agent: number, clue: Clue) => {
    if (hands[agent].length >= capacity[agent] || used.has(signature(clue))) return false
    const left = sequences.filter(sequence => clue.accepts(sequence) && cards[agent].every(fact => fact.accepts(sequence)))
    return targets.every((_, order) => new Set(left.map(sequence => sequence[order])).size > 1)
  }
  const add = (agent: number, clue: Clue) => {
    clues.push(clue)
    used.add(signature(clue))
    cards[agent].push(clue)
    hands[agent].push(clue.text)
  }

  const extras: Clue[] = []
  targets.forEach((target, order) => {
    const label = `Kabel ke-${order + 1}`
    const fact = (text: string, allowed: number[]): Clue => ({ text: `${label} ${text}`, accepts: sequence => allowed.includes(sequence[order]) })
    const exclusion = (excluded: number[]) => fact(`bukan kabel ${excluded.map(wireLabel).join(' maupun ')}.`, positions.filter(i => !excluded.includes(i)))
    const patterns = [
      { text: `berada di posisi ${target % 2 ? 'genap' : 'ganjil'}.`, allowed: positions.filter(i => i % 2 === target % 2) },
      { text: `berwarna ${wires[target]}.`, allowed: positions.filter(i => wires[i] === wires[target]) },
      ...colors.filter(color => color !== wires[target]).map(color => ({
        text: `bukan warna ${color}.`, allowed: positions.filter(i => wires[i] !== color),
      })),
      ...colors.flatMap(color => {
        const adjacent = positions.filter(i => wires[i - 1] === color || wires[i + 1] === color)
        const below = positions.filter(i => wires[i - 1] === color)
        return [
          { text: `bersebelahan dengan kabel ${color}.`, allowed: adjacent },
          { text: `berada tepat di bawah kabel ${color}.`, allowed: below },
        ]
      }),
    ].filter(pattern => pattern.allowed.includes(target) && pattern.allowed.length > 1 && pattern.allowed.length < wires.length)
    const pattern = patterns[index(patterns.length)]
    const core = [fact(pattern.text, pattern.allowed), exclusion(pattern.allowed.filter(i => i !== target))]
    const coreAgents = new Set<number>()
    for (const clue of core) {
      const agent = positionsForAgents().sort((a, b) => hands[a].length - hands[b].length)
        .find(i => !coreAgents.has(i) && canAdd(i, clue))
      if (agent === undefined) throw new Error('Cable clue could not be assigned')
      add(agent, clue)
      coreAgents.add(agent)
    }
    extras.push(...patterns.map(candidate => fact(candidate.text, candidate.allowed)))
    const alternatives = positions.filter(i => i !== target)
    for (let mask = 1; mask < (1 << alternatives.length) - 1; mask++) {
      extras.push(exclusion(alternatives.filter((_, i) => mask & (1 << i))))
    }
  })
  if (targets.length === 2) {
    const lower = targets[1] > targets[0]
    extras.unshift({
      text: `Kabel ke-2 berada lebih ${lower ? 'bawah' : 'atas'} dari kabel ke-1.`,
      accepts: sequence => (sequence[1] > sequence[0]) === lower,
    })
  }

  for (const agent of positionsForAgents()) {
    while (hands[agent].length < capacity[agent]) {
      const eligible = extras.filter(clue => canAdd(agent, clue))
      const varied = eligible.filter(clue => !clue.text.includes('bukan kabel'))
      const pool = varied.length ? varied : eligible
      if (!pool.length) throw new Error('No distinct cable clue remains for this agent')
      add(agent, pool[index(pool.length)])
    }
  }
  return { wires, serial, targets, pin: pinFacts.map(fact => fact.digit).join(''), clues, hands }
}

export type Mission = ReturnType<typeof createMission>
export const solved = (mission: Mission, cuts: number, pinDone: boolean) => cuts === mission.targets.length && (!mission.pin || pinDone)
