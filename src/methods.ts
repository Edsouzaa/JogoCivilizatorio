// Métodos de produção (estilo Victoria 3): cada edifício escolhe 1 método por categoria.
//   Produção-base, Produção secundária, Automação, Organização, Manutenção.
// Um método muda a produção (bônus sobre a base), os trabalhadores (multiplicador), a manutenção e pede insumos
// extras por nível (ferramentas, cavalos, carvão...). O bônus só vem na proporção dos insumos que o mercado tiver:
// sem insumo, o método roda como o mais simples. Os bônus de tecnologia continuam à parte (economy.ts updateBonus).
// Escolha do jogador por edifício em e.methods ("hex:b" → índice por categoria, −1 = automático: o melhor liberado).
import type { Economy } from "./economy.ts";

export const CATEGORIES = ["Produção-base", "Produção secundária", "Automação", "Organização", "Manutenção"] as const;
export type Method = {
  name: string; tech?: string; desc?: string;
  out?: number;                  // + fração da produção
  workers?: number;              // × trabalhadores (automação < 1)
  upkeep?: number;               // × manutenção
  inputs?: [string, number][];   // insumos extras por nível por semana
  extra?: [string, number][];    // produtos extras por nível por semana (produção secundária)
  divShare?: number;             // Organização: fração do lucro livre que vira dividendo (resto: reinveste)
  state?: boolean;               // Organização estatal: o lucro livre vai para o tesouro e o Estado cobre o prejuízo
};
const M = (name: string, o: Omit<Method, "name"> = {}): Method => ({ name, ...o });

// --- categorias comuns
const MAINT: Method[] = [
  M("Manutenção rudimentar"),
  M("Manutenção regular", { tech: "Escrita", out: 0.05, upkeep: 1.2 }),
  M("Manutenção especializada", { tech: "Universidades", out: 0.1, upkeep: 1.4, inputs: [["Ferramentas", 0.1]] }),
  M("Manutenção industrial", { tech: "Máquina a vapor", out: 0.15, upkeep: 1.6, inputs: [["Ferramentas", 0.2]] }),
  M("Manutenção automatizada", { tech: "Computadores", out: 0.2, upkeep: 2, workers: 0.9, inputs: [["Ferramentas", 0.3]] }),
];
const ORG: Method[] = [
  M("Comunitária", { desc: "A comunidade fica com o resultado: quase tudo é reinvestido.", divShare: 0.2 }),
  M("Familiar", { tech: "Agricultura", desc: "Famílias tocam o negócio; metade vira renda.", divShare: 0.5 }),
  M("Aristocrática", { tech: "Feudalismo", desc: "Nobres ficam com a maior parte do lucro.", divShare: 0.75, out: 0.05 }),
  M("Companhia comercial", { tech: "Companhias comerciais", desc: "Sócios e ações; reinveste para crescer.", divShare: 0.6, out: 0.1 }),
  M("Empresarial", { tech: "Máquina a vapor", desc: "Gerentes profissionais; mais produtividade.", divShare: 0.6, out: 0.15, workers: 0.95 }),
  M("Cooperativa", { tech: "Iluminismo", desc: "Os trabalhadores são donos: dividendo vai para eles.", divShare: 0.5, out: 0.05 }),
  M("Estatal", { tech: "Escrita", desc: "O Estado administra: o lucro livre vai para o tesouro (sai da renda dos donos) e o Estado cobre o prejuízo.", divShare: 0, out: -0.05, state: true }),
];
const HAND = M("Trabalho manual");

