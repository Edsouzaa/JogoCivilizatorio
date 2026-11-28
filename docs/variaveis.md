# Variáveis de efeito (para tecnologias, leis, eventos, incentivos e personagens)

Referência para reescrever tecnologias e criar eventos. Cada variável abaixo **já está ligada** a uma mecânica do jogo; usar uma chave que não está aqui não faz nada (precisa ser programada antes).
Convenções: "fração" = 0,1 significa +10%. Valores negativos funcionam (penalidade). Somas de várias fontes se acumulam, salvo onde dito.

---

## 1. Tecnologias (`src/tech.ts`, lista `TECHS`)

Formato de uma tecnologia:

```ts
{ name: "Metalurgia do bronze", era: 0, cost: 0, requires: ["Fogo controlado"],
  unlocks: ["Fundição de bronze"], bonus: [["Mina", 0.1]], army: 0.05, infamy: 2 }
```

| Campo | Tipo | O que faz | Onde é lido | Valores típicos |
|---|---|---|---|---|
| `name` | texto | nome único (outras techs, leis e construções apontam por ele) | tudo | — |
| `era` | 0–9 | era da tecnologia (0 Tribal … 9 Moderna) | árvore, custo | — |
| `cost` | número | 0 = custo automático pela era e pela ordem (recomendado) | `tech.ts` | 0 |
| `requires` | lista | pré-requisitos (nomes) | árvore, pesquisa | 1–2 |
| `unlocks` | lista | construções liberadas (nomes de `BUILDINGS`) | construção, IA | — |
| `bonus` | `[construção, fração]` | + produção daquela construção | produção (`c.bonus`) | 0,05–0,3 |
| `research` | fração | + velocidade de pesquisa | pesquisa | 0,05–0,15 |
| `trade` | fração | + comércio entre cidades e exterior; entra na **vantagem comercial** | `trade()`, `foreignTrade()`, `advantage()` | 0,05–0,2 |
| `army` | fração | + força de combate das divisões terrestres | batalha (dado: diferença de tecnologia) | 0,05–0,2 |
| `fleet` | fração | + força das frotas | batalha naval (`Tecnologia naval` no dado) | 0,05–0,2 |
| `air` | fração | + força dos esquadrões | combate aéreo | 0,05–0,2 |
| `manpower` | fração | + parte da população mobilizável | recrutas | 0,02–0,1 |
| `unrest` | pontos | + alvo de lealdade (positivo = menos agitação; negativo = ideias novas agitam) | lealdade, radicais | −3 a +5 |
| `growth` | fração | + crescimento natural da população | `growPopulation` | 0,1–0,5 |
| `popCap` | fração | + teto de população de todo hex | `popCap` | 0,05–0,2 |
| `urbanCap` | fração | + teto dos centros urbanos | `popCap` | 0,1–0,3 |
| `plague` | fração | − mortes por peste | eventos | 0,1–0,5 |
| `subsistence` | fração | + produtividade da subsistência (teto total +50%) | `subsistence.ts` | 0,05–0,1 |
| `control` | fração | + controle máximo do território | `control.ts` | 0,02–0,1 |
| `infamy` | pontos | infâmia ganha ao descobrir (armas que assustam) | diplomacia | 1–10 |

Tecnologias que também mexem nos fatores da era ficam em `ECON_TECH` (seção 2). Tecnologias que liberam leis: campo `tech` da lei (seção 3). Unidades militares têm `tech` próprio (seção 7).

### Atalhos que já existem
- `INDUSTRY(v)`: bônus `v` para Siderúrgica, Fábrica têxtil, Arsenal, Fundição de bronze, Tecelagem, Ferraria e Armeiro.
- Letrados: `RULES.literacyTechs` lista `[tecnologia, +fração de letrados]` (ex.: Escrita, Universidades, Imprensa).

---

## 2. Fatores estruturais da era (`src/eramods.ts`)

Cada país tem estes fatores: **base da era + tecnologias (`ECON_TECH`) + leis (`ECON_LAW`)**, com limites. Uso: `econ(país, "chave")`.

