# 🔍 GoodFirstFinder

> **A smart platform for discovering beginner-friendly open-source projects**

GoodFirstFinder helps developers find welcoming GitHub repositories by intelligently ranking projects with a custom health score algorithm. Perfect for beginners looking for their first open-source contribution or experienced developers seeking active, well-maintained projects.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://www.mysql.com/)

---

## 📋 Table of Contents

- Features
- Tech Stack
- Architecture
- Getting Started
- API Documentation
- Database Schema
- Health Score Algorithm
- Environment Variables
- Deployment
- Project Structure
- Contributing
- License
- Acknowledgments
- Support
- Roadmap

---

## ✨ Features

### Core Functionality

- 🎯 **Smart Repository Search** - Search GitHub for repositories with "good first issue" labels
- 📊 **Health Score Ranking** - Custom algorithm combining stars, recency, and community activity (0-100 scale)
- 🔄 **Real-time Data** - Live GitHub API integration with intelligent caching
- 🔐 **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- 🤖 **Background Worker** - Automatic repository data refresh and health score updates
- 🧹 **Auto Cleanup** - Smart TTL-based cleanup prevents database bloat (<500MB storage limit)

### Advanced Features

- 🎨 **Modern UI** - React + TailwindCSS with shadcn-inspired design
- 🔍 **Advanced Filters** - Filter by language, stars, topics, license, update date, and more
- 📈 **Activity Metrics** - Track PRs merged/opened, issues, and mean merge time (30-day windows)
- ⚡ **Rate Limiting** - Built-in rate limiting to prevent API abuse
- 🔄 **ETag Caching** - Efficient GitHub API usage with conditional requests
- 📱 **Responsive Design** - Mobile-friendly interface

---

## 🛠️ Tech Stack

### Backend

| Technology     | Version | Purpose                    |
| -------------- | ------- | -------------------------- |
| **Node.js**    | 18+     | Runtime environment        |
| **Express.js** | 4.19+   | Web framework              |
| **Prisma ORM** | 5.18+   | Database ORM & migrations  |
| **MySQL**      | 8.0+    | Relational database        |
| **JWT**        | 9.0+    | Authentication tokens      |
| **bcryptjs**   | 2.4+    | Password hashing           |
| **axios**      | 1.7+    | HTTP client for GitHub API |
| **node-cron**  | 3.0+    | Background job scheduler   |
| **Pino**       | 9.4+    | Structured logging         |

### Frontend

| Technology       | Version | Purpose                  |
| ---------------- | ------- | ------------------------ |
| **React**        | 18+     | UI library               |
| **Vite**         | 5+      | Build tool & dev server  |
| **React Router** | 6+      | Client-side routing      |
| **TailwindCSS**  | 3+      | Utility-first CSS        |
| **Axios**        | 1.7+    | HTTP client              |
| **jwt-decode**   | 4+      | JWT token parsing        |
| **Radix UI**     | Latest  | Accessible UI components |

### Infrastructure

- **Database**: MySQL (Aiven Cloud)
- **Deployment**: Vercel (Frontend), Render/Railway (Backend)
- **Version Control**: Git/GitHub
- **Package Manager**: npm

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐
│   GitHub API    │
│  (Rate Limited) │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │   Routes   │  │  Services  │  │   Middleware     │  │
│  │ • /auth    │→ │ • GitHub   │  │ • Auth (JWT)     │  │
│  │ • /search  │  │ • Health   │  │ • Rate Limiter   │  │
│  │ • /repos   │  │ • Prisma   │  │ • Error Handler  │  │
│  └────────────┘  └────────────┘  └──────────────────┘  │
│         ↕                                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │              MySQL Database (Prisma)             │  │
│  │  • User  • Repository  • RepoActivity  • Jobs    │  │
│  └──────────────────────────────────────────────────┘  │
│         ↑                                                │
│  ┌──────────────────┐                                   │
│  │  Background Jobs  │                                  │
│  │  • Repo Refresh   │  (node-cron, every 10 sec)      │
│  │  • Auto Cleanup   │  (every 1 hour, TTL: 7 days)    │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
         ↑
         │ REST API (CORS enabled)
         ↓
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (React + Vite)                     │
│  ┌──────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │  Pages   │  │ Components │  │     Services       │  │
│  │ • Home   │  │ • RepoCard │  │ • API Client       │  │
│  │ • Login  │  │ • Filters  │  │ • Auth Context     │  │
│  │ • Signup │  │ • Skeleton │  │                    │  │
│  │ • Details│  │ • Search   │  │                    │  │
│  └──────────┘  └────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. Search Flow (No DB Storage)

