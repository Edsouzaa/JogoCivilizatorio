# Interface: atlas de grande estratégia

Especificação visual do jogo. O que já existe está marcado com **[feito]**.

## Identidade
- **[feito]** Tema escuro e sóbrio: grafite, carvão e azul-acinzentado. Os painéis são um pouco mais claros que o fundo, com bordas finas cinza e dourado fosco nos destaques.
- **[feito]** Cada cor tem um sentido: verde = crescimento e estabilidade; vermelho = crise e perda; azul = diplomacia e administração; laranja = alerta econômico.
- Nada de cores saturadas, gradientes fortes, sombras pesadas ou cara de dashboard empresarial.
- **[feito]** Títulos, nomes de países e eras em fonte serifada (Cormorant Garamond); dados, botões e tabelas em sem serifa (Inter); números alinhados (tabular).
- Ornamentos discretos de cartografia: brasões, bandeiras, divisórias finas, textura sutil de pergaminho em eventos e documentos.

## Estrutura da tela
- **[feito]** **Barra superior (64 px).**
  - Esquerda: bandeira, nome, governo e grupos no poder.
  - Centro: data, era e progresso da era.
  - Direita: tesouro com saldo, prestígio, estabilidade, legitimidade e pontos administrativos.
  - **Nunca mostra recursos materiais.**
- **[feito]** **Menu lateral (236 px)** com 12 categorias, cada uma com ícone: Visão Geral, População, Economia, Construções, Comércio, Diplomacia, Política, Tecnologia, Militar, Administração, Sociedade e Gráficos. O item selecionado ganha fundo destacado e uma linha dourada.
- **[feito]** **Mapa** dominante ao centro, com barra de camadas por grupo.
- **[feito]** **Painel contextual à direita**, para cidade, hex ou unidade clicada.
  - Falta: abas por tipo, ilustração da cidade e governador.
- **[feito]** **Barra inferior (58 px):** pausa, velocidades, data, informação do hex e notificações por categoria com contador; clicar num ícone abre a lista.

## Camadas do mapa
- **[feito]**
  - Geografia: Terreno, Clima, Recursos.
  - Território: Político, Controle.
  - Sociedade: População, Satisfação.
  - Ciência: Tecnologia.
- **A fazer:**
  - Território: Administração, Claims, Influência.
  - Economia: Produção, Mercados, Construções, Infraestrutura, Investimentos.
  - Sociedade: Cultura, Língua, Religião, Alfabetização, Migração.
  - Militar: Exércitos, Logística, Frentes, Fortificações.
  - Geografia: Relevo, Rios navegáveis, Nós marítimos.
- Toda camada tinge o mapa sem esconder o terreno.

## Economia (único lugar onde os recursos aparecem como estoque e fluxo)
- **[feito]** Tabela de mercadorias do país (produção, consumo, saldo e preço) e finanças.
- **Abas a fazer:**
  - Visão Geral com cartões.
  - Mercados: metropolitanos e nacional.
  - Mercadorias em cartões por categoria, com tendência e uma página de detalhe com histórico de preço, produtores e consumidores.
  - Produção e Consumo, com barras horizontais por cidade e setor.
  - Investimentos, Empresas, Finanças e Comércio.

## Diplomacia e Política
- **[feito]** Lista de países com bandeira, relação e prestígio.
- **A fazer:**
  - Diplomacia: confiança, influência comparada entre potências, claims, desejos, personalidade e plano da IA.
  - Política: cartões dos grupos de interesse e personagens.

## Tecnologia
**[feito]** Árvore visual por área, com cartões ligados aos pré-requisitos. Tecnologias bloqueadas aparecem visíveis, mas com menos contraste.

## Militar
Operacional, no estilo HOI4. Três grupos: terrestre, naval e aéreo. Desenhar frentes, objetivos e rotas no mapa, e uma tela de logística (demanda, estoque, entrega, gargalos).

## Eventos
- **[feito]** Janela central com escolha.
- Falta: aparência de documento histórico, com ilustração, data e envolvidos.

## Evolução por era
A estrutura fica a mesma em todas as eras; só os detalhes mudam:
- Tribal: pergaminho e símbolos simples.
- Clássica e Medieval: brasões e selos.
- Renascença e Descobertas: cartografia náutica.
- Revoluções e Industrialização: interface burocrática.
- Grandes Guerras: mapas militares.
- Multipolar e Moderna: gráficos e mapas de influência.

## Regras
1. Nenhum recurso material na barra superior.
2. Mercadorias só aparecem em Economia, Mercados e Mercadorias.
3. Nada de uma interface feita de janelas flutuantes.
4. O mapa é sempre o centro.
5. Painéis com espaçamento e tipografia consistentes.
6. Tabelas para muitos dados e cartões para resumos.
7. Gráficos para evolução no tempo, comparação e distribuição.
8. Ícones gráficos, nada de emoji.
9. Pouca borda, sombra e decoração.
10. Hierarquia visual clara.
11. Painéis responsivos e retráteis.
12. Funcionar de resoluções comuns até ultrawide.
13. Mesma identidade visual em todas as eras.
