# Ideias: tirar a era tribal do marasmo

## Diagnóstico (código atual)

1. **Não existe crescimento natural da população.**
   - A população de um hex só muda quando a gente migra entre hexes e países, morre de fome, de peste ou na guerra, vira colono, ou um evento mexe nela.
   - Sem nascimentos, o país só "cresce" tomando terra de outros. Esse é o motivo principal da sensação de jogo parado.
2. **A pesquisa tribal é lenta de propósito.**
   - A era tribal dura de 600 a.C. a 400 a.C. e tem só 5 tecnologias.
   - Cada uma custa milhares de pontos, e a tribo faz uns 3 por semana. A primeira tecnologia leva cerca de 23 anos.
   - Não há nada para fazer entre uma descoberta e outra.
3. **Construir rende pouco no começo.**
   - Os hexes rurais têm poucas pessoas (às vezes menos de 10).
   - A ocupação das construções fica baixa e a produção quase não aparece.
4. **Pouca decisão por ano.**
   - Na era tribal, o jogador fundou a cidade, pôs uma obra na fila e espera.

## Ideias para a população crescer

1. **Crescimento natural por comida.**
   - **Regra:** todo mês, cada hex cresce `taxa × (comida disponível / comida consumida − 1)`, limitado ao teto do hex (`popCap`).
   - **Valores:** taxa tribal de uns 0,3% ao ano com comida sobrando, até 1% ao ano com comida farta. Sem comida, a população encolhe (fome já existe em events.ts).
   - **Efeito:** fazenda, pasto e caça passam a ter um motivo claro, que é mais gente. Pesquisar Agricultura vira prioridade.
2. **Teto pela terra.**
   - O teto de população (já existe: 600 × fertilidade no rural) vira a meta do crescimento.
   - Rio, irrigação e moinho sobem o teto. Fazendas sobem o teto do hex em +X por nível.
3. **Cidade puxa gente e cresce mais rápido.**
   - A migração campo → cidade já existe.
   - Somar a ela um bônus de natalidade no hex urbano enquanto houver comida no mercado da cidade.
4. **Saúde e moradia:**
   - "Ervas medicinais" (Plantas medicinais): menos mortalidade.
   - "Poços" (construção nova, barata): +teto em hex sem rio.
5. **Fundar cidade dá gente.**
   - A cidade nova recebe +50 pessoas da tribo em vez de só tirar 20 da capital.
   - Assim, expandir não esvazia o país.
6. **Eventos tribais de crescimento:**
   - "Boa colheita": +2% de gente.
   - "Casamentos entre clãs": +1% e relação com o vizinho.
   - "Migração de nômades": +100 pessoas num hex de fronteira.
7. **Absorver tribos vizinhas sem guerra:**
   - Diplomacia tribal com "Unir clãs" (o súdito tribal vira parte do país depois de X anos de relação alta).
   - Mais gente e mais território sem conquista.

## Ideias para a pesquisa e o ritmo

1. **Mais tecnologias tribais, mais baratas cada uma** (veja docs/tecnologias.md).
   - O custo por era continua o mesmo, porque ele é dividido entre todas as tecnologias da era.
   - Com 14 em vez de 5, cada descoberta sai em uns 6 a 24 anos (hoje 20 a 68), e há mais escolhas ao mesmo tempo.
2. **Inspiração ("eureca")** como no Civilization VI.
   - Fazer a coisa ligada à tecnologia dá 30% dela de graça. Exemplos: ter 3 pastos → Domesticação; encostar num rio → Irrigação; fundar 2 cidades → Escrita.
3. **Contato acelera.** A difusão já existe; aumentar o bônus por vizinho na era tribal.
4. **Tradições** (pontos de cultura tribal) como segunda moeda.
   - Escolher entre "Caçadores", "Pastores", "Agricultores" e "Guerreiros".
   - Cada uma dá bônus pequeno e decide o caminho da tribo.

## Ideias para ter o que fazer

1. **Tarefas tribais curtas** de 1 a 3 anos, com recompensa: explorar 30 hexes, juntar 500 de comida, fazer contato com 2 tribos.
2. **Caça a grandes animais:** o exército tribal caça num hex de floresta e traz comida e peles, com risco de baixas.
3. **Festivais:** gastar comida para subir lealdade e legitimidade.
4. **Saques entre tribos:** guerra curta que rouba comida e gente sem tomar terra.
5. **Velocidade da era tribal:**
   - Hoje 1 semana leva 0,1 s na velocidade máxima.
   - Dobrar a velocidade padrão na era tribal (ou começar em 3×) encurta a espera sem mudar o equilíbrio.

## Ordem sugerida

1. Crescimento natural por comida (o maior efeito).
2. Mais tecnologias tribais e inspiração.
3. Tarefas e eventos tribais.
4. Velocidade padrão maior na era tribal.
