# Roadmap

Fila de implementação a partir da lista grande de pedidos. A ordem segue a dependência entre os sistemas: um sistema que outros usam vem primeiro. Cada item vira um commit próprio.

## Feito

- 10 eras com datas, começo em 600 a.C., ritmo por era e custos de pesquisa (docs/escopo.md).
- 1 tribo a cada 10.000 hexes de terra; algumas tribos demoram mais a sair da era tribal, e o comércio ajuda.
- Movimento inteligente: as tropas andam pelo menor caminho. Se o alvo é inalcançável (mar sem frota), elas vão até o ponto possível mais perto e param.
- Painel de notificações (tecnologia, guerra, paz e avisos) e linha do equador.
- Testes movidos para `tests/`.
- Seleção por caixa (botão esquerdo arrastando), painel das tropas por tipo e ordem para o grupo todo. Arrastar o mapa agora é com o botão direito ou o do meio.
- Bandeira do país (faixas, cruz ou canto + símbolo), desenhada nas unidades. Nome, cor e bandeira editáveis no botão 🏳.
- Nome e bandeira ao fundar cidade e criar estado, e depois no ✏. Bandeira e nome das cidades no mapa.
- Clique numa zona marítima ou num estado: a borda brilha e aparece o nome; o nó da zona fica dourado. Estado mostra pop, PIB, QV (do país) e lealdade.
- Nós marítimos: bolinha no centro de cada zona e ligações pontilhadas (aparecem com zoom). O bloqueio de comércio por frota inimiga já existia.
- Recursos: todo hex de terra tem recurso. Jazidas minerais têm reserva (150–600 anos com 1 nível; pedra e sal 5× mais); ao acabar a mina fecha, o povo perde o emprego e chega aviso. Jazida em cima de lavoura/floresta = 2 produtos, desenhados como meia-fatia no mapa de recursos.

- Cidades não crescem sozinhas: compra-se um hex vizinho como centro urbano (150 × tamanho; a IA compra quando a cidade enche). Teto de população por hex (rural pela fertilidade, urbano 2.500 + 25% por era). Centro urbano tira metade do recurso natural e a indústria rende 25% a mais.

- Controle (estilo EU5): 0–100% por hex; o máximo cai com a distância da sede mais perto (capital ou 1ª cidade de cada estado), com alcance 6 + 3 por era; o atual sobe 4% por mês. Pouco controle: menos imposto, metade da produção pode não chegar ao mercado, menos recrutas. Mapa "5 Controle" e 🏛 no painel.

- Cerco: o centro da cidade só cai com exército parado nele por 4 + 2 × tamanho semanas (2 ou mais divisões: metade). Tomada a cidade, a região toda fica ocupada; retomar o centro liberta a região.

- Fome (comida < 25% do necessário numa cidade com 100+ pessoas; acaba acima de 50%) e peste (por acaso em cidades grandes, pula para cidades do mesmo país, dura 26 semanas). Matam aos poucos, avisam e aparecem no painel. Medicina moderna e Biotecnologia cortam pela metade.

- Propagação de tecnologia: cada vizinho de fronteira ou parceiro comercial que já conhece a tecnologia em pesquisa dá +15% (até +60%). Acordo comercial revela o território do parceiro na névoa.

- Mapas: 6 Clima, 7 Tecnologia (azul = mais tecnologias) e 8 Satisfação (vermelho → verde), com o valor ao passar o mouse.

- Oceano profundo (mar a mais de 4 hexes da terra): sem Navegação, frota e exército embarcado não entram. Aparece ao passar o mouse.

- Nomes gerados por 10 "línguas" (latina, germânica, eslava, árabe, sínica, banto, náuatle, tupi, nórdica, persa), por região do mapa: tribos e cidades nascem com nome. Continentes (terras com 800+ hexes) têm nome no mapa de longe e se renomeiam no ✏.

