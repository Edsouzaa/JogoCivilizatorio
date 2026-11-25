import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick, BUILDINGS, GOODS } from "../src/economy.ts";
import { TECHS, ERAS } from "../src/tech.ts";
import { privateInvest } from "../src/ai.ts";

// a economia roda em todas as eras com todas as tecnologias: sem NaN, sem dinheiro negativo nas contas, sem travar
for (let era = 0; era < ERAS.length; era += 3) {
  const w = generateWorld(200, 100, 11 + era, 3), e = createEconomy(w);
  for (const c of e.countries) {
    c.research.era = era;
    for (const t of TECHS) if (t.era <= era) c.research.known.add(t.name);
    c.politics.laws["Economia"] = era >= 5 ? "Livre comércio" : "Subsistência";
    c.investPool = 1e4; c.treasury = 1e4;
  }
  // uma indústria de cada tipo liberado na capital (testa a ordem das cadeias e os métodos genéricos)
  const cap = e.cities[0].hex; w.pop[cap] = 1e6;
  BUILDINGS.forEach((b, k) => { if (b.industry) { e.levels[k][cap] = 1; e.producers.add(cap); } });
  for (let k = 0; k < 30; k++) { tick(w, e); if (k % 4 === 0) privateInvest(w, e); }
  for (const c of e.countries) {
    assert.ok(Number.isFinite(c.treasury) && Number.isFinite(c.debt) && Number.isFinite(c.gdpWeek), `era ${ERAS[era]}: números do país`);
    assert.ok(c.treasury >= 0 && (c.investPool ?? 0) >= -1e-6, `era ${ERAS[era]}: tesouro/fundo negativos`);
  }
  for (const [key, l] of e.ledgers!) for (const v of [l.rev, l.inputs, l.wages, l.profit, l.reserve, l.debt])
    assert.ok(Number.isFinite(v), `era ${ERAS[era]}: conta ${key} com número inválido`);
  for (const k of e.cities) for (let g = 1; g < GOODS.length; g++) assert.ok(Number.isFinite(k.market.price[g]) && k.market.supply[g] >= -1e-6, `era ${ERAS[era]}: mercado ${GOODS[g]}`);
}
console.log("eras ok");
