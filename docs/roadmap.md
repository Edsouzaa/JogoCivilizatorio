# Roadmap

Fila de implementação a partir da lista grande de pedidos. A ordem segue a dependência entre os sistemas: um sistema que outros usam vem primeiro. Cada item vira um commit próprio.

## Feito

- 10 eras com datas, começo em 600 a.C., ritmo por era e custos de pesquisa (docs/escopo.md).
- 1 tribo a cada 1.000 hexes de terra; algumas tribos demoram mais a sair da era tribal, e o comércio ajuda.
- Movimento inteligente: as tropas andam pelo menor caminho. Se o alvo é inalcançável (mar sem frota), elas vão até o ponto possível mais perto e param.
- Painel de notificações (tecnologia, guerra, paz e avisos) e linha do equador.
- Testes movidos para `tests/`.
- Seleção por caixa (botão esquerdo arrastando), painel das tropas por tipo e ordem para o grupo todo. Arrastar o mapa agora é com o botão direito ou o do meio.
- Bandeira do país (faixas, cruz ou canto + símbolo), desenhada nas unidades. Nome, cor e bandeira editáveis no botão 🏳. Cidades e estados podem ser renomeados (✏).

## Próximos (nesta ordem)

1. **Bandeiras de cidade e estado**, e escolher nome e bandeira já na criação (hoje se renomeia depois).
2. **Clique em estado e zona marítima**: a borda brilha e aparece o nome. O nó fica dourado. O estado mostra QV, PIB e população.
3. **Nós marítimos**: bolinha no centro e linhas pontilhadas entre nós vizinhos. O bloqueio fecha a entrada de recursos no mercado.
4. **Recursos**
   - Todo hex de terra com recurso, e mais tipos de recurso.
   - Reservas que acabam, e a construção desativa quando esgota (gera desemprego).
   - Até 2–3 produtos por hex, desenhados como fatias.
5. **Cidades**
   - Crescimento comprando centro urbano vizinho.
   - Teto de população por hex.
   - Centros urbanos com menos recurso natural e bônus industrial.
6. **Controle e proximidade (estilo EU5)**
   - Controle de 0 a 100% por hex e controle máximo pela proximidade da capital.
   - Efeitos em imposto, adesão ao mercado e recrutamento.
   - Pontos administrativos gerados por centros administrativos, que consomem papel.
7. **Mercados**
   - Mercado nacional como soma dos metropolitanos.
   - Cada hex compra da cidade mais barata, não só da mais próxima.
   - Centros comerciais e mercado mundial (Vic3 1.9) no lugar do comércio por pactos.
8. **Infraestrutura**
   - Estradas em níveis (−10% no custo terrestre por nível).
   - Ferrovias (gastam carvão e locomotivas).
   - Portos com nível limitado pela era.
9. **Rios**
   - Sem espirais e com mais lagos.
   - Rios navegáveis largos, ligados a um nó de mar, com nome (votação no multiplayer).
   - Cidades e portos na margem.
   - Disputa de navegação.
10. **Guerra**
    - Cerco de cidade (a cidade dominada leva a região).
    - Hexes ocupados listrados na cor do ocupante.
    - Painel da guerra: baixas, custo e apoio.
    - Exploração por unidades terrestres e aéreas.
11. **Mapas novos**: satisfação, recursos com %, população (com zoom no hex), tecnologia, clima, atração de imigração e suprimentos.
12. **População**
    - Cultura, língua e religião por POP, independentes entre si.
    - Assimilação e conversão.
    - Letrados dando bônus à pesquisa.
13. **Eventos**
    - Pestes e fomes, com aviso.
    - Eventos aleatórios com escolha (pausa todos, 2 min).
14. **Leis**
    - 3 fases com oposição política e popular.
    - Incentivos por estado ou cidade, pagos com pontos administrativos.
15. **Construção estilo Vic3**: setor de construção, investimento privado, fundo de investimentos, privatização e nacionalização, investimento estrangeiro.
16. **Diplomacia**
    - Relação, confiança e influência.
    - Tratados com manutenção em pontos administrativos.
    - Dependências (colônia, vassalo, fantoche, protetorado, tributário, satélite) com autonomia de 0 a 100.
    - Esferas de influência e prestígio.
17. **IA com claims, desejos e planos**: personalidade, memória e avaliação de guerra.
18. **Propagação de tecnologia** por fronteira e comércio; o comércio também revela a névoa.
19. **Oceano profundo**: bloqueia navios de tecnologia baixa.
20. **Continentes com nome**: no solo o jogador altera; no multiplayer há votação.
21. **Personagens**
    - Ficha, atributos e retrato gerado.
    - Comandantes e generais.
    - Livro de história exportável em PDF.
22. **Militar completo**
    - Categorias de unidade por era e comandantes por domínio.
    - Operações conjuntas.
    - Logística por rede (terrestre, naval e alcance aéreo).
23. **Árvore tecnológica completa** em 10 ramos. Isso substitui as 5 tecnologias por era de hoje.
24. **Gráficos**: começar pelos que já têm dado (PIB, população, dívida, preços, receitas e despesas) e crescer junto com cada sistema.

## Fora por enquanto

- Mapas pagos.
- Os 105 gráficos completos: só entram os que têm sistema por trás.
