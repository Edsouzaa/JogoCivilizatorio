# Tecnologias

**No jogo desde esta versão** (src/tech.ts): as 113 abaixo. ✓ marca as 47 que já existiam antes.

Alguns efeitos do texto foram simplificados para campos que o jogo já tem: pesquisa, comércio, exército, frota, aviação, manpower, lealdade e bônus de construção. Os campos novos são crescimento da população, teto de população, teto urbano, peste, comida de subsistência e controle.

**Unidades** agora presas a tecnologias próprias:

| Unidade | Tecnologia |
|---|---|
| Cavalaria | Cavalaria |
| Mosqueteiros | Mosquete |
| Couraçados | Couraçados |
| Submarinos | Submarinos |
| Porta-aviões | Porta-aviões |
| Caças a jato | Caças a jato |

**Regra de custo** (a mesma de src/tech.ts):

- Cada era dura o seu intervalo de datas (`ERA_YEARS`) ganhando o ganho esperado por semana (`ERA_RESEARCH`).
- O total de pontos da era é dividido entre as tecnologias dela.
- A primeira da era custa 0,5× a média e a última 1,7× (peso `0,5 + 1,2·k/(n−1)`).
- Consequência: **mais tecnologias numa era = cada uma mais barata**, e a era continua durando o mesmo. Na era tribal, 14 tecnologias em vez de 5 fazem cada descoberta levar uns 6 a 24 anos em vez de 20 a 68.

Setores (as faixas da tela de tecnologia): Agricultura, Indústria, Ciência, Militar, Naval, Sociedade, Governo, Comércio, Infraestrutura.

## Tribal (-600 a -400) · 14 tecnologias · 3.5 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Coleta organizada | Agricultura | — | +10% comida de subsistência | 1.182 | 338 |
| Fogo controlado | Sociedade | — | +5% teto de população; libera Festivais | 1.400 | 400 |
| Ferramentas de pedra polida | Indústria | — | libera Oficina de ferramentas; +10% Serraria | 1.618 | 462 |
| Caça em grupo | Militar | — | +15% Acampamento de caça; libera Caça a grandes animais | 1.836 | 525 |
| Domesticação ✓ | Agricultura | — | libera Estábulo; +25% Pasto | 2.055 | 587 |
| Agricultura ✓ | Agricultura | Coleta organizada | +25% Fazenda; libera crescimento por excedente de comida | 2.273 | 649 |
| Cerâmica | Indústria | Fogo controlado | libera Olaria; −10% perda de comida estocada | 2.491 | 712 |
| Mineração ✓ | Indústria | Ferramentas de pedra polida | libera Galerias escoradas; +25% Mina | 2.709 | 774 |
| Tecelagem ✓ | Indústria | Agricultura | libera Tecelagem | 2.927 | 836 |
| Tradição oral | Ciência | Fogo controlado | +10% pesquisa; +difusão de vizinhos | 3.145 | 899 |
| Conselho de anciãos | Governo | Tradição oral | +5% legitimidade; libera lei Chefia com conselho | 3.364 | 961 |
| Canoas | Naval | Ferramentas de pedra polida | comércio por rio +10%; colonos cruzam rios sem custo | 3.582 | 1023 |
| Metalurgia do bronze ✓ | Indústria | Mineração | libera Fundição de bronze. Oficina de joias | 3.800 | 1086 |
| Calendário lunar | Ciência | Tradição oral. Agricultura | +10% Fazenda; eventos de colheita mais frequentes | 4.018 | 1148 |

## Clássica (-400 a 400) · 15 tecnologias · 11 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Estradas ✓ | Infraestrutura | — | libera Trilhas de transporte; +25% Serraria; estrada nível 2 | 13.867 | 1261 |
| Escrita ✓ | Ciência | — | +25% pesquisa; libera Oficina de papel. Centro administrativo | 16.244 | 1477 |
| Irrigação ✓ | Agricultura | Agricultura | libera Irrigação | 18.621 | 1693 |
| Moeda | Comércio | Metalurgia do bronze | +10% comércio; impostos +5% | 20.998 | 1909 |
| Galés ✓ | Naval | Metalurgia do bronze | libera frotas e Doca; +5% comércio | 23.375 | 2125 |
| Armas de bronze ✓ | Militar | Metalurgia do bronze | libera Armeiro. Infantaria pesada | 25.752 | 2341 |
| Trabalho do ferro ✓ | Indústria | Metalurgia do bronze | libera Ferraria; +25% Mina | 28.130 | 2557 |
| Matemática | Ciência | Escrita | +10% pesquisa; +5% Setor de construção | 30.507 | 2773 |
| Arquitetura | Infraestrutura | Matemática | método Alvenaria; +1 tamanho máximo de cidade | 32.884 | 2989 |
| Direito escrito | Governo | Escrita | +10% controle; lei Monarquia/República | 35.261 | 3206 |
| Aquedutos | Infraestrutura | Arquitetura. Irrigação | +25% teto de população urbana | 37.638 | 3422 |
| Filosofia | Ciência | Matemática | +15% pesquisa; +3 agitação | 40.015 | 3638 |
| Cavalaria | Militar | Domesticação. Armas de bronze | Cavalaria +20% ataque | 42.392 | 3854 |
| Rotas de caravana | Comércio | Moeda. Estradas | alcance do comércio exterior +50% | 44.770 | 4070 |
| Medicina antiga | Sociedade | Escrita | −20% mortalidade da peste | 47.147 | 4286 |

