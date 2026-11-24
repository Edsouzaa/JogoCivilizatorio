// Fomes e pestes. Fome: o mercado da cidade tem bem menos comida do que precisa; o povo da região morre aos poucos.
// Peste: começa por acaso numa cidade grande, pula para as cidades que comerciam com ela e some depois de um tempo.
// A medicina (tecnologias com unrest < 0, como Medicina moderna) reduz chance e mortes.
import { mulberry32, type World } from "./world.ts";
import { GOODS, type Economy } from "./economy.ts";

export const EVENTS = {
  famineFood: 0.25,     // comida ofertada / necessária (somando os tipos) abaixo disto = fome...
  famineMinPop: 100,    // ...em cidade com pelo menos esta gente (aldeia minúscula em terra ruim não conta)
  famineEnd: 2,         // a fome acaba com comida acima de famineFood × isto
  famineDeath: 0.004,   // fração do povo da região que morre por semana de fome
  plagueChance: 0.0004, // por cidade e por mês, × tamanho da cidade
  plagueWeeks: 26,      // duração na cidade
  plagueDeath: 0.003,   // fração do povo da região por semana
  plagueSpread: 0.05,   // chance por mês de pular para uma cidade do mesmo país a até spreadRange
  spreadRange: 12,
  medicine: ["Medicina moderna", "Biotecnologia"], // cada uma corta pela metade chance e mortes
};

const FOOD = ["Grãos", "Frutas e vegetais", "Carne e caça"].map((n) => GOODS.indexOf(n));

const medicineMult = (e: Economy, country: number) =>
  EVENTS.medicine.reduce((m, t) => (e.countries[country - 1].research.known.has(t) ? m / 2 : m), 1);

/** Uma semana: atualiza fomes e pestes, mata gente e devolve o que começou nesta semana (para avisar). */
export function stepEvents(w: World, e: Economy) {
  const started: { kind: "fome" | "peste"; city: number }[] = [];
  const rand = mulberry32(w.seed * 977 + e.week);
  e.famine ??= []; e.plague ??= [];
  const death = new Float64Array(e.cities.length);
  e.cities.forEach((city, k) => {
    const m = city.market;
    const need = FOOD.reduce((s, g) => s + m.need[g], 0), have = FOOD.reduce((s, g) => s + m.supply[g], 0);
    // histerese: a fome só acaba quando a comida passa bem do limite (senão ela entra e sai toda semana)
    const hungry = m.pop >= EVENTS.famineMinPop && need > 0 && have / need < EVENTS.famineFood * (e.famine![k] ? EVENTS.famineEnd : 1);
    if (hungry && !e.famine![k]) started.push({ kind: "fome", city: k });
    e.famine![k] = hungry;
    if (hungry) death[k] += EVENTS.famineDeath;
    const med = medicineMult(e, city.country);
    if (e.plague![k] > 0) { e.plague![k]--; death[k] += EVENTS.plagueDeath * med; }
    else if (e.week % 4 === 0 && rand() < EVENTS.plagueChance * city.size * med) { e.plague![k] = EVENTS.plagueWeeks; started.push({ kind: "peste", city: k }); }
  });
  if (e.week % 4 === 0) e.cities.forEach((city, k) => { // a peste viaja com o comércio
    if (!(e.plague![k] > 0)) return;
    e.cities.forEach((other, j) => {
      if (j === k || other.country !== city.country || e.plague![j] > 0) return;
      const dx = Math.abs((other.hex % w.W) - (city.hex % w.W)), dy = Math.abs(((other.hex / w.W) | 0) - ((city.hex / w.W) | 0));
      if (Math.min(dx, w.W - dx) + dy <= EVENTS.spreadRange && rand() < EVENTS.plagueSpread * medicineMult(e, other.country)) {
        e.plague![j] = EVENTS.plagueWeeks; started.push({ kind: "peste", city: j });
      }
    });
  });
  if (death.some((d) => d > 0)) for (const i of e.owned) { const k = e.market[i]; if (k && death[k - 1]) w.pop[i] *= 1 - death[k - 1]; }
  return started;
}
