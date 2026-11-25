// Ícones simples (silhuetas preenchidas, 24×24, sem texto) para recursos/bens, construções e tecnologias.
// Uma definição central: id estável (independente da tradução) → forma + cor. Quem não tiver entrada usa o
// padrão da categoria (fallback), então todo elemento sempre tem ícone. Ver docs/icones.md.
import { GOODS, BUILDINGS } from "./economy.ts";
import { TECHS } from "./tech.ts";

/** Formas: cada uma é um path preenchido no quadro 24×24. */
export const GLYPHS: Record<string, string> = {
  grain: "M12 22v-12 M12 4c-2 1.5-2 4 0 5.5 2-1.5 2-4 0-5.5z M8 8c-1.5 1.5-1 4 1 5 1-2 .5-4-1-5z M16 8c1.5 1.5 1 4-1 5-1-2-.5-4 1-5z M8 13c-1.5 1.5-1 4 1 5 1-2 .5-4-1-5z M16 13c1.5 1.5 1 4-1 5-1-2-.5-4 1-5z",
  basket: "M3 10h18l-2 10H5z M7 10l3-6 M17 10l-3-6 M9 5a2 2 0 1 0 0-.01 M15 5a2 2 0 1 0 0-.01",
  meat: "M6 14c-2-4 1-9 6-9s9 3 8 7-5 7-9 6l-3 3-2-2 3-3c-1 0-2-1-3-2z",
  fish: "M2 12c3-5 10-6 15-1l4-3v8l-4-3c-5 5-12 4-15-1z",
  hide: "M5 4l4 2h6l4-2-1 5 2 4-3 1v6H9v-6l-3-1 2-4z",
  logs: "M3 9h14a3 3 0 0 1 0 6H3a3 3 0 0 1 0-6z M17 9a3 3 0 1 0 .01 0 M6 15h12a3 3 0 0 1 0 6H6a3 3 0 0 1 0-6z",
  rocks: "M2 19l4-8 5 2 3-5 6 4 2 7z",
  fiber: "M7 21c0-6 1-12 4-18 M12 21c0-7 0-12 0-18 M17 21c0-6-1-12-4-18 M6 15h12",
  nugget: "M5 14l3-6 6-2 5 4 0 6-5 4-7-1z",
  crystal: "M12 2l6 6-6 14-6-14z M6 8h12",
  leaf: "M4 20C4 10 10 4 20 4c0 10-6 16-16 16z M4 20L14 10",
  horse: "M6 21V12l-3-2 4-5 3 1 6-3 2 3-3 2 2 5-2 1-2-3-3 2v8z",
  cow: "M3 9l3-3h12l3 3-3 2v7h-2v-4H8v4H6v-7z M5 6L3 3 M19 6l2-3",
  drop: "M12 2c4 6 7 10 7 13a7 7 0 0 1-14 0c0-3 3-7 7-13z",
  barrel: "M7 3h10c2 6 2 12 0 18H7c-2-6-2-12 0-18z M5 8h14 M5 16h14",
  bottle: "M10 2h4v4l2 3v13H8V9l2-3z",
  vase: "M9 3h6l-1 3c4 2 5 7 3 11l-2 4H9l-2-4c-2-4-1-9 3-11z",
  roll: "M4 7a3 3 0 1 0 0 10h14V7z M4 7a3 3 0 1 1 0 .01 M18 7l3 2v10l-3-2",
  scroll: "M6 3h12v15a3 3 0 0 1-3 3H5a2 2 0 0 1 0-4h11 M9 8h6 M9 12h6",
  sword: "M14 3l7 0 0 7-9 9-3 0 0-3z M5 15l4 4 M3 21l3-3",
  gear: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M11 2h2l1 3 3 1 2-2 2 2-2 2 1 3 3 1v2l-3 1-1 3 2 2-2 2-2-2-3 1-1 3h-2l-1-3-3-1-2 2-2-2 2-2-1-3-3-1v-2l3-1 1-3-2-2 2-2 2 2 3-1z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  flask: "M9 2h6v6l5 10a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l5-10z M7 15h10",
  chip: "M6 6h12v12H6z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4",
  battery: "M4 7h14v10H4z M18 10h2v4h-2 M7 10v4 M11 10v4",
  panel: "M3 14l3-8h12l3 8z M8 6l-1 8 M16 6l1 8 M4 10h16 M12 14v6 M8 20h8",
  tower: "M12 6v16 M8 22l4-16 4 16 M6 8a8 8 0 0 1 12 0 M3 5a12 12 0 0 1 18 0",
  ingot: "M2 17l4-8h12l4 8z M6 9l2-3h8l2 3",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v10 M9 9h5a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h5",
  building: "M3 21h18 M5 21V10l7-6 7 6v11 M10 21v-6h4v6",
  factory: "M2 21V11l6 4V11l6 4V5h4v16z M2 21h20",
  ship: "M3 15h18l-3 6H6z M12 3v12 M12 4l7 9h-7",
  plane: "M2 13l9-2 1-8h2l1 8 7 2v2l-7-1-1 5 3 2v1l-5-1-5 1v-1l3-2-1-5-7 1z",
  book: "M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z",
  crown: "M3 18h18l1-11-5 4-5-7-5 7-5-4z",
  shield: "M12 2l8 3v6c0 6-4 10-8 11-4-1-8-5-8-11V5z",
  cross: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  fire: "M12 2c4 5 7 8 7 12a7 7 0 0 1-14 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3 0-5 1-8z",
  pick: "M3 21l10-10 M4 8c5-4 11-4 16 0l-2 1c-4-3-8-3-12 0z",
  moon: "M15 3a9 9 0 1 0 6 13A7 7 0 0 1 15 3z",
  canal: "M2 8c3-2 5 2 8 0s5 2 8 0 4 0 4 0 M2 14c3-2 5 2 8 0s5 2 8 0 4 0 4 0 M2 20c3-2 5 2 8 0s5 2 8 0 4 0 4 0",
  tent: "M2 21L12 3l10 18z M12 21l-3-6h6z",
  saw: "M2 16h14l4-4H6z M4 16v2 M8 16v2 M12 16v2 M16 16v2",
  anvil: "M4 7h14c0 3-2 5-5 5v3h3v4H6v-4h3v-3C6 12 4 10 4 7z",
  people: "M8 7a3 3 0 1 0 0 .01 M16 7a3 3 0 1 0 0 .01 M2 20c0-4 3-7 6-7s6 3 6 7z M12 20c0-4 2-7 4-7 3 0 6 3 6 7z",
  scale: "M12 3v18 M5 21h14 M3 9h18 M3 9l-2 6h6z M21 9l-2 6h6z",
  road: "M8 21L11 3 M16 21L13 3 M12 7v2 M12 13v2 M12 18v2",
  rail: "M6 3v18 M18 3v18 M4 7h16 M4 12h16 M4 17h16",
  anchor: "M12 7a2 2 0 1 0 0-.01 M12 9v12 M5 15a7 7 0 0 0 14 0 M8 12h8",
  dna: "M7 3c0 6 10 6 10 12s-10 6-10 6 M17 3c0 6-10 6-10 12s10 6 10 6 M8 7h8 M8 17h8",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18",
  atom: "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M12 3c5 0 5 18 0 18S7 3 12 3z M3.5 7.5c2.5-4.5 17 4.5 17 9s-17-4.5-17-9z",
  robot: "M5 21l4-8 4 2 4-9 3 2-4 10-4-2-4 5z M17 6a2 2 0 1 0 0-.01",
  magnifier: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M15 15l6 6",
  container: "M2 7h20v12H2z M6 7v12 M10 7v12 M14 7v12 M18 7v12",
};
const FILL = new Set(["meat", "fish", "hide", "rocks", "nugget", "crystal", "horse", "cow", "drop", "barrel", "bottle", "vase", "ingot", "crown", "shield", "cross", "fire", "moon", "tent", "anvil", "bolt", "plane", "leaf", "basket"]);

