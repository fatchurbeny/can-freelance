# Local Setup & Notion Sync Guide

Welcome! If you've just cloned this project, follow this guide to quickly set up your environment, connect your Notion workspace, and avoid common pitfalls.

## 1. Environment Configuration
First, duplicate the `.env.example` file (if available) or create a new `.env.local` file in the root of your project.

You will need to provide the following keys:
```env
# PostgreSQL connection string for Prisma
DATABASE_URL="postgresql://user:password@localhost:5432/your_database"

# 32-byte secret key used for AES-256-CBC encryption of Notion Credentials
# Keep this extremely safe. If this changes, existing encrypted credentials will become unreadable.
ENCRYPTION_SECRET="your-32-character-secret-key-here!"
```

## 2. Database Initialization
This project uses Prisma to manage the database schema.
1. Run `npx prisma db push` to push the schema to your database.
2. Run `npx prisma generate` to generate the TypeScript Prisma client.
3. Start the development server with `npm run dev`.

## 3. Notion Integration Setup
To synchronize tasks from Notion to this dashboard, you need a Notion API Key (Internal Integration Token) and the Database ID.

1. Go to [Notion Connections](https://www.notion.so/my-integrations) and create a new integration.
2. Ensure your integration has **Read content** and **Read user information** capabilities.
3. Copy the **Internal Integration Secret** (this is your API Key, starting with `ntn_...`).
4. Go to the specific Database in Notion you want to sync, click the `...` menu in the top right, and **Connect** your new integration.
5. Copy the 32-character **Database ID** from the Notion URL (e.g., `https://www.notion.so/workspace/[DATABASE_ID]?v=...`).

## 4. Required Notion Database Structure
Your Notion Database **must** contain the following columns exactly as named below (case-insensitive aliases exist for some, but these are recommended). 

> [!WARNING]
> If your database is missing any of the `REQUIRED` columns, the sync will fail.

| Column Name | Property Type | Requirement |
| :--- | :--- | :--- |
| **Name** | `Title` | **REQUIRED** |
| **Designer** | `Select` or `Person` | **REQUIRED** |
| **Doctype** | `Select` | **REQUIRED** |
| **Pages** | `Number` | **REQUIRED** |
| **QTY-Submit** | `Number` | **REQUIRED** |
| **Design Status** | `Status` or `Select`| **REQUIRED** |
| **Pool Rate** | `Number` | *Optional* |
| **License** | `Select` | *Optional* |
| **IND/ENG** | `Select` or `Multi-select`| *Optional* |
| **Date Aproved** | `Date` | *Optional* |
| **Task Month** | `Select` | *Optional* |
| **Payroll Month** | `Select` | *Optional* |
| **Priority** | `Select` | *Optional* |
| **Created** | `Created time` or `Date` | *Optional* |
| **Brand** | `Select` or `Multi-select`| *Optional* |

## 5. Connecting via the Dashboard
1. Open the web dashboard and navigate to **Settings > Notion Config**.
2. Paste your Notion API Key and Database ID.
3. Click **Test Connection**. The dashboard will securely verify that all required columns are present in your Notion database.
4. Click **Save Configuration**. The credentials will be securely encrypted using your `ENCRYPTION_SECRET` and saved to the database.

---

## 🚨 Troubleshooting & Known Gotchas (For AI Agents)

### Empty Properties Bug
If `notion.databases.retrieve` successfully connects but the `properties` object is completely empty or undefined, **check your Notion SDK version**. 
A known issue occurs if an invalid version (e.g., `@notionhq/client: ^5.23.1`) was accidentally installed. Ensure you are using a valid `2.x.x` version (e.g., `^2.2.14`).

### Corrupted Database ID / Invalid Request URL
If testing the connection works, but syncing fails with `Invalid request URL`, your Database ID might be corrupted in the database due to an AES-CBC Shared IV bug.
**Fix**: Have the user completely delete and re-paste both the API Key and Database ID into the UI, test it, and click Save to re-encrypt them properly. Do not manually update the SQLite/Postgres rows unless you know exactly what you are doing with the IV.
