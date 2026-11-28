// Missões aéreas: cada esquadrão tem uma missão na região onde opera (war.ts: d.target = região de missão).
// Prontidão = combustível disponível × tempo (chuva, neblina, neve, tempestade atrapalham). Sem combustível, não voa.
import { GOODS, type Division, type Economy } from "./economy.ts";
import { weatherAt, T, type World } from "./world.ts";
import { seaWeather } from "./seawar.ts";
import { tv, tvMul, tvCut } from "./techvars.ts";

export const AIR_MISSIONS = ["Superioridade aérea", "Apoio aéreo", "Bombardeio estratégico", "Reconhecimento", "Abastecimento aéreo"] as const;
export type AirMission = (typeof AIR_MISSIONS)[number];
export const AIRW = {
  fuel: 0.5,          // combustível por esquadrão por semana (mercado da capital)
  badWeather: 0.6,    // tempo ruim na região: prontidão × isto
  support: 1,         // apoio aéreo: +1 na batalha terrestre da região (com céu ≥ metade)
  bombing: 0.15,      // bombardeio estratégico: −15% de produção na cidade atingida
  bombWeeks: 2,       // o dano dura isto (reparo)
  airlift: 0.3,       // abastecimento aéreo: comida entregue (em semanas de consumo) a cada exército da região
};
export const airMissionOf = (d: Division): AirMission => (AIR_MISSIONS as readonly string[]).includes(d.mission ?? "") ? d.mission as AirMission : "Superioridade aérea";

/** Uma vez por semana: prontidão de cada esquadrão e os efeitos das missões que não são combate. */
export function stepAir(w: World, e: Economy, regionOf: (hex: number) => number, atWar: (a: number, b: number) => boolean) {
  const FUEL = GOODS.indexOf("Combustível");
  const need = new Map<number, number>();
  for (const d of e.divisions) if (d.kind === "air") need.set(d.country, (need.get(d.country) ?? 0) + AIRW.fuel);
  for (const d of e.divisions) {
    if (d.kind !== "air") continue;
    const cap = e.cities.find((k) => k.country === d.country)?.market, hex = d.target ?? d.hex;
    const fuel = cap ? Math.min(1, cap.supply[FUEL] / Math.max(1e-9, need.get(d.country)!)) : 0;
    const wx = w.terrain[hex] === T.OCEAN ? seaWeather(w, hex, e.week) : weatherAt(w, hex, e.week);
    const bad = wx === "chuva" || wx === "neblina" || wx === "neve" || wx === "tempestade" || wx === "nevoeiro" || wx === "lama";
    const cmdr = d.general ? e.characters?.find((c) => c.id === d.general) : undefined; // comandante aéreo: prontidão +10% (logística aérea +20%)
    const ra = e.countries[d.country - 1].research;
    d.ready = Math.min(1, Math.max(fuel > 0 ? Math.min(fuel, tv(ra, "airOrganization")) : 0, fuel * (bad ? Math.min(1, AIRW.badWeather + tv(ra, "airReconnaissance")) : 1) * (cmdr ? (cmdr.spec === "Logística aérea" ? 1.2 : 1.1) : 1)));
    if (d.ready < 0.05) continue;
    const region = regionOf(hex), m = airMissionOf(d);
    if (m === "Bombardeio estratégico") for (const k of e.cities) if (atWar(k.country, d.country) && regionOf(k.hex) === region) { k.bombed = e.week + AIRW.bombWeeks; k.bombHit = Math.min(0.6, AIRW.bombing * tvMul(e.countries[d.country - 1].research, "airBombing") * tvCut(e.countries[k.country - 1].research, "airInterception", 0.2)); }
    if (m === "Abastecimento aéreo") for (const a of e.divisions) if (a.kind === "army" && a.country === d.country && regionOf(a.hex) === region && a.stock) a.stock.food += AIRW.airlift * d.ready * tvMul(e.countries[d.country - 1].research, "airLogistics");
  }
}
/** Apoio aéreo: o país tem esquadrão pronto com essa missão na região. */
export const airSupport = (e: Economy, region: number, country: number, regionOf: (hex: number) => number) =>
  e.divisions.some((d) => d.kind === "air" && d.country === country && (d.ready ?? 1) > 0.3 && airMissionOf(d) === "Apoio aéreo" && regionOf(d.target ?? d.hex) === region);
/** Reconhecimento aéreo: o país vê a região (sem emboscada contra ele). */
export const airRecon = (e: Economy, region: number, country: number, regionOf: (hex: number) => number) =>
  e.divisions.some((d) => d.kind === "air" && d.country === country && (d.ready ?? 1) > 0.3 && airMissionOf(d) === "Reconhecimento" && regionOf(d.target ?? d.hex) === region);