- Letrados: fração alfabetizada do país, com alvo dado pelas tecnologias de ensino (Escrita, Universidades, Imprensa, Iluminismo...), subindo 1 ponto por ano; pesquisa × (1 + 1,5 × letrados). Aparece na aba Sociedade.

- Painel da guerra (aba Política): mortos em combate, civis perdidos em território ocupado (0,1% por semana), custo de manutenção, duração e apoio do povo. O apoio cai com o tempo (zero em 5 anos) e com os mortos; guerra impopular tira legitimidade.

- Leis em 3 fases (Proposta, Disputa, Aprovação). O Poder Político barra no parlamento (apoio ≤ 0 trava); o Poder Popular barra nas ruas: protestos (apoio < −20%) cortam a velocidade pela metade e revolta (< −40%) na fase de disputa tira legitimidade toda semana. Na troca de fase pode sair um evento (discurso, escândalo, concessões...), avisado nas notificações.

- Pontos administrativos: bem novo Papel (Oficina de papel: madeira → papel) e Centro administrativo (queima papel, gera 2 pontos/nível; empregos de Burocratas e Escriturários), liberados pela Escrita. Estoque com teto 100 × (era + 1). 📜 no painel do país.
- Incentivos por cidade ou estado inteiro, pagos com pontos (criação + manutenção semanal; sem pontos, todos caem): Isenção fiscal (sem imposto, +15% produção), Alívio emergencial (ninguém morre de fome), Integração (+25% controle máximo), Impor ideias (+10% de apoio popular à lei em votação, até +30%). Save passa para a versão 5 (saves antigos não abrem: mudou a lista de bens).

- Estradas por cidade em níveis (máximo = era + 1, até 5; custo 80 × nível): cada nível dá +10% no que a cidade troca por terra e +5% de controle máximo na região. A IA melhora quando sobra dinheiro.

- Portos por cidade (no mar ou rio navegável), nível máximo 1 + era/2 (até 5), custo 120 × nível: +25% de comércio por nível e alcance do comércio exterior dobrado.

- Rios: não contornam mais o mesmo hex (espirais caíram ~45%) e toleram menos subida; parte dos que terminam numa bacia vira um lago de ~7 hexes (água, com zona marítima própria; lago pequeno não ganha nó no mapa).

- Cultura, língua e religião, separadas, como mistura por cidade. Cada tribo nasce com cultura própria (nome na língua dela), a língua da região e uma de 5 religiões por faixa do mundo. Por ano: assimilação 1%, língua 2%, conversão 0,8% rumo à do dono (× controle, mais rápido com letrados). Cultura principal, aceita (custa 40 pontos adm.) ou discriminada; gente não aceita tira até 25 de lealdade. Aba Sociedade e painel da cidade mostram tudo.

- Eventos aleatórios com escolha (7 eventos: colheita, profeta, sábio estrangeiro, incêndio, bandidos, escrivães, ouro), ~1 a cada 2 anos por país. A IA escolhe na hora; para o jogador o jogo pausa e abre uma janela com 2 minutos (depois vale a 1ª opção). No multiplayer o servidor pausa a sala ("evento"), aceita a resposta mesmo pausado e escolhe sozinho no fim do prazo; a sala continua pausada, despausa pela regra normal.

- Aba Gráficos: 11 séries do país (PIB, população, tesouro, dívida, legitimidade, letrados, pesquisa, controle, tecnologias, recrutas, cidades), 1 ponto por mês, até 50 anos; ranking mundial (top 10 + sua posição) por PIB, população, tecnologias e cidades.

- Diplomacia: relação de −100 a +100 entre cada par de países. Melhora com acordo comercial (+2/mês) e diplomatas (+15 por 10 pontos adm.); piora com guerra (−8/mês), fronteira (−0,5/mês) e infâmia do vizinho; volta devagar para 0. Abaixo de −25 ninguém assina acordo; a IA só ataca quem ela gosta menos que +10. Prestígio = parcela do mundo em PIB, tecnologia e população (média 100) + glória de guerras (±50 por vitória/derrota, se apaga 1%/mês). Ranking de prestígio na aba Gráficos.

