# Subsistência

Código em `src/subsistence.ts` (configuração em `SUBSIST`), ligado em `src/economy.ts` (no lugar da antiga comida de subsistência por hex, sem duplicar).

## Como funcionava antes

Cada hex com gente produzia comida = população × consumo × fertilidade × 0,8, em cada um dos 3 bens de comida, direto na oferta do mercado. Todo mundo produzia (empregado ou não), construções não tiravam terra, e o valor inteiro entrava no PIB e na renda de quem vive da terra.

## Como funciona agora

- **Automática, por hex**: não é construção. Os 1 milhão de hexes não ganham edifícios; a conta é feita no laço que já percorre os hexes do país.
- **Tipo** pelo terreno, água e clima (calculado uma vez por mundo):
  - Agricultura de subsistência: planície, pradaria (grãos, frutas, um pouco de fibras).
  - Coleta e caça: floresta, selva, taiga, tundra, deserto, montanha (carne, frutas, peles).
  - Pecuária de subsistência: estepe, savana, colinas (carne, peles).
  - Pesca de subsistência: litoral pouco fértil (peixe conta como carne e caça).
  - Agricultura alagada: rio em selva ou planície tropical (grãos).
  - Sem a tecnologia Agricultura, roça vira coleta; sem Domesticação, pasto vira caça.
- **Capacidade** (pessoas que a terra sustenta): 450 × fertilidade do tipo × rio (1,25) ou litoral (1,1) × clima (árido sem rio 0,8, polar 0,6) × tecnologia (até +50%) × terra livre.
- **Quem vive da terra**: a gente do hex menos as vagas das construções, com piso de 30% (a roça de casa). Em centro urbano, só uma parte (60% na era tribal, −5% por era, mínimo 10%).
- **Pressão** = quem vive da terra ÷ capacidade. Até 80% cada pessoa rende cheio; acima, cada pessoa a mais rende menos (curva suave, teto em 120% da capacidade). Pressão alta empurra mais gente do campo para a cidade e trava o crescimento dos hexes sem cidade.
- **Produção por pessoa**: (0,4 + 0,6 × fertilidade do tipo) do que ela come, × tempo da semana (calor/seca 0,8, lama/enchente 0,85, chuva 0,95, neve 0,5; celeiros da era evitam até metade da perda) × perda de armazenamento da era.
- **Autoconsumo e excedente**: a família come primeiro (até o que precisa de cada bem); 80% do excedente chega ao mercado. O autoconsumo fica na oferta da cidade, mas fora do PIB; o excedente vendido entra no PIB.
- **Construções ocupam terra**: extratora 10% por nível, indústria 4%, outras 2%, centro urbano 40%; no máximo 85%. A subsistência nunca some de todo.
- **Renda e imposto**: quem vive da terra recebe o autoconsumo (em espécie, isento) e o excedente vendido (tributável).
- **Profissões**: quem sobra sem emprego continua Camponês (ou Caçador-coletor sem Agricultura); muda de profissão quando aparece vaga.

## Onde ver

- Painel do hex: tipo, capacidade, quem vive da terra, pressão, produção, autoconsumo, excedente, falta e terra ocupada.
- Camada de mapa **Subsistência** (Economia): pressão no país (verde folgado → vermelho apertado) e potencial fora dele.
- Economia › Visão Geral: cartões de subsistência. Gráficos: "Vivem da terra" e "Pressão sobre a terra (%)".

## Ainda não

- Leis de propriedade da terra (servidão, latifúndio, cooperativas) mudando a divisão da produção.
- Disputas por terra e eventos próprios de fome por pressão.
- Cache incremental por hex: hoje a conta é refeita toda semana (≈2 µs por hex).