## Medieval (400 a 1300) · 12 tecnologias · 27 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Feudalismo ✓ | Governo | — | +20% Fazenda; +5% manpower | 47.864 | 1773 |
| Arado pesado ✓ | Agricultura | Agricultura | +30% Fazenda; método Arado pesado | 58.307 | 2160 |
| Rotação trienal | Agricultura | Arado pesado | +15% Fazenda; método Rotação de culturas | 68.750 | 2546 |
| Moinhos ✓ | Indústria | Irrigação | +20% Fazenda e +25% Serraria; libera Moinho. Manufatura de tecidos | 79.193 | 2933 |
| Castelos ✓ | Militar | Trabalho do ferro | +15% exército; cerco 2× mais longo | 89.636 | 3320 |
| Guildas | Comércio | Moeda | +10% indústria artesanal; organização Familiar | 100.079 | 3707 |
| Universidades ✓ | Ciência | Escrita | +25% pesquisa; +letrados | 110.521 | 4093 |
| Bestas | Militar | Castelos | Arqueiros +25% ataque | 120.964 | 4480 |
| Arreio de coleira | Agricultura | Domesticação. Arado pesado | +10% Fazenda; Cavalos como insumo | 131.407 | 4867 |
| Catedrais | Sociedade | Arquitetura | +10 lealdade dos devotos; método Alvenaria especializada | 141.850 | 5254 |
| Letras de câmbio | Comércio | Guildas | +15% comércio exterior; fundo de investimento + | 152.293 | 5640 |
| Bússola | Naval | Galés | frotas +20% em mar raso; comércio costeiro +10% | 162.736 | 6027 |

## Renascença (1300 a 1500) · 10 tecnologias · 65 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Navegação ✓ | Naval | Galés. Bússola | +25% comércio. +30% frota; libera Estaleiro e oceano profundo | 30.727 | 473 |
| Imprensa ✓ | Ciência | Universidades | +30% pesquisa; libera Tipografia. Oficina de máquinas simples; +3 agitação | 38.921 | 599 |
| Mineração profunda ✓ | Indústria | Mineração | +30% Mina; métodos Bombas e Beneficiamento | 47.115 | 725 |
| Perspectiva | Ciência | Imprensa | +10% pesquisa; Oficina de vidro +20% | 55.309 | 851 |
| Contabilidade de partidas dobradas | Comércio | Letras de câmbio | +10% lucro dos edifícios; −50% insolvências | 63.503 | 977 |
| Humanismo | Sociedade | Imprensa | +letrados; +5 lealdade da classe média | 71.697 | 1103 |
| Alto-forno | Indústria | Trabalho do ferro. Moinhos | Ferraria +30%; Ferro mais barato | 79.891 | 1229 |
| Fortificações em estrela | Militar | Castelos | cerco +50% mais longo; defesa +15% | 88.085 | 1355 |
| Cartografia | Infraestrutura | Navegação | névoa recua 2× mais rápido; colonos veem mais | 96.279 | 1481 |
| Diplomacia permanente | Governo | Direito escrito | +relação mensal com vizinhos; embaixadas | 104.473 | 1607 |

## Descobertas (1500 a 1750) · 10 tecnologias · 150 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Pólvora ✓ | Militar | Castelos | +30% exército. +20% frota; libera Fábrica de pólvora | 88.636 | 591 |
| Bancos ✓ | Comércio | Navegação | +20% comércio; juros da dívida −25% | 112.273 | 748 |
| Companhias comerciais ✓ | Comércio | Navegação | +20% comércio; organização Companhia comercial | 135.909 | 906 |
| Mosquete | Militar | Pólvora | libera Mosqueteiros | 159.545 | 1064 |
| Plantation | Agricultura | Navegação | +25% Especiarias. Fibras e Plantas medicinais | 183.182 | 1221 |
| Galeões | Naval | Navegação | Navios de linha +20%; transporte de exército +50% | 206.818 | 1379 |
| Método científico | Ciência | Perspectiva | +25% pesquisa | 230.455 | 1536 |
| Mercantilismo | Governo | Companhias comerciais | lei Mercantilismo; tarifas +50% | 254.091 | 1694 |
| Correios | Infraestrutura | Estradas. Imprensa | +10% controle; difusão de tecnologia + | 277.727 | 1852 |
| Vacinação variólica | Sociedade | Medicina antiga. Método científico | −40% mortalidade da peste; +crescimento | 301.364 | 2009 |

## Revoluções (1750 a 1830) · 11 tecnologias · 315 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Máquina a vapor ✓ | Indústria | Mineração profunda | libera Siderúrgica. Fábrica têxtil. Aciaria. Fábrica de máquinas; +30% frota | 54.149 | 172 |
| Ferrovias ✓ | Infraestrutura | Máquina a vapor | +30% comércio; libera Ferrovias | 67.144 | 213 |
| Iluminismo ✓ | Sociedade | Imprensa | +30% pesquisa; +5 agitação | 80.140 | 254 |
| Conscrição ✓ | Militar | Pólvora | +10% manpower. +10% exército; +3 agitação | 93.136 | 296 |
| Agricultura científica ✓ | Agricultura | Arado pesado | +40% Fazenda | 106.132 | 337 |
| Tear mecânico | Indústria | Máquina a vapor | Fábrica têxtil +30% | 119.127 | 378 |
| Economia política | Governo | Iluminismo | leis Livre comércio. Intervencionismo | 132.123 | 419 |
| Navio a vapor | Naval | Máquina a vapor. Galeões | frotas +30% de velocidade | 145.119 | 461 |
| Artilharia de campanha | Militar | Conscrição | Artilharia +25% | 158.114 | 502 |
| Saneamento | Sociedade | Vacinação variólica | +25% teto urbano; −30% peste | 171.110 | 543 |
| Bolsa de valores | Comércio | Bancos | fundo de investimento +25%; organização Empresarial | 184.106 | 584 |

