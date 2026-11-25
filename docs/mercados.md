# Mercados e comércio

Código em `src/markets.ts` (configuração em `MARKET`), ligado em `src/economy.ts`.

## Três níveis

- **Local**: cada cidade tem oferta, demanda, preço e agora **estoque**. O que encalha no fim da semana vai metade para o estoque (o resto se perde), até a capacidade (15 × tamanho da cidade × (1 + era/2) + estruturas comerciais). Comida estraga 10% por semana, o resto 1%. No começo da semana metade do estoque volta à venda; isso não conta como produção no PIB.
- **Nacional**: as cidades do país trocam entre si conforme o **acesso** de cada uma (0–1), recalculado todo mês: base da era, estradas, porto ou rio navegável, estruturas comerciais (até +40%), menos a distância da capital; cidade isolada perde metade. A capital tem acesso 1.
- **Internacional**: comércio entre países com pacto (como antes), agora com:
  - **Política por mercadoria**: Livre, Proibir exportação, Reservar consumo interno (guarda 20% a mais do que o povo consome), Prioridade à exportação (vende até o que o povo comeria), Proibir importação.
  - **Tarifa** do país (0–50%): arrecada mais, mas reduz a vantagem.
  - **Vantagem comercial** (eficiência: era, tecnologias de comércio, acesso médio das cidades, tarifa) e **parte do poder** nos nós que os dois dividem decidem quanto do excedente sai.

## Nós comerciais

Nó não é mercado: é onde o poder comercial dos países disputa o comércio. Cidade costeira fica no nó da zona marítima colada nela; as outras no nó terrestre do continente. Poder da cidade = população/1000 + 2 por nível de porto + estradas + estruturas.

## Estruturas comerciais

| Estrutura | Tecnologia | Estoque | Acesso | Poder |
|---|---|---|---|---|
| Posto comercial | — | 20 | 3% | 1 |
| Mercado local | Moeda | 40 | 5% | 1 |
| Entreposto comercial | Rotas de caravana | 80 | 3% | 2 |
| Companhia comercial | Companhias comerciais | 50 | 2% | 6 |
| Centro comercial | Bancos | 120 | 8% | 4 |
| Bolsa de comércio | Bolsa de valores | 0 | 5% | 5 |
| Centro logístico comercial | Ferrovias | 200 | 10% | 2 |

Valores por nível.

## Complexidade da Economia (0–1000)

É nacional e não é ineficiência. O alvo soma pontos por tecnologia conhecida (cada uma uma vez, peso por área), 5 por bem diferente produzido e até 300 pela urbanização; o valor anda 10% por mês até o alvo. Cada construção tem um impacto (baixo 5%, médio 15%, alto 30%, muito alto 45% de custo a mais com complexidade 1000): o custo em dinheiro sobe tudo isso, os pontos de construção a metade.

## Ainda não

- Comércio exterior sem pacto, só pelos nós.
- IA escolhendo política por mercadoria e tarifa.
