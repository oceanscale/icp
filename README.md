# Dossiê ICP

Sistema da operação comercial da Oceanscale para estruturar o comercial das empresas atendidas no treinamento. Cada empresa é um **caso**; cada linha de produto da empresa percorre 8 pastas, e cada pasta entregue abre a próxima:

| Pasta | O que entrega |
| --- | --- |
| 01 Empresa | Pitch, diferenciais, time, ferramentas e as linhas de produto (vale para o caso todo) |
| 02 ICP | Entrevista de carteira com 3 a 5 clientes reais, ICP principal e secundário, persona decisora e retrato gerado por IA |
| 03 Playbook | Checklist de implantação (cada item vale XP), critério de lead qualificado, perguntas SPIN, objeções A.R.A., rituais e indicadores |
| 04 Roteiros | Cold call de 4 minutos, e-mail, WhatsApp, LinkedIn e respostas rápidas a objeções |
| 05 Funil | Etapas para o Kanban do CRM: critério de entrada e saída, dono, prazo, conversão de referência; exporta CSV |
| 06 Ads | Pautas semanais de criativo e copy (formato, fase, foco), com links e prints de anúncios de concorrentes |
| 07 Automações | Cadência de 15 dias, templates do WhatsApp oficial por categoria da Meta, regras de follow-up |
| 08 Simulador | Custo por disparo e por lead, reuniões, custo por reunião e a conta de trás para frente a partir da meta |

**Jogo:** cada pasta tem missões (automáticas, que o sistema marca quando a entrega existe, e manuais, que o time marca). Missões dão XP, pasta resolvida dá +50 XP, o caso sobe de nível (Improviso, Estruturando, Processo definido, Previsível, Escalável) e o mural mostra o ranking do time. A pasta seguinte só abre quando a peça-chave da anterior existe, e o servidor também confere isso.

PDF (pela impressão do navegador, em layout neutro), Markdown e CSV saem de cada pasta.

## Acesso

- **Consultor** (papel `admin`): abre casos, vê todos e convida pessoas e outros consultores.
- **Gestor** do caso: convida e remove pessoas do caso, muda papéis e gera link de nova senha.
- **Membro** do caso: preenche pastas, gera com IA e cumpre missões.

Login com e-mail e senha (PBKDF2-SHA256 com 100.000 iterações, sessão em cookie HttpOnly de 30 dias). Ninguém se cadastra sozinho: entra por **link de convite** (vale 7 dias, uso único) que o gestor ou o consultor copia e envia pelo WhatsApp. "Esqueci a senha" também é por link (48 horas) gerado pelo gestor. Cinco senhas erradas seguidas bloqueiam o e-mail por 15 minutos.

## Estrutura

- `src/`: front-end (React + Vite). `src/pages` (entrada, convite, casos, caso), `src/pastas` (uma por pasta), `src/components`.
- `src/ds/`: componentes e estilos do Design System (fonte única). `npm run build:ds` regenera `design-system/project/components/bundle.js` e `bundle.css`.
- `design-system/project/`: o Design System publicado (tokens, brand book, guia e preview de cada componente). `tokens.json` é a fonte dos tokens; `npm run build` gera `src/ds/tokens.css`.
- `shared/game.js`: regras do jogo (pastas, missões, XP, níveis, desbloqueio), usadas pelo Worker e pelo front.
- `worker/`: API no Cloudflare Worker. `store.js` é o Durable Object com SQLite (usuários, sessões, convites, casos, pastas, missões, mural, imagens); `ai.js` chama o Claude com saída estruturada por pasta; `images.js` gera o retrato no Workers AI.

## Publicação (Cloudflare Workers)

Mesmo esquema do sondagem. No painel da Cloudflare, **Workers e Pages > Criar > Importar um repositório**, escolha `oceanscale/icp` e use:

- Comando de build: `npm run build`
- Comando de deploy: `npx wrangler deploy`

Depois do primeiro deploy, em **Configurações > Variáveis e segredos** do Worker `dossie-icp`, crie como tipo **Segredo**:

| Segredo | Para quê |
| --- | --- |
| `ANTHROPIC_API_KEY` | Geração das pastas com Claude |
| `SETUP_TOKEN` | Código do primeiro acesso: uma frase longa que só você sabe |

Variáveis de texto ficam no `wrangler.jsonc` (o deploy apaga as que existem só no painel):

- `ADS_WEEKLY_LIMIT`: pedidos de pauta de anúncio por linha por semana (padrão 3).
- `AI_MODEL` (opcional): `claude-opus-5-5` é o padrão; `claude-sonnet-5-5` custa metade (US$ 2 / US$ 10 por milhão de tokens contra US$ 4 / US$ 20).

O banco (Durable Object `DOSSIE` com SQLite) e o Workers AI (binding `AI`) são criados pelo próprio deploy, sem passo manual.

### Primeiro acesso

1. Abra `https://<seu-worker>/#/primeiro-acesso`.
2. Informe o `SETUP_TOKEN`, seu nome, e-mail e senha. Esse é o primeiro consultor.
3. O primeiro acesso só funciona uma vez. Depois disso, pode apagar o segredo `SETUP_TOKEN`.
4. Em **Casos > Abrir novo caso**, crie a empresa. No caso, **Time do caso > Convidar** gera o link para o gestor e o time do cliente.

Confira a configuração em `/api/health` (`anthropic` e `portrait` dizem se a IA e o retrato estão ligados).

### Pontos de atenção

- **Plano grátis do Workers:** o limite de CPU por requisição é baixo, e o cálculo da senha no login e no convite é pesado de propósito. Se o login devolver erro 1102 (limite de recursos), a saída é o Workers Paid (US$ 5 por mês) ou baixar `PBKDF2_ITERATIONS` nas variáveis, o que deixa a senha mais fácil de quebrar se o banco vazar.
- **Retrato do decisor:** usa o modelo FLUX.1 schnell do Workers AI, que tem cota diária gratuita. Quantas imagens cabem na cota depende da tabela de preços atual do Workers AI. Cada linha guarda os 3 retratos mais recentes.
- **Bibliotecas de anúncios:** o servidor não lê os links da Meta, LinkedIn ou TikTok (não há API aberta para anúncios comerciais no Brasil). O link fica registrado; o que a IA analisa são os prints enviados.
- **Custo do WhatsApp:** o simulador não traz preços prontos. Use os valores por categoria da fatura do seu provedor da API oficial.

## Rodando

```bash
npm install
npm run build && npx wrangler dev   # app + API em http://localhost:8787 (segredos em .dev.vars)
npm run dev                         # só o front em http://localhost:5173, com /api apontando para o wrangler dev
npm run build:ds                    # regenera o bundle do Design System
npx wrangler deploy --dry-run       # confere a configuração sem publicar
```

`.dev.vars` (não vai para o git):

```
SETUP_TOKEN=uma-frase-local
ANTHROPIC_API_KEY=sk-ant-...
```

O binding de Workers AI exige conta Cloudflare mesmo em modo local; sem ela, rode com uma cópia do `wrangler.jsonc` sem o bloco `ai` e o botão de retrato mostra o aviso de que não está ligado.
