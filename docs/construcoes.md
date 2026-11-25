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

## Métodos de produção (methods.ts)

Cada edifício tem 5 categorias e usa 1 método em cada. O padrão é "automático": o melhor método já liberado.

| Categoria | Exemplos |
|---|---|
| Produção-base | Fazenda: subsistência → tradicional → rotação de culturas → intensiva → científica → de precisão |
| Produção secundária | Diversificação (frutas), produção de couro (peles), aproveitamento de resíduos da serraria (papel) |
| Automação | Arado (gado) → arado pesado (cavalos + ferramentas) → tratores (petróleo) → máquinas agrícolas |
| Organização | Comunitária, Familiar, Aristocrática, Companhia comercial, Empresarial, Cooperativa, Estatal |
| Manutenção | Rudimentar → regular → especializada → industrial → automatizada |

- **Efeitos de um método:** bônus de produção, multiplicador de trabalhadores, multiplicador de manutenção, insumos extras por nível e produtos extras.
- **Insumos:** o bônus e os subprodutos só saem na proporção dos insumos que o mercado da cidade tiver. Sem gado, o arado não rende mais nada.
- **Teto:** os bônus dos métodos se somam até +200%. Os bônus de tecnologia continuam à parte.
- **Comparação:** na ficha do edifício (botão "Ficha" no painel do hex), cada método mostra o efeito e o automático aparece entre parênteses.
- **Aplicar em massa:** "Em todos" aplica a escolha a todos os edifícios do mesmo tipo no país.

## Finanças e propriedade de cada edifício (firms.ts)

Cada edifício (tipo + hex) tem uma conta semanal:

**lucro = receita − insumos − salários − manutenção − impostos**

- **Receita:** o que ele produziu de verdade × o preço do mercado da cidade.
- **Insumos:** o que ele comprou de verdade.
- **Salários:** a parte do trabalho no valor agregado, 70%, a mesma divisão da renda das POPs.
- **Impostos:** a taxa do país sobre o lucro.

Destino do lucro:

- **Reserva:** a meta é 6 semanas de custos. Passando da meta, o que sobra é distribuído.
- **Organização Estatal:**
  - O lucro vai ao tesouro e sai da renda dos donos.
  - O Estado cobre o prejuízo.
- **Outras organizações:**
  - A organização diz quanto vira dividendo; por exemplo, a Comunitária distribui 20%.
  - A parte privada reinveste no fundo de investimento.
  - Os donos põem no fundo a fração da lei de Economia: 0%, 15%, 30% ou 50%.
- **Prejuízo:** gasta a reserva e depois vira dívida. Dívida acima de 26 semanas de receita é insolvência, e um nível fecha (os privados primeiro).

Propriedade:

- **Origem:** níveis feitos pela fila privada são privados; os da fila pública são estatais ou comunitários.
- **Privatizar:** o fundo de investimento paga 60% do valor ao tesouro.
- **Nacionalizar:** o tesouro indeniza 100% do valor e assume a dívida proporcional. A legitimidade cai 0,01 por nível.

## Leis econômicas e investidores (politics.ts, ai.ts)

**Economia:** a lei diz quanto da capacidade de construção vai para a fila privada, quanto dos dividendos os donos põem no fundo e, em alguns modelos, a organização automática.

| Modelo | Era | Fila privada | Fundo | Organização automática |
|---|---|---|---|---|
| Subsistência | Tribal | 0% | 0% | — |
| Tradicionalismo | Clássica | 20% | 15% | — |
| Agrarismo | Medieval | 25% | 20% | — |
| Mercantilismo | Descobertas | 35% | 30% | — |
| Livre comércio | Revoluções | 60% | 50% | — |
| Intervencionismo | Revoluções | 40% | 35% | — |
| Economia cooperativa | Industrialização | 45% | 30% | Cooperativa |
| Economia planejada | Grandes Guerras | 0% (sem investidores) | 0% | Estatal |
| Economia mista | Multipolar | 50% | 40% | — |

**Investimento:** diz onde os investidores privados podem construir.

| Lei | Regra |
|---|---|
| Costume | Sem regra. |
| Restrito | Só extração e lavoura; indústria é do Estado. |
| Orientado | Só onde falta mercadoria (preço local acima de 110%). |
| Livre | Onde quiserem. |

**Como o investidor da IA escolhe:**
- Prefere onde o produto está caro, onde há gente para trabalhar e onde os edifícios do mesmo tipo dão lucro no país (margem real, lucro ÷ receita).
- Só põe obra na fila se o fundo cobre o que já deve mais a obra nova.

**Gráficos novos** (aba Gráficos): capacidade de construção, construção usada, fundo de investimento, contribuições ao fundo, lucro dos edifícios e insolvências.

## Etapa 5: matérias-primas, bens e edifícios novos

**Matérias-primas novas:**

