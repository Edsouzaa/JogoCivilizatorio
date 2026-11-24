import assert from "node:assert/strict";
import { newResearch, research, available, researchMult, techSum, TECHS, ERAS, ERA_WEEKS_PER_SECOND } from "./tech.ts";

// toda exigência aponta para uma tecnologia que existe, e de era igual ou anterior
for (const t of TECHS) for (const q of t.requires) {
  const req = TECHS.find((x) => x.name === q);
  assert.ok(req && req.era <= t.era, `${t.name} exige ${q}`);
}
assert.equal(ERA_WEEKS_PER_SECOND.length, ERAS.length);
assert.equal(ERA_WEEKS_PER_SECOND[0], 1); // tribal: 1 semana por segundo na média

const r = newResearch();
assert.ok(available(r).every((t) => t.era === 0 && t.requires.length === 0), "só tribais sem exigência no início");

// pesquisa escolhe sozinha a mais barata e conclui quando atinge o custo
const agri = TECHS.find((t) => t.name === "Agricultura")!;
assert.equal(research(r, agri.cost - 1), null);
assert.equal(r.researching, "Agricultura");
assert.equal(research(r, 1)?.name, "Agricultura");
assert.ok(r.known.has("Agricultura"));

// conhecer todas as tribais passa para a Clássica, que libera as tecnologias dela
for (let k = 0; k < 100 && r.era === 0; k++) research(r, 5000);
assert.equal(r.era, 1);
assert.ok(TECHS.filter((t) => t.era === 0).every((t) => r.known.has(t.name)));
assert.ok(available(r).some((t) => t.era === 1));

// Escrita acelera a pesquisa
r.known.add("Escrita");
assert.equal(researchMult(r), 1.25);

// pesquisando tudo, o país passa por todas as eras até a Atual, e toda era tem tecnologias
for (let k = 0; k < 5000 && available(r).length; k++) research(r, 1e6);
assert.equal(r.era, ERAS.length - 1);
assert.equal(r.known.size, TECHS.length);
for (let era = 0; era < ERAS.length; era++) assert.ok(TECHS.some((t) => t.era === era), `era ${ERAS[era]} sem tecnologias`);

// efeitos somados: exército, comércio e agitação (que pode ser negativa: acalma)
assert.ok(techSum(r, "army") > 0 && techSum(r, "trade") > 0 && techSum(r, "manpower") > 0);
const calm = newResearch(); calm.known.add("Medicina moderna");
assert.equal(techSum(calm, "unrest"), -5);
console.log("tech ok");
