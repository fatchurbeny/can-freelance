# CAN Freelance Dashboard

Next.js dashboard backed by PostgreSQL/Prisma and Notion synchronization.

## Environments

| Environment | Git source | Database | Purpose |
| --- | --- | --- | --- |
| Local | `develop` or `feature/*` | Development PostgreSQL | Feature work |
| Preview | Pull request / feature branch | Development or preview PostgreSQL | Remote review |
| Production | `main` | Production PostgreSQL | Live app |

Never use the production database for routine local development.

## Local development

1. Copy required values into local `.env` (never commit it):

   ```dotenv
   DATABASE_URL="postgresql://...development..."
   ENCRYPTION_SECRET="..."
   NOTION_API_KEY="..."
   NOTION_DATABASE_ID="..."
   CRON_SECRET="..."
   BASIC_AUTH_USER="..."
   BASIC_AUTH_PASSWORD="..."
   ```

2. Install and generate Prisma Client:

   ```bash
   npm ci
   npx prisma generate
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Vercel setup

1. Import GitHub repository into Vercel.
2. Set **Production Branch** to `main`.
3. Keep Preview deployments enabled for pull requests and feature branches.
4. Add Production and Preview environment variables in Vercel Project Settings. Do not upload or commit `.env`.
5. Use separate `DATABASE_URL` values for Production and Preview.
6. Set strong `ENCRYPTION_SECRET`, `CRON_SECRET`, `BASIC_AUTH_USER`, and `BASIC_AUTH_PASSWORD` values.

Required server variables:

- `DATABASE_URL`
- `ENCRYPTION_SECRET`
- `CRON_SECRET`
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASSWORD`
- `NOTION_API_KEY` and `NOTION_DATABASE_ID` when Notion config is not stored in database

## Database schema changes

`npm run build` generates Prisma Client but does not update database schema.

For every `prisma/schema.prisma` change:

```bash
npx prisma db push
npx prisma generate
```

Run against development first. Back up production before applying production schema changes. Restart local Next.js dev server after Prisma Client regeneration.

## Release workflow

1. Update local `main` from `origin/main`.
2. Create `feature/<name>` from updated `main`.
3. Develop locally and commit only intended files.
4. Run:

   ```bash
   npm run lint
   npm run build
   ```

5. Push feature branch and inspect Vercel Preview.
6. Open pull request into `main`.
7. Review code, environment, and schema impact.
8. Merge pull request. Vercel automatically deploys Production from `main`.
9. Smoke-test dashboard, database access, and Notion sync.

Do not develop directly on `main`. Do not force-push `main`.

## Rollback

For immediate recovery, promote previous healthy deployment in Vercel. Then revert faulty Git commit on `main` so repository history matches production state.