- Investimento privado: a lei de Economia manda uma fração do PIB para o fundo dos donos (Tradicionalismo 1%, Mercantilismo 2%, Livre comércio 4% por semana; Subsistência nada). Todo mês os investidores fazem até 3 obras onde o produto está mais caro, sem tirar do tesouro. Fundo aparece na aba Economia.

- Território ocupado aparece em listras diagonais na cor de quem ocupa (mapa Político).

- Histórico dos gráficos: a cada 30 anos os países na metade de baixo do prestígio, sem jogador, perdem o histórico (o save fica menor).
- Interface, fase 1 (docs/interface.md): tema escuro de atlas (grafite, dourado fosco, serifa nos títulos), barra superior (bandeira, nome, governo, data/era com barra de progresso, tesouro, prestígio, estabilidade, legitimidade, pontos adm.; nenhum recurso material), barra de camadas do mapa por grupo, menu lateral com 12 categorias e ícones de linha (sem emoji), painel da categoria ao lado do menu (Economia e Gráficos largos), painel contextual à direita para o que foi clicado, barra inferior com pausa, velocidades, data, info do hex e notificações por categoria com contador e lista.

- Interface, fase 2: Economia em abas (Visão Geral com cartões e crescimento de 12 meses; Mercados por cidade com produção, consumo, abastecimento, estrada e porto, e botão que leva ao mapa; Mercadorias em cartões por categoria com preço, tendência de 6 meses, produção, consumo, importação e exportação). Preço de cada bem guardado por 24 meses. Tecnologia em árvore: linhas por área (Militar, Ciência, Comércio, Indústria, Agricultura), colunas por era até a próxima, cartões conhecidos/disponíveis/bloqueados ligados aos pré-requisitos por linhas; clicar num disponível muda a pesquisa.

- Interface: todos os emojis da interface viraram ícones de linha (39 tipos); notificações classificadas pelo ícone e mostradas como texto puro.

- Interface, fase 3: camadas Cultura, Língua, Religião, Alfabetização e Infraestrutura; grupos de interesse em cartões (papel no governo, barras de poder político e apoio popular); evento como documento histórico (bandeira, data, país, ilustração, texto em serifa, opções com consequências).

- Personagens, primeira parte: cada país tem um governante (nome na língua do país, idade, administração/diplomacia/militar de 0 a 100, 2 traços, aparência). Administração mexe no imposto (±10%), militar na força do exército (±10%), diplomacia nas relações com vizinhos. Morre de velhice e o sucessor vem pela forma de governo (herdeiro, eleito, clero, partido), com aviso. Retrato gerado pela aparência (rosto, pele, cabelo, barba, cicatriz, corpo e roupa da era) na barra superior e na aba Política, com a vida dele e o botão "Guardar na história".

- Livro da história: personagem guardado continua depois de morto; a vida dele anota nascimento, posse, guerras declaradas/sofridas, paz (vitória ou derrota), leis aprovadas e morte. "Abrir livro" mostra um documento com retrato e a vida, com botão "Salvar como PDF / imprimir".

- Militar, primeira parte: 10 tipos de tropa terrestre liberados por tecnologia (Lanceiros, Arqueiros, Cavalaria, Infantaria pesada, Máquinas de cerco, Mosqueteiros, Artilharia, Fuzileiros, Blindados, Infantaria mecanizada), cada um com ataque, defesa, velocidade, força de cerco e custo; a IA recruta o melhor que tem. Generais: personagens contratados (80) para uma divisão, com bônus pela habilidade militar; batalhas vencidas e perdidas (soldados × soldados) entram na vida deles e no livro.

- Mar aberto: zonas marítimas sem costa de verdade (menos de 10 hexes encostados em terra; ilhota não conta) se juntam às vizinhas também de mar aberto, em grupos de até 10 zonas. O oceano fica com poucos nós grandes; o litoral mantém os nós menores (no mapa padrão: 614 → 444 zonas).