type Art = [glyph: string, color: string];
/** Recursos e bens (por nome no jogo). */
const GOOD_ART: Record<string, Art> = {
  "Grãos": ["grain", "#d9b44a"], "Frutas e vegetais": ["basket", "#d9783a"], "Carne e caça": ["meat", "#c4544a"], "Peles": ["hide", "#9a6a43"],
  "Madeira": ["logs", "#8a5a33"], "Pedra": ["rocks", "#8f8f8a"], "Fibras": ["fiber", "#b8c27a"], "Argila": ["rocks", "#b06a42"], "Sal": ["crystal", "#e8e8f0"],
  "Cobre": ["nugget", "#c87533"], "Estanho": ["nugget", "#a8b0b8"], "Ferro": ["nugget", "#5f6670"], "Ouro": ["nugget", "#e2b93b"], "Prata": ["nugget", "#c9ced6"],
  "Pedras preciosas": ["crystal", "#5fb7d9"], "Especiarias": ["leaf", "#b5462e"], "Cavalos": ["horse", "#8a5c3a"], "Gado": ["cow", "#7a6a5a"],
  "Carvão mineral": ["rocks", "#2e2e33"], "Enxofre": ["crystal", "#e3d24a"], "Petróleo": ["drop", "#222428"], "Areia de quartzo": ["crystal", "#e6e0cf"],
  "Salitre": ["crystal", "#f0f0e6"], "Bauxita": ["rocks", "#b24a3a"], "Terras raras": ["crystal", "#9a6ad0"], "Lítio": ["rocks", "#e9ecef"], "Urânio": ["atom", "#7cc242"],
  "Plantas medicinais": ["leaf", "#4aa368"], "Bronze": ["ingot", "#b87d3b"], "Tecidos": ["roll", "#7d9fc4"], "Ferramentas": ["pick", "#9aa1a8"], "Armas": ["sword", "#b8bec6"],
  "Papel": ["scroll", "#e8dfc4"], "Cerâmica": ["vase", "#b9643a"], "Couro": ["hide", "#7a4f2e"], "Bebidas": ["bottle", "#7a2e4a"], "Vidro": ["bottle", "#9ad0e0"],
  "Bens de luxo": ["crystal", "#d96ab8"], "Produtos alimentícios": ["basket", "#d9a44a"], "Pólvora": ["barrel", "#3a3a3a"], "Máquinas": ["gear", "#8a9099"],
  "Materiais impressos": ["book", "#c9b98a"], "Aço": ["ingot", "#7f8a96"], "Cimento": ["rocks", "#b9b9b0"], "Química básica": ["flask", "#6ac2b0"], "Fertilizantes": ["leaf", "#7a9a3a"],
  "Medicamentos": ["cross", "#d94a4a"], "Combustível": ["barrel", "#a35a2a"], "Energia elétrica": ["bolt", "#f0d23a"], "Alumínio": ["ingot", "#cfd6dc"], "Plásticos": ["drop", "#5aa6d9"],
  "Eletrônicos": ["chip", "#3aa36a"], "Baterias": ["battery", "#e0b03a"], "Equipamentos de energia": ["panel", "#3a6ad9"], "Equipamentos de telecomunicações": ["tower", "#9aa1a8"],
};
/** Construções. */
const BUILDING_ART: Record<string, Art> = {
  "Fazenda": ["grain", "#d9b44a"], "Irrigação": ["canal", "#5a9ad9"], "Pasto": ["cow", "#8a7a5a"], "Estábulo": ["horse", "#8a5c3a"], "Acampamento de caça": ["tent", "#9a6a43"],
  "Serraria": ["saw", "#8a5a33"], "Trilhas de transporte": ["road", "#a08a6a"], "Mina": ["pick", "#8f8f8a"], "Galerias escoradas": ["pick", "#6a5a43"], "Barreiro": ["rocks", "#b06a42"],
  "Poço": ["drop", "#3a3a3a"], "Fundição de bronze": ["fire", "#b87d3b"], "Tecelagem": ["roll", "#7d9fc4"], "Ferraria": ["anvil", "#5f6670"], "Armeiro": ["sword", "#b8bec6"],
  "Oficina de papel": ["scroll", "#e8dfc4"], "Centro administrativo": ["building", "#c2a46a"], "Setor de construção": ["building", "#d39a52"], "Siderúrgica": ["factory", "#7f8a96"],
  "Fábrica têxtil": ["factory", "#7d9fc4"], "Arsenal": ["factory", "#b8bec6"], "Olaria": ["vase", "#b9643a"], "Oficina de ferramentas": ["pick", "#9aa1a8"], "Curtume": ["hide", "#7a4f2e"],
  "Oficina de bebidas": ["bottle", "#7a2e4a"], "Oficina de vidro": ["fire", "#9ad0e0"], "Oficina de joias": ["crystal", "#d96ab8"], "Oficina de pergaminho": ["scroll", "#c9b98a"],
  "Moinho": ["gear", "#d9b44a"], "Manufatura de tecidos": ["roll", "#5a7fa8"], "Fábrica de pólvora": ["barrel", "#3a3a3a"], "Tipografia": ["book", "#c9b98a"], "Aciaria": ["fire", "#7f8a96"],
  "Oficina de máquinas simples": ["gear", "#9aa1a8"], "Fábrica de máquinas": ["gear", "#6a7078"], "Fábrica de cimento": ["factory", "#b9b9b0"], "Usina termelétrica": ["bolt", "#5a5a5a"],
  "Usina nuclear": ["atom", "#7cc242"], "Fábrica química": ["flask", "#6ac2b0"], "Fábrica de fertilizantes": ["leaf", "#7a9a3a"], "Fábrica de medicamentos": ["cross", "#d94a4a"],
  "Refinaria": ["barrel", "#a35a2a"], "Fundição de alumínio": ["fire", "#cfd6dc"], "Fábrica de plásticos": ["drop", "#5aa6d9"], "Fábrica de eletrônicos": ["chip", "#3aa36a"],
  "Fábrica de baterias": ["battery", "#e0b03a"], "Fábrica de equipamentos de energia": ["panel", "#3a6ad9"], "Fábrica de telecomunicações": ["tower", "#9aa1a8"],
  "Doca": ["ship", "#a08a6a"], "Estaleiro": ["ship", "#8a9099"], "Arsenal naval": ["ship", "#5f6670"],
};
/** Tecnologias: forma pela palavra-chave do nome; sem palavra-chave, a do setor (cor pelo setor). */
const TECH_KEYWORDS: [RegExp, string][] = [
  [/agricult|arado|rotação|plantation|revolução verde|fertiliz|calendário|irrigação|coleta/i, "grain"], [/domestic|cavalaria|arreio/i, "horse"], [/caça/i, "meat"],
  [/fogo/i, "fire"], [/pedra|ferramentas/i, "pick"], [/cerâmica/i, "vase"], [/minera/i, "pick"], [/tecelagem|tear/i, "roll"], [/tradição oral|humanismo|conselho|sindicatos|previdência/i, "people"],
  [/canoa|galés|galeões|navio|bússola|navegação|couraçados|submarino|porta-aviões|companhias/i, "ship"], [/bronze|aço|alto-forno|ferro/i, "ingot"], [/lunar/i, "moon"],
  [/estrada|correios|rotas/i, "road"], [/escrita|direito|filosofia|diplomacia/i, "scroll"], [/moeda|bancos|bolsa|câmbio|mercantil|contabilidade|economia|comércio/i, "coin"],
  [/armas|castelos|bestas|mosquete|pólvora|metralhadora|blindados|mísseis|artilharia|conscrição|fortifica/i, "sword"], [/matemática|método científico|perspectiva|universidades|imprensa|iluminismo|educação/i, "book"],
  [/arquitetura|aqueduto|catedrais|concreto|construção|saneamento/i, "building"], [/medicina|vacina|antibiótico/i, "cross"], [/genômica|biotecnologia/i, "dna"],
  [/vapor|motor|produção em massa|automação|moinhos/i, "gear"], [/ferrovias/i, "rail"], [/eletricidade|nuclear|energias|refrigeração/i, "bolt"], [/química/i, "flask"],
  [/telégrafo|rádio|internet|governo digital|propaganda/i, "tower"], [/computadores|baterias/i, "chip"], [/aviação|caças|drones/i, "plane"], [/contêineres/i, "container"],
  [/cartografia/i, "globe"], [/feudalismo|planejada|mista|guildas/i, "crown"],
];
const SECTOR_COLOR = ["#cf6b62", "#7d9fc4", "#c2a46a", "#9aa1a8", "#86b382"]; // militar, ciência, comércio, indústria, agricultura