// --- por construção: [base, secundária, automação]; organização e manutenção são comuns
const BY: Record<string, [Method[], Method[], Method[]]> = {
  "Fazenda": [
    [M("Agricultura de subsistência"), M("Agricultura tradicional", { tech: "Agricultura", out: 0.1 }), M("Rotação de culturas", { tech: "Feudalismo", out: 0.2 }),
      M("Agricultura intensiva", { tech: "Moinhos", out: 0.3, workers: 1.1 }), M("Agricultura científica", { tech: "Agricultura científica", out: 0.45, inputs: [["Enxofre", 0.1]] }),
      M("Agricultura de precisão", { tech: "Computadores", out: 0.6, inputs: [["Enxofre", 0.15]] })],
    [M("Especialização"), M("Diversificação", { tech: "Irrigação", extra: [["Frutas e vegetais", 1]], workers: 1.1 })],
    [HAND, M("Arado", { tech: "Domesticação", out: 0.1, workers: 0.9, inputs: [["Gado", 0.1]] }), M("Arado pesado", { tech: "Arado pesado", out: 0.2, workers: 0.8, inputs: [["Cavalos", 0.1], ["Ferramentas", 0.1]] }),
      M("Tratores", { tech: "Motor a combustão", out: 0.35, workers: 0.45, inputs: [["Petróleo", 0.3], ["Ferramentas", 0.3]] }),
      M("Máquinas agrícolas", { tech: "Automação", out: 0.5, workers: 0.25, inputs: [["Petróleo", 0.4], ["Ferramentas", 0.4]] })],
  ],
  "Pasto": [
    [M("Pecuária extensiva"), M("Pecuária seletiva", { tech: "Feudalismo", out: 0.15 }), M("Pecuária intensiva", { tech: "Agricultura científica", out: 0.3, inputs: [["Grãos", 0.5]] }),
      M("Pecuária industrial", { tech: "Química industrial", out: 0.5, inputs: [["Grãos", 1]] })],
    [M("Produção de carne", { extra: [["Carne e caça", 1]] }), M("Produção de couro", { tech: "Domesticação", extra: [["Peles", 1]] })],
    [HAND, M("Cercas especializadas", { tech: "Trabalho do ferro", out: 0.1, workers: 0.85, inputs: [["Madeira", 0.2]] }),
      M("Alimentação mecanizada", { tech: "Máquina a vapor", out: 0.2, workers: 0.6, inputs: [["Ferramentas", 0.2]] }), M("Ordenha mecanizada", { tech: "Eletricidade", out: 0.3, workers: 0.4, inputs: [["Ferramentas", 0.3]] })],
  ],
  "Acampamento de caça": [
    [M("Caça tradicional"), M("Caça organizada", { tech: "Domesticação", out: 0.1 }), M("Caça intensiva", { tech: "Pólvora", out: 0.25, inputs: [["Armas", 0.05]] })],
    [M("Conservação de alimentos", { tech: "Agricultura", inputs: [["Sal", 0.1]], out: 0.1 }), M("Produção de peles", { extra: [["Peles", 1]] }), M("Aproveitamento integral", { tech: "Tecelagem", extra: [["Peles", 0.5], ["Carne e caça", 0.5]] })],
    [M("Ferramentas rudimentares"), M("Armas", { tech: "Armas de bronze", out: 0.15, inputs: [["Armas", 0.05]] }), M("Equipamentos modernos", { tech: "Metralhadora", out: 0.3, workers: 0.7, inputs: [["Armas", 0.1]] })],
  ],
  "Serraria": [
    [M("Corte manual"), M("Produção artesanal", { tech: "Trabalho do ferro", out: 0.1, inputs: [["Ferramentas", 0.05]] }), M("Serraria hidráulica", { tech: "Moinhos", out: 0.25 }),
      M("Serraria a vapor", { tech: "Máquina a vapor", out: 0.45, inputs: [["Carvão mineral", 0.3]] }), M("Serraria elétrica", { tech: "Eletricidade", out: 0.6, workers: 0.8 }),
      M("Serraria automatizada", { tech: "Automação", out: 0.8, workers: 0.4 })],
    [M("Madeira bruta"), M("Aproveitamento de resíduos", { tech: "Escrita", extra: [["Papel", 0.3]], workers: 1.05 })],
    [M("Serras manuais"), M("Serras mecânicas", { tech: "Máquina a vapor", out: 0.15, workers: 0.7, inputs: [["Ferramentas", 0.2]] }),
      M("Linhas industriais", { tech: "Produção em massa", out: 0.25, workers: 0.5, inputs: [["Ferramentas", 0.3]] }), M("Equipamentos automatizados", { tech: "Automação", out: 0.35, workers: 0.3, inputs: [["Ferramentas", 0.4]] })],
  ],
  "Mina": [
    [M("Extração superficial"), M("Extração subterrânea", { tech: "Mineração", out: 0.1, inputs: [["Madeira", 0.1]] }), M("Mineração mecanizada", { tech: "Máquina a vapor", out: 0.35, inputs: [["Carvão mineral", 0.3]] }),
      M("Mineração industrial", { tech: "Química industrial", out: 0.5, inputs: [["Enxofre", 0.1], ["Carvão mineral", 0.3]] }), M("Mineração automatizada", { tech: "Automação", out: 0.7, workers: 0.5 })],
    [M("Minério bruto"), M("Beneficiamento", { tech: "Mineração profunda", out: 0.1, inputs: [["Carvão mineral", 0.1]], workers: 1.1 })],
    [M("Ferramentas manuais"), M("Bombas", { tech: "Mineração profunda", out: 0.1, workers: 0.9, inputs: [["Madeira", 0.1]] }), M("Perfuração", { tech: "Máquina a vapor", out: 0.2, workers: 0.75, inputs: [["Ferramentas", 0.2]] }),
      M("Escavadeiras", { tech: "Motor a combustão", out: 0.3, workers: 0.5, inputs: [["Petróleo", 0.3]] }), M("Sistemas autônomos", { tech: "Automação", out: 0.4, workers: 0.3, inputs: [["Ferramentas", 0.3]] })],
  ],
  "Barreiro": [
    [M("Extração manual"), M("Extração organizada", { tech: "Escrita", out: 0.15 }), M("Extração mecanizada", { tech: "Máquina a vapor", out: 0.4, workers: 0.6, inputs: [["Carvão mineral", 0.2]] })],
    [M("Argila bruta"), M("Beneficiamento da argila", { tech: "Iluminismo", out: 0.1, workers: 1.1 })],
    [M("Ferramentas simples"), M("Máquinas de extração", { tech: "Eletricidade", out: 0.2, workers: 0.5, inputs: [["Ferramentas", 0.2]] })],
  ],
  "Poço": [
    [M("Extração rudimentar"), M("Extração mecânica", { tech: "Máquina a vapor", out: 0.2 }), M("Extração industrial", { tech: "Química industrial", out: 0.4 }),
      M("Extração automatizada", { tech: "Automação", out: 0.6, workers: 0.5 })],
    [M("Petróleo bruto"), M("Recuperação aprimorada", { tech: "Computadores", out: 0.2, workers: 1.1 })],
    [M("Bombas mecânicas"), M("Bombas elétricas", { tech: "Eletricidade", out: 0.2, workers: 0.7 }), M("Sistemas automatizados", { tech: "Automação", out: 0.35, workers: 0.4, inputs: [["Ferramentas", 0.2]] })],
  ],
};
/** Indústrias: produção-base em degraus (artesanal → automatizada); automação e secundária só onde faz sentido. */
const industry = (steps: string[], techs: (string | undefined)[], extra: Method[] = [M("Sem subproduto")]): [Method[], Method[], Method[]] => [
  steps.map((name, k) => M(name, { tech: techs[k], out: [0, 0.15, 0.35, 0.6, 0.9][k] ?? 0, workers: [1, 1, 0.9, 0.75, 0.5][k] ?? 1,
    inputs: k >= 3 ? [["Carvão mineral", 0.3 * k]] : k === 2 ? [["Ferramentas", 0.2]] : undefined })),
  extra,
  [HAND, M("Ferramentas especializadas", { tech: "Trabalho do ferro", out: 0.05, inputs: [["Ferramentas", 0.1]] }), M("Máquinas a vapor", { tech: "Máquina a vapor", out: 0.15, workers: 0.8, inputs: [["Carvão mineral", 0.3]] }),
    M("Linhas de produção", { tech: "Produção em massa", out: 0.25, workers: 0.6, inputs: [["Ferramentas", 0.3]] }), M("Robótica", { tech: "Automação", out: 0.35, workers: 0.35, inputs: [["Ferramentas", 0.4]] })],
];
Object.assign(BY, {
  "Fundição de bronze": industry(["Fundição artesanal", "Fundição organizada", "Produção em série", "Produção elétrica", "Produção automatizada"], [undefined, "Escrita", "Produção em massa", "Eletricidade", "Automação"]),
  "Tecelagem": industry(["Tear manual", "Tear especializado", "Tear mecânico", "Tear a vapor", "Tear elétrico"], [undefined, "Feudalismo", "Imprensa", "Máquina a vapor", "Eletricidade"]),
  "Ferraria": industry(["Forja artesanal", "Forja especializada", "Produção mecanizada", "Produção industrial", "Produção automatizada"], [undefined, "Feudalismo", "Máquina a vapor", "Eletricidade", "Automação"]),
  "Armeiro": industry(["Produção artesanal", "Produção padronizada", "Produção em série", "Produção industrial", "Produção automatizada"], [undefined, "Castelos", "Pólvora", "Metralhadora", "Automação"]),
  "Oficina de papel": industry(["Produção manual", "Produção hidráulica", "Produção mecânica", "Produção industrial"], [undefined, "Moinhos", "Imprensa", "Máquina a vapor"]),
  "Centro administrativo": industry(["Administração manual", "Escrituração especializada", "Burocracia organizada", "Administração profissionalizada", "Administração automatizada"], [undefined, "Universidades", "Bancos", "Telégrafo", "Computadores"]),
  "Setor de construção": industry(["Canteiro simples", "Canteiro organizado", "Construção mecanizada", "Construção industrial", "Construção automatizada"], [undefined, "Escrita", "Máquina a vapor", "Eletricidade", "Automação"]),
  "Siderúrgica": industry(["Forno primitivo", "Alto-forno", "Conversor industrial", "Produção elétrica", "Produção automatizada"], [undefined, "Máquina a vapor", "Química industrial", "Eletricidade", "Automação"]),
  "Fábrica têxtil": industry(["Produção mecânica", "Produção a vapor", "Produção elétrica", "Produção em massa", "Produção automatizada"], [undefined, "Máquina a vapor", "Eletricidade", "Produção em massa", "Automação"]),
  "Arsenal": industry(["Produção artesanal", "Produção padronizada", "Produção em série", "Produção industrial", "Produção automatizada"], [undefined, "Metralhadora", "Produção em massa", "Blindados", "Automação"]),
});
/** Melhorias (irrigação, estábulo...) seguem o edifício que melhoram: só organização e manutenção. */
const NONE: [Method[], Method[], Method[]] = [[M("Padrão")], [M("Sem subproduto")], [HAND]];