| Chave | Significado | Onde |
|---|---|---|
| `tax` | fração do imposto devido que o Estado consegue cobrar | arrecadação |
| `monetization` | fração da atividade que vira dinheiro | investimento privado, obras |
| `trade` | × comércio entre cidades e exterior; entra na **vantagem comercial** | mercados |
| `industry` | × produção das indústrias | produção |
| `admin` | × pontos administrativos | administração |
| `construction` | × pontos de construção | `construction.ts` |
| `upkeep` | × manutenção das construções (melhorar = **diminuir**) | despesas |
| `foodLoss` | comida de subsistência perdida por mês (melhorar = **diminuir**) | subsistência |
| `credit` | capacidade de endividamento (× PIB anual) | dívida |
| `privateInvest` | × o que os donos põem no fundo de investimento | investimento privado |

Formato:

```ts
ECON_TECH["Bancos"] = { credit: 0.15, monetization: 0.05 };
ECON_LAW["Imposto de renda"] = { tax: 0.08 };
```

---

## 3. Leis (`src/politics.ts`, `LAWS`)

```ts
{ name: "Burocracia profissional", era: 3, tech: "Correios", likes: ["Intelectuais"], dislikes: ["Latifundiários"],
  desc: "…", fx: { control: 0.05, unrest: -1 } }
```

| Campo | O que faz |
|---|---|
| `era`, `tech` | quando fica disponível |
| `likes`, `dislikes` | grupos de interesse (apoio para aprovar; `GROUPS`) |
| `tax` | (Impostos) taxa sobre o PIB |
| `tradeShare` | (Economia) fração da sobra que circula entre as cidades |
| `policy` | (Investimento) "restrito" / "orientado" / "livre" |
| `defaultOrg` | (Economia) organização padrão dos edifícios (Estatal, Cooperativa…) |
| `fundShare`, `privateCp`, `invest` | (Economia) investimento privado |
| `singleParty` | (Governo) só o partido tem poder político |
| `fx` | efeitos `LawFx` abaixo |

`LawFx` (valem pela metade onde o controle é baixo):

| Chave | Efeito |
|---|---|
| `control` | + controle máximo |
| `unrest` | pontos no alvo de lealdade (negativo = menos agitação) |
| `growth` | + crescimento da população |
| `research` | + pesquisa |
| `manpower` | + população mobilizável |
| `army` | + força do exército |
| `immigration` | atração de imigrantes (−1 = fronteiras fechadas) |

---

## 4. Eventos de escolha (`src/choices.ts`, `EVENT_LIST`)

```ts
{ title: "Colheita farta", art: "bread", minEra: 0, text: "Os celeiros transbordam este ano.", options: [
  { label: "Vender o excedente", fx: { treasury: 0.15 } },
  { label: "Fazer uma grande festa", fx: { legitimacy: 0.05 } },
] }
```

| Chave em `fx` | Efeito | Escala |
|---|---|---|
| `treasury` | dinheiro: **fração do tesouro** (0,15 = +15%; base mínima 100, para tesouro vazio ainda ganhar algo) | −0,3 a +0,3 |
| `legitimacy` | legitimidade do governo (0–1) | −0,1 a +0,1 |
| `pop` | população da capital: fração | −0,1 a +0,1 |
| `research` | pesquisa: × pesquisa da semana × 10 | 0,1–0,5 |
| `admin` | pontos administrativos (absoluto) | 5–30 |
| `infamy` | infâmia (absoluto) | 1–10 |

Outros campos: `art` = ícone (`icons.ts`: bread, speech, skull, church, ship, fort, book, heart, mask, news, people…), `minEra` = era mínima. Chance: `CHOICES.chanceMonth` por mês.

Eventos automáticos (fome, peste, desastres): `src/events.ts`, config `EVENTS`. Eventos de lei durante a votação: `LAW_EVENTS` em `politics.ts` (`progress`, `legitimacy`).

---

## 5. Incentivos regionais (`src/admin.ts`, `INCENTIVES`)

```ts
"Incentivar agricultura": { cost: 20, upkeep: 1, cat: "Economia e desenvolvimento", desc: "…",
  fx: [["farm", 0.2]], ramp: 26, max: 260, group: "foco econômico", glyph: "bread" }
```

