# Basico do jogo:
Esse jogo visa simular a admnistração de nações e o mundo.
O jogo deve ser jogado por 2 ou mais jogadores(sem considerar o mestre).
O mestre será responsável por admnistrar combates, simular npcs e suas interações com os jogadores.

Para jogar deve ser necessário uma mesa contendo o mapa divido em provincias que contenham alguma marcação(numero ou ID),
podendo ser digital ou físico.
Também é necessário provincias no mar para o deslocamento de marinha.

O jogo começa na era medieval e os jogadores recebem um feudo pequeno para controlar.
O jogo é baseado em turnos e cada turno é uma semana em jogo.

É necessario tambem um aplicativo de celular para a admnistração do pais. Disponível em: ##########

É importante saber que jogadores podem fazer ações que não estejam no aplicativo, dependendo da ação pode causar algum efeito
positivo ou negativo na visão do mestre.

---------------------- POPULAÇÃO ---------------------------
# População:
A população é o que vai movimentar seu país o jogo inteiro.
A população é dividida em dois grupos:
População ativa e População Dependente.

*População ativa* é aquela que pode trabalhar.

*População Dependente* é aquela que não pode ou não consegue trabalhar(Apesar de existir leis que faça com que essa parte menor
da população trabalhe).

População pode ser resumida a um POP. O que difere um POP de outro é:
Tipo de População, Religião, Raça, Provincia, Estado, Classe Social, Nível de Lealdade e Qualidade de Vida.

# As classes sociais são:
Classe Baixa, Classe Media e Classe Alta.

Cada tipo de POP tem:
- *Salário*: multiplicador sobre o salário base da construção onde trabalha.
- *Peso político*: quanto cada pessoa desse tipo pesa no Poder Político do grupo que apoia (ver docs/politica.md).
- *Dependentes*: fração de População Dependente que esse POP sustenta (0 = todos trabalham).
- *Investimento*: parte da renda que vai para o fundo de investimento do país (construção de prédios privados).
- *Era*: primeira era em que o tipo aparece. Tipos de eras antigas podem sumir por lei ou tecnologia.

*Classe Baixa*: trabalha na maior parte das construções.

| POP | Salário | Peso político | Dependentes | Investimento | Especial | Era |
|---|---|---|---|---|---|---|
| Escravos | 0 | 0 | 0 | 0% | Não mudam de profissão nem migram. Necessidades pagas pelo dono. Só existem com lei de escravidão | Tribal |
| Caçadores-coletores *(novo)* | 0 | 0.2 | 0.25 | 0% | Vivem sem dinheiro: produzem e consomem no próprio hex. Viram Camponeses quando o país adota agricultura | Tribal |
| Camponeses / Servos | 0.2 | 0.2 | 0.25 | 0% | Agricultura de subsistência; consomem quase nada do mercado. Nunca ficam desempregados (viram Trabalhadores) | Tribal |
| Trabalhadores | 1 | 1 | 0.5 | 0% | Tipo padrão; podem ser contratados sem qualificação | Antiga |
| Fazendeiros | 2 | 1 | 0.5 | 10% | Donos de pequenas terras | Antiga |
| Marinheiros | 1.5 | 1 | 0.5 | 0% | Tripulam portos e navios; saem do manpower naval | Antiga |
| Soldados | 1.5 | 1.5 | 0.5 | 0% | Saem do manpower; contratados sem qualificação | Tribal |
| Operários especializados | 1.5 | 1.5 | 0.5 | 10% | Exigidos por indústrias | Industrial |

*Classe Media*: trabalha em menos vagas; quando uma construção tem 100% dessas vagas preenchidas, ela ganha bônus.

| POP | Salário | Peso político | Dependentes | Investimento | Especial | Era |
|---|---|---|---|---|---|---|
| Escriturários | 1.5 | 1.5 | 0.5 | 0% | +25% acesso à educação | Antiga |
| Comerciantes *(novo, ex-lojistas)* | 3 | 3 | 0.5 | 20% | Rodam comércio e rotas; base do grupo Mercadores/Pequena Burguesia | Antiga |
| Clérigos | 3 | 3 | 0.5 | 20% | +50% acesso à educação; espalham a religião do Estado | Tribal (como xamãs) |
| Acadêmicos | 4 | 4 | 0.5 | 0% | +50% acesso à educação; aceleram pesquisa | Antiga |
| Engenheiros | 3 | 3 | 0.5 | 15% | +25% acesso à educação; exigidos por indústrias avançadas | Industrial |
| Oficiais | 5 | 5 | 0.5 | 0% | Comandam exércitos; poder político extra (×3) | Antiga |
| Burocratas *(movido da Classe Alta)* | 4 | 4 | 0.5 | 15% | +50% acesso à educação; geram capacidade administrativa e coletam impostos | Antiga |

*Classe Alta*: trabalha em poucas vagas; como donos, dão um bônus ou penalidade a mais à construção.

| POP | Salário | Peso político | Dependentes | Investimento | Especial | Era |
|---|---|---|---|---|---|---|
| Chefes e anciãos *(novo)* | — | 5 | 0 | 0% | Elite tribal; viram Aristocratas quando surge o Estado | Tribal |
| Aristocratas | — | 5 | 0.2 | 20% | Donos de terras; só recebem salário em construções do governo | Antiga |
| Capitalistas | — | 5 | 0 | 30% | Donos de indústrias e empresas; só recebem salário em construções do governo | Industrial |

Mudanças em relação à versão anterior:
- "Militares" virou *Soldados*; *Oficiais* continuam na Classe Média.
- *Burocratas* foram para a Classe Média: eles trabalham como funcionários e não são donos de nada.
- Novos tipos para a era tribal (*Caçadores-coletores*, *Chefes e anciãos*) e para o comércio (*Comerciantes*).
- Servos foram fundidos com *Camponeses*: em vez de "não consomem nada", consomem muito pouco do mercado, porque vivem de subsistência.

Cada classe vai pagar uma quantidade de impostos, baseado no que a tecnologia permite.

*Religião*:
No começo do jogo nenhuma civilização possui uma religião e vai mestre criar uma ao iniciar ou do jogador criar durante o jogo.
Cada religião garante bônus e debuffs baseado em suas crenças.

*Qualidade de Vida*:
É aquilo que define o quão bem a sua população vive.
Varia de 1-50.
Sendo 1 Pessima qualidade de vida, e 50 otima qualidade de vida.
Isso é definido baseado nas leis de aceitação de grupos, religião, renda e raça.

Nível de Lealdade é o quanto sua população se mantem fiel ao estado.
Isso é calculado baseado a Qualidade de vida, capacidade de compra em relação ao salario.

*Crescimento Populacional*:
É calculada usando as metricas pasadas.
Como cada turno é equivalente a uma semana o crescimento populacional é bem pequeno.

*Imigração*:
Dependendo de algumas metricas acima alguns pops(principalmente de classe baixa) podem acabar imigrando para outras regiões do mundo que
sejam boas.

----------------------------- Arvore Tecnologica -----------------------------

A arvore de tecnologia possui 4 eras:

Era Medieval -> Era Colonial -> Era das Revoluções -> Era do Imperialismo -> Era das Guerras ->