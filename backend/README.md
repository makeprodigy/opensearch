# GoodFirstFinder Backend

Node.js + Express service that powers the GoodFirstFinder experience. Responsible for:

- Managing user accounts with JWT authentication
- Querying the GitHub API and caching repository metadata
- Calculating repository health scores
- Running background jobs to refresh data

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and update the values:

   - `DATABASE_URL`: MySQL connection string (Aiven or local dev)
   - `JWT_SECRET`: random string used to sign tokens
   - `GITHUB_TOKEN`: optional, but recommended to avoid low rate limits
   - `CRON_SCHEDULE`: cron expression for the worker (defaults to every 5 minutes)

3. Push the Prisma schema to your database:

   ```bash
   npx prisma db push
   ```

4. Start the API server:

   ```bash
   npm run dev
   ```

5. Start the background worker in a separate terminal:

   ```bash
   npm run worker
   ```

## Project Structure

- `src/app.js` — Express entry point
- `src/routes/` — HTTP route handlers (auth, search, repos)
- `src/middleware/` — shared Express middlewares
- `src/services/` — integrations with GitHub + health score logic
- `src/jobs/jobWorker.js` — cron-based background worker
- `prisma/schema.prisma` — database schema

## Testing the API

After seeding data, try the following endpoints:

- `POST /api/auth/signup` — create test account
- `POST /api/auth/login` — obtain JWT
- `GET /api/search?q=react` — search GitHub for good first issues
- `GET /api/repos` — list cached repositories by health score
- `POST /api/repos/:id/refresh` — queue refresh (requires JWT)

Add your preferred test runner or contract tests as you expand the project.

