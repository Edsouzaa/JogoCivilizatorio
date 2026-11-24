// Retrato simples gerado pelas características do personagem: rosto, pele, cabelo, barba, cicatriz, corpo e roupa
// (a roupa muda com a era). SVG pequeno, sem imagens externas.
import type { Character } from "./characters.ts";

const SKIN = ["#f1d2b6", "#dcb08a", "#b98559", "#8a5a36", "#5e3b22"];
const HAIR = ["#1e1a17", "#4a3220", "#8a5a2b", "#c9a15a", "#a9a39b"];
// roupa por era: tribal (pele/couro), clássica (toga), medieval, renascença, descobertas, revoluções, industrial, guerras, multipolar, moderna
const CLOTH = ["#7a5a3a", "#d8d0bd", "#5b3a5e", "#7a2e2e", "#2e4a6b", "#2f3a5a", "#2b2b2b", "#4a5a3a", "#3a3f4a", "#2a3550"];

export function portraitSVG(c: Character, era: number, size = 64) {
  const L = c.looks, skin = SKIN[L.skin], hair = HAIR[c.dead ? 4 : L.hair], cloth = CLOTH[Math.min(era, CLOTH.length - 1)];
  // corpo: 0 quadrado, 1 ampulheta, 2 triângulo
  const body = [
    `<path d="M14 64 V52 Q14 44 22 43 H42 Q50 44 50 52 V64Z" fill="${cloth}"/>`,
    `<path d="M16 64 Q20 52 24 48 Q32 44 40 48 Q44 52 48 64Z" fill="${cloth}"/>`,
    `<path d="M10 64 L22 44 H42 L54 64Z" fill="${cloth}"/>`,
  ][L.body];
  // rosto: 0 redondo, 1 quadrado, 2 oval
  const head = [`<circle cx="32" cy="28" r="12" fill="${skin}"/>`, `<rect x="20" y="16" width="24" height="25" rx="5" fill="${skin}"/>`, `<ellipse cx="32" cy="28" rx="10.5" ry="13.5" fill="${skin}"/>`][L.face];
  // cabelo: 0 curto, 1 comprido, 2 careca, 3 coque
  const hairs = [
    `<path d="M20 25 Q20 13 32 13 Q44 13 44 25 Q40 18 32 18 Q24 18 20 25Z" fill="${hair}"/>`,
    `<path d="M19 40 Q16 14 32 13 Q48 14 45 40 L42 40 Q43 20 32 19 Q21 20 22 40Z" fill="${hair}"/>`,
    `<path d="M22 21 Q32 14 42 21" stroke="${hair}" stroke-width="2" fill="none"/>`,
    `<path d="M20 25 Q20 14 32 14 Q44 14 44 25 Q40 19 32 19 Q24 19 20 25Z" fill="${hair}"/><circle cx="32" cy="11" r="4" fill="${hair}"/>`,
  ][L.hairStyle];
  // barba: 0 nenhuma, 1 bigode, 2 cavanhaque, 3 cheia
  const beard = ["", `<path d="M26 34 Q32 31 38 34" stroke="${hair}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    `<path d="M29 37 Q32 44 35 37Z" fill="${hair}"/>`, `<path d="M21 31 Q22 44 32 45 Q42 44 43 31 Q38 38 32 38 Q26 38 21 31Z" fill="${hair}"/>`][L.beard];
  const eye = ["#3a2a1a", "#2e4a6b", "#3d5a2e"][L.eyes];
  const eyes = `<circle cx="27.5" cy="28" r="1.4" fill="${eye}"/><circle cx="36.5" cy="28" r="1.4" fill="${eye}"/>`;
  const scar = L.scar ? `<path d="M36 22 L40 30" stroke="#9a5a4a" stroke-width="1.2"/>` : "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="background:#2a2620;border:1px solid #5a4d33${c.dead ? ";filter:grayscale(1)" : ""}" aria-hidden="true">${body}<rect x="28" y="38" width="8" height="7" fill="${skin}"/>${head}${hairs}${eyes}${beard}${scar}</svg>`;
}
