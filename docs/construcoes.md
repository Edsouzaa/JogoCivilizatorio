# Construções do jogo

O que existe hoje no código (`src/economy.ts`, `src/expansion.ts`, `src/tech.ts`). Se mudar lá, atualize aqui.

## Regras gerais

- **Custo:** o nível *n* de qualquer construção econômica custa `100 × n` (o nível 3 custa 300).
- **Manutenção:** 0,5 por semana por nível.
- **Trabalhadores:** cada nível ocupa os trabalhadores da tabela. Eles saem do manpower do país, e só metade da população do hex trabalha nas construções dele.
- **Produção:**
  - Extratora: 5 unidades por semana por nível, do recurso do hex. Num hex com dois recursos, produz os dois.
  - Indústria: a receita da tabela × o nível. Compra os insumos no mercado da cidade e vende o produto nele.
- **Centro urbano:** num hex urbano, a extração rende só 50%, mas a indústria rende 125%.
- **Tecnologias:** algumas liberam a construção e outras dão bônus de produção (colunas "Exige" e "Bônus").
- **Quem trabalha:** muda com a era. Na era tribal são camponeses e caçadores. Depois vêm trabalhadores, fazendeiros e comerciantes. Nas Revoluções entram operários especializados e engenheiros.

## Extratoras (produzem o recurso do hex)

| Construção | Recursos do hex | Trabalhadores/nível | Exige | Bônus de tecnologia |
|---|---|---|---|---|
| Fazenda | Grãos, Frutas e vegetais, Fibras, Especiarias | 20 | — | Agricultura +25%; Feudalismo +20%; Moinhos +20%; Arado pesado +30%; Agricultura científica +40%; Química industrial +30%; Revolução verde +50%; Biotecnologia +40% |
| Pasto | Cavalos, Gado | 15 | — | Domesticação +25% |
| Acampamento de caça | Carne e caça, Peles | 15 | — | — |
| Serraria | Madeira | 20 | — | Estradas +25%; Moinhos +25% |
| Mina | Pedra, Cobre, Estanho, Ferro, Ouro, Prata, Pedras preciosas, Carvão mineral, Enxofre, Sal | 30 | — | Mineração +25%; Trabalho do ferro +25%; Mineração profunda +30%; Química industrial +20%; Energias renováveis +20% |
| Barreiro | Argila | 12 | — | — |
| Poço | Petróleo | 20 | — | Motor a combustão +50%; Energias renováveis +30% |

A jazida do hex se esgota com o uso (reservas). O hex também produz um pouco de comida sozinho (subsistência), mesmo sem construção.

## Melhorias (multiplicam uma extratora no mesmo hex)

| Construção | Melhora | Efeito por nível | Trabalhadores/nível | Exige |
|---|---|---|---|---|
| Irrigação | Fazenda | +50% | 10 | Irrigação (Clássica) |
| Estábulo | Pasto | +40% | 8 | Domesticação (Tribal) |
| Trilhas de transporte | Serraria | +30% | 8 | Estradas (Clássica) |
| Galerias escoradas | Mina | +50% | 15 | Mineração (Tribal) |

## Indústrias (só em hex urbano)

| Construção | Insumos por nível | Produto por nível | Trabalhadores/nível | Exige | Bônus de tecnologia |
|---|---|---|---|---|---|
| Fundição de bronze | 2 Cobre + 1 Estanho | 2 Bronze | 40 | Metalurgia do bronze (Tribal) | Eletricidade +30%; Produção em massa +30%; Automação +50% |
| Tecelagem | 2 Fibras | 2 Tecidos | 30 | Tecelagem (Tribal) | Eletricidade +30%; Produção em massa +30%; Automação +50% |
| Ferraria | 1 Ferro + 1 Madeira | 2 Ferramentas | 35 | Trabalho do ferro (Clássica) | Eletricidade +30%; Produção em massa +30%; Automação +50% |
| Armeiro | 1 Bronze + 1 Madeira | 1 Armas | 35 | Armas de bronze (Clássica) | Eletricidade +30%; Produção em massa +30%; Automação +50% |
| Oficina de papel | 2 Madeira | 2 Papel | 25 | Escrita (Clássica) | — |
| Centro administrativo | 1 Papel | 2 pontos administrativos | 30 | Escrita (Clássica) | — |
| Siderúrgica | 1 Ferro + 1 Carvão mineral | 4 Ferramentas | 60 | Máquina a vapor (Revoluções) | Eletricidade +30%; Produção em massa +30%; Energia nuclear +40%; Automação +50% |
| Fábrica têxtil | 2 Fibras | 5 Tecidos | 50 | Máquina a vapor (Revoluções) | Eletricidade +30%; Produção em massa +30%; Automação +50% |
| Arsenal | 1 Ferro + 1 Carvão mineral | 3 Armas | 60 | Metralhadora (Industrialização) | Eletricidade +30%; Produção em massa +30%; Automação +50% |