| Recurso | Construção que extrai | Onde aparece |
|---|---|---|
| Areia de quartzo | Mina | Desertos |
| Salitre | Mina | Desertos e estepes |
| Bauxita | Mina | Selvas, savanas e colinas |
| Terras raras | Mina | Colinas e montanhas |
| Lítio | Mina | Desertos e montanhas |
| Urânio | Mina | Montanhas e tundras |
| Plantas medicinais | Fazenda | Selvas e savanas |

**Bens novos:** cerâmica, couro, bebidas, vidro, bens de luxo, produtos alimentícios, pólvora, máquinas, materiais impressos, aço, cimento, química básica, fertilizantes, medicamentos, combustível, energia elétrica, alumínio, plásticos, eletrônicos, baterias, equipamentos de energia e equipamentos de telecomunicações.

- **Consumo das casas:** cerâmica, couro, bebidas, bens de luxo, alimentos processados, impressos, medicamentos, combustível, energia elétrica, eletrônicos, plásticos e telecomunicações.
- **Só insumo:** aço, cimento, máquinas, química básica e os demais.
- **Energia elétrica:** é uma mercadoria como as outras. É produzida por usinas, vendida no mercado da cidade e consumida pelas casas e pela fundição de alumínio.

**Edifícios novos:** todos são indústrias urbanas. Estão na ordem em que rodam: quem fabrica um insumo vem antes de quem o usa.

| Construção | Insumos por nível | Produto por nível | Trabalhadores | PC | Exige |
|---|---|---|---|---|---|
| Olaria | 2 Argila | 2 Cerâmica | 20 | 10 | — |
| Oficina de ferramentas | 1 Madeira + 1 Pedra | 1 Ferramentas | 25 | 13 | — |
| Curtume | 2 Peles | 2 Couro | 20 | 10 | Domesticação (Tribal) |
| Oficina de bebidas | 2 Grãos + 1 Frutas e vegetais | 3 Bebidas | 20 | 10 | Agricultura (Tribal) |
| Oficina de vidro | 2 Areia de quartzo + 1 Madeira | 2 Vidro | 30 | 15 | Trabalho do ferro (Clássica) |
| Oficina de joias | 0.5 Ouro + 0.5 Prata + 0.5 Pedras preciosas | 1 Bens de luxo | 15 | 8 | Metalurgia do bronze (Tribal) |
| Oficina de pergaminho | 2 Peles | 2 Papel | 20 | 10 | Escrita (Clássica) |
| Moinho | 3 Grãos | 3 Produtos alimentícios | 20 | 10 | Moinhos (Medieval) |
| Manufatura de tecidos | 3 Fibras | 4 Tecidos | 40 | 20 | Moinhos (Medieval) |
| Fábrica de pólvora | 1 Enxofre + 1 Salitre + 1 Madeira | 2 Pólvora | 35 | 18 | Pólvora (Descobertas) |
| Tipografia | 2 Papel | 2 Materiais impressos | 25 | 13 | Imprensa (Renascença) |
| Aciaria | 2 Ferro + 1 Carvão mineral | 2 Aço | 50 | 25 | Máquina a vapor (Revoluções) |
| Oficina de máquinas simples | 1 Ferro + 1 Ferramentas | 1 Máquinas | 40 | 20 | Imprensa (Renascença) |
| Fábrica de máquinas | 2 Aço + 1 Ferramentas | 3 Máquinas | 70 | 35 | Máquina a vapor (Revoluções) |
| Fábrica de cimento | 2 Pedra + 1 Argila + 0.5 Carvão mineral | 3 Cimento | 40 | 20 | Química industrial (Industrialização) |
| Usina termelétrica | 2 Carvão mineral | 6 Energia elétrica | 40 | 20 | Eletricidade (Industrialização) |
| Usina nuclear | 0.2 Urânio | 20 Energia elétrica | 80 | 40 | Energia nuclear (Multipolar) |
| Fábrica química | 1 Enxofre + 1 Sal | 2 Química básica | 60 | 30 | Química industrial (Industrialização) |
| Fábrica de fertilizantes | 1 Química básica + 1 Salitre | 3 Fertilizantes | 50 | 25 | Química industrial (Industrialização) |
| Fábrica de medicamentos | 2 Plantas medicinais + 1 Química básica | 2 Medicamentos | 50 | 25 | Medicina moderna (Industrialização) |
| Refinaria | 2 Petróleo | 3 Combustível | 60 | 30 | Química industrial (Industrialização) |
| Fundição de alumínio | 2 Bauxita + 3 Energia elétrica | 1 Alumínio | 60 | 30 | Eletricidade (Industrialização) |
| Fábrica de plásticos | 1 Petróleo + 1 Química básica | 2 Plásticos | 60 | 30 | Produção em massa (Grandes Guerras) |
| Fábrica de eletrônicos | 2 Areia de quartzo + 0.5 Terras raras + 0.5 Plásticos | 1 Eletrônicos | 80 | 40 | Rádio (Grandes Guerras) |
| Fábrica de baterias | 1 Lítio + 0.5 Química básica + 0.2 Alumínio | 1 Baterias | 70 | 35 | Computadores (Multipolar) |
| Fábrica de equipamentos de energia | 1 Areia de quartzo + 1 Aço + 0.3 Terras raras | 1 Equipamentos de energia | 80 | 40 | Energias renováveis (Moderna) |
| Fábrica de telecomunicações | 1 Vidro + 0.5 Eletrônicos | 1 Equipamentos de telecomunicações | 70 | 35 | Computadores (Multipolar) |