```
User Search → Frontend → Backend /api/search
→ GitHub API → Calculate Health Score (on-the-fly)
→ Return Results → Display in UI
```

#### 2. Repository Details Flow (With DB Storage)

```
User Clicks Repo → Frontend → Backend /api/search/:owner/:repo
→ Check DB Cache → Fetch GitHub API (ETag)
→ Store/Update DB → Queue Refresh Job (if stale)
→ Return Data → Display Details
```

#### 3. Background Worker Flow

```
Cron Job (Every 10s) → Fetch Queued Jobs
→ GitHub API (Repo + Activity)
→ Calculate Health Score → Update DB
→ Mark Job Complete
```

#### 4. Cleanup Flow

```
Cron Job (Every 1h) → Find Stale Repos (lastFetchedAt > TTL)
→ Delete from DB (Cascade) → Log Results
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MySQL** 8.0+ (or Aiven Cloud account)
- **GitHub Personal Access Token** ([Create here](https://github.com/settings/tokens))
- **npm** or **yarn**

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/opensearch.git
cd opensearch
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env with your credentials
nano .env  # or use any text editor
```

**Required `.env` configuration:**

```env
PORT=4000
DATABASE_URL="mysql://user:password@host:3306/opensearch"
JWT_SECRET="your-super-secret-key-change-this"
GITHUB_TOKEN="github_pat_xxxxxxxxxxxxx"
LOG_LEVEL="info"
CORS_ORIGIN="http://localhost:5173"
REPO_TTL_DAYS=7
CLEANUP_INTERVAL_HOURS=1
```

```bash
# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start backend server
npm run dev
```

Server runs on **http://localhost:4000**

#### 3. Start Background Worker (Required!)

**Open a new terminal:**

```bash
cd backend
npm run worker
```

The worker processes repository refresh jobs every 10 seconds.

#### 4. Frontend Setup

**Open another terminal:**

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on **http://localhost:5173**

### Verify Installation

1. **Backend Health Check**: Visit http://localhost:4000/api/health

   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend**: Visit http://localhost:5173

   - Should see the GoodFirstFinder homepage

3. **Test Search**: Try searching for "react" or "python"

4. **Check Worker**: Look for log output like:
   ```
   [Worker] Starting job worker cron (runs every 10 seconds)
   [Worker] Processing job...
   ```

---

## 📡 API Documentation

### Base URL

- **Development**: `http://localhost:4000/api`
- **Production**: `https://your-domain.com/api`

---

### 🔓 Public Endpoints

#### **Health Check**

```http
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

#### **Search Repositories**

```http
GET /api/search?q={query}&page={page}&perPage={perPage}&sort={sort}&order={order}
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | _required_ | Search query (supports GitHub syntax) |
| `page` | number | 1 | Page number |
| `perPage` | number | 10 | Results per page (max: 30) |
| `sort` | string | "updated" | Sort by: `updated`, `stars`, `forks`, `best-match` |
| `order` | string | "desc" | Sort order: `asc`, `desc` |

**Example Request:**

```bash
curl "http://localhost:4000/api/search?q=language:python+stars:>100&page=1&perPage=10"
```

**Example Response:**

```json
{
  "totalCount": 1234,
  "items": [
    {
      "id": 12345,
      "fullName": "owner/repo-name",
      "description": "A great beginner-friendly project",
      "stars": 5420,
      "forks": 234,
      "openIssues": 12,
      "defaultBranch": "main",
      "lastCommitAt": "2025-11-10T08:30:00.000Z",
      "language": "Python",
      "htmlUrl": "https://github.com/owner/repo-name",
      "healthScore": 85
    }
  ]
}
```

---

#### **Get Repository Details**

```http
GET /api/search/:owner/:repo
```

**Example:**

```bash
curl "http://localhost:4000/api/search/facebook/react"
```

**Response:**

