// Tipos de unidade terrestre (categoria → unidade da era). Cada um multiplica ataque, defesa, velocidade e
// cerco da divisão. As tecnologias (army) continuam valendo por cima; isto diz QUE tipo de tropa é.
export type UnitType = { name: string; cat: string; tech?: string; atk: number; def: number; speed: number; siege: number; cost: number };

export const UNITS: UnitType[] = [
  { name: "Lanceiros", cat: "Infantaria", atk: 1, def: 1.15, speed: 1, siege: 1, cost: 1 },
  { name: "Arqueiros", cat: "Infantaria", atk: 1.15, def: 0.9, speed: 1, siege: 0.8, cost: 1 },
  { name: "Cavalaria", cat: "Montaria", tech: "Domesticação", atk: 1.35, def: 0.8, speed: 1.7, siege: 0.6, cost: 1.6 },
  { name: "Infantaria pesada", cat: "Infantaria", tech: "Trabalho do ferro", atk: 1.35, def: 1.4, speed: 0.85, siege: 1, cost: 1.4 },
  { name: "Máquinas de cerco", cat: "Cerco", tech: "Castelos", atk: 0.6, def: 0.6, speed: 0.6, siege: 3, cost: 1.5 },
  { name: "Mosqueteiros", cat: "Infantaria", tech: "Pólvora", atk: 1.8, def: 1.7, speed: 1, siege: 1.2, cost: 1.5 },
  { name: "Artilharia", cat: "Artilharia", tech: "Pólvora", atk: 2.2, def: 0.9, speed: 0.7, siege: 2.5, cost: 2 },
  { name: "Fuzileiros", cat: "Infantaria", tech: "Conscrição", atk: 2.4, def: 2.5, speed: 1, siege: 1.2, cost: 1.6 },
  { name: "Blindados", cat: "Blindados", tech: "Blindados", atk: 4, def: 3, speed: 1.5, siege: 1.6, cost: 3 },
  { name: "Infantaria mecanizada", cat: "Infantaria", tech: "Motor a combustão", atk: 3, def: 3.3, speed: 1.4, siege: 1.3, cost: 2.4 },
];
export const unitOf = (name?: string) => UNITS.find((u) => u.name === name) ?? UNITS[0];
/** Estatísticas de uma divisão: o tipo dela, ou num regimento a média pelos soldados de cada tipo
 * (ataque e defesa pela média; anda no passo do mais lento; cerca com a melhor máquina). */
export function statsOf(d: { unit?: string; mix?: Record<string, number> }): UnitType {
  if (!d.mix) return unitOf(d.unit);
  const parts = Object.entries(d.mix).map(([n, s]) => [unitOf(n), s] as const);
  const avg = (f: (u: UnitType) => number) => parts.reduce((a, [u, s]) => a + f(u) * s, 0);
  return { name: "Regimento", cat: "Regimento", atk: avg((u) => u.atk), def: avg((u) => u.def), speed: Math.min(...parts.map(([u]) => u.speed)),
    siege: Math.max(...parts.map(([u]) => u.siege)), cost: avg((u) => u.cost) };
}
/** Tipos que o país já sabe formar. */
export const unitsFor = (known: Set<string>) => UNITS.filter((u) => !u.tech || known.has(u.tech));
/** Melhor tipo disponível (a IA recruta este): maior ataque + defesa por custo. */
export const bestUnit = (known: Set<string>) => unitsFor(known).reduce((a, u) => ((u.atk + u.def) / u.cost > (a.atk + a.def) / a.cost ? u : a));

/** Navios e aviões: tipo por era (força multiplica a frota/esquadrão; as tecnologias fleet/air continuam valendo). */
export type CraftType = { name: string; tech: string; power: number; cost: number };
export const SHIPS: CraftType[] = [
  { name: "Galés", tech: "Galés", power: 1, cost: 1 },
  { name: "Caravelas", tech: "Navegação", power: 1.5, cost: 1.3 },
  { name: "Navios de linha", tech: "Pólvora", power: 2.5, cost: 1.8 },
  { name: "Couraçados", tech: "Eletricidade", power: 5, cost: 3 },
  { name: "Submarinos", tech: "Motor a combustão", power: 4, cost: 2.5 },
  { name: "Porta-aviões", tech: "Aviação", power: 6, cost: 4 },
];
export const PLANES: CraftType[] = [
  { name: "Caças", tech: "Aviação", power: 1, cost: 1 },
  { name: "Caças a jato", tech: "Computadores", power: 3, cost: 2 },
  { name: "Drones", tech: "Drones", power: 4, cost: 2.2 },
];
export const craftOf = (list: CraftType[], name?: string) => list.find((u) => u.name === name) ?? list[0];
export const craftsFor = (list: CraftType[], known: Set<string>) => list.filter((u) => known.has(u.tech));
export const bestCraft = (list: CraftType[], known: Set<string>) => craftsFor(list, known).reduce((a, u) => (u.power / u.cost > a.power / a.cost ? u : a), list[0]);