| Chave `fx` | Efeito | Alcance |
|---|---|---|
| `farm` | + produção de fazendas e pastos | cidade |
| `extract` | + produção de minas, serrarias, caça | cidade |
| `industry` | + produção das indústrias | cidade |
| `skill` | qualificação **permanente** (+ indústria do país) | país |
| `exempt` | isenção de imposto | cidade |
| `tax` | + arrecadação efetiva | cidade |
| `control` | + controle máximo (1 = +25%) | cidade |
| `growth` | + crescimento da população | cidade |
| `urban` | − crescimento necessário para ganhar hex urbano | cidade |
| `access` | + acesso ao mercado nacional | cidade |
| `famine` | ninguém morre de fome | cidade |
| `unrest` | pontos de agitação (negativo = menos) | país, pelo peso da região |
| `legitimacy` | + legitimidade por semana | país, pelo peso |
| `research` | + pesquisa | país, pelo peso |
| `manpower` | + mobilizáveis | país, pelo peso |
| `construction` | + pontos de construção | país, pelo peso |
| `literacy` | letrados **permanentes** | país |
| `culture` | integração cultural **permanente** (minorias pesam menos) | país |
| `defense` | pontos no dado defendendo na região | batalha |
| `readiness` | pontos no dado das suas tropas na região | batalha |

Outros campos: `ramp` (semanas até o efeito cheio), `max` (duração), `perm` (permanente), `group` (exclusão), `req` (requisito). Custo final = base × (1 + Complexidade Social/100); estado ×1,25 (`ADMIN.stateMult`).

---

## 6. Personagens (`src/characters.ts`)

Atributos 0–100: `adm` (impostos), `dip` (relações), `mil` (exército e batalhas). Valor efetivo = sorteado + personalidade + traços (`skill(c, "adm")`).

| Constante | Efeito |
|---|---|
| `CHAR.admTax` | governante com adm 100: +10% de arrecadação (0: −10%) |
| `CHAR.dipRelation` | relação mensal com vizinhos por ponto de dip acima de 50 |
| `CHAR.generalCost` | custo de contratar comandante |
| general no dado | 0 a +2 pela habilidade militar (`attrMod(skill(gen, "mil"))`) |
| almirante no dado | idem, +0,5 com Combate naval |
| comandante aéreo | prontidão +10% (+20% com Logística aérea) |
| diplomata (`DIPLOMAT`) | (diplomacia − 50) × 0,2 = pontos a mais por "Melhorar relações" e de tolerância para assinar acordos; custa 60 |

Traço (`TRAIT_FX`) e personalidade (`PERSONALITIES`) usam o mesmo formato:

```ts
TRAIT_FX["Veterano"] = { mil: 8 };
PERSONALITIES["Arrogante"] = { dip: -8, mil: 3, desc: "acha que sabe tudo" };
```

Estilos de comando (`STYLES`, vêm da especialização ou do traço): Defensivo (+1 defendendo, entrincheira mais), Agressivo (+1 atacando, +10% baixas próprias), Cauteloso (−20% baixas próprias, −0,5 atacando), Flanqueador (flanco ×2), Logístico (+15% suprimento), Inspirador (moral cai 30% mais devagar).

Especializações (`SPECS`, com era mínima): terrestre (Infantaria, Cavalaria, Cerco, Reconhecimento, Engenharia, Logística, Estratégia defensiva/ofensiva, Artilharia), naval (Combate naval, Bloqueio, Escolta, Transporte, Logística naval, Operações anfíbias, Guerra submarina), aérea (Superioridade aérea, Interceptação, Bombardeio, Apoio terrestre, Reconhecimento aéreo, Transporte aéreo, Logística aérea).

IA pelo governante (`ai.ts rulerWar`): Expansionista ×1,8 guerra, Agressivo ×1,5, Implacável ×1,4, Audacioso/Impulsivo ×1,3, Conciliador ×0,5, Prudente ×0,7, Isolacionista ×0,6, traço Pacifista ×0,4, Guerreiro ×1,3. Reformista propõe leis com metade do apoio; Conservador com o dobro.

`AGITATION`: agitador aparece com radicais > 30%, some < 12%; revolução com radicais > 45% e legitimidade < 20%. `FAMILY`: maioridade 16, casamento 18, até 4 filhos, fé diferente −0,003 de legitimidade/mês, devoto +0,001.

---

## 7. Combate terrestre (`src/battle.ts`, `src/units.ts`)

