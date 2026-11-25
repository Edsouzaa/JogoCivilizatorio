# Ícones (src/art.ts)

**Estilo:** silhuetas simples, 24×24, uma cor, contorno igual, sem texto nem números. Cerca de 60 formas (`GLYPHS`) combinadas com cores.

**Definição central:** nome → forma + cor. O id é estável e não depende da tradução: `artId("Fábrica de máquinas")` = `fabrica_de_maquinas`.

| Tipo | Como o ícone é escolhido |
|---|---|
| Recursos e bens | um ícone próprio cada (`GOOD_ART`): espigas para grãos, pepita para metais, gota para petróleo, placa para eletrônicos, torre para telecomunicações... |
| Construções | um ícone próprio cada (`BUILDING_ART`): fazenda com espigas, mina com picareta, forja com bigorna, fábricas, estaleiros com navio... |
| Tecnologias | forma pela palavra-chave do nome (agricultura → espiga, navegação → navio, medicina → cruz, rádio → torre...) e cor pelo setor (militar, ciência, comércio, indústria, agricultura) |

- **Elemento novo sem entrada:** usa a forma genérica do tipo, então nunca fica sem ícone.
- **Onde aparecem:** cartões e detalhe de mercadorias, linhas de construção no painel do hex, lista Edifícios e Produção, fila de obras e tela de tecnologia.

**Ainda falta:** a construção mudar de aparência por era (fazenda tribal, medieval, industrial, moderna).