- Navios por era (Galés, Caravelas, Navios de linha, Couraçados, Submarinos, Porta-aviões) e aviões (Caças, Caças a jato, Drones), liberados por tecnologia, com força e custo próprios; a IA constrói o melhor. Botões por tipo no hex da cidade.

- Frentes (estilo HOI4, simplificado): com exércitos selecionados (um ou a caixa), "Defender fronteira" espalha as tropas por igual na fronteira com o vizinho escolhido, e "Atacar cidades" (em guerra) manda as tropas em duplas para as cidades inimigas mais perto, para cercá-las.

- Economia, abas novas: Produção e Consumo (barras: produção por cidade, empregos por setor, o que falta, o que sobra, o que depende de importação) e Finanças (tesouro, dívida, imposto médio, juros; receitas e despesas em barras, incluindo forças armadas; gráficos de tesouro e dívida). Clicar num cartão de mercadoria abre a página dela: preço dos últimos 24 meses, produção, consumo, importação, exportação, cidades que produzem e que consomem, construções que fazem e que usam.

- Abastecimento: exército em terra precisa estar a até 6 + 3 × era hexes de um depósito (cidade sua ou cidade inimiga que ele ocupa); fora disso perde 5% de organização e 2% dos soldados por semana e não se recupera. O painel da divisão mostra se tem suprimento e a distância.

- Dependências: Tributário (paga 15%), Vassalo (paga 10%, luta nas guerras do soberano, é defendido), Fantoche (paga 20%, luta junto, não assina acordos sozinho) e Protetorado (não paga; o protetor entra nas guerras contra ele). Proposta aceita se o soberano tiver 1,5× o prestígio e relação mínima por tipo. Autonomia de 0 a 100 anda todo mês (soberano forte e querido segura); em 100 o súdito se solta; pode romper antes (relação despenca). Tributo cai com a autonomia. Súdito não ataca o soberano. A IA propõe a vizinhos da IA. Tudo na aba Diplomacia.

- Claims e caráter da IA: reivindicações sobre cidades (Histórico 80 ao perder a cidade na paz; Cultural 60 sobre cidade vizinha de maioria da sua cultura; Estratégico 35 sobre porto vizinho de quem não tem litoral), perdem 2 de força por ano e somem se a cidade voltar. Guerra contra quem você reivindica dá metade da infâmia; o reivindicado gosta menos de quem reivindica. Personalidade da IA (Expansionista, Comercial, Defensivo, Diplomático, Revanchista) muda chance de guerra, acordos e dependências; a IA ataca primeiro quem ela reivindica. Desejos de cada país e personalidade aparecem na Diplomacia, junto com suas reivindicações.
- Correção: país que perde todas as cidades perde as tropas (antes o jogo travava na paz).

- Propostas entre jogadores: acordo comercial ou dependência proposto a um país de jogador fica esperando ele aceitar ou recusar (8 semanas, depois vence); aviso nas notificações e lista "Propostas recebidas" na Diplomacia. Aceitar aplica com as regras normais (prestígio, relação). País da IA continua decidindo sozinho.

- Votação de nomes no multiplayer: com mais de um jogador, renomear continente abre uma votação (Sim/Não na Diplomacia, com aviso); passa com mais da metade dos jogadores, cai com metade dizendo não, vence em 8 semanas. No solo continua direto. No servidor, votação nova pausa a sala ("evento ou votação"); despausa pela regra normal. Rios terão o mesmo quando ganharem nome.

- Litoral enxugado: zonas de costa vizinhas também se juntam, até 3 por grupo, começando pelas menores (pedacinhos de costa grudam no vizinho). No mapa padrão as zonas costeiras caíram de 233 para 102 (total 444 → 313, a maioria do resto são lagos).

