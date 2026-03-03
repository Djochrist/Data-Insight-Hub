# Data Insight Hub

Application web pour importer/analyser des datasets (CSV côté client) et visualiser des métriques via une API `/api/datasets`.

## Sommaire

- Fonctionnalités
- Stack
- Architecture
- Pré-requis
- Démarrage (local)
- Scripts
- API
- Déploiement sur Vercel
- Variables d’environnement
- Sécurité & limites
- Roadmap “prod-ready”

## Fonctionnalités

- Import CSV côté client (pas d’upload de fichier brut).
- Inférence de colonnes + envoi des données en JSON vers l’API.
- Listing / création / suppression de datasets via REST.
- UI React + graphiques (Recharts) + export PNG (html2canvas).

## Stack

- Frontend : Vite + React + TypeScript + Tailwind.
- Backend (local dev) : Node.js + Express (API + serveur dev Vite).
- Backend (prod sur Vercel) : Python Serverless Functions (dossier `api/`).

> Remarque : sur Vercel, le backend Node/Express **n’est pas utilisé**. Les routes `/api/*` sont servies par les fonctions Python.

## Architecture

- `client/` : SPA Vite/React.
- `shared/` : schémas/types partagés (routes + schéma dataset).
- `server/` : serveur Express (utile pour le dev local).
- `api/` : fonctions serverless Python pour Vercel.

## Pré-requis

- Node.js 20+ recommandé.
- Python 3.x (uniquement pour exécuter/valider localement les fonctions Vercel si besoin ; pas nécessaire pour `npm run dev`).

## Démarrage (local)

1) Installer les dépendances

```bash
npm install
```

2) Configurer l’environnement

```bash
cp .env.example .env
```

3) Lancer en dev

```bash
npm run dev
```

- Frontend + API (Express) : `http://localhost:5000`

## Scripts

- `npm run dev` : serveur Express + Vite (dev).
- `npm run build` : build complet (client + bundle server Node).
- `npm run build:vercel` : build **frontend** pour Vercel (sortie `client/dist`).
- `npm run start` : démarre le bundle Node (`dist/index.cjs`) en production (hors Vercel).
- `npm run check` : TypeScript (noEmit).

## API

Routes utilisées par le client :

- `GET /api/datasets` : liste
- `GET /api/datasets/:id` : détail
- `POST /api/datasets` : création
- `DELETE /api/datasets/:id` : suppression

### Auth

- `POST /api/auth/register` : création d’utilisateur (bootstrap)
- `POST /api/auth/login` : connexion (retourne un token)
- `GET /api/auth/me` : session courante
- `POST /api/auth/logout` : invalide la session

Le frontend utilise `Authorization: Bearer <token>`.

### Contrat (simplifié)

`POST /api/datasets`

```json
{
  "name": "string",
  "columns": [{ "key": "string", "name": "string", "type": "string" }],
  "data": [{ "...": "..." }]
}
```
