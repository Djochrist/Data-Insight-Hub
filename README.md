# Data Insight Hub

Application web d’analyse descriptive pour fichiers CSV. Les données sont importées côté client, conservées dans le navigateur et exploitées pour produire des indicateurs statistiques et des visualisations sur les variables quantitatives.

## Fonctionnalités

- Import de fichiers CSV depuis le navigateur.
- Détection automatique des colonnes numériques.
- Conservation locale des jeux de données entre deux sessions via le stockage du navigateur.
- Exploration tabulaire des données importées.
- Analyse descriptive : moyenne, médiane, mode, variance, écart-type, quartiles, étendue et IQR.
- Visualisations : histogramme, polygone de fréquences et lecture synthétique de la dispersion.
- Export des visuels au format PNG.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Papa Parse

## Fonctionnement

L’application est actuellement conçue comme une SPA frontend-only.

- Aucun backend n’est nécessaire pour l’usage principal.
- Les fichiers importés ne sont pas envoyés vers une base distante.
- Les jeux de données sont enregistrés localement dans le navigateur de l’utilisateur.

Cette approche convient pour un usage personnel, une démonstration ou un outil léger d’analyse locale.

## Démarrage local

```bash
npm install
npm run dev
```

L’application est ensuite accessible localement via le serveur de développement Vite.

## Scripts utiles

- `npm run dev` : lance l’environnement de développement.
- `npm run build:vercel` : génère le build de production pour Vercel.
- `npm run check` : vérifie le typage TypeScript.

## Déploiement

Le projet est déployé sur Vercel :

https://data-insight-hub-chi.vercel.app/

## Limites actuelles

- Les données restent liées au navigateur et à l’appareil utilisés.
- Les jeux de données ne sont pas partagés entre plusieurs utilisateurs.
- Le stockage local n’est pas adapté à de très gros volumes de données.

## Évolution possible

Si un stockage centralisé devient nécessaire, l’application pourra être étendue avec un backend et une base de données afin de gérer des jeux de données partagés et persistants côté serveur.
```
