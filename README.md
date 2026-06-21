# F1 Tracker Frontend

Frontend Angular do projeto F1 Tracker, uma aplicacao web para consultar informacao de Formula 1, acompanhar corridas por epoca, ver detalhes de cada Grande Premio, guardar circuitos favoritos, votar no Piloto do Dia e gerir uma equipa Fantasy F1 pessoal.
Frontend: https://f1-race-manager.web.app
## Tecnologias

- Angular 21
- TypeScript
- Angular Router
- Angular HttpClient
- RxJS
- CSS

## Funcionalidades

- Registo, login, validacao de sessao e logout.
- Dashboard com corridas de Formula 1 por epoca.
- Pagina de detalhe de corrida com resultados e informacao do circuito.
- Voto pessoal no Piloto do Dia.
- Gestao de circuitos favoritos.
- Perfil do utilizador com favoritos, votos e equipa fantasy guardada.
- Area Fantasy F1 para escolher 5 pilotos e 2 construtores dentro de um limite de orcamento.
- Leaderboard fantasy e pontuacao de corridas.

## Ligacao ao backend

O frontend usa o backend configurado em `src/app/core/config/api.config.ts`:

- Em desenvolvimento: `http://localhost:3000/api`
- Em producao: `https://f1-tracker-backend-ahni.onrender.com/api`

As chamadas de autenticacao usam cookies HTTP com `withCredentials: true`, por isso o backend deve permitir a origem do frontend em `FRONTEND_URL`.

## Instalar dependencias

```bash
npm install
```

## Executar localmente

```bash
npm start
```

Depois abrir:

```text
http://localhost:4200
```

Para a aplicacao funcionar por completo, o backend deve estar ativo em `http://localhost:3000`.

## Scripts disponiveis

```bash
npm start
npm run build
npm run lint
npm run test:ci
npm run validate
npm run quality
npm run grade
```

- `start`: arranca o servidor Angular de desenvolvimento.
- `build`: gera a build de producao.
- `lint`: valida qualidade de codigo com ESLint.
- `test:ci`: executa testes unitarios em Chrome Headless.
- `validate`: verifica a estrutura minima exigida pelo projeto.
- `quality`: executa validacao, lint, testes e build.
- `grade`: gera a avaliacao automatica do template.

No Windows, o npm run grade original da template pode dar falso por erro ao chamar npm.cmd; os comandos individuais passam.

## Paginas principais

- `/auth`: registo e login.
- `/dashboard`: lista e resumo de corridas.
- `/races/:season/:round`: detalhe de uma corrida.
- `/fantasy`: criacao e gestao da equipa Fantasy F1.
- `/profile`: dados do utilizador, favoritos, votos e equipa guardada.

## Estrutura principal

```text
src/app/
+-- core/
|   +-- config/       # configuracao da API
|   +-- guards/       # protecao de rotas
|   +-- models/       # interfaces TypeScript
|   +-- services/     # servicos de autenticacao e Formula 1
+-- features/
|   +-- auth/
|   +-- dashboard/
|   +-- fantasy/
|   +-- profile/
|   +-- race-detail/
+-- shared/
```

## Notas

- As rotas principais estao protegidas pelo `authGuard`.
- A sessao e validada atraves de `GET /api/auth/me`.
- Os dados de corridas e classificacoes sao obtidos pelo backend atraves do Actor Jolpica F1 Results Scraper na Apify.