```json
{
  "id": 1,
  "fullName": "facebook/react",
  "description": "A JavaScript library for building user interfaces",
  "stars": 220000,
  "forks": 45000,
  "openIssues": 1234,
  "healthScore": 92,
  "lastCommitAt": "2025-11-11T12:00:00.000Z",
  "lastFetchedAt": "2025-11-12T10:00:00.000Z",
  "activities": [
    {
      "windowStart": "2025-10-13T00:00:00.000Z",
      "windowEnd": "2025-11-12T00:00:00.000Z",
      "prsMerged": 45,
      "prsOpened": 52,
      "issuesOpened": 89,
      "issuesComment": 456,
      "meanMergeDays": 2.3
    }
  ]
}
```

---

#### **List Stored Repositories (Sorted by Health Score)**

```http
GET /api/repos?page={page}&perPage={perPage}
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `perPage` | number | 12 | Results per page (max: 50) |

**Example:**

```bash
curl "http://localhost:4000/api/repos?page=1&perPage=12"
```

**Response:**

```json
{
  "total": 156,
  "page": 1,
  "perPage": 12,
  "items": [
    {
      "id": 1,
      "fullName": "facebook/react",
      "healthScore": 92,
      "stars": 220000,
      "latestActivity": {
        /* activity object */
      }
    }
  ]
}
```

---

#### **Get Repository Health Score**

```http
GET /api/repos/:id/health
```

**Example:**

```bash
curl "http://localhost:4000/api/repos/1/health"
```

**Response:**

```json
{
  "repositoryId": 1,
  "healthScore": 92,
  "refreshedAt": "2025-11-12T10:00:00.000Z",
  "activity": {
    "prsMerged": 45,
    "prsOpened": 52,
    "issuesOpened": 89,
    "issuesComment": 456,
    "meanMergeDays": 2.3
  }
}
```

---

### 🔐 Protected Endpoints (Require Authentication)

**Authentication Header:**

```
Authorization: Bearer <your-jwt-token>
```

---

#### **Signup**

```http
POST /api/auth/signup
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**

```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-11-12T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### **Login**

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**

```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-11-12T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### **Refresh Repository Data**

```http
POST /api/repos/:id/refresh
Authorization: Bearer <token>
```

**Example:**

```bash
curl -X POST "http://localhost:4000/api/repos/1/refresh" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**

```json
{
  "message": "Refresh queued"
}
```

---

#### **Manual Cleanup**

```http
POST /api/repos/cleanup
Authorization: Bearer <token>
```

**Example:**

```bash
curl -X POST "http://localhost:4000/api/repos/cleanup" \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "message": "Cleanup completed",
  "deletedCount": 42,
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

### Error Responses

All endpoints return errors in this format:

```json
{
  "message": "Error description"
}
```

**Common HTTP Status Codes:**

- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate user)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (PK)         │
│ username        │
│ email           │
│ passwordHash    │
│ createdAt       │
│ updatedAt       │
└─────────────────┘

┌──────────────────────┐
│     Repository       │
├──────────────────────┤
│ id (PK)              │
│ fullName (UNIQUE)    │
│ description          │
│ stars                │
│ forks                │
│ openIssues           │
│ defaultBranch        │
│ lastCommitAt         │
│ hasGoodFirstIssues   │
│ etag                 │
│ lastFetchedAt        │◄────── Used for TTL cleanup
│ healthScore          │
│ healthRefreshedAt    │
│ createdAt            │
│ updatedAt            │
└──────────┬───────────┘
           │
           │ 1:N
           ↓
┌──────────────────────┐
│   RepoActivity       │
├──────────────────────┤
│ id (PK)              │
│ repoId (FK)          │
│ windowStart          │
│ windowEnd            │
│ prsMerged            │
│ prsOpened            │
│ issuesOpened         │
│ issuesComment        │
│ meanMergeDays        │
└──────────────────────┘