Unidade (`UNITS`):

```ts
{ name: "Infantaria pesada", cat: "Infantaria", tech: "Trabalho do ferro", atk: 1.35, def: 1.4, speed: 0.85, siege: 1, cost: 1.4 }
```

| Campo | Efeito |
|---|---|
| `atk` | multiplicador de ataque (bônus de ataque) |
| `def` | multiplicador de defesa |
| `speed` | velocidade (perseguição e marcha) |
| `siege` | rapidez do cerco |
| `cost` | custo de recrutar e manter |
| `cat` | Infantaria, Montaria, Artilharia, Cerco, Blindados (largura e peso no fogo) |
| `tech` | tecnologia que libera |

Modificadores no dado (1d10 + modificadores, por fase):

| Modificador | Valor | Fonte |
|---|---|---|
| Terreno do defensor | montanha +3, colinas +2, selva +2, floresta/taiga +1 | `BATTLE.terrainDefense` |
| Atacar montanha | −1 | `mountainAttack` |
| Atravessar rio | −2 | `river` |
| Defender cidade | +1 | `urbanDefense` |
| Entrincheirado | até +2 (+0,25/semana) | `entrenchPerWeek`, `entrenchMax` |
| Diferença de tecnologia | ± pela soma de `army` | techs |
| General | 0 a +2 | personagem |
| Emboscada | −2 (chance 35%) | `ambush` |
| Carga de cavalaria | +2 (contra entrincheirado −1) | `charge` |
| Barragem de artilharia | +2, tira entrincheiramento | `barrage` |
| Colapso da linha | −2 | `collapse` |
| Apoio aéreo | +1 | `AIRW.support` |
| Bombardeio naval | +1 no litoral | `SEA.bombard` |
| Fortificação regional | até +1 defendendo | incentivo `defense` |
| Preparação militar | até +0,5 | incentivo `readiness` |
| Clima | chuva, lama, neve, neblina, calor | `weatherAt` |

Constantes de dano: `casualty` (baixas por fase), `orgDamage`, `maxOrgDamage`, `maxLossShare`, `moraleLoss`, `retreatMorale`, `pursuit`, `fireShare` por era, `fireAffinity` por categoria, `frontage` por terreno, `width` por categoria.

Guerra geral (`WAR`): `divisionSize` 25, `recruitCost` 60, `upkeep` 0,3, `reinforce` 5, `orgRecovery` 0,1, `casualties`, `siegeBase` 4, `siegePerSize` 2, `supplyBase` 6 + `supplyPerEra` 3, `supportWeeks` 260.

## 8. Naval e aéreo

`SEA`: tempestade (chance por latitude, −1 aos dois, perdas pela metade), `sub` (emboscada submarina +1), `carrier` (aviação embarcada +1), `seek` (superioridade naval +1), `convoy` (base 0,6, escolta +0,3, interceptação, tempestade), `bombard` +1.
`AIRW`: `fuel` 0,5 por esquadrão/semana, `badWeather` ×0,6, `support` +1, `bombing` −15% de produção por `bombWeeks` 2, `airlift` 0,3.

## 9. Logística e atrito (`src/logistics.ts`)

`LOGI`: comida 0,004/soldado/semana, pólvora 0,002, combustível 0,004, estoque `reserveWeeks` 4 (+0,5/era), `refill` 1,5, logístico +15%, mau tempo −25%, depósito +150 soldados/nível, `capPerCitySize` 60, `rangeLoss` 0,6, ferrovias +20%, forragem 0,25.
`ATTRITION`: por terreno (planície 0,1% … deserto 0,6%/semana), inverno +0,4%, calor +0,3%, chuva +0,1%, em casa ×0,25, inimigo +0,2%, fome ×3%, fadiga (marcha +0,15, descanso −0,25).

## 10. Mercados e comércio (`src/markets.ts`, `MARKET`)

