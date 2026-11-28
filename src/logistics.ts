// Logística terrestre e atrito (Etapas 3 e 4). Cada exército tem demanda por tipo de suprimento, um estoque próprio
// (semanas de autonomia) e um nível de abastecimento de 0 a 100%. O suprimento vem do mercado da capital (o que existe de
// verdade), passa pela capacidade de transporte do país (cidades e estradas) e chega conforme a distância ao depósito
// mais perto (cidade própria ou ocupada, posto avançado). Falta de comida mata e derruba moral; sem munição o fogo enfraquece;
// sem combustível os blindados param. Atrito (terreno, inverno, fome, doença) é separado das baixas de batalha.
import { GOODS, BUILDINGS, type Division, type Economy } from "./economy.ts";
import { T, snowAt, type World } from "./world.ts";
import { statsOf } from "./units.ts";
import { techSum } from "./tech.ts";
import { styleOf } from "./characters.ts";
import { weatherAt } from "./world.ts";
import { tv, tvMul, tvCut } from "./techvars.ts";

export const LOGI = {
  foodPerSoldier: 0.004,   // comida (unidades de mercado) por soldado por semana
  ammoPerSoldier: 0.002,   // pólvora por soldado por semana (só depois da Pólvora)
  fuelPerSoldier: 0.004,   // combustível por soldado de blindados/mecanizada por semana
  reserveWeeks: 4,         // estoque máximo do exército em semanas (+ 0,5 por era)
  refill: 1.5,
  logisticStyle: 0.15,     // general logístico: entrega +15%
  badWeather: 0.25,        // lama ou neve: entrega −25%
  depotCapacity: 150,      // soldados a mais que cada nível de depósito abastece por semana (× 1 + era/3)             // entrega máxima por semana em semanas de consumo (o que passa de 1 enche o estoque)
  capPerCitySize: 60,      // soldados que o país consegue abastecer por semana por tamanho de cidade (× 1 + era/3)
  rangeLoss: 0.6,          // no limite do alcance chega só 40%
  railBonus: 0.2,          // Ferrovias: entrega +20%
  forage: 0.25,            // parte da comida que o exército tira da terra onde está (se houver gente)
  forageDeath: 0.0005,     // fração da gente do hex que some por semana por exército forrageando (saque tem custo)
  levels: [[1, "completo"], [0.75, "adequado"], [0.5, "insuficiente"], [0.25, "crítico"], [0.01, "quase sem suprimentos"], [0, "isolado"]] as [number, string][],
};
export const ATTRITION = {
  terrain: { [T.PLAINS]: 0.001, [T.GRASS]: 0.001, [T.STEPPE]: 0.002, [T.SAVANNA]: 0.003, [T.DESERT]: 0.006, [T.FOREST]: 0.003, [T.TAIGA]: 0.004, [T.JUNGLE]: 0.008, [T.HILLS]: 0.003, [T.MOUNTAIN]: 0.008, [T.TUNDRA]: 0.006 } as Record<number, number>,
  winter: 0.004,           // neve: soma isto (e dobra o do terreno)
  heat: 0.003,             // calor forte: desidratação
  rain: 0.001,             // chuva e lama: doença
  homeShare: 0.25,         // em território próprio e abastecido, o atrito de terreno e clima cai a isto
  hostile: 0.002,          // território inimigo
  hunger: 0.03,            // × falta de comida (0..1)
  hungerMorale: 0.05,      // moral perdida × falta de comida
  fatigueMove: 0.15, fatigueRest: 0.25, // fadiga: marchar sobe, parar desce
};

export type Supply = { level: number; food: number; ammo: number; fuel: number; stock: number; delivered: number; demand: number };
const needAmmo = (e: Economy, d: Division) => e.countries[d.country - 1].research.known.has("Pólvora");
const needFuel = (d: Division) => ["Blindados", "Infantaria mecanizada"].includes(statsOf(d).name) || Object.keys(d.mix ?? {}).some((n) => n === "Blindados" || n === "Infantaria mecanizada");
export const levelName = (v: number) => LOGI.levels.find(([min]) => v >= min)?.[1] ?? "isolado";

