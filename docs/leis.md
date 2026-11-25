# Leis (src/politics.ts)

Cada categoria tem uma lei ativa e várias opções.

**Pré-requisitos de uma opção:**
- **Era mínima:** a partir de quando a lei é historicamente possível. A lei não é adotada sozinha.
- **Tecnologia:** algumas pedem uma das 113 tecnologias que já existem. Nenhuma tecnologia nova foi criada.

**Aprovação** (já existia):
- Uma votação por vez, em três fases.
- O Poder Político trava a votação no parlamento; o apoio popular gera protestos (metade da velocidade) ou revolta (perde legitimidade).
- Cada grupo de interesse gosta ou não gosta de cada lei.

**Efeitos (`fx`):** ligados aos sistemas reais.

| Efeito | Onde age |
|---|---|
| Controle | control.ts |
| Lealdade (agitação) | economy.ts updateLoyalty |
| Crescimento da população | growPopulation |
| Pesquisa | researchWeek |
| Recrutas | manpower |
| Força do exército | war.ts |
| Imigração (−1 fecha as fronteiras) | migrate |

- **Efeitos econômicos** (eficiência tributária, administração, comércio, produtividade) ficam em `eramods.ts ECON_LAW`.
- **Implementação gradual:** o efeito vale por inteiro com controle total e pela metade onde o governo não controla.

| Categoria | Opções (era · tecnologia) |
|---|---|
| Governo | Chefia tribal · Chefia com conselho (Conselho de anciãos) · Monarquia e República (Clássica, Direito escrito) · Teocracia · Monarquia constitucional (Revoluções, Iluminismo) · Partido único |
| Impostos | Tributo em espécie · Dízimo · Imposto por cabeça · Imposto proporcional · Imposto de renda (Industrialização, Economia política) |
| Estados, Economia, Investimento | como antes (docs/construcoes.md) |
| Sucessão | Hereditária · Por conselho · Eletiva · Parlamentar · Eleição popular |
| Administração | Tradicional · Burocracia básica · Patrimonial · Burocracia profissional · Tecnocrática · Digital |
| Justiça | Costumeira · Religiosa · Direito escrito · Direito civil · Independente |
| Trabalho | Familiar · Servil · Assalariado · Regulamentado |
| Educação | Familiar · Religiosa · Privada · Pública · Técnica e superior |
| Saúde | Tradicional · Assistência religiosa · Saúde pública básica · Saúde pública universal |
| Recrutamento | Tribal · Exército permanente · Feudal · Conscrição · Exército profissional |
| Religião | Tradicional · Oficial · Tolerância · Estado secular |
| Imigração | Costume · Fronteiras fechadas · Seletiva · Aberta |

**Ainda falta** (docs/proximos-sistemas.md):
- As demais categorias da especificação: eleições, mandatos, propriedade, monopólios, falência, dívida pública, direitos civis, escravidão, jornada, sindicatos, previdência, cultura, língua, minorias, naturalização, polícia, censura e meio ambiente.
- Os resultados "adiada" e "aprovada com concessões".
