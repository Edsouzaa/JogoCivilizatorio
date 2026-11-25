# Próximos sistemas (especificações recebidas, resumidas)

Resumo dos pedidos grandes que ainda não foram feitos. A ordem é a recomendada em cada pedido.

O que já existe no jogo e deve ser reaproveitado:

| Sistema | Arquivo |
|---|---|
| Guerra e unidades | war.ts, units.ts |
| Mercados por cidade | economy.ts |
| Nós marítimos | regions.ts |
| Diplomacia | diplomacy.ts, subjects.ts, proposals.ts, claims.ts |
| Mundo | world.ts |
| Construções e finanças | construction.ts, firms.ts |

## 1. Batalhas, atrito e suprimentos (estilo HOI4 / EU5)

**Ordem recomendada:** primeiro combate terrestre e logística terrestre; depois naval e aéreo.

**Etapa 1: batalha**
- Batalha como entidade própria: participantes, hex, rodadas e histórico.
- Largura de frente por terreno: planície 100, floresta 80, colinas 75, montanha 50, deserto 90, urbano 90.
- Largura por categoria de unidade: infantaria 10, montaria 12, artilharia 15, blindados 20.
- Tropas que não cabem na frente ficam na reserva e entram quando a frente se desgasta.
- Ataque por mais de uma direção aumenta a largura.
- Duas fases por rodada:
  - fogo: artilharia e projéteis;
  - choque: corpo a corpo, montaria e blindados.
  - O peso de cada fase muda com a era.
- **Dados:** 1d10 por lado por fase, mais modificadores (comandante, terreno, travessia de rio, entrincheiramento, abastecimento, tecnologia). O dado pesa, mas não decide sozinho.
- **Três números separados por unidade:** força (soldados), organização (aguentar lutar) e moral (vontade de lutar).
  - Dano de organização e dano de força são separados.
  - Perder a batalha leva à retirada, e só cercado leva à destruição.

**Etapa 2: combate**
- Terreno, eventos (emboscada, flanco, carga, bombardeio, colapso da linha, falta de munição) e reservas.
- Retirada com perseguição e cerco.
- Estilos de comandante: defensivo, agressivo, cauteloso, flanqueador, logístico e inspirador.

**Etapa 3: atrito**
- Atrito separado das baixas de batalha: doença, fome, deserção, frio, calor, deserto e pântano.
- Fadiga de marcha, recuperação limitada por estoque e por gente.

**Etapa 4: logística terrestre**
- Cada exército tem demanda por tipo de bem (comida, armas, munição/pólvora, combustível, peças).
- Cada exército tem estoque próprio e abastecimento de 0 a 100%, com faixas de penalidade.
- Falta de um bem específico tem efeito específico.
- Depósitos com capacidade limitada; rotas com capacidade semanal por estrada, ferrovia, rio e porto.
- Prioridades de distribuição. Saque limitado, com custo social.

**Etapas 5 e 6: naval e aéreo**
- Naval: comboios, bloqueios e abastecimento ultramarino (de origem, local ou misto).
- Aéreo: bases, alcance de ida e volta, combustível e munição.

**Etapa 7: interface**
- Tela de batalha com as duas linhas e o histórico de rolagens com todos os modificadores.
- Painel e mapa de suprimentos (verde, amarelo, laranja, vermelho).
- Painel de atrito.

**Regra de multiplayer:** dados vêm do RNG determinístico da partida (mulberry32 com a semente), e o número de rodadas por semana é fixo.

## 2. Mercados, comércio, nós comerciais e Complexidade da Economia

- **Mercado local:** já existe, um por cidade.
  - Falta: estoque e capacidade de armazenamento.
  - Falta: acesso ao mercado nacional por cidade (0 a 100%), pela capacidade real de transporte (estrada, ferrovia, rio, porto).
- **Mercado nacional:** a rede entre as cidades conectadas.
  - O transporte entre cidades consome capacidade.
  - Os preços locais continuam diferentes.
- **Nós comerciais:**
  - Marítimos: usar os nós de regions.ts.
  - Terrestres: passos de montanha, rotas de caravana, travessias de rio.
  - Cada nó tem volume, capacidade, segurança, pirataria, bloqueio e poder comercial por país.
- **Poder comercial e vantagem comercial são coisas diferentes:**
  - Poder é presença: população, produção, portos, frota mercante.
  - Vantagem é eficiência: infraestrutura, tarifas, tecnologia.
- **Comércio:**
  - Importação e exportação configuráveis por bem.
  - Três modos: automático, direcionado e estratégico.
  - Exportar com escassez interna é permitido, e gera alta de preço e insatisfação.