/** Demanda semanal do exército por bem do mercado: [bem, quantidade]. */
export function demandOf(e: Economy, d: Division): [number, number][] {
  const out: [number, number][] = [[GOODS.indexOf("Grãos"), d.strength * LOGI.foodPerSoldier]];
  if (needAmmo(e, d)) out.push([GOODS.indexOf("Pólvora"), d.strength * LOGI.ammoPerSoldier]);
  if (needFuel(d)) out.push([GOODS.indexOf("Combustível"), d.strength * LOGI.fuelPerSoldier * tvCut(e.countries[d.country - 1].research, "fuelEfficiency")]);
  return out;
}

/**
 * Uma vez por semana, depois do mercado: distribui o suprimento. Exércitos em batalha recebem primeiro, depois os mais perto
 * do depósito. `depotDist` = distância ao depósito; `range` = alcance da logística do país; `fighting` = em combate.
 */
export function stepSupply(w: World, e: Economy, depotDist: (d: Division) => number, range: (country: number) => number, fighting: Set<Division>, seaRoute: (d: Division) => number = () => 1) {
  const armies = e.divisions.filter((d) => d.kind === "army" && w.terrain[d.hex] !== T.OCEAN);
  const byCountry = new Map<number, Division[]>();
  for (const d of armies) { if (!byCountry.has(d.country)) byCountry.set(d.country, []); byCountry.get(d.country)!.push(d); }
  for (const [country, ds] of byCountry) {
    const c = e.countries[country - 1], cap0 = e.cities.find((k) => k.country === country);
    let capacity = e.cities.filter((k) => k.country === country).reduce((s, k) => s + k.size * (1 + 0.1 * (k.road ?? 0)), 0) * LOGI.capPerCitySize * (1 + c.research.era / 3);
    // o exército é abastecido antes da população (requisição): o limite é a oferta da capital frente à demanda militar
    const armyNeed = new Map<number, number>();
    for (const d of ds) for (const [gi, q] of demandOf(e, d)) armyNeed.set(gi, (armyNeed.get(gi) ?? 0) + q);
    const fill = (gi: number) => (cap0 ? Math.min(LOGI.refill, cap0.market.supply[gi] / Math.max(1e-9, armyNeed.get(gi) ?? 0)) : 0); // sobrando, chega até 50% a mais para encher o estoque
    const rail = c.research.known.has("Ferrovias") ? LOGI.railBonus : 0;
    // prioridade: a escolhida pelo jogador (1 = emergência … 6 = treino); sem escolha, em combate = frente (2), senão guarnição (4)
    const prio = (d: Division) => d.priority ?? (fighting.has(d) ? 2 : 4);
    const order = ds.map((d) => ({ d, dist: depotDist(d) })).sort((a, b) => prio(a.d) - prio(b.d) || a.dist - b.dist);
    capacity += depotCapacity(e, country);
    capacity *= tvMul(c.research, "logisticsCapacity");
    for (const { d, dist } of order) {
      const gen = d.general ? e.characters?.find((x) => x.id === d.general) : undefined, logi = gen && styleOf(gen) === "Logístico" ? LOGI.logisticStyle : 0;
      const wx = weatherAt(w, d.hex, e.week), mud = wx === "lama" || wx === "neve" ? LOGI.badWeather : 0; // lama e neve atrasam carroças e caminhões
      const r = range(country), eff = dist <= r ? Math.min(1, (1 - LOGI.rangeLoss * tvCut(c.research, "supplyEfficiency") * dist / Math.max(1, r)) * (1 + rail + logi) * (1 - mud)) * seaRoute(d) : 0; // além-mar: comboio
      const share = Math.min(1, capacity / Math.max(1, d.strength)); // capacidade de transporte do país (não se usa duas vezes)
      capacity = Math.max(0, capacity - d.strength * eff);
      const reserve = LOGI.reserveWeeks + c.research.era / 2, s = (d.stock ??= { food: reserve / 2, ammo: reserve / 2, fuel: reserve / 2 });
      const got = (gi: number) => eff * share * fill(gi);
      // forragem: comida da terra onde está (limitada e com custo para a gente local)
      const local = w.pop[d.hex] > 50 ? LOGI.forage : 0;
      if (local) w.pop[d.hex] *= 1 - LOGI.forageDeath;
      const food = Math.min(LOGI.refill, got(GOODS.indexOf("Grãos")) + local);
      const ammo = needAmmo(e, d) ? got(GOODS.indexOf("Pólvora")) : 1, fuel = needFuel(d) ? got(GOODS.indexOf("Combustível")) : 1;
      // estoque em semanas: entra o que chegou, sai uma semana de consumo
      s.food = Math.max(0, Math.min(reserve, s.food + food - 1)); s.ammo = Math.max(0, Math.min(reserve, s.ammo + ammo - (fighting.has(d) ? 1 : 0.3))); s.fuel = Math.max(0, Math.min(reserve, s.fuel + fuel - (d.target !== null ? 1 : 0.2)));
      const lv = (have: number, flow: number) => (have > 0 ? 1 : Math.min(1, flow)); // com estoque: atendido; sem: só o que chegou
      const sup: Supply = { food: lv(s.food, food), ammo: lv(s.ammo, ammo), fuel: lv(s.fuel, fuel), level: 0, stock: Math.min(s.food, needAmmo(e, d) ? s.ammo : Infinity), delivered: food, demand: d.strength * LOGI.foodPerSoldier };
      sup.level = Math.min(sup.food, (sup.food + sup.ammo + sup.fuel) / 3); // nível geral; a falta específica tem efeito próprio
      d.supply = sup; d.supplied = sup.level >= 0.5;
    }
  }
}