## Industrialização (1830 a 1910) · 11 tecnologias · 725 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Eletricidade ✓ | Indústria | Máquina a vapor | +30% indústria; libera Usina termelétrica. Fundição de alumínio. Arsenal naval | 124.628 | 172 |
| Química industrial ✓ | Indústria | Agricultura científica | libera Fábrica química. de fertilizantes. de cimento e Refinaria | 154.539 | 213 |
| Metralhadora ✓ | Militar | Conscrição | +40% exército; libera Arsenal | 184.450 | 254 |
| Telégrafo ✓ | Infraestrutura | Ferrovias | +20% comércio. +15% pesquisa | 214.360 | 296 |
| Medicina moderna ✓ | Sociedade | Iluminismo | −5 agitação; libera Fábrica de medicamentos | 244.271 | 337 |
| Aço Bessemer | Indústria | Eletricidade | Aciaria +40%; método Construção industrial | 274.182 | 378 |
| Fertilizantes químicos | Agricultura | Química industrial | +30% Fazenda com Fertilizantes | 304.093 | 419 |
| Couraçados | Naval | Eletricidade. Navio a vapor | libera Couraçados | 334.003 | 461 |
| Sindicatos | Governo | Economia política | lei Economia cooperativa; salários + | 363.914 | 502 |
| Educação pública | Sociedade | Iluminismo | +letrados 2×; +pesquisa | 393.825 | 543 |
| Refrigeração | Agricultura | Eletricidade | −50% perda de comida; Moinho +20% | 423.736 | 584 |

## Grandes Guerras (1910 a 1950) · 10 tecnologias · 1600 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Motor a combustão ✓ | Indústria | Eletricidade | +30% comércio; +50% Poço; libera Tratores | 151.273 | 95 |
| Blindados ✓ | Militar | Metralhadora. Motor a combustão | +40% exército; libera Tanques | 191.612 | 120 |
| Produção em massa ✓ | Indústria | Eletricidade | +30% indústria; libera Fábrica de plásticos | 231.952 | 145 |
| Rádio ✓ | Ciência | Telégrafo | +20% pesquisa; libera Fábrica de eletrônicos | 272.291 | 170 |
| Aviação ✓ | Militar | Motor a combustão | libera força aérea | 312.630 | 195 |
| Concreto armado | Infraestrutura | Aço Bessemer | método Concreto armado; +30% teto urbano | 352.970 | 221 |
| Antibióticos | Sociedade | Medicina moderna | −60% mortalidade de peste e guerra | 393.309 | 246 |
| Submarinos | Naval | Motor a combustão | libera Submarinos | 433.648 | 271 |
| Economia planejada | Governo | Sindicatos | lei Economia planejada | 473.988 | 296 |
| Propaganda | Governo | Rádio | +legitimidade na guerra; guerra total −50% custo político | 514.327 | 321 |

## Multipolar (1950 a 2000) · 10 tecnologias · 3400 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Computadores ✓ | Ciência | Rádio | +40% pesquisa; libera Fábrica de baterias e de telecomunicações | 401.818 | 118 |
| Energia nuclear ✓ | Indústria | Produção em massa | libera Usina nuclear | 508.970 | 150 |
| Revolução verde ✓ | Agricultura | Fertilizantes químicos | +50% Fazenda | 616.121 | 181 |
| Contêineres ✓ | Comércio | Motor a combustão | +40% comércio | 723.273 | 213 |
| Mísseis ✓ | Militar | Aviação | +50% exército. +30% frota e aviação | 830.424 | 244 |
| Caças a jato | Militar | Aviação | libera Caças a jato | 937.576 | 276 |
| Construção modular | Infraestrutura | Concreto armado | método Construção modular | 1.044.727 | 307 |
| Previdência social | Sociedade | Economia planejada | +10 lealdade; custo por pessoa | 1.151.879 | 339 |
| Porta-aviões | Naval | Aviação. Couraçados | libera Porta-aviões | 1.259.030 | 370 |
| Economia mista | Governo | Previdência social | lei Economia mista | 1.366.182 | 402 |

## Moderna (2000 a 2050) · 10 tecnologias · 6750 pontos/semana esperados

| Tecnologia | Setor | Requer | Efeito | Custo (pontos) | Semanas no ritmo esperado |
|---|---|---|---|---|---|
| Internet ✓ | Ciência | Computadores | +50% pesquisa; +5 agitação | 797.727 | 118 |
| Automação ✓ | Indústria | Computadores. Produção em massa | +50% indústria; métodos automatizados | 1.010.455 | 150 |
| Energias renováveis ✓ | Indústria | Energia nuclear | libera Fábrica de equipamentos de energia | 1.223.182 | 181 |
| Biotecnologia ✓ | Agricultura | Revolução verde | +40% Fazenda; −5 agitação | 1.435.909 | 213 |
| Drones ✓ | Militar | Mísseis | +50% exército e aviação | 1.648.636 | 244 |
| Baterias de lítio | Indústria | Computadores | Fábrica de baterias +40% | 1.861.364 | 276 |
| Construção automatizada | Infraestrutura | Automação. Construção modular | método Construção automatizada | 2.074.091 | 307 |
| Medicina genômica | Sociedade | Biotecnologia | +crescimento; −peste | 2.286.818 | 339 |
| Comércio eletrônico | Comércio | Internet | +30% comércio exterior | 2.499.545 | 370 |
| Governo digital | Governo | Internet | +20% controle; −20% custo de administração | 2.712.273 | 402 |

