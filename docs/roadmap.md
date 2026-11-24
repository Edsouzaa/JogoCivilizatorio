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

## Próximos (nesta ordem)

1. **Interface, fases seguintes** (docs/interface.md): trocar os emojis que sobraram nos painéis por ícones; Economia com abas (Mercados, Mercadorias em cartões com tendência, Produção/Consumo com barras); Diplomacia com influência e claims; Política com cartões dos grupos; Tecnologia em árvore; Militar operacional (frentes, logística); eventos com moldura de documento e imagem; camadas novas (cultura, religião, língua, alfabetização, infraestrutura); estilo que muda devagar por era; painéis redimensionáveis.
2. **Recursos**: tipos novos (hoje são os 21 de antes) e um 3º produto por hex.
3. **Mercados**
   - Mercado nacional como soma dos metropolitanos.
   - Cada hex compra da cidade mais barata, não só da mais próxima.
   - Centros comerciais e mercado mundial (Vic3 1.9) no lugar do comércio por pactos.
4. **Infraestrutura**
   - Ferrovias (gastam carvão e locomotivas).
5. **Rios**
   - Rios navegáveis largos, ligados a um nó de mar, com nome (votação no multiplayer).
   - Cidades e portos na margem.
   - Disputa de navegação.
6. **Guerra**
    - Exploração por unidades terrestres e aéreas.
7. **Mapas novos (resto)**: população com zoom no hex e modos Cidade/Estado/País/Mundo, atração de imigração e suprimentos.
8. **População**
    - Cultura/língua/religião por POP (hoje é por cidade), grupos culturais, famílias de línguas e religiões, surgimento e divisão de culturas.
9. **Leis**
10. **Construção estilo Vic3 (resto)**: setor de construção (capacidade, materiais), propriedade dos edifícios, privatização e nacionalização, investimento estrangeiro.
11. **Diplomacia**
    - Confiança, influência e esferas.
    - Tratados com manutenção em pontos administrativos.
    - Dependências (colônia, vassalo, fantoche, protetorado, tributário, satélite) com autonomia de 0 a 100.
12. **IA com claims, desejos e planos**: personalidade, memória e avaliação de guerra.
13. **Votação de nomes no multiplayer** (continentes e rios): hoje qualquer jogador renomeia direto.
14. **Personagens**
    - Ficha, atributos e retrato gerado.
    - Comandantes e generais.
    - Livro de história exportável em PDF.
15. **Militar completo**
    - Categorias de unidade por era e comandantes por domínio.
    - Operações conjuntas.
    - Logística por rede (terrestre, naval e alcance aéreo).
16. **Árvore tecnológica completa** em 10 ramos. Isso substitui as 5 tecnologias por era de hoje.
17. **Gráficos (resto)**: comparação entre países, preços, composição cultural ao longo do tempo, modos Cidade/Estado/Mundo.

## Fora por enquanto

- Mapas pagos.
- Os 105 gráficos completos: só entram os que têm sistema por trás.
