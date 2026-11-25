# Economia por era (src/eramods.ts)

As sociedades começam com pouca moeda, arrecadação fraca, comércio curto e construção lenta.

- **A era vem da pesquisa do país, não da data.** Só tecnologia e lei melhoram os fatores.
- **Um lugar só:** cada fator é aplicado uma vez, e todos ficam na tabela `ERA_ECON`, que é onde se ajusta.

| Fator | Onde age | Tribal | Clássica | Medieval | Renasc. | Descob. | Revol. | Indust. | G. Guerras | Multip. | Moderna |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Eficiência tributária | renda do imposto | 15% | 30% | 40% | 50% | 60% | 70% | 80% | 85% | 90% | 95% |
| Monetização | parte em dinheiro da manutenção, das obras, do soldo e do fundo | 20% | 40% | 50% | 60% | 70% | 80% | 90% | 95% | 100% | 100% |
| Comércio | troca entre cidades e com o exterior | 25% | 40% | 50% | 60% | 70% | 80% | 90% | 90% | 100% | 110% |
| Produtividade industrial | produção das indústrias | 35% | 50% | 60% | 70% | 75% | 85% | 100% | 110% | 120% | 130% |
| Administração | pontos administrativos | 20% | 35% | 45% | 55% | 60% | 70% | 80% | 85% | 90% | 100% |
| Construção | pontos de construção | 50% | 60% | 70% | 80% | 85% | 95% | 110% | 120% | 130% | 140% |
| Manutenção | custo relativo | 150% | 130% | 120% | 110% | 105% | 100% | 95% | 100% | 95% | 90% |
| Perda de comida | subsistência, por mês | 15% | 10% | 8% | 6% | 5% | 4% | 3% | 2% | 1% | 0,5% |
| Crédito | teto de dívida (× PIB anual) | 0 | 10% | 20% | 35% | 45% | 60% | 75% | 85% | 95% | 100% |
| Investimento privado | entrada no fundo | 0 | 10% | 20% | 40% | 60% | 80% | 100% | 100% | 100% | 100% |

**Melhorias (`ECON_TECH`, `ECON_LAW`):**
- Moeda, Escrita, Direito escrito, Letras de câmbio, Contabilidade, Bancos, Bolsa de valores, Correios, Ferrovias, Eletricidade, Refrigeração, Computadores, Internet e Governo digital.
- Leis de imposto, burocracia, comércio e educação.
- Cada uma melhora poucos pontos. Os limites são 100% nas eficiências e 150% na produtividade, e a manutenção não fica abaixo de 80%.

**Sem crédito, não há dívida.** Todo gasto passa por `spend()`, que paga até o tesouro mais o teto de crédito.

| O que fica sem pagar | Consequência |
|---|---|
| Manutenção | as construções rendem até 50% menos na semana seguinte |
| Soldo | o exército perde organização |
| Obras e navios | esperam ("sem dinheiro") |

**Simulação de 200 anos (mapa 600×240, 5 tribos):**
- Na era tribal, o tesouro oscila entre 100 e 500 e não há dívida; a renda (cerca de 8 a 11 por semana) empata com a manutenção.
- Na era Clássica, a renda sobe para cerca de 75 a 210 por semana, e a construção passa a ser limitada pelos pontos de construção.