- **Vantagem comercial** = `econ("trade")` × (1 + tecnologias `trade`) × (0,5 + acesso médio das cidades) × (1 − tarifa), entre 0,2 e 2.
- **Poder comercial** de uma cidade no nó = população/1000 + 2 × nível de porto + estradas + estruturas comerciais.
- Parte do excedente exportado = `RULES.foreignShare` × vantagem × (0,5 + parte do poder nos nós em comum).
- **Acesso** ao mercado nacional = base da era (`accessBase`) + 0,08 × estrada + 0,15 (porto/rio) + estruturas (até +40%) + incentivos − distância/60; isolada ×0,5.
- Estoque: `release` 0,5, `keep` 0,5, comida estraga 10%/semana, resto 1%, capacidade 15 × tamanho × (1 + era/2) + estruturas.
- Complexidade da Economia: pontos por tecnologia (`complexityTech` por área), 5 por bem produzido, até 300 pela urbanização; custo de construção +5% a +45% (`COMPLEXITY_IMPACT`).
- Estruturas comerciais (`commerce: { storage, access, power }` em `BUILDINGS`).

## 11. Subsistência (`src/subsistence.ts`, `SUBSIST`)

`capacity` 450 pessoas por hex fértil; `yieldBase` 0,4 + `yieldFert` 0,6 × fertilidade; tecnologia até +50%; pressão suave a partir de 80%; `sell` 0,8 do excedente; rio ×1,25, litoral ×1,1, árido ×0,8, polar ×0,6; terra ocupada: extratora 10%/nível, indústria 4%, outras 2%, centro urbano 40% (máximo 85%); `plots` 30% (roça de casa); clima: calor 0,8, lama 0,85, chuva 0,95, neve 0,5.

## 12. Economia geral (`src/economy.ts`, `RULES` e `GROWTH`)

| Chave | Valor | Efeito |
|---|---|---|
| `outputPerLevel` | 5 | produção por nível de extratora |
| `buildCost` | 100 | custo do nível n = isto × n |
| `upkeepPerLevel` | 0,5 | manutenção por nível |
| `interestYear` | 5% | juros da dívida |
| `manpowerShare` | 0,5 | parte mobilizável |
| `foreignShare` | 0,25 | sobra que vai a parceiros |
| `tariff` | 0,1 | tarifa padrão |
| `taxBaseEfficiency` | 0,5 | arrecadação = imposto × (isto + legitimidade) |
| `cityGrowthPct` | 0,25 | +1 hex urbano a cada 25% de gente |
| `popCapRural` / `popCapUrban` | 600 / 2500 | tetos de população |
| `researchBase` / `researchPerPop` | 3 / 1000 | pesquisa = base + √(pop/1000) |
| `harborTrade` / `roadTrade` | 0,25 / 0,1 | comércio por nível de porto/estrada |
| `roadControl` | 0,05 | controle por nível de estrada |
| `radicalPenalty` | 0,3 | produção × (1 − isto × radicais) |
| `GROWTH.yearly` | 1% | crescimento com comida farta |

## 13. Outros sistemas

- **Controle** (`CONTROL`): alcance 6 + 3/era da sede, mínimo 10%, sobe 4%/mês; produção que chega ao mercado = 0,5 + 0,5 × controle.
- **POPs** (`POP_RULES`): donos ficam com 30% do PIB; clérigos 1%, burocratas 1% (Clássica+), acadêmicos 0,2% (com Escrita); radical = lealdade < 30.
- **Cultura** (`CULTURE`): assimilação 1%/ano, língua 2%/ano, conversão 0,8%/ano (× controle × (1 + 2 × letrados)); cultura não aceita: até −25 de lealdade.
- **Diplomacia** (`DIPLO`): acordo +2/mês, guerra −8/mês, fronteira −0,5/mês; melhorar relações +15 por 10 pontos adm.; acordo exige relação ≥ −25; vencer guerra +50 de prestígio.
- **Expansão** (`EXPAND`): fundar 60 × distância; posto avançado 30; comprar hex 15 × (1 + hexes do país/40); disputa −5 de relação.
- **Economia de guerra** (`WAR_ECON`, `wareconomy.ts`): paz / guerra / guerra total mudam produção militar e civil.

---

## Como adicionar uma variável nova

1. Escolha onde ela vale (tecnologia, lei, incentivo…) e acrescente o campo no tipo (ex.: `Tech` em `tech.ts`).
2. Leia o campo **num lugar só** da mecânica (ex.: `techSum(c.research, "novoCampo")` em `economy.ts`).
3. Acrescente uma linha neste documento e um teste em `tests/`.