**Não criados, porque já existem:**
- A Oficina de armas seria o Armeiro.
- A Salina seria a Mina de sal.
- A Fundição de ferro seria a Ferraria.
- Estaleiro, doca e arsenal naval entram na construção naval, na Etapa 6.

**Métodos de construção novos:**

| Método | Era | Materiais | PC por nível |
|---|---|---|---|
| Alvenaria com vidro | Renascença | inclui vidro | 8 |
| Estruturas de ferro | Revoluções | inclui aço e máquinas | 10 |
| Construção industrial | Industrialização | aço, máquinas, vidro, cimento e combustível | 14 |
| Concreto armado | Grandes Guerras | — | 18 |
| Construção modular | Multipolar | inclui alumínio | 22 |
| Construção automatizada | Moderna | inclui eletrônicos | 26 |

- **Escolha do método:** o setor usa o método mais avançado cujos materiais o país produziu na semana anterior. Assim a construção não trava quando falta cimento ou aço.
- **Indústrias novas:** ganham métodos genéricos de artesanal a automatizada.
- **Saves:** o formato subiu para a versão 6 (lista de bens nova), e saves antigos não abrem mais.

## Etapa 6: construção naval (naval.ts)

Navios não aparecem mais na hora. Eles saem de uma **fila naval** própria, separada das obras, e andam com **pontos navais (PN)** feitos pelos estaleiros da cidade.

| Estaleiro | Tecnologia | Materiais por nível | PN por nível | Navios |
|---|---|---|---|---|
| Doca | Galés | 2 Madeira + 0,5 Tecidos | 3 | Galés |
| Estaleiro | Navegação | 2 Madeira + 1 Tecidos + 0,5 Ferro + 0,5 Ferramentas | 6 | Caravelas, Navios de linha |
| Arsenal naval | Eletricidade | 2 Aço + 0,5 Máquinas + 0,5 Combustível | 12 | Couraçados, Submarinos, Porta-aviões |

- **Onde:** estaleiro só em hex de cidade colado no mar. Ele é uma indústria urbana: compra os materiais no mercado e, sem material, faz menos PN.
- **Custo:** um navio custa 25 PN × o custo relativo dele (Galés 25, Porta-aviões 100). O dinheiro sai aos poucos.
- **Tripulação:** os marinheiros saem do manpower quando o navio fica pronto. Sem gente, ele espera no cais.
- **IA:** constrói uma doca na cidade do porto e depois encomenda o melhor navio que o estaleiro dela faz.

**Ajustes de equilíbrio:**
- A IA só investe em indústria com margem de pelo menos 15% nos preços locais (produto acima dos insumos) e com os insumos presentes no mercado.
- Melhorias (Estábulo, Irrigação…) não têm conta de caixa própria, porque o ganho delas já entra na receita da extratora.

## Etapa 7: economia de guerra (wareconomy.ts)

| | Paz | Guerra | Guerra total (só em guerra) |
|---|---|---|---|
| Indústria militar (armeiro, arsenal, pólvora, aciaria, estaleiros) | — | +25% e subsídio de 10% da receita | +50% e subsídio de 20% |
| Indústria de bens civis (olaria, curtume, bebidas, joias, tipografia, plásticos, eletrônicos, telecom, moinho) | — | — | −30% |
| Exportação de bens estratégicos (armas, pólvora, ferro, aço, carvão, combustível, petróleo, enxofre, salitre, máquinas, cavalos) | livre | proibida | proibida |
| Fila privada de construção | normal | metade da capacidade | parada (o Estado requisita) |
| Lucro livre das empresas | donos e fundo | donos e fundo | requisitado pelo tesouro |
| Preço dos bens estratégicos | mercado | mercado | tabelado (no máximo o preço normal) |
| Legitimidade por semana | — | −0,0005 | −0,002 |

- **Sem guerra declarada:** manter a economia mobilizada custa o dobro de legitimidade. A guerra total cai sozinha para economia de guerra quando a guerra acaba.
- **Conversão industrial:** a fábrica usa os mesmos insumos e entrega outro produto.

| Fábrica | Produto convertido |
|---|---|
| Fábrica de máquinas | 2 Armas |
| Oficina de máquinas simples | 1 Armas |
| Fábrica química | 2 Pólvora |
| Fábrica têxtil | 4 Tecidos + 0,5 Armas |
| Fábrica de plásticos | 1 Armas |

- **IA:** mobiliza quando entra em guerra e passa à guerra total se o inimigo tem 1,5× o PIB dela. Desmobiliza na paz.
- **Gráficos novos:** economia de guerra, subsídio militar, produção militar e produção civil.