- **Estruturas comerciais:** posto comercial, mercado local, entreposto, porto comercial, centro comercial, bolsa de comércio, companhia comercial e centro logístico comercial.
- **Complexidade da Economia (0 a 1000):**
  - Sobe com tecnologias (cada uma uma vez só), diversificação, urbanização e instituições.
  - Encarece o custo e o pessoal das construções conforme a categoria:

| Impacto | Exemplos | Acréscimo máximo de custo |
|---|---|---|
| Baixo | Fazenda, pasto | +5% |
| Médio | Ferraria, olaria | +15% |
| Alto | Siderúrgica, refinaria | +30% |
| Muito alto | Eletrônicos, nuclear | +45% |

- **Interface:** página Mercado e Comércio com 6 abas e gráficos.

## 3. Diplomacia (estilo Victoria 2 e 3)

- **Indicadores separados:** relações, confiança, influência, dependência, ameaça percebida, rivalidade, prestígio, infâmia e leverage.
- **Rank global:**

| Categoria | Bônus de negociação contra a IA |
|---|---|
| Grande Potência | +20 |
| Potência Maior | +12 |
| Potência Regional | +6 |
| Potência Menor | +2 |
| Insignificante | 0 |
| Descentralizado | 0 |

  - Pontuação normalizada: economia 20%, militar 20%, prestígio 15%, população 10%, tecnologia 10%, administração 10%, influência 10%, comércio 5%.
  - O rank ajuda, mas não garante aceitação.
- **Esferas de influência (Victoria 2):**
  - Pontos de influência por rank; prioridades por país.
  - Ações: aumentar influência, desacreditar, expulsar conselheiros, proibir embaixada, financiar governo.
  - Entrada na esfera com influência 80 ou mais e 20 de vantagem sobre a segunda potência, e o país-alvo precisa aceitar.
  - Esfera não é dependência.
- **Tratados por artigos (Victoria 3):**
  - Militares, econômicos, diplomáticos, territoriais e de dependência.
  - Duração de 1, 5, 10, 25 anos ou indeterminada.
  - Proposta, contraproposta e rompimento com custo.
- **IA:** pontua cada artigo (de +30 aceita a −30 recusa) e faz contrapropostas.
- **Obrigações:** consumíveis.
- **Crises (Diplomatic Plays):** exigência, reação, formação de lados, negociação e resolução; tensão de 0 a 100; nem toda crise vira guerra.
- **Blocos internacionais:** separados das esferas.
- **Interface:** 7 abas e histórico diplomático.

## 4. Recursos, biomas, clima e eventos ambientais

- **Distribuição por geografia:**
  - Províncias minerais que se estendem por vários hexes.
  - Bacias sedimentares (carvão, petróleo) e regiões vulcânicas (obsidiana).
  - Abundância de 0 a 5 por recurso.
  - Renováveis regeneram; jazidas se esgotam.
- **Recursos que faltam:** peixe, obsidiana, uvas e lúpulo, marfim, borracha, ligas especiais e combustível nuclear (como produto). Só criar depois de analisar as cadeias.
- **Biomas candidatos:** pântano, manguezal, floresta temperada, mediterrâneo e floresta tropical sazonal.
- **Características separadas do bioma:** costa, ilha, rio, lago, delta, altitude e vulcão.
- **Clima permanente por região:** temperatura, chuva, vento, estações e risco de cada desastre. Usar regiões climáticas, não hex por hex.
- **Eventos ambientais:** chuva forte, tempestade, tornado, ciclone, onda de calor, onda de frio, seca, nevasca, terremoto, tsunami, erupção e deslizamento.
  - Cada um com epicentro, área, duração em semanas e efeitos na economia, população, exército e infraestrutura.
- **Condições dos nós:** marítimos (ondas, gelo, nevoeiro) e aéreos (vento, turbulência, cinzas).
- **Mapa "Clima e Eventos Ambientais"** com camadas.
- **Previsão** que melhora com a tecnologia.
- **Desempenho:** guardar só os eventos ativos e calcular efeitos só nos hexes atingidos (mapa de 1.024.000 hexes).

## 5. Pendente dos pedidos desta rodada

- **Leis:** as ~60 categorias completas (sociedade, imigração, justiça, meio ambiente...) e os resultados "adiada" e "aprovada com concessões". Feito: o núcleo, em politics.ts.
- **Orçamento:** histórico por categoria, tributos de herança, riqueza e guerra em detalhe, evasão fiscal. Feito: impostos por classe e tributos específicos com pontos administrativos.
- **Ícones:** cada construção mudando de aparência por era. Feito: um ícone por recurso, tecnologia e construção.
