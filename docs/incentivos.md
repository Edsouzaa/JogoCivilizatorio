# Incentivos regionais e Complexidade Social

Código em `src/admin.ts` (catálogo `INCENTIVES`, configuração `ADMIN`). Interface: "Políticas Regionais" no painel da cidade (modo normal) e no painel do estado (modo Estado).

## Custo

- Custo final = base × (1 + Complexidade Social / 100), para a ativação e para a manutenção semanal.
- No estado inteiro: +25% (não multiplica pelo número de cidades). O efeito vale em todas as cidades do estado; cidade e estado com o mesmo incentivo não se somam.
- Complexidade Social da região: diversidade de cultura, língua e religião (entropia), urbanização, tamanho da população, letrados, número de classes presentes e era. Complexidade é dificuldade de administrar, não instabilidade.

## Regras

- Efeito gradual: sobe até o cheio em `ramp` semanas; duração máxima `max` semanas, depois acaba sozinho.
- Cancelar: para a manutenção na hora, não devolve a ativação, o que é permanente fica.
- Requisito perdido: suspenso (efeito parado, meia manutenção); volta quando o requisito volta.
- Grupo "foco econômico": agricultura, extração e indústria não coexistem no mesmo território.
- Sem pontos administrativos: todos os incentivos do país caem.

## Onde cada efeito é lido

| Efeito | Mecânica |
|---|---|
| farm, extract | produção das extratoras do hex (economy.ts, `natural`) |
| industry, skill | produção das indústrias da cidade (economy.ts, `om`) |
| exempt, tax | imposto da cidade (economy.ts, `taxed`) |
| control | controle máximo (control.ts) |
| growth | crescimento da população da cidade |
| urban | crescimento de hexes urbanos (growCities) |
| access | acesso ao mercado nacional (markets.ts) |
| famine | sem mortes de fome (events.ts) |
| unrest, legitimacy, research, manpower, construction | país, pelo peso da população da região |
| literacy, culture, skill | permanentes: acumulam no país (`incLiteracy`, `incCulture`, `incSkill`) |
| defense, readiness | modificador no dado de batalhas na região (war.ts, BATTLE_HOOKS) |

## Ainda não

- Ilustrações próprias: hoje cada incentivo usa um ícone do conjunto do jogo.
- Corrupção como sistema próprio (os incentivos de corrupção mexem na arrecadação efetiva e na legitimidade).