As indústrias rodam nesta ordem a cada semana, por isso o Bronze fica pronto antes do Armeiro usar.

## Infraestrutura da cidade

| Obra | Custo | Limite | Efeito |
|---|---|---|---|
| Porto | 120 × nível | Só em cidade no litoral ou em rio navegável. Nível máximo = 1 + era/2 (até 5) | +25% do que a cidade troca por nível. Liga a cidade ao resto do país (não fica isolada). Base para navios. |
| Estrada | 80 × nível | Nível máximo = era + 1 (até 5) | +10% no comércio por terra e +5% de controle máximo na região, por nível |
| Centro urbano | 150 × tamanho atual da cidade | Hex de terra do país encostado num centro urbano da cidade. Cidade até 37 hexes (raio 3) | Aumenta o teto de população (2.500 contra 600 de um hex rural, crescendo 25% por era). Permite indústria. |

## Expansão

| Obra | Custo | Efeito |
|---|---|---|
| Cidade (fundada por colonos) | 60 × multiplicador da distância × desconto do tipo de reivindicação. Treinar os colonos custa 200 e 20 pessoas da capital | Cria a cidade e reivindica o território em volta. Conta na capacidade de expansão: 1 + era + cidades/4, a cada 2 anos. |
| Posto avançado (colonos viram acampamento) | 30 | Reivindica o hex, espalha influência num raio de 2 e vira âncora: fundar perto dele fica mais barato. Serve de depósito de suprimento para o exército. Some se o hex for tomado. |

**Multiplicador da distância:** conta o caminho pelo terreno até a cidade ou o posto mais perto.

| Distância | Multiplicador |
|---|---|
| 1 a 3 | ×1 |
| 4 a 6 | ×1,25 |
| 7 a 10 | ×1,75 |
| 11 a 15 | ×2,5 |
| 16 ou mais | ×3,5 |

**Desconto do tipo de reivindicação:**

| Tipo | Multiplicador |
|---|---|
| Continuidade | ×0,8 |
| Recursos | ×0,85 |
| Estratégico | ×0,85 |
| Proximidade e Assentamento distante | sem desconto |

## Ainda não existem (no roadmap)

- **Ferrovias:** o roadmap prevê.
- **Depósitos militares:** construídos à parte. Hoje o depósito é a cidade (sua ou ocupada) ou o posto avançado.
- **Fortalezas e muralhas.**
- **Prédios culturais e religiosos:** templos, escolas, universidades. Hoje a alfabetização vem só das tecnologias.
- **Indústrias de era tardia:** química, eletrônicos, automóveis.

## Obras por etapas (construction.ts)

Construir não é mais instantâneo. Cada nível vira uma **obra** na fila do país:

- **Pontos de construção (PC):** cada obra precisa de PC = trabalhadores da construção × 0,5 (Fazenda 10, Mina 15, Fundição de bronze 20).
- **Capacidade semanal:** 2 PC da comunidade + 1 por cidade + o que os **Setores de construção** fazem.
  - O Setor de construção é uma indústria urbana de 30 trabalhadores.
  - Compra os materiais do método da era no mercado da cidade e gera PC. Sem material, gera menos.

| Método | Desde a era | Materiais por nível | PC por nível |
|---|---|---|---|
| Construção rudimentar | Tribal | 1 Madeira + 1 Pedra | 3 |
| Alvenaria | Clássica | 1 Madeira + 1 Pedra + 0,5 Argila + 0,5 Ferramentas | 5 |
| Alvenaria especializada | Medieval | 1 Madeira + 1,5 Pedra + 0,5 Ferramentas + 0,5 Ferro | 7 |
| Estruturas de ferro | Revoluções | 1 Madeira + 1 Ferro + 1 Ferramentas + 0,5 Carvão mineral | 10 |
| Construção industrial | Industrialização | 2 Ferro + 1 Ferramentas + 1 Carvão mineral | 14 |

- **Duas filas:**
  - Pública: paga pelo tesouro.
  - Privada: paga pelo fundo de investimento. Sem dinheiro no fundo, a obra privada espera.
  - A lei de Economia diz quanto da capacidade vai para a privada: Subsistência 0%, Tradicionalismo 20%, Mercantilismo 35%, Livre comércio 60%. O que uma fila não usa vai para a outra.
- **Limite por obra:** cada obra recebe no máximo 4 × (1 + era/2) PC por semana, então obra grande leva tempo.
- **Pagamento:** o dinheiro (100 × nível, como antes) sai junto com o progresso. Na fila pública, o que faltar no tesouro vira dívida.
- **Limite físico do hex:** as vagas de todas as construções de um hex cabem em 2 × metade do teto de população dele.
- **Construção em massa:** no menu Construções, escolha a construção, a cidade (ou todas), os níveis por hex e a fila. O painel mostra os hexes elegíveis, o custo, os PC e a previsão, e põe tudo na fila de uma vez.
- **Gerenciar a fila:** obras podem ser pausadas ou canceladas. O que já foi pago numa obra cancelada fica gasto.