- Rios navegáveis com nome: trechos navegáveis ligados viram um rio (15+ hexes) com nome na língua da região e o nó de mar da foz (se deságua noutro rio, o mar mais perto). Nome aparece no mapa de perto; o hex mostra o rio e a foz; renomear pelo lápis (no multiplayer, votação como os continentes).

- Rios espalhados: as nascentes saem de uma grade (uma chance a cada 26 × 16 hexes, no ponto mais alto de algumas amostras), em qualquer terra um pouco acima do mar, em vez de sorteadas no mapa todo (o que juntava tudo nas serras). Metade dos rios de antes, espalhados por todos os continentes.

- Expansão por etapas (interesse → claim → expedição → posto avançado ou cidade → consolidação → integração):
  - Custo de fundar = 60 × multiplicador da distância de caminho (terreno pesa; rio navegável e costa encurtam) até a cidade ou posto mais perto: 1–3 ×1; 4–6 ×1,25; 7–10 ×1,75; 11–15 ×2,5; 16+ ×3,5.
  - Tipo de claim de expansão mostrado nos colonos: Proximidade, Continuidade (entre duas áreas suas, −20%), Recursos e Estratégico (−15%), Assentamento distante.
  - Capacidade de expansão: 1 + era + cidades/4 fundações a cada 2 anos.
  - Posto avançado (30): colonos viram acampamento que reivindica o hex, espalha influência, abastece tropas e serve de base para fundar mais longe.
  - Área de influência: hexes livres perto das cidades e postos, em tom claro da cor do país no mapa Político.
  - Continuidade territorial: cidade sem ligação por terra com a capital (nem porto/rio navegável) fica isolada, com controle máximo ×0,6.

- IA na expansão: quando a capacidade de expansão está cheia, os colonos da IA viram posto avançado (em vez de esperar parados) e as próximas cidades partem também dos postos; posto avançado abastece colonos. Camada de mapa "Expansão": território, área de influência em tom claro e cidades isoladas em vermelho.