**Total: 113 tecnologias.** Todas as atuais estão na lista.

## Próximo passo

- Passar a lista para src/tech.ts (os custos se recalculam sozinhos).
- Para cada efeito novo (teto de população, mortalidade, legitimidade...), ligar o campo no sistema que ele afeta.
- As tecnologias que só liberam leis e métodos já se encaixam nos sistemas que existem.

## Árvore em três áreas (gerado do código)

Total: 211 tecnologias. Cada era mantém a mesma soma de pontos (o custo de cada uma é dividido automaticamente). Requisito de outra área aparece como `Nome (Era)` acima do card.

### Tribal

**Produção** (13)

- Coleta organizada — Agricultura
- Ferramentas de pedra polida — Indústria
- Caça em grupo — Indústria
- Domesticação — Agricultura; livestock +0.05
- Agricultura — Agricultura; requer Coleta organizada
- Cerâmica — Agricultura; requer Fogo controlado (de outra área: Fogo controlado (Tribal))
- Mineração — Indústria; requer Ferramentas de pedra polida
- Tecelagem — Indústria; requer Agricultura
- Canoas — Comércio; requer Ferramentas de pedra polida
- Metalurgia do bronze — Indústria; requer Mineração
- Conservação de alimentos — Agricultura; requer Cerâmica; foodPreservation +0.03
- Agricultura itinerante — Agricultura; requer Agricultura; agriculture +0.05
- Técnicas de construção em madeira — Infraestrutura; requer Ferramentas de pedra polida; constructionEfficiency +0.05, storageCapacity +0.1

**Militar** (2)

- Organização tribal de guerreiros — Exército; requer Caça em grupo (de outra área: Caça em grupo (Tribal)); armyOrganization +0.05, armyMobilization +0.1
- Táticas de emboscada — Doutrina; requer Caça em grupo (de outra área: Caça em grupo (Tribal)); armyReconnaissance +0.15, armyInitiative +0.2

**Social** (7)

- Fogo controlado — Sociedade
- Tradição oral — Cultura; requer Fogo controlado
- Conselho de anciãos — Governo; requer Tradição oral
- Calendário lunar — Ciência; requer Tradição oral, Agricultura (de outra área: Agricultura (Tribal))
- Tradições de parentesco — Sociedade; socialCohesion +0.05, legitimacy +0.0005
- Conselho de líderes — Governo; requer Conselho de anciãos; governanceEfficiency +0.1, legitimacy +0.0005
- Contagem de recursos — Administração; requer Tradição oral; recordKeeping +0.05, administrativeEfficiency +0.03

### Clássica

**Produção** (11)

- Estradas — Infraestrutura; transportCapacity +0.05, supplyRange +1
- Irrigação — Indústria; requer Agricultura
- Moeda — Comércio; requer Metalurgia do bronze
- Armas de bronze — Indústria; requer Metalurgia do bronze
- Trabalho do ferro — Indústria; requer Metalurgia do bronze
- Arquitetura — Infraestrutura; requer Matemática (de outra área: Matemática (Clássica))
- Aquedutos — Infraestrutura; requer Arquitetura, Irrigação
- Rotas de caravana — Comércio; requer Moeda, Estradas
- Padronização de medidas — Comércio; requer Matemática (de outra área: Matemática (Clássica)); laborProductivity +0.03, marketIntegration +0.03
- Engenharia hidráulica — Infraestrutura; requer Arquitetura, Irrigação; agriculture +0.05, constructionEfficiency +0.05
- Metalurgia avançada do ferro — Indústria; requer Trabalho do ferro; resourceEfficiency +0.05, armyEquipment +0.05

**Militar** (5)

- Galés — Marinha; requer Metalurgia do bronze (de outra área: Metalurgia do bronze (Tribal))
- Cavalaria — Exército; requer Domesticação, Armas de bronze (de outra área: Domesticação (Tribal), Armas de bronze (Clássica))
- Legiões profissionais — Exército; requer Cavalaria, Direito escrito (de outra área: Direito escrito (Clássica)); armyOrganization +0.05, armyTraining +0.25, armyProfessionalism +0.05
- Engenharia de cerco — Doutrina; requer Arquitetura, Trabalho do ferro (de outra área: Arquitetura (Clássica), Trabalho do ferro (Clássica)); armySiege +0.15, fortificationEfficiency +0.25
- Logística de campanha — Logística; requer Estradas, Matemática (de outra área: Estradas (Clássica), Matemática (Clássica)); logisticsCapacity +0.1, supplyEfficiency +0.05, supplyRange +1

**Social** (8)