┌──────────────────────┐
│      FetchJob        │
├──────────────────────┤
│ id (PK)              │
│ kind                 │ (e.g., "refreshRepo")
│ payload (JSON)       │ { repoId: 123 }
│ status               │ (queued/processing/completed/failed)
│ attempts             │
│ lastError            │
│ createdAt            │
│ updatedAt            │
└──────────────────────┘
```

### Table Details

#### **User**

Stores authentication data for registered users.

| Field          | Type            | Description                 |
| -------------- | --------------- | --------------------------- |
| `id`           | Int (PK)        | Auto-increment primary key  |
| `username`     | String (UNIQUE) | Unique username (lowercase) |
| `email`        | String (UNIQUE) | Unique email (lowercase)    |
| `passwordHash` | String          | bcrypt hash (12 rounds)     |
| `createdAt`    | DateTime        | Account creation timestamp  |
| `updatedAt`    | DateTime        | Last update timestamp       |

#### **Repository**

Cached GitHub repository metadata.

| Field                | Type            | Description                |
| -------------------- | --------------- | -------------------------- |
| `id`                 | Int (PK)        | Auto-increment primary key |
| `fullName`           | String (UNIQUE) | `owner/repo` format        |
| `description`        | Text            | Repo description           |
| `stars`              | Int             | Stargazers count           |
| `forks`              | Int             | Forks count                |
| `openIssues`         | Int             | Open issues count          |
| `defaultBranch`      | String          | Default branch name        |
| `lastCommitAt`       | DateTime        | Last push timestamp        |
| `hasGoodFirstIssues` | Boolean         | Has good first issues      |
| `etag`               | String          | GitHub ETag for caching    |
| `lastFetchedAt`      | DateTime        | **Used for TTL cleanup**   |
| `healthScore`        | Int             | 0-100 health score         |
| `healthRefreshedAt`  | DateTime        | Last health calculation    |

#### **RepoActivity**

30-day activity metrics for repositories.

| Field           | Type     | Description                |
| --------------- | -------- | -------------------------- |
| `id`            | Int (PK) | Auto-increment primary key |
| `repoId`        | Int (FK) | Links to Repository        |
| `windowStart`   | DateTime | 30-day window start        |
| `windowEnd`     | DateTime | 30-day window end          |
| `prsMerged`     | Int      | PRs merged in window       |
| `prsOpened`     | Int      | PRs opened in window       |
| `issuesOpened`  | Int      | Issues opened in window    |
| `issuesComment` | Int      | Total issue comments       |
| `meanMergeDays` | Float    | Average days to merge PR   |

#### **FetchJob**

Background job queue for repository updates.

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `id`        | Int (PK) | Auto-increment primary key           |
| `kind`      | String   | Job type (`refreshRepo`)             |
| `payload`   | JSON     | Job data `{ repoId: 123 }`           |
| `status`    | String   | `queued/processing/completed/failed` |
| `attempts`  | Int      | Retry count (max: 3)                 |
| `lastError` | String   | Error message if failed              |

---

## 🧮 Health Score Algorithm

The health score is a **0-100 metric** that ranks repositories based on multiple factors:

### Formula

```
Health Score = 30 × Recency Score
             + 10 × Stars Score
             + 10 × Open Issues Score
             + 25 × PRs Opened Score
             + 15 × PRs Merged Score
             + 10 × Issues Opened Score