- Rios sempre chegam à água: todo rio termina no mar, num lago ou noutro rio; o que para numa bacia ganha um lago no fim (se for curto ou não couber lago, o rio não fica). Teste novo garante que todo rio encosta em água.
- Rios sinuosos: a trava contra espiral deixava só 2 bordas do rio por hex, e toda curva precisa de 3 (por isso os rios eram retos). Agora vale 3, e um ruído suave entorta a descida (RIVER_MEANDER). Rio não corre por dentro nem pela margem de lago aberto depois dele.
- Lagos variados: o lago enche a bacia pelo hex mais baixo da beira até um tamanho sorteado (quase todos pequenos, alguns médios, raros de ~350 hexes, como um mar interior). Prefere crescer encostado no próprio lago (corpo cheio, contorno irregular) e nunca encosta no mar. Lista das construções em docs/construcoes.md.
- Disputa de navegação: quem controla a foz de um rio navegável pode fechá-lo ao comércio dos outros (botão no painel do hex do rio). Cidades estrangeiras nele perdem o bônus de porto fluvial e a ligação por água, e a relação com quem fechou cai 1 por mês. Perder a foz reabre o rio. A IA ainda não usa.
- Economia estilo Victoria 3 (docs/construcoes.md): obras por etapas com pontos de construção e setores de construção, filas pública e privada, construção em massa com camada de mapa; métodos de produção em 5 categorias; conta financeira por edifício (reserva, dívida, dividendos, insolvência), privatizar e nacionalizar; leis de Economia e Investimento; 7 matérias-primas, 22 bens e 25 indústrias novas; construção naval com fila própria; economia de guerra e guerra total com conversão industrial; aba Edifícios e Produção.
- Crescimento natural da população pela sobra de comida e 113 tecnologias (docs/tecnologias.md, docs/ideias-era-tribal.md); pesquisa pela raiz da população.
- Batalhas e logística terrestre (docs/batalhas.md): frente por terreno com reservas, fases de fogo e choque, 1d10 com modificadores e histórico, organização, moral e baixas separadas, retirada, cerco e perseguição; atrito e fadiga separados das baixas; suprimento por tipo com estoque, capacidade e distância ao depósito.
- Guerra naval e aérea (docs/batalhas.md): tempo no mar, batalha naval com dados, missões de frota (escolta, bombardeio costeiro...), comboio além-mar com interceptação; missões aéreas (apoio, bombardeio estratégico, reconhecimento, abastecimento) com combustível e tempo.
- Oceano profundo visível: azul bem escuro no mapa (a faixa rasa do litoral continua clara). Além de barrar navio sem Navegação, atrapalha o comércio além-mar: entre países de continentes diferentes, quem não tem Navegação só consegue exportar 20% do que exportaria.
- Mercados e comércio (docs/mercados.md): estoque por cidade (encalhe guardado, comida estraga), acesso de cada cidade ao mercado nacional, nós comerciais com poder por país, vantagem comercial, política por mercadoria e tarifa, 7 estruturas comerciais e Complexidade da Economia (encarece construção sofisticada). Página Comércio em 6 abas.
- Subsistência (docs/subsistencia.md): tipo por terreno, capacidade por hex, pressão sobre a terra com curva suave, autoconsumo fora do PIB e do imposto, excedente vendido, construções ocupando terra, camada de mapa. Árvore de tecnologia redesenhada sem linhas sobre os cartões.
- Expansão por compra de hex (preço pelo tamanho do país, disputa piora a relação), cidades até raio 5 e a 1 hex de distância, sem limite de fundações. Área da cidade destacada e hex escolhido à mão para uma cidade.
- HUD: construções impossíveis somem, tropa com painel próprio, perfil do personagem. Legendas em todas as camadas.
- Barra de modos especiais: Construção, Estado, Diplomacia e Militar (docs/incentivos.md para os incentivos).
- Incentivos regionais com Complexidade Social (docs/incentivos.md).
- Personagens: personalidade separada de traços, traços adquiridos em batalha, 3 candidatos por comando (terrestre, naval, aéreo) com especialização, registro de batalhas com números, livro com biografia e exportação em PDF, dia da semana no calendário.
- Personagens, etapa 2: histórico de cargos (acumula governante e comandante), leis propostas, retiradas e aprovadas no governo, cidades fundadas e tomadas, general herói assume na sucessão, golpe de general ambicioso com governo fraco, classificações históricas e título da capa do livro pelos feitos registrados.
- Personagens, etapa 3: agitadores surgem com radicais acima de 30% e somem abaixo de 12%; revolução (radicais > 45%, legitimidade < 20%) põe o agitador no governo; governante derrubado vai para o exílio no país de melhor relação e aprende a língua de lá; línguas no perfil; governante pesa na IA (guerra e leis). Modo Militar com setas de ofensiva e avanço e pilhas agrupadas.
- Personagens, etapa 4: retratos caricaturais (cabeça grande, contorno grosso, 5 rostos, 4 narizes, 5 cabelos, olhos com pupila, boca pela personalidade) com chapéu pelo cargo e pela era (penas, louros, coroa, cartola; elmo, capacete, bicorne, quepe), medalhas de herói; religião do personagem (fé diferente da do Estado tira legitimidade, devoto dá um pouco; exilado pode converter); casamento, filhos com o sobrenome da família e herdeiro na chefia tribal e na monarquia.
- Personagens, etapa 5: crônica central (chronicle.ts) com batalhas, guerras, paz, tratados, leis, governo, golpes, revoluções, mortes, fundações, conquistas e exílios, cada um registrado uma vez e referenciado pelos personagens; crônica na Visão Geral e no livro; tratados (acordo comercial, súdito) na vida dos governantes; regência (cônjuge ou escolhido) quando o herdeiro tem menos de 16 anos.
- Personagens, etapa 6: diplomata como cargo (3 candidatos; diplomacia dá pontos a mais por gesto e tolerância nos acordos; negociações na vida dele e na crônica); avaliação do comando em cada batalha (números, terreno, suprimento, troca de baixas) no livro; crônica filtrável por tipo. Referência de variáveis em docs/variaveis.md.
- Tecnologia em três áreas (Produção, Militar, Social) com 211 tecnologias (98 novas), pré-requisitos cruzados, 110 variáveis com leitura central (techvars.ts), difusão parcial entre vizinhos e parceiros, Complexidade Social com instituições; árvore em abas com requisitos externos `Nome (Era)`, legenda das linhas e painel de detalhes.
- Tecnologia, etapa 2: pesquisa em paralelo (uma por área, vagas por Universidades, Academias científicas e Computadores, pontos divididos com perda de foco); 45 leis mexem nas variáveis de tecnologia (campo `vars`); painel da tecnologia mostra os métodos de produção liberados com os insumos que exigem.

