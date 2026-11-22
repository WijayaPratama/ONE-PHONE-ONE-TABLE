import type { RoleDefinition, RoleId } from './types'

export const roles: RoleDefinition[] = [
  { id: 'villager', name: 'Villager', team: 'Desa', description: 'Tidak memiliki kemampuan khusus. Bertugas menemukan Werewolf melalui diskusi dan voting.', ability: 'Diskusikan petunjuk dan gunakan suaramu untuk melindungi desa.' },
  { id: 'werewolf', name: 'Werewolf', team: 'Werewolf', description: 'Mengetahui identitas sesama Werewolf. Pada malam hari, mereka menentukan satu target.', ability: 'Temukan rekanmu dan singkirkan warga tanpa ketahuan.' },
  { id: 'seer', name: 'Seer', team: 'Desa', description: 'Setiap malam dapat memeriksa satu pemain untuk mengetahui apakah pemain tersebut Werewolf atau bukan.', ability: 'Pilih satu pemain untuk diperiksa setiap malam.' },
  { id: 'guardian', name: 'Guardian', team: 'Desa', description: 'Setiap malam dapat memilih satu pemain untuk dilindungi dari serangan Werewolf.', ability: 'Pilih satu pemain untuk dilindungi setiap malam.' },
  { id: 'hunter', name: 'Hunter', team: 'Desa', description: 'Ketika tereliminasi, dapat memilih satu pemain lain untuk ikut tereliminasi.', ability: 'Saat tereliminasi, bawa satu pemain lain bersamamu.' },
  { id: 'tanner', name: 'Tanner', team: 'Netral', description: 'Menang sendiri jika berhasil dieliminasi melalui voting siang hari.', ability: 'Yakinkan desa untuk memilihmu pada siang hari.' }
  , { id: 'witch', name: 'Witch (Penyihir)', team: 'Desa', description: 'Dua ramuan sekali pakai. Pilih paling banyak satu per malam.', ability: 'Pasang penyembuh pada satu pemain hidup. Ramuan terpakai jika ia diserang. Mulai malam kedua, racun bisa mengeliminasi pemain meski dilindungi Guardian.' },
  { id: 'cupid', name: 'Cupid (Dewi Asmara)', team: 'Desa', description: 'Memilih dua Lovers pada malam pertama.', ability: 'Moderator mempertemukan pasangan secara rahasia. Jika satu gugur, pasangannya ikut gugur.' },
  { id: 'mayor', name: 'Mayor (Kepala Desa)', team: 'Desa', description: 'Suara Mayor berbobot dua saat keputusan meja.', ability: 'Moderator menerapkan bobot suara saat diskusi langsung.' },
  { id: 'alpha', name: 'Alpha Werewolf (Serigala Alfa)', team: 'Werewolf', description: 'Pemimpin kawanan.', ability: 'Ikut memilih korban. Pemeriksaan Seer membaca dirinya sebagai Villager.' },
  { id: 'wolfcub', name: 'Wolfcub (Anak Serigala)', team: 'Werewolf', description: 'Anggota kawanan.', ability: 'Jika gugur, kawanan dapat menyerang dua target berbeda malam berikutnya.' },
  { id: 'sorcerer', name: 'Sorcerer (Penyidik Jahat)', team: 'Werewolf', description: 'Membantu tim Werewolf mencari Seer.', ability: 'Periksa satu pemain hidup tiap malam untuk mengetahui apakah ia Seer.' },
  { id: 'doppelganger', name: 'Doppelganger', team: 'Netral', description: 'Mewarisi role pemain pilihannya setelah pemain itu gugur.', ability: 'Tentukan satu pemain di malam pertama. Setelah mewarisi role, ikuti kondisi kemenangan role itu.' }
]
export const roleIds = roles.map(r => r.id) as RoleId[]
export const blankComposition = (): Record<RoleId, number> => Object.fromEntries(roleIds.map(id => [id, 0])) as Record<RoleId, number>
export const isWolf = (role?: RoleId) => role === 'werewolf' || role === 'alpha' || role === 'wolfcub'
export const teamOf = (role?: RoleId) => roles.find(entry => entry.id === role)?.team

export function recommendedPreset(count: number): Record<RoleId, number> {
  const result = blankComposition()
  result.werewolf = count >= 10 ? 3 : 2
  result.seer = 1; result.guardian = 1
  if (count >= 8) result.hunter = 1
  if (count >= 9) result.tanner = 1
  result.villager = count - Object.values(result).reduce((a, b) => a + b, 0)
  if (result.villager < 0) { result.villager = 0; result.hunter = 0 }
  return result
}