/** Atrito da semana (separado das baixas de batalha): terreno, inverno, território hostil, fome; fadiga e moral. Devolve os mortos. */
export function attrition(w: World, e: Economy, d: Division, moved: boolean, hostile: boolean): number {
  const c = e.countries[d.country - 1], snow = snowAt(w, d.hex, e.week);
  const hunger = 1 - (d.supply?.food ?? 1);
  const home = !hostile && (d.supply?.level ?? 1) >= 0.75 ? ATTRITION.homeShare : 1; // em casa e abastecido: quartéis, não campanha
  const wx = weatherAt(w, d.hex, e.week);
  let rate = ((ATTRITION.terrain[w.terrain[d.hex]] ?? 0.002) * (snow ? 2 : 1) + (snow ? ATTRITION.winter : 0) + (wx === "calor" ? ATTRITION.heat : 0) + (wx === "chuva" || wx === "lama" ? ATTRITION.rain * tvCut(c.research, "diseaseResistance") : 0)) * home
    + (hostile ? ATTRITION.hostile : 0) + hunger * ATTRITION.hunger;
  rate *= (1 - Math.min(0.6, techSum(c.research, "plague"))) * tvCut(c.research, "attritionReduction"); // medicina corta doença; tecnologias de campanha cortam o resto
  d.fatigue = Math.max(0, Math.min(1, (d.fatigue ?? 0) + (moved ? ATTRITION.fatigueMove * (wx === "calor" || wx === "lama" ? 1.5 : 1) : -ATTRITION.fatigueRest)));
  d.morale = Math.max(0, Math.min(1, (d.morale ?? 1) - hunger * ATTRITION.hungerMorale + (hunger === 0 && !moved ? 0.02 : 0)));
  if ((d.supply?.fuel ?? 1) < 0.5 && needFuel(d)) d.target = null; // sem combustível, blindado não anda
  const dead = d.strength * rate;
  d.strength -= dead;
  c.attritionTotal = (c.attritionTotal ?? 0) + dead;
  return dead;
}

/** Depósitos de suprimentos (construção): hexes com nível e capacidade extra de transporte do país. */
export const depotHexes = (w: World, e: Economy, country: number) => {
  const b = BUILDINGS.findIndex((x) => x.name === DEPOT_NAME), out: number[] = [];
  for (const i of e.producers) if (e.levels[b][i] && w.owner[i] === country) out.push(i);
  return out;
};
export const DEPOT_NAME = "Depósito de suprimentos";
export function depotCapacity(e: Economy, country: number) {
  const b = BUILDINGS.findIndex((x) => x.name === DEPOT_NAME);
  let lv = 0;
  for (const i of e.producers) if (e.levels[b][i] && e.cities[e.market[i] - 1]?.country === country) lv += e.levels[b][i];
  return lv * LOGI.depotCapacity * (1 + e.countries[country - 1].research.era / 3);
}
/** Prioridades de abastecimento (o jogador escolhe por exército). */
export const PRIORITIES = ["Emergência", "Frente de batalha", "Em preparação", "Guarnição", "Reserva", "Treinamento"] as const;