/** Indústria sem métodos próprios (as da Etapa 5): degraus genéricos de artesanal a automatizada. */
const GENERIC_INDUSTRY = industry(["Produção artesanal", "Produção organizada", "Produção mecanizada", "Produção industrial", "Produção automatizada"],
  [undefined, "Escrita", "Máquina a vapor", "Eletricidade", "Automação"]);
/** Métodos da construção, por categoria. */
export const methodsOf = (building: string): Method[][] => [...(BY[building] ?? (INDUSTRIES.has(building) ? GENERIC_INDUSTRY : NONE)), ORG, MAINT];
/** Nomes das indústrias (economy.ts registra na carga: evita import circular de BUILDINGS aqui). */
export const INDUSTRIES = new Set<string>();

const unlocked = (m: Method, known: Set<string>) => !m.tech || known.has(m.tech);
/** Organização automática: comunitária na era tribal, depois a mais avançada liberada (cooperativa e estatal são escolhas). */
function autoPick(cat: number, list: Method[], known: Set<string>, defaultOrg?: string) {
  if (cat === 3 && defaultOrg) { const d = list.findIndex((m) => m.name === defaultOrg && unlocked(m, known)); if (d >= 0) return d; } // lei de Economia
  let k = 0;
  list.forEach((m, i) => { if (unlocked(m, known) && !(cat === 3 && (m.name === "Cooperativa" || m.state))) k = i; });
  return k;
}
/** Métodos em uso no edifício (escolha do jogador se liberada; senão o automático). */
export function activeMethods(e: Economy, key: string, building: string, known: Set<string>, defaultOrg?: string): Method[] {
  const lists = methodsOf(building), pick = e.methods?.get(key);
  return lists.map((list, cat) => {
    const k = pick?.[cat] ?? -1;
    return k >= 0 && list[k] && unlocked(list[k], known) ? list[k] : list[autoPick(cat, list, known, defaultOrg)];
  });
}
export const methodKey = (hex: number, b: number) => `${hex}:${b}`;