- Escrita — Educação; recordKeeping +0.05, assimilation +0.1
- Matemática — Ciência; requer Escrita
- Direito escrito — Instituições; requer Escrita; lawEnforcement +0.05
- Filosofia — Ciência; requer Matemática
- Medicina antiga — Saúde; requer Escrita
- Administração provincial — Administração; requer Direito escrito, Escrita; stateCapacity +1, administrativeEfficiency +0.03
- Censo populacional — Administração; requer Matemática, Direito escrito; censusAccuracy +0.1, taxCollection +0.02, bureaucraticCapacity +0.05
- Educação clássica — Educação; requer Filosofia; literacy +0.02, educationAccess +0.1, researchCapacity +0.05

### Medieval

**Produção** (9)

- Arado pesado — Agricultura; requer Agricultura
- Rotação trienal — Agricultura; requer Arado pesado
- Moinhos — Agricultura; requer Irrigação
- Guildas — Indústria; requer Moeda
- Arreio de coleira — Agricultura; requer Domesticação, Arado pesado
- Letras de câmbio — Comércio; requer Guildas
- Agricultura de pousio aprimorada — Agricultura; requer Rotação trienal; agriculture +0.05
- Contabilidade mercantil — Comércio; requer Letras de câmbio; priceEfficiency +0.03, privateCapital +0.05
- Técnicas de construção gótica — Infraestrutura; requer Arquitetura, Moinhos; constructionEfficiency +0.05, urbanPlanning +1

**Militar** (6)

- Castelos — Doutrina; requer Trabalho do ferro (de outra área: Trabalho do ferro (Clássica)); fortificationEfficiency +0.25
- Bestas — Exército; requer Castelos
- Bússola — Marinha; requer Galés
- Cavalaria pesada — Exército; requer Arreio de coleira, Trabalho do ferro (de outra área: Arreio de coleira (Medieval), Trabalho do ferro (Clássica)); cavalryEfficiency +0.15, armyBreakthrough +0.25
- Doutrina de fortificações — Doutrina; requer Castelos; fortificationEfficiency +0.25, armyEntrenchment +0.25
- Organização de exércitos permanentes — Exército; requer Feudalismo, Bestas (de outra área: Feudalismo (Medieval)); armyOrganization +0.05, armyRecovery +0.1

**Social** (6)

- Feudalismo — Governo; armySuppression +0.1
- Universidades — Educação; requer Escrita; researchCapacity +0.1
- Catedrais — Religião; requer Arquitetura (de outra área: Arquitetura (Clássica)); legitimacy +0.0005, culturalIntegration +0.1
- Administração feudal formalizada — Governo; requer Feudalismo; taxCollection +0.02, governanceEfficiency +0.05
- Escolástica — Ciência; requer Universidades, Filosofia; scientificMethod +0.05, educationQuality +0.1
- Hospitais e enfermarias — Saúde; requer Medicina antiga, Catedrais; healthcare +0.1, publicHealth +0.05

### Renascença

**Produção** (7)

- Mineração profunda — Indústria; requer Mineração; resourceDiscovery +0.1
- Contabilidade de partidas dobradas — Comércio; requer Letras de câmbio
- Alto-forno — Indústria; requer Trabalho do ferro, Moinhos
- Cartografia — Comércio; requer Navegação (de outra área: Navegação (Renascença))
- Cartografia comercial — Comércio; requer Cartografia, Contabilidade de partidas dobradas; shippingCapacity +0.05, exportCapacity +0.05
- Instrumentos de precisão — Indústria; requer Perspectiva, Matemática (de outra área: Perspectiva (Renascença), Matemática (Clássica)); researchCapacity +0.05, inputEfficiency +0.03
- Mineração metalúrgica especializada — Indústria; requer Mineração profunda, Alto-forno; extraction +0.05, resourceDepletion +0.1

**Militar** (5)

- Navegação — Marinha; requer Galés, Bússola; navalOrganization +0.05
- Fortificações em estrela — Doutrina; requer Castelos; fortificationEfficiency +0.25
- Exércitos profissionais — Exército; requer Fortificações em estrela, Trabalho do ferro (de outra área: Trabalho do ferro (Clássica)); armyProfessionalism +0.05, armyTraining +0.25
- Artilharia de cerco — Exército; requer Fortificações em estrela, Alto-forno (de outra área: Alto-forno (Renascença)); armySiege +0.2, artilleryEfficiency +0.1
- Táticas de infantaria combinada — Doutrina; requer Armas de bronze, Fortificações em estrela (de outra área: Armas de bronze (Clássica)); armyCoordination +0.1, armyDiscipline +0.05

**Social** (7)

- Imprensa — Cultura; requer Universidades; knowledgeDiffusion +0.1, propagandaEfficiency +0.05
- Perspectiva — Ciência; requer Imprensa
- Humanismo — Cultura; requer Imprensa; religiousTolerance +0.2
- Diplomacia permanente — Governo; requer Direito escrito; migrationAttraction +0.05, technologySpread +0.05
- Administração centralizada — Administração; requer Diplomacia permanente, Direito escrito; stateCapacity +1, bureaucraticCapacity +0.1
- Educação humanista — Educação; requer Humanismo; literacy +0.02, socialMobility +0.1
- Direito comercial — Instituições; requer Contabilidade de partidas dobradas, Direito escrito (de outra área: Contabilidade de partidas dobradas (Renascença)); judicialEfficiency +0.05, priceEfficiency +0.03

### Descobertas

**Produção** (7)

