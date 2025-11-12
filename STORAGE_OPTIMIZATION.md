# Storage Optimization Guide

## Problem Statement

Previously, the application was storing every repository returned from GitHub search results in the database. This caused unlimited database growth and would eventually exceed the 500MB storage limit.

## Solution Overview

We've implemented a **session-based caching strategy** with automatic cleanup to prevent database bloat:

### 1. **Search Results Are No Longer Persisted**

- Search results from `/api/search` are now returned directly from GitHub API
- Health scores are calculated on-the-fly without database storage
- This eliminates the bulk of unnecessary data storage

### 2. **Selective Repository Storage**

Repositories are only stored when:
- Users explicitly view repository details via `/api/search/:owner/:repo`
- Background jobs need to track repository metadata

### 3. **Automatic Cleanup (TTL-based)**

A background cleanup job automatically removes stale repositories that haven't been accessed recently:
- **Default TTL**: 7 days (configurable via `REPO_TTL_DAYS`)
- **Cleanup Frequency**: Every hour (configurable via `CLEANUP_INTERVAL_HOURS`)
- Repositories with `lastFetchedAt` older than the TTL are automatically deleted

## Configuration

Add these environment variables to your `.env` file:

```env
# Number of days to keep repository data before cleanup (default: 7)
REPO_TTL_DAYS=7

# How often to run the cleanup job in hours (default: 1)
CLEANUP_INTERVAL_HOURS=1
```

## How It Works

### Search Flow

```
User searches → GitHub API → Calculate health score → Return results
                                    ↓
                          (No database storage)
```

### Repository Details Flow

```
User views repo → Check if exists in DB
                         ↓
                    Fetch from GitHub API
                         ↓
                  Store/Update in DB with lastFetchedAt timestamp
                         ↓
                    Return to user
```

### Cleanup Flow

```
Every CLEANUP_INTERVAL_HOURS hours:
    → Find repos where lastFetchedAt < (now - REPO_TTL_DAYS)
    → Delete stale repositories and their activities
    → Log deletion count
```

## Manual Cleanup

Authenticated users can manually trigger cleanup:

```bash
POST /api/repos/cleanup
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Cleanup completed",
  "deletedCount": 42,
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

## Database Impact

### Before Optimization
- Every search result stored indefinitely
- Database growth: ~100-500 KB per repository
- 1000 searches × 10 results = ~5 MB minimum growth per 1000 searches
- Would exceed 500MB limit after extensive usage

### After Optimization
- Only viewed repositories are stored
- Automatic cleanup removes stale data
- Storage footprint remains constant and predictable
- Typical storage: 50-100 repositories at any given time (~5-10 MB)

## Benefits

1. **Predictable Storage**: Database size remains within limits
2. **Performance**: No unnecessary writes on search operations
3. **Fresh Data**: Always fetch latest data from GitHub when viewing repos
4. **Automatic Maintenance**: No manual intervention needed
5. **Configurable**: Adjust TTL and cleanup frequency based on needs

## Monitoring

The cleanup job logs its activity:

```
[CleanupJob] Starting cleanup scheduler (interval: 3600000ms, TTL: 604800000ms)
[CleanupJob] Deleted 15 stale repositories older than 2025-11-05T10:30:00.000Z
```

Monitor these logs to ensure cleanup is running as expected.

## Recommendations

### For Development
```env
REPO_TTL_DAYS=1
CLEANUP_INTERVAL_HOURS=1
```

### For Production
```env
REPO_TTL_DAYS=7
CLEANUP_INTERVAL_HOURS=6
```

### For Heavy Usage
If you expect very high traffic, reduce TTL:
```env
REPO_TTL_DAYS=3
CLEANUP_INTERVAL_HOURS=3
```

## Database Schema

The `Repository` model uses `lastFetchedAt` timestamp to track when repos were last accessed:

```prisma
model Repository {
  id              Int       @id @default(autoincrement())
  fullName        String    @unique
  lastFetchedAt   DateTime? // Used for TTL-based cleanup
  // ... other fields
}
```

## Migration from Previous Version

If you have existing data from before this optimization:

1. **No action required** - The cleanup job will gradually remove old repos
2. **Optional: Manual cleanup** - Use `POST /api/repos/cleanup` to immediately clean old data
3. **Database size** - Will shrink to optimal size within 1-2 cleanup cycles

## Troubleshooting

### Database still growing?
- Check if `REPO_TTL_DAYS` is too high
- Verify cleanup job is running (check logs)
- Manually trigger cleanup: `POST /api/repos/cleanup`

### Too many deletions?
- Increase `REPO_TTL_DAYS`
- Increase `CLEANUP_INTERVAL_HOURS` to reduce deletion frequency

### Performance issues?
- Ensure proper indexes exist on `lastFetchedAt` field
- Consider running cleanup during off-peak hours only

## Future Enhancements

Potential improvements for session-based storage:

1. **Redis Integration**: Use Redis for true session storage
2. **User-specific Caching**: Track which user accessed which repos
3. **Favorites/Bookmarks**: Allow users to save repos permanently
4. **Smart Cleanup**: Preserve popular/frequently accessed repos longer

