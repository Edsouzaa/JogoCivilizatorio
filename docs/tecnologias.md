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