- Bancos — Comércio; requer Navegação (de outra área: Navegação (Renascença)); capitalAccumulation +0.03
- Companhias comerciais — Comércio; requer Navegação (de outra área: Navegação (Renascença))
- Plantation — Agricultura; requer Navegação (de outra área: Navegação (Renascença))
- Mercantilismo — Comércio; requer Companhias comerciais
- Contabilidade industrial primitiva — Indústria; requer Bancos, Contabilidade de partidas dobradas; privateCapital +0.05, inputEfficiency +0.03
- Agricultura colonial especializada — Agricultura; requer Plantation; agriculture +0.05
- Construção naval oceânica — Infraestrutura; requer Galeões, Navegação (de outra área: Galeões (Descobertas), Navegação (Renascença)); shippingCapacity +0.05, productionSpeed +0.1

**Militar** (6)

- Pólvora — Exército; requer Castelos
- Mosquete — Exército; requer Pólvora
- Galeões — Marinha; requer Navegação; navalRange +1
- Infantaria de fogo coordenado — Exército; requer Mosquete; armyDiscipline +0.05, armyTraining +0.25
- Logística ultramarina — Logística; requer Galeões, Companhias comerciais (de outra área: Companhias comerciais (Descobertas)); navalLogistics +0.1, navalRange +1
- Artilharia de campanha aprimorada — Exército; requer Pólvora, Mosquete; artilleryEfficiency +0.1

**Social** (6)

- Método científico — Ciência; requer Perspectiva; scientificMethod +0.1, innovation +0.1
- Correios — Administração; requer Estradas, Imprensa (de outra área: Estradas (Clássica)); knowledgeDiffusion +0.05, migrationControl +0.1
- Vacinação variólica — Saúde; requer Medicina antiga, Método científico; publicHealth +0.05
- Administração colonial — Administração; requer Correios, Diplomacia permanente; stateCapacity +1, censusAccuracy +0.05
- Academias científicas — Ciência; requer Método científico, Universidades; researchCapacity +0.1, scientificMethod +0.05, knowledgeDiffusion +0.1
- Sistema de ensino estatal — Educação; requer Imprensa, Educação humanista; literacy +0.03, educationAccess +0.1

### Revoluções

**Produção** (8)

- Máquina a vapor — Indústria; requer Mineração profunda; manufacturing +0.03, productionSpeed +0.1
- Ferrovias — Infraestrutura; requer Máquina a vapor; transportCapacity +0.1, supplyRange +1, railCapacity +0.05
- Agricultura científica — Agricultura; requer Arado pesado
- Tear mecânico — Indústria; requer Máquina a vapor
- Bolsa de valores — Comércio; requer Bancos
- Mecanização agrícola — Agricultura; requer Agricultura científica, Máquina a vapor; agriculture +0.05, mechanization +0.15, laborProductivity +0.03
- Engenharia industrial — Indústria; requer Máquina a vapor, Matemática (de outra área: Matemática (Clássica)); constructionEfficiency +0.05, manufacturing +0.03
- Padronização industrial — Indústria; requer Máquina a vapor, Contabilidade de partidas dobradas; laborProductivity +0.03, inputEfficiency +0.05

**Militar** (6)

- Conscrição — Exército; requer Pólvora; armyMobilization +0.1
- Navio a vapor — Marinha; requer Máquina a vapor, Galeões (de outra área: Máquina a vapor (Revoluções)); navalLogistics +0.1
- Artilharia de campanha — Exército; requer Conscrição
- Estado-maior profissional — Doutrina; requer Conscrição, Administração centralizada (de outra área: Administração centralizada (Renascença)); commandCapacity +0.15, armyCoordination +0.1, armyOrganization +0.05
- Logística ferroviária militar — Logística; requer Ferrovias, Logística de campanha (de outra área: Ferrovias (Revoluções)); railCapacity +0.05, supplyEfficiency +0.1, supplyRange +2
- Doutrina de guerra de massa — Doutrina; requer Conscrição, Estado-maior profissional; armyMobilization +0.2, armyReinforcement +0.2

**Social** (6)

- Iluminismo — Ciência; requer Imprensa; innovation +0.1, politicalParticipation +0.05
- Economia política — Instituições; requer Iluminismo; politicalOrganization +0.05
- Saneamento — Saúde; requer Vacinação variólica; publicHealth +0.1
- Serviço público profissional — Administração; requer Administração centralizada, Iluminismo; administrativeEfficiency +0.05, bureaucraticCost +0.1
- Estatística estatal — Administração; requer Matemática, Administração centralizada; censusAccuracy +0.1, recordKeeping +0.1, taxCollection +0.02
- Ensino obrigatório — Educação; requer Sistema de ensino estatal, Serviço público profissional; literacy +0.05, educationAccess +0.15

### Industrialização

**Produção** (10)

- Eletricidade — Indústria; requer Máquina a vapor
- Química industrial — Agricultura; requer Agricultura científica
- Telégrafo — Infraestrutura; requer Ferrovias; commandCapacity +0.05, knowledgeDiffusion +0.1
- Aço Bessemer — Indústria; requer Eletricidade
- Fertilizantes químicos — Agricultura; requer Química industrial
- Refrigeração — Agricultura; requer Eletricidade; foodPreservation +0.03
- Linha de montagem — Indústria; requer Eletricidade, Padronização industrial; manufacturing +0.05, productionSpeed +0.1, inputEfficiency +0.03
- Engenharia química avançada — Indústria; requer Química industrial, Medicina moderna (de outra área: Medicina moderna (Industrialização)); resourceEfficiency +0.05, energyEfficiency +0.05
- Rede elétrica nacional — Infraestrutura; requer Eletricidade; energyEfficiency +0.1, productionCapacity +0.05
- Logística ferroviária integrada — Infraestrutura; requer Ferrovias, Telégrafo; railCapacity +0.1, marketAccess +0.05

