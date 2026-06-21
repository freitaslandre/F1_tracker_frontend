# Project Information

## Group Members

- Student 1: Afonso Neiva
- Student 2: André Freitas
- Student 3: Diogo Viana

## Project Theme

F1 Tracker / F1 Race Manager Pessoal

## Project Description

Aplicacao web sobre Formula 1 que permite a cada utilizador consultar corridas por epoca, ver detalhes de Grandes Premios, guardar circuitos favoritos, votar no Piloto do Dia e criar uma equipa Fantasy F1 com pilotos e construtores.

## External API Used

- API name: Jolpica F1 Results Scraper via Apify
- API link: https://apify.com/jungle_synthesizer/jolpica-f1-results-scraper/api/openapi
- Requires API key? Yes, configured in the backend with `APIFY_TOKEN`

## Backend Repository

- Link: ../F1_tracker_backend

## Main Features

1. Authentication pages for register, login, session check and logout.
2. Dashboard with Formula 1 races by season.
3. Race detail page with race results, circuit information, favorites and Driver of the Day voting.
4. User profile with saved favorites, votes and fantasy team.
5. Fantasy F1 team builder with budget limit, saved team, scoring and leaderboard.

## Pages

- Auth: `/auth`
- Home/Dashboard: `/dashboard`
- Race list: `/dashboard`
- Race detail: `/races/:season/:round`
- Fantasy team: `/fantasy`
- User profile: `/profile`

## Data Stored in the Backend

- Users
- Session/authentication data through secure cookies
- Favorite circuits
- Driver of the Day votes
- Fantasy teams
- Fantasy scores and leaderboard data

## Frontend Technologies

- Angular 21
- TypeScript
- Angular Router
- Angular HttpClient
- RxJS
- CSS

## Notes

The frontend expects the backend API at `http://localhost:3000/api` during local development. In production it points to `https://f1-tracker-backend-ahni.onrender.com/api`.