/** Efeito somado dos métodos: bônus de produção (somado, com teto), trabalhadores e manutenção (multiplicados). */
export function combine(ms: Method[]) {
  let out = 0, workers = 1, upkeep = 1;
  const inputs = new Map<string, number>(), extra = new Map<string, number>();
  for (const m of ms) {
    out += m.out ?? 0; workers *= m.workers ?? 1; upkeep *= m.upkeep ?? 1;
    for (const [g, q] of m.inputs ?? []) inputs.set(g, (inputs.get(g) ?? 0) + q);
    for (const [g, q] of m.extra ?? []) extra.set(g, (extra.get(g) ?? 0) + q);
  }
  return { out: Math.min(out, METHOD_RULES.maxOut), workers, upkeep, inputs, extra, divShare: ms[3]?.divShare ?? 0.5, state: !!ms[3]?.state };
}
export const METHOD_RULES = { maxOut: 2 }; // teto do bônus somado dos métodos (+200%): evita multiplicação sem fim

/** Escolhe um método (jogador). cat = categoria, k = índice (−1 volta ao automático). */
export function setMethod(e: Economy, key: string, building: string, cat: number, k: number, known: Set<string>): string | null {
  const list = methodsOf(building)[cat];
  if (!list || k < -1 || k >= list.length) return "Método inválido";
  if (k >= 0 && !unlocked(list[k], known)) return `Precisa pesquisar ${list[k].tech}`;
  const cur = e.methods?.get(key) ?? [-1, -1, -1, -1, -1];
  cur[cat] = k;
  (e.methods ??= new Map()).set(key, cur);
  return null;
}
