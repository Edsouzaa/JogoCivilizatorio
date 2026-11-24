# Política: leis e grupos políticos

Inspirado no Victoria 3: o país é governado por leis, e as leis só mudam com o apoio de grupos políticos.

## Grupos políticos

Cada POP apoia um ou mais grupos conforme o tipo, a religião, a cultura e a qualidade de vida dele.
Cada grupo tem dois números:

- **Poder Político**: força dentro do sistema. Vem dos POPs que o apoiam, ponderados pelo *peso político* de cada tipo de POP (docs/game-desing.md), pela riqueza deles e pelas leis (ex.: voto censitário dá mais peso aos ricos). É o que conta para aprovar leis e formar governo.
- **Poder Popular**: apoio na população. É a fração de pessoas que apoia o grupo, sem peso por classe. Não aprova leis, mas dá **legitimidade**.

**Legitimidade do governo** = Poder Político dos grupos no governo + Poder Popular deles.
Um governo com muito Poder Político e pouco Poder Popular pode governar, mas sofre com instabilidade, revoltas e mais custo para aprovar leis.

**Partido único:** a lei de partido único deixa só um partido no governo e zera o Poder Político de quem está fora dele.
O Poder Popular, porém, não some. Um grupo fora do partido pode ter **mais legitimidade popular que o próprio partido**.
Quando isso acontece, o governo perde legitimidade a cada mês, o grupo excluído radicaliza e pode exigir entrar no governo, gerar movimentos de reforma, golpe ou revolução.

### Grupos

| Grupo | Quem apoia | Quer | Era |
|---|---|---|---|
| Anciãos e Clãs *(novo)* | Chefes e anciãos, caçadores-coletores | Tradição, chefia tribal, terras comunais | Tribal |
| Forças Armadas | Oficiais, soldados | Exército forte, recrutamento, gasto militar | Tribal |
| Devotos | Clérigos, camponeses religiosos | Religião do Estado, moral religiosa | Tribal |
| Latifundiários | Aristocratas | Servidão, monarquia, impostos sobre terra baixos | Antiga |
| Povo do Campo | Camponeses, fazendeiros | Terra para quem trabalha, preços de comida altos | Antiga |
| Mercadores *(novo)* | Comerciantes, marinheiros | Comércio livre, rotas, portos, guildas | Antiga |
| Pequena Burguesia | Comerciantes, escriturários, burocratas | Ordem, tradição, proteção do pequeno negócio | Medieval |
| Intelectuais | Acadêmicos, engenheiros | Educação, ciência, liberdades | Antiga |
| Industriais | Capitalistas, engenheiros | Livre mercado, pouca regulação, indústria | Industrial |
| Sindicatos | Operários, trabalhadores | Direitos trabalhistas, salário, estado social | Industrial |
| Ambientalistas *(novo)* | Acadêmicos, classe média urbana | Proteção ambiental, energia limpa | Contemporânea |
| Sem alinhamento | Quem não apoia ninguém | — | Todas |

Grupos aparecem na era indicada e podem se fundir ou sumir; por exemplo, Anciãos e Clãs tendem a virar Latifundiários quando surge o Estado.

## Leis

Leis são agrupadas por categoria; cada país tem exatamente uma lei ativa por categoria.
Mudar uma lei leva tempo (meses), precisa de apoio de grupos com Poder Político suficiente e pode ser bloqueada.
Cada grupo aprova, rejeita ou é neutro sobre cada lei; leis aprovadas contra um grupo poderoso o radicalizam.
Algumas leis só ficam disponíveis com certas tecnologias ou eras.

| Categoria | Exemplos (do mais antigo ao mais moderno) |
|---|---|
| Governo | Chefia tribal, Monarquia, Teocracia, República aristocrática, República, Partido único |
| Eleições / Distribuição de poder | Conselho de anciãos, Nobreza, Voto censitário, Voto universal, Sem eleições |
| Economia | Subsistência (sem dinheiro), Tradicionalismo, Mercantilismo, Livre comércio, Intervencionismo, Economia planejada |
| Trabalho | Escravidão, Servidão, Trabalho livre, Proteções trabalhistas |
| Impostos | Tributo em espécie, Dízimo, Imposto por cabeça, Imposto proporcional, Imposto progressivo |
| Religião | Religião do Estado, Liberdade religiosa, Laicidade, Ateísmo de Estado |
| Cidadania e cultura | Cultura exclusiva, Assimilação forçada, Tolerância cultural, Multiculturalismo (afeta a assimilação) |
| Exército | Milícia tribal, Levas feudais, Exército profissional, Recrutamento obrigatório (muda o manpower) |
| Educação | Nenhuma, Escolas religiosas, Educação pública |
| Saúde e bem-estar | Nenhum, Caridade, Saúde pública, Estado de bem-estar |
| Imprensa / liberdades | Censura total, Censura parcial, Imprensa livre |

As leis ligam os sistemas: Economia controla preços e comércio, Trabalho controla quais POPs existem, Exército controla o manpower, Cidadania controla a assimilação de culturas.

## Estados

Mais para frente, o jogador poderá dividir o território em **estados**, como os do Brasil ou dos Estados Unidos.

- **Quem demarca:** o próprio jogador desenha as fronteiras dos estados, juntando hexágonos e cidades.
- **Quando não pode mudar:** em crise ou guerra, as fronteiras dos estados ficam travadas.
- **O que um estado faz depende das leis:**
  - Lei *centralizada*: o estado é só uma divisão administrativa e melhora a administração (menos custo de burocracia, impostos coletados melhor).
  - Lei *federativa*: cada estado pode ter **leis próprias** (como nos Estados Unidos), dentro do que a lei federal permite.
- **Interesses:** cada estado, assim como os grupos políticos, tem interesses (por exemplo, um estado agrícola quer comida cara e um estado industrial quer insumos baratos). Estados insatisfeitos perdem lealdade e podem pressionar por autonomia ou separação.
