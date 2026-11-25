import assert from "node:assert/strict";
import { newResearch, research, available, researchMult, techSum, TECHS, ERAS, ERA_WEEKS_PER_SECOND } from "../src/tech.ts";

// toda exigência aponta para uma tecnologia que existe, e de era igual ou anterior
for (const t of TECHS) for (const q of t.requires) {
  const req = TECHS.find((x) => x.name === q);
  assert.ok(req && req.era <= t.era, `${t.name} exige ${q}`);
}
assert.equal(ERA_WEEKS_PER_SECOND.length, ERAS.length);
assert.ok(Math.abs(1 / (ERA_WEEKS_PER_SECOND[0] * 30) - 0.1) < 1e-9); // tribal: 0,1 s por semana na máxima
// a era tribal inteira (200 anos) cabe no ritmo da tabela: ~3,5 pontos/semana
assert.ok(Math.abs(TECHS.filter((t) => t.era === 0).reduce((a, t) => a + t.cost, 0) / 3.5 - 200 * 52) < 50);

const r = newResearch();
assert.ok(available(r).every((t) => t.era === 0 && t.requires.length === 0), "só tribais sem exigência no início");

// pesquisa escolhe sozinha a mais barata e conclui quando atinge o custo
const first = [...available(r)].sort((a, b) => a.cost - b.cost)[0];
assert.equal(research(r, first.cost - 1), null);
assert.equal(r.researching, first.name);
assert.equal(research(r, 1)?.name, first.name);
assert.ok(r.known.has(first.name));

// conhecer todas as tribais passa para a Clássica, que libera as tecnologias dela
for (let k = 0; k < 100 && r.era === 0; k++) research(r, 1e5);
assert.equal(r.era, 1);
assert.ok(TECHS.filter((t) => t.era === 0).every((t) => r.known.has(t.name)));
assert.ok(available(r).some((t) => t.era === 1));

// Escrita acelera a pesquisa (somada às tribais já conhecidas)
r.known.add("Escrita");
assert.equal(researchMult(r), 1.35); // Escrita +25% e Tradição oral (tribal) +10%

// pesquisando tudo, o país passa por todas as eras até a Moderna, e toda era tem tecnologias
for (let k = 0; k < 5000 && available(r).length; k++) research(r, 1e6);
assert.equal(r.era, ERAS.length - 1);
assert.equal(r.known.size, TECHS.length);
for (let era = 0; era < ERAS.length; era++) assert.ok(TECHS.some((t) => t.era === era), `era ${ERAS[era]} sem tecnologias`);

// efeitos somados: exército, comércio e agitação (que pode ser negativa: acalma)
assert.ok(techSum(r, "army") > 0 && techSum(r, "trade") > 0 && techSum(r, "manpower") > 0);
const calm = newResearch(); calm.known.add("Medicina moderna");
assert.equal(techSum(calm, "unrest"), -5);
assert.ok(techSum(calm, "growth") > 0 && techSum(calm, "plague") > 0, "medicina: mais crescimento, menos peste");
console.log("tech ok");

// letrados: sobem devagar com as tecnologias de ensino e aceleram a pesquisa
{
  const { generateWorld } = await import("../src/world.ts");
  const { createEconomy, tick, RULES } = await import("../src/economy.ts");
  const w = generateWorld(200, 100, 2, 2), e = createEconomy(w), c = e.countries[0];
  tick(w, e); const base = c.researchWeek, lit0 = c.literacy!;
  c.research.known.add("Escrita"); c.research.known.add("Imprensa");
  for (let k = 0; k < 52; k++) tick(w, e);
  assert.ok(Math.abs(c.literacy! - lit0 - RULES.literacyYear) < 1e-6, "deveria subir 1 ponto por ano");
  assert.ok(c.literacy! < 0.2, "não pula direto para o alvo");
  assert.ok(base > 0);
}
console.log("literacy ok");
