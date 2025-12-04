# GoodFirstFinder Frontend

React + Vite single-page application for the GoodFirstFinder experience. Highlights repositories with "good first issues" and visualises their health scores.

## Setup

```bash
npm install
npm run dev
```

Environment variables (set in `.env` at the project root):

- `VITE_API_BASE` – defaults to `http://localhost:4000/api`

## Available Scripts

- `npm run dev` – start development server at http://localhost:5173
- `npm run build` – production build
- `npm run preview` – preview built app
- `npm run lint` – lint source files

## Project Structure

- `src/App.jsx` — router + global layout
- `src/pages/` — route-level screens (home, repo detail, auth)
- `src/components/` — UI blocks
- `src/services/api.js` — Axios instance with auth token injection

## Styling

TailwindCSS is configured via `tailwind.config.js`. The design system includes a `brand` color that aligns with the backend scoring brand.