```

### Factor Breakdown

| Factor            | Weight | Full Score Threshold        | Description                 |
| ----------------- | ------ | --------------------------- | --------------------------- |
| **Recency**       | 30%    | Last commit within 180 days | Prioritizes active projects |
| **Stars**         | 10%    | 10,000+ stars (log scale)   | Popularity indicator        |
| **Open Issues**   | 10%    | 100+ open issues            | Community engagement        |
| **PRs Opened**    | 25%    | 20+ PRs in 30 days          | Active contribution         |
| **PRs Merged**    | 15%    | 10+ merged in 30 days       | Maintainer responsiveness   |
| **Issues Opened** | 10%    | 10+ issues in 30 days       | Active community            |

### Scoring Logic

#### 1. Recency (30 points)

```javascript
recency = max(0, 1 - (daysOld / 180))
score = recency × 30
```

#### 2. Stars (10 points, logarithmic)

```javascript
stars_score = min(log10(stars + 1) / 4, 1)
score = stars_score × 10
```

#### 3. Open Issues (10 points)

```javascript
issues_score = min(openIssues / 100, 1)
score = issues_score × 10
```

#### 4. PRs Opened (25 points)

```javascript
prs_opened_score = min(prsOpened / 20, 1)
score = prs_opened_score × 25
```

#### 5. PRs Merged (15 points)

```javascript
prs_merged_score = min(prsMerged / 10, 1)
score = prs_merged_score × 15
```

#### 6. Issues Opened (10 points)

```javascript
issues_opened_score = min(issuesOpened / 10, 1)
score = issues_opened_score × 10
```

### Example Calculation

**Repository:** `facebook/react`

- Last Commit: 5 days ago
- Stars: 220,000
- Open Issues: 1,234
- PRs Opened (30d): 52
- PRs Merged (30d): 45
- Issues Opened (30d): 89

**Calculation:**

```
Recency:      1.0 × 30 = 30.0
Stars:        1.0 × 10 = 10.0
Open Issues:  1.0 × 10 = 10.0
PRs Opened:   1.0 × 25 = 25.0
PRs Merged:   1.0 × 15 = 15.0
Issues Opened: 1.0 × 10 = 10.0
─────────────────────────────
Total Health Score = 100
```

### Health Score Ranges

- **80-100** 🟢 Excellent - Highly active, well-maintained
- **60-79** 🟡 Good - Active with regular updates
- **40-59** 🟠 Fair - Moderate activity
- **0-39** 🔴 Low - Inactive or minimal activity

---

## ⚙️ Environment Variables

### Backend Configuration

Create `backend/.env` file:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database (MySQL)
DATABASE_URL="mysql://user:password@host:3306/opensearch?ssl-mode=REQUIRED"

# Authentication
JWT_SECRET="your-super-secret-key-minimum-32-characters"

# GitHub API
GITHUB_TOKEN="github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Logging
LOG_LEVEL="info"  # Options: trace, debug, info, warn, error, fatal

# CORS
CORS_ORIGIN="http://localhost:5173,https://yourdomain.com"

# Storage Optimization
REPO_TTL_DAYS=7                    # Days to keep repos before cleanup
CLEANUP_INTERVAL_HOURS=1           # Cleanup frequency

# Worker Configuration (Optional)
CRON_SCHEDULE="*/10 * * * * *"     # Worker interval (default: every 10 seconds)
```

### Frontend Configuration

Create `frontend/.env`:

```env
# API Base URL
VITE_API_BASE=http://localhost:4000/api

# Optional: Environment
VITE_ENV=development
```

### Getting a GitHub Token

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scopes:
   - ✅ `public_repo` (access public repositories)
   - ✅ `read:org` (optional, for organization repos)
4. Copy the token and add to `.env` file

**Rate Limits:**

- Without token: 60 requests/hour
- With token: 5,000 requests/hour

---

## 🚢 Deployment

### Frontend (Vercel)

1. **Push to GitHub**
2. **Import to Vercel**: https://vercel.com/new
3. **Configure Build Settings**:

   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `frontend`

4. **Add Environment Variables**:

   ```
   VITE_API_BASE=https://your-backend-url.com/api
   ```

5. **Deploy** 🚀

### Backend (Render / Railway)

#### Render

1. **Create Web Service**: https://dashboard.render.com/new/web-service
2. **Connect GitHub Repo**
3. **Configure**:

   - Name: `opensearch-backend`
   - Environment: `Node`
   - Build Command: `cd backend && npm install && npx prisma generate`
   - Start Command: `cd backend && npm start`
   - Root Directory: Leave blank

4. **Add Environment Variables** (all from backend `.env`)

5. **Create Background Worker** (separate service):
   - Build Command: Same as above
   - Start Command: `cd backend && npm run worker`

#### Railway

1. **New Project**: https://railway.app/new
2. **Deploy from GitHub**
3. **Add Services**:

   - **API Service**: Start command = `cd backend && npm start`
   - **Worker Service**: Start command = `cd backend && npm run worker`
   - **MySQL Database**: Railway provides managed MySQL

4. **Add Environment Variables**

### Database (Aiven)

1. **Create MySQL Service**: https://console.aiven.io
2. **Copy Connection String**
3. **Run Migrations**:
   ```bash
   cd backend
   DATABASE_URL="mysql://..." npx prisma db push
   ```

### Important: Run Both Backend Processes

⚠️ **You MUST run both:**