**Militar** (5)

- Metralhadora — Exército; requer Conscrição
- Couraçados — Marinha; requer Eletricidade, Navio a vapor (de outra área: Eletricidade (Industrialização)); navalProtection +0.05
- Guerra de trincheiras — Doutrina; requer Metralhadora, Artilharia de campanha; armyEntrenchment +0.5, fortificationEfficiency +0.25
- Estado-maior moderno — Doutrina; requer Telégrafo, Estado-maior profissional (de outra área: Telégrafo (Industrialização)); commandCapacity +0.15, armyCoordination +0.1
- Guerra naval industrial — Marinha; requer Couraçados, Aço Bessemer (de outra área: Aço Bessemer (Industrialização)); navalFirepower +0.1, navalProtection +0.1

**Social** (6)

- Medicina moderna — Saúde; requer Iluminismo; lifeExpectancy +3
- Sindicatos — Sociedade; requer Economia política; politicalOrganization +0.05
- Educação pública — Educação; requer Iluminismo; literacy +0.05, educationAccess +0.1, bureaucraticCapacity +0.05
- Previdência trabalhista — Sociedade; requer Sindicatos, Medicina moderna; socialStability +0.05, publicOrder +2
- Ensino técnico — Educação; requer Educação pública, Eletricidade (de outra área: Eletricidade (Industrialização)); laborProductivity +0.03, educationQuality +0.1
- Saúde pública urbana — Saúde; requer Saneamento, Medicina moderna; publicHealth +0.15, healthcare +0.1

### Grandes Guerras

**Produção** (6)

- Motor a combustão — Indústria; requer Eletricidade; logisticsCapacity +0.05
- Produção em massa — Indústria; requer Eletricidade
- Concreto armado — Infraestrutura; requer Aço Bessemer; constructionSpeed +0.05, infrastructureMaintenance +0.05
- Cadeias industriais integradas — Indústria; requer Produção em massa, Rádio (de outra área: Rádio (Grandes Guerras)); manufacturing +0.05, industrialComplexity +0.1
- Refino avançado de petróleo — Indústria; requer Química industrial, Motor a combustão; fuelEfficiency +0.1, energyEfficiency +0.05
- Produção industrial militar — Indústria; requer Produção em massa, Metralhadora (de outra área: Metralhadora (Industrialização)); armyEquipment +0.1, productionSpeed +0.1

**Militar** (8)

- Blindados — Exército; requer Metralhadora, Motor a combustão (de outra área: Motor a combustão (Grandes Guerras))
- Aviação — Aeronáutica; requer Motor a combustão (de outra área: Motor a combustão (Grandes Guerras)); airTraining +0.1, airLogistics +0.1
- Submarinos — Marinha; requer Motor a combustão (de outra área: Motor a combustão (Grandes Guerras)); navalDoctrine +0.25
- Guerra mecanizada — Exército; requer Blindados, Logística ferroviária militar; armorEfficiency +0.15, armyBreakthrough +0.5, fuelEfficiency +0.05
- Guerra combinada — Doutrina; requer Aviação, Estado-maior moderno; airSupport +0.25, armyCoordination +0.1
- Guerra submarina moderna — Marinha; requer Submarinos, Rádio (de outra área: Rádio (Grandes Guerras)); navalDoctrine +0.25, navalReconnaissance +0.1
- Radar militar — Aeronáutica; requer Rádio, Eletricidade (de outra área: Rádio (Grandes Guerras), Eletricidade (Industrialização)); armyReconnaissance +0.1, airInterception +0.15, navalReconnaissance +0.15
- Logística motorizada — Logística; requer Motor a combustão, Produção industrial militar (de outra área: Motor a combustão (Grandes Guerras), Produção industrial militar (Grandes Guerras)); logisticsCapacity +0.15, supplyRange +2

**Social** (7)

- Rádio — Cultura; requer Telégrafo (de outra área: Telégrafo (Industrialização))
- Antibióticos — Saúde; requer Medicina moderna; diseaseResistance +0.2
- Economia planejada — Governo; requer Sindicatos; socialAdministration +0.1
- Propaganda — Cultura; requer Rádio; propagandaEfficiency +0.15
- Mobilização nacional — Governo; requer Conscrição, Propaganda (de outra área: Conscrição (Revoluções)); armyMobilization +0.2, stateCapacity +1
- Planejamento econômico de guerra — Governo; requer Economia planejada, Cadeias industriais integradas (de outra área: Cadeias industriais integradas (Grandes Guerras)); productionSpeed +0.1, manufacturing +0.03
- Medicina de emergência — Saúde; requer Antibióticos, Medicina moderna; attritionReduction +0.1, healthcare +0.1

### Multipolar

**Produção** (8)

