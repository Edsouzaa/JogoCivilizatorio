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

## Próximos (nesta ordem)

1. **Recursos**: tipos novos (hoje são os 21 de antes) e um 3º produto por hex.
2. **Controle (resto)**
   - Pontos administrativos gerados por centros administrativos, que consomem papel.
3. **Mercados**
   - Mercado nacional como soma dos metropolitanos.
   - Cada hex compra da cidade mais barata, não só da mais próxima.
   - Centros comerciais e mercado mundial (Vic3 1.9) no lugar do comércio por pactos.
4. **Infraestrutura**
   - Estradas em níveis (−10% no custo terrestre por nível).
   - Ferrovias (gastam carvão e locomotivas).
   - Portos com nível limitado pela era.
5. **Rios**
   - Sem espirais e com mais lagos.
   - Rios navegáveis largos, ligados a um nó de mar, com nome (votação no multiplayer).
   - Cidades e portos na margem.
   - Disputa de navegação.
6. **Guerra**
    - Hexes ocupados listrados na cor do ocupante.
    - Painel da guerra: baixas, custo e apoio.
    - Exploração por unidades terrestres e aéreas.
7. **Mapas novos (resto)**: população com zoom no hex e modos Cidade/Estado/País/Mundo, atração de imigração e suprimentos.
8. **População**
    - Cultura, língua e religião por POP, independentes entre si.
    - Assimilação e conversão.
    - Letrados dando bônus à pesquisa.
9. **Eventos**
    - Eventos aleatórios com escolha (pausa todos, 2 min).
10. **Leis**
    - 3 fases com oposição política e popular.
    - Incentivos por estado ou cidade, pagos com pontos administrativos.
11. **Construção estilo Vic3**: setor de construção, investimento privado, fundo de investimentos, privatização e nacionalização, investimento estrangeiro.
12. **Diplomacia**
    - Relação, confiança e influência.
    - Tratados com manutenção em pontos administrativos.
    - Dependências (colônia, vassalo, fantoche, protetorado, tributário, satélite) com autonomia de 0 a 100.
    - Esferas de influência e prestígio.
13. **IA com claims, desejos e planos**: personalidade, memória e avaliação de guerra.
14. **Votação de nomes no multiplayer** (continentes e rios): hoje qualquer jogador renomeia direto.
15. **Personagens**
    - Ficha, atributos e retrato gerado.
    - Comandantes e generais.
    - Livro de história exportável em PDF.
16. **Militar completo**
    - Categorias de unidade por era e comandantes por domínio.
    - Operações conjuntas.
    - Logística por rede (terrestre, naval e alcance aéreo).
17. **Árvore tecnológica completa** em 10 ramos. Isso substitui as 5 tecnologias por era de hoje.
18. **Gráficos**: começar pelos que já têm dado (PIB, população, dívida, preços, receitas e despesas) e crescer junto com cada sistema.

## Fora por enquanto

- Mapas pagos.
- Os 105 gráficos completos: só entram os que têm sistema por trás.