1. **API Server** (`npm start`) - Handles HTTP requests
2. **Worker** (`npm run worker`) - Processes background jobs

On Render/Railway, create **2 separate services** from the same repo.

---

## 📁 Project Structure

```
opensearch/
├── backend/
│   ├── src/
│   │   ├── app.js                      # Express server entry point
│   │   ├── jobs/
│   │   │   ├── cleanupRepos.js         # Auto cleanup logic (TTL-based)
│   │   │   └── jobWorker.js            # Background worker (cron)
│   │   ├── middleware/
│   │   │   └── authMiddleware.js       # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js                 # Signup/login endpoints
│   │   │   ├── repos.js                # Repository CRUD operations
│   │   │   └── search.js               # GitHub search proxy
│   │   ├── services/
│   │   │   ├── githubService.js        # GitHub API wrapper
│   │   │   ├── healthScore.js          # Health score algorithm
│   │   │   └── prismaClient.js         # Database client singleton
│   │   └── utils/
│   │       └── rateLimiter.js          # Token bucket rate limiter
│   ├── prisma/
│   │   └── schema.prisma               # Database schema
│   ├── package.json
│   ├── env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Root component + routing
│   │   ├── main.jsx                    # React entry point
│   │   ├── pages/
│   │   │   ├── Home.jsx                # Search + results page
│   │   │   ├── Login.jsx               # Login form
│   │   │   ├── Signup.jsx              # Signup form
│   │   │   └── RepoDetails.jsx         # Repository detail page
│   │   ├── components/
│   │   │   ├── FilterSidebar.jsx       # Advanced search filters
│   │   │   ├── RepoCard.jsx            # Repository card component
│   │   │   ├── SearchBar.jsx           # Search input
│   │   │   └── Skeleton.jsx            # Loading skeleton
│   │   ├── services/
│   │   │   └── api.js                  # Axios client with interceptors
│   │   └── index.css                   # Tailwind styles
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── README.md
├── HEALTH_SCORE_GUIDE.md              # Health score documentation
├── STORAGE_OPTIMIZATION.md            # Storage strategy guide
└── README.md                          # This file
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**:

   ```bash
   # Backend
   cd backend
   npm run lint

   # Frontend
   cd frontend
   npm run build  # Check for build errors
   ```

5. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Areas for Contribution

- 🐛 **Bug Fixes** - Check [Issues](https://github.com/yourusername/opensearch/issues)
- ✨ **New Features** - See [Feature Requests](https://github.com/yourusername/opensearch/labels/enhancement)
- 📝 **Documentation** - Improve guides, add examples
- 🎨 **UI/UX** - Design improvements
- ⚡ **Performance** - Optimize queries, reduce API calls
- 🧪 **Testing** - Add unit/integration tests

### Code Style

- **Backend**: Use ESLint (Standard style)
- **Frontend**: Prettier with default settings
- **Naming**: camelCase for variables/functions, PascalCase for components

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **GitHub API** - For providing comprehensive repository data
- **Prisma** - Excellent ORM and database toolkit
- **Aiven** - Reliable managed MySQL hosting
- **Vercel** - Lightning-fast frontend hosting
- **TailwindCSS** - Beautiful utility-first CSS framework
- **Radix UI** - Accessible component primitives

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/opensearch/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/opensearch/discussions)
- **Email**: support@opensearch.com

---

## 🗺️ Roadmap

### Version 1.1

- [ ] Add favorites/bookmarks feature
- [ ] Email notifications for repo updates
- [ ] User profile pages
- [ ] Repository comparison tool

### Version 1.2

- [ ] GraphQL API support
- [ ] Redis caching layer
- [ ] Advanced analytics dashboard
- [ ] GitHub OAuth integration

### Version 2.0

- [ ] Multi-platform support (GitLab, Bitbucket)
- [ ] AI-powered project recommendations
- [ ] Contributor matching system
- [ ] Mobile app (React Native)

---

<div align="center">

**Made with ❤️ by the GoodFirstFinder Team**

⭐ Star us on GitHub if you find this helpful!

[Report Bug](https://github.com/yourusername/opensearch/issues) · [Request Feature](https://github.com/yourusername/opensearch/issues) · [Documentation](https://github.com/yourusername/opensearch/wiki)

</div>
