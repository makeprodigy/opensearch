# Open Search (GoodFirstFinder)

Open-source platform that helps developers discover welcoming GitHub repositories by ranking projects with a custom health score.

## Features

- Searches GitHub repositories for issues labelled "good first issue"
- Smart storage with automatic cleanup to prevent database bloat (see [STORAGE_OPTIMIZATION.md](STORAGE_OPTIMIZATION.md))
- Calculates a health score combining stars, recency, and community activity
- Background worker re-fetches repository stats on a schedule
- JWT-based authentication for queueing refreshes and personalisation
- React + Tailwind frontend with modern UI (shadcn-inspired styling)
- Automatic repository cleanup with configurable TTL (time-to-live)

## Getting Started

### Backend

```bash
cd backend
npm install
cp env.example .env
npx prisma db push
npm run dev
```

In another terminal run the worker:

```bash
npm run worker
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is available at http://localhost:5173 with the backend at http://localhost:4000.

## Configuration

See `backend/env.example` for all available environment variables. Key settings:

- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: Secret for JWT token generation
- `GITHUB_TOKEN`: GitHub personal access token for API access
- `REPO_TTL_DAYS`: Days to keep repository data before cleanup (default: 7)
- `CLEANUP_INTERVAL_HOURS`: Frequency of cleanup job (default: 1)

## Deployment

- Frontend: deploy to Vercel (set `VITE_API_BASE` to backend URL)
- Backend: deploy to Render/Railway, configure environment variables (`DATABASE_URL`, `JWT_SECRET`, `GITHUB_TOKEN`, etc.)
- See [STORAGE_OPTIMIZATION.md](STORAGE_OPTIMIZATION.md) for production recommendations

## Contributing

Pull requests welcome! See `backend/README.md` and `frontend/README.md` for architecture details and development tips.