## Próximos (nesta ordem)

1. **Interface, fases seguintes** (docs/interface.md): Economia: abas Investimentos e Empresas; Diplomacia com influência e claims; Militar operacional (frentes, logística); camadas que ainda faltam (claims, influência, produção, militares) e tingir sem esconder o terreno; estilo que muda devagar por era; painéis redimensionáveis.
2. **Recursos**: tipos novos (hoje são os 21 de antes) e um 3º produto por hex.
3. **Mercados**
   - Mercado nacional como soma dos metropolitanos.
   - Cada hex compra da cidade mais barata, não só da mais próxima.
   - Comércio pelos nós sem depender de pacto (hoje o comércio exterior ainda exige pacto e cidades perto).
4. **Infraestrutura**
   - Ferrovias (gastam carvão e locomotivas).
5. **Rios**
   - Rio navegável desenhado largo (ocupando o hex, com margem).
   - Cidades e portos na margem.
6. **Guerra**
    - Exploração por unidades terrestres e aéreas.
7. **Mapas novos (resto)**: população com zoom no hex e modos Cidade/Estado/País/Mundo, atração de imigração e suprimentos.
8. **População**
    - Cultura/língua/religião por POP (hoje é por cidade), grupos culturais, famílias de línguas e religiões, surgimento e divisão de culturas.
9. **Leis**
11. **Tecnologia, etapa 3**: IA usando a pesquisa paralela e escolhendo a área pela personalidade; incentivos e eventos com variáveis de tecnologia.
10. **Personagens, etapa 7**: idiomas aprendidos por convivência (diplomata no estrangeiro), mortos/feridos/capturados separados no combate, narrativa da biografia por IA (opcional, só com fatos registrados).
10. **Construção estilo Vic3 (resto)**: setor de construção (capacidade, materiais), propriedade dos edifícios, privatização e nacionalização, investimento estrangeiro.
11. **Diplomacia**
    - Confiança, influência e esferas.
    - Tratados com manutenção em pontos administrativos.
    - Colônia, satélite e união pessoal; dependência imposta na paz.
12. **IA (resto)**: planos em etapas, memória de traições, avaliação de guerra pelo poder militar e logística, exigências territoriais sem guerra.
13. **Personagens**
    - Outros personagens (generais, ministros, líderes de grupo, empresários), família, mortes por eventos.
    - Comandantes e generais.
14. **Militar completo**
    - Papéis especiais (submarino caçando comércio, porta-aviões levando aviões, bombardeiro destruindo indústria), reconhecimento, engenharia; comandantes terrestre/naval/aéreo e exércitos com vários generais.
    - Operações conjuntas.
    - Logística por rede (estradas, ferrovias, portos e comboios com capacidade), mapa de suprimentos, alcance aéreo por base.
15. **Árvore tecnológica completa** em 10 ramos. Isso substitui as 5 tecnologias por era de hoje.
16. **Gráficos (resto)**: comparação entre países, preços, composição cultural ao longo do tempo, modos Cidade/Estado/Mundo.

## Fora por enquanto

- Mapas pagos.
- Os 105 gráficos completos: só entram os que têm sistema por trás.