- Energia nuclear — Indústria; requer Produção em massa
- Revolução verde — Agricultura; requer Química industrial
- Contêineres — Comércio; requer Motor a combustão; shippingCapacity +0.1
- Construção modular — Infraestrutura; requer Concreto armado; constructionSpeed +0.05
- Microeletrônica — Indústria; requer Computadores, Eletricidade (de outra área: Computadores (Multipolar)); automation +0.05, researchCapacity +0.05
- Robótica industrial — Indústria; requer Produção em massa, Microeletrônica; automation +0.1, laborProductivity +0.03
- Logística global — Comércio; requer Contêineres, Computadores (de outra área: Computadores (Multipolar)); shippingCapacity +0.1, importCapacity +0.1, exportCapacity +0.1
- Materiais avançados — Indústria; requer Química industrial, Microeletrônica; resourceEfficiency +0.05, inputEfficiency +0.03

**Militar** (7)

- Mísseis — Exército; requer Aviação; airBombing +0.15
- Caças a jato — Aeronáutica; requer Aviação; airSuperiority +0.15, airOrganization +0.1
- Porta-aviões — Marinha; requer Aviação, Couraçados; navalReconnaissance +0.1
- Guerra eletrônica — Doutrina; requer Computadores, Radar militar (de outra área: Computadores (Multipolar)); airInterception +0.1, armyReconnaissance +0.1, navalReconnaissance +0.1
- Satélites militares — Aeronáutica; requer Mísseis, Computadores (de outra área: Computadores (Multipolar)); airReconnaissance +0.15, commandCapacity +0.1, airRange +2
- Doutrina de armas combinadas — Doutrina; requer Guerra combinada, Computadores (de outra área: Computadores (Multipolar)); armyCoordination +0.15, armyTraining +0.25
- Logística militar informatizada — Logística; requer Logística global, Computadores (de outra área: Logística global (Multipolar), Computadores (Multipolar)); supplyEfficiency +0.1, logisticsCapacity +0.1

**Social** (6)

- Computadores — Ciência; requer Rádio; recordKeeping +0.05, innovation +0.1
- Previdência social — Sociedade; requer Economia planejada; socialStability +0.05
- Economia mista — Instituições; requer Previdência social
- Administração pública informatizada — Administração; requer Computadores; recordKeeping +0.1, administrativeEfficiency +0.05
- Sistemas universais de saúde — Saúde; requer Previdência social, Medicina moderna; healthcare +0.15, publicHealth +0.1, lifeExpectancy +5
- Comunicação de massa — Cultura; requer Rádio, Computadores; propagandaEfficiency +0.15, knowledgeDiffusion +0.1

### Moderna

**Produção** (10)

- Automação — Indústria; requer Computadores, Produção em massa (de outra área: Computadores (Multipolar))
- Energias renováveis — Indústria; requer Energia nuclear
- Biotecnologia — Agricultura; requer Revolução verde
- Baterias de lítio — Indústria; requer Computadores (de outra área: Computadores (Multipolar))
- Construção automatizada — Infraestrutura; requer Automação, Construção modular
- Comércio eletrônico — Comércio; requer Internet (de outra área: Internet (Moderna))
- Inteligência artificial industrial — Indústria; requer Automação, Internet (de outra área: Internet (Moderna)); automation +0.1, laborProductivity +0.05, inputEfficiency +0.05
- Manufatura aditiva — Indústria; requer Robótica industrial, Materiais avançados; resourceEfficiency +0.05
- Redes inteligentes de energia — Infraestrutura; requer Energias renováveis, Microeletrônica; energyEfficiency +0.1
- Biologia sintética — Agricultura; requer Biotecnologia, Inteligência artificial industrial; agriculture +0.05, livestock +0.05

**Militar** (5)

- Drones — Aeronáutica; requer Mísseis
- Sistemas militares autônomos — Exército; requer Drones, Inteligência artificial industrial (de outra área: Inteligência artificial industrial (Moderna)); armyReconnaissance +0.1, airReconnaissance +0.1, commandCapacity +0.1
- Defesa cibernética — Doutrina; requer Internet, Guerra eletrônica (de outra área: Internet (Moderna)); commandCapacity +0.1, recordKeeping +0.05
- Guerra em rede — Doutrina; requer Satélites militares, Sistemas militares autônomos; armyCoordination +0.15, airSupport +0.25
- Logística preditiva — Logística; requer Inteligência artificial industrial, Logística militar informatizada (de outra área: Inteligência artificial industrial (Moderna)); supplyEfficiency +0.1, armyMaintenance +0.1

**Social** (8)

- Internet — Ciência; requer Computadores; knowledgeDiffusion +0.15, technologySpread +0.1
- Medicina genômica — Saúde; requer Biotecnologia (de outra área: Biotecnologia (Moderna))
- Governo digital — Administração; requer Internet; administrativeEfficiency +0.03, taxCollection +0.02
- Gestão ambiental — Sociedade; requer Energias renováveis (de outra área: Energias renováveis (Moderna)); disasterResponse +0.15, resourceDepletion +0.1
- Administração algorítmica — Administração; requer Governo digital, Inteligência artificial industrial (de outra área: Inteligência artificial industrial (Moderna)); administrativeEfficiency +0.05, bureaucraticCapacity +0.1, censusAccuracy +0.05
- Medicina personalizada — Saúde; requer Medicina genômica, Biologia sintética (de outra área: Biologia sintética (Moderna)); healthcare +0.1, lifeExpectancy +5
- Educação digital — Educação; requer Internet, Administração pública informatizada; educationAccess +0.15, educationQuality +0.1
- Governança de dados — Governo; requer Governo digital, Defesa cibernética (de outra área: Defesa cibernética (Moderna)); censusAccuracy +0.05, governanceEfficiency +0.1
