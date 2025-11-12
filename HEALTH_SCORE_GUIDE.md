# Health Score & Repository Fetching Guide

## ✅ Authentication Status

Your JWT authentication is **WORKING PERFECTLY**:

- ✅ Signup creates users with bcrypt-hashed passwords
- ✅ Login verifies credentials and returns JWT tokens
- ✅ User data is stored in MySQL database
- ✅ Protected routes verify JWT tokens
- ✅ Frontend automatically attaches tokens to requests

**Verified:** 2 test users successfully created and logged in.

---

## 🎯 Fetching Repos by Health Score

### Health Score Formula (0-100 points)

Your health score is calculated in `backend/src/services/healthScore.js`:

- **40 points** - Recency (commits within 180 days)
- **30 points** - Stars (logarithmic scale)
- **20 points** - Pull Request Activity
- **10 points** - Issue Activity

### API Endpoints

#### 1. **Get Repos Sorted by Health Score (Best First)**

```bash
GET /api/repos?page=1&perPage=12
```

**Response:**

```json
{
  "total": 50,
  "page": 1,
  "perPage": 12,
  "items": [
    {
      "id": 26,
      "fullName": "lynx-family/lynx",
      "description": "...",
      "stars": 13414,
      "healthScore": 70,
      "lastCommitAt": "2025-11-12T06:17:12.000Z",
      "latestActivity": {...}
    },
    // ... more repos sorted by healthScore DESC
  ]
}
```

#### 2. **Get Specific Repo's Health Score**

```bash
GET /api/repos/:id/health
```

**Example:**

```bash
GET /api/repos/26/health
```

**Response:**

```json
{
  "repositoryId": 26,
  "healthScore": 70,
  "refreshedAt": "2025-11-12T06:15:00.000Z",
  "activity": {
    "prsMerged": 45,
    "prsOpened": 50,
    "issuesOpened": 100,
    "issuesComment": 234,
    "meanMergeDays": 3.5
  }
}
```

#### 3. **Refresh a Repo's Data (Protected - Requires Auth)**

```bash
POST /api/repos/:id/refresh
Authorization: Bearer <your-jwt-token>
```

---

## 💻 Frontend Usage

### Fetch Top Repos in React

```javascript
import api from "../services/api.js";

async function fetchTopRepos() {
  const response = await api.get("/repos", {
    params: {
      page: 1,
      perPage: 12,
    },
  });

  // Repos are already sorted by healthScore DESC
  console.log("Top repo:", response.data.items[0]);
  console.log("Health score:", response.data.items[0].healthScore);
}
```

### Get Single Repo Health Score

```javascript
async function getRepoHealth(repoId) {
  const response = await api.get(`/repos/${repoId}/health`);
  return response.data;
}
```

### Refresh Repo Data (Requires Login)

```javascript
async function refreshRepo(repoId) {
  const response = await api.post(`/repos/${repoId}/refresh`);
  return response.data;
}
```

---

## 🔍 Database Queries

### Direct Prisma Queries

If you need to query the database directly:

```javascript
import prisma from "./services/prismaClient.js";

// Get top 10 repos by health score
const topRepos = await prisma.repository.findMany({
  orderBy: { healthScore: "desc" },
  take: 10,
  include: {
    activities: {
      orderBy: { windowEnd: "desc" },
      take: 1,
    },
  },
});

// Get repos with health score > 50
const healthyRepos = await prisma.repository.findMany({
  where: {
    healthScore: { gt: 50 },
  },
  orderBy: { healthScore: "desc" },
});

// Get repos with recent commits
const activeRepos = await prisma.repository.findMany({
  where: {
    lastCommitAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    },
  },
  orderBy: { healthScore: "desc" },
});
```

---

## 📊 Current Database Stats

**Users:** 2 test users created
**Repositories:** 26+ repos indexed
**Top Health Score:** 70/100

### Top 5 Repos by Health Score:

1. **lynx-family/lynx** - Score: 70, Stars: 13,414
2. **Homebrew/homebrew-cask** - Score: 70, Stars: 21,651
3. **rapidsai/cudf** - Score: 70, Stars: 9,320
4. **optuna/optuna** - Score: 70, Stars: 13,013
5. **metabase/metabase** - Score: 70, Stars: 44,533

---

## 🐛 Bug Fixed

Fixed a bug in the `/api/repos/:id/refresh` endpoint where the Prisma JSON query was malformed:

**Before:**

```javascript
payload: { path: ["repoId"], equals: repoId }
```

**After:**

```javascript
payload: { path: "repoId", equals: repoId }
```

---

## 🚀 Quick Start

### Start Backend Server

```bash
cd backend
npm run dev
```

### Start Frontend

```bash
cd frontend
npm run dev
```

### Test Authentication

```bash
# Signup
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"myuser","email":"user@example.com","password":"MyPassword123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"MyPassword123"}'
```

### Get Top Repos

```bash
curl http://localhost:4000/api/repos?page=1&perPage=5
```

---

## 🔐 Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire after 7 days
- JWT_SECRET is stored in `.env` file
- Protected routes verify token on each request
- Frontend automatically includes token in API requests

---

## 📝 Environment Variables

Ensure your `.env` file has:

```env
PORT=4000
DATABASE_URL="mysql://user:password@host:3306/opensearch"
JWT_SECRET="your-strong-secret-key"
GITHUB_TOKEN="github_pat_xxxxx"
LOG_LEVEL="info"
CORS_ORIGIN="http://localhost:5173"
```

---

## Next Steps

To improve health scoring, you can:

1. **Adjust weights** in `healthScore.js` to prioritize different factors
2. **Add more metrics** like contributor count, issue response time
3. **Filter by health score** in the frontend UI
4. **Show health score badges** on repo cards
5. **Add health score trends** over time