/** Identificador estável a partir do nome (sem acento, minúsculo, com _). */
export const artId = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function techArt(name: string): Art {
  const t = TECHS.find((x) => x.name === name);
  const sector = !t ? 4 : t.army || t.fleet || t.air || t.manpower ? 0 : t.research || t.unrest ? 1 : t.trade ? 2 : t.unlocks?.length || t.bonus?.some(([b]) => b !== "Fazenda" && b !== "Pasto") ? 3 : 4;
  return [TECH_KEYWORDS.find(([re]) => re.test(name))?.[1] ?? ["shield", "book", "coin", "gear", "leaf"][sector], SECTOR_COLOR[sector]];
}
/** Forma e cor de um elemento (fallback: forma genérica do tipo). */
export function artOf(kind: "good" | "building" | "tech", name: string): Art {
  if (kind === "good") return GOOD_ART[name] ?? ["nugget", "#9a978e"];
  if (kind === "building") return BUILDING_ART[name] ?? ["building", "#9a978e"];
  return techArt(name);
}
/** SVG do ícone (mesmo tamanho-base, mesmo contorno). */
export function artSVG(kind: "good" | "building" | "tech", name: string, size = 18) {
  const [g, color] = artOf(kind, name), filled = FILL.has(g);
  return `<svg class="art" data-art="${kind}:${artId(name)}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${GLYPHS[g]}" fill="${filled ? color : "none"}" stroke="${filled ? "#1b1e24" : color}" stroke-width="${filled ? 1 : 1.8}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
/** Todos os ids (para testes): recursos/bens, construções e tecnologias. */
export const ALL_ART = () => ({ goods: GOODS.slice(1), buildings: BUILDINGS.map((b) => b.name), techs: TECHS.map((t) => t.name) });
