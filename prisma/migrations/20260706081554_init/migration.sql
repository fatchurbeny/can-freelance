-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'manager',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notion_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_color" TEXT,

    CONSTRAINT "designers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctypes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notion_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "is_top_specialist" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "doctypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notion_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notion_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status_group" TEXT,
    "counts_as_submitted" BOOLEAN NOT NULL DEFAULT true,
    "counts_as_approved" BOOLEAN NOT NULL DEFAULT false,
    "counts_as_profile_only" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "design_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notion_page_id" TEXT NOT NULL,
    "notion_url" TEXT,
    "name" TEXT,
    "designer_id" UUID,
    "doctype_id" UUID,
    "design_status_id" UUID,
    "pages" DECIMAL,
    "qty_submit" DECIMAL,
    "license" TEXT,
    "languages" TEXT[],
    "date_approved" DATE,
    "task_month" TEXT,
    "payroll_month" TEXT,
    "priority" TEXT,
    "created_time" TIMESTAMPTZ NOT NULL,
    "synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_accounts" (
    "task_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,

    CONSTRAINT "task_accounts_pkey" PRIMARY KEY ("task_id","account_id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "status" TEXT NOT NULL,
    "records_synced" INTEGER,
    "error_message" TEXT,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "designers_notion_key_key" ON "designers"("notion_key");

-- CreateIndex
CREATE UNIQUE INDEX "doctypes_notion_key_key" ON "doctypes"("notion_key");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_notion_key_key" ON "accounts"("notion_key");

-- CreateIndex
CREATE UNIQUE INDEX "design_statuses_notion_key_key" ON "design_statuses"("notion_key");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_notion_page_id_key" ON "tasks"("notion_page_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_designer_id_fkey" FOREIGN KEY ("designer_id") REFERENCES "designers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_doctype_id_fkey" FOREIGN KEY ("doctype_id") REFERENCES "doctypes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_design_status_id_fkey" FOREIGN KEY ("design_status_id") REFERENCES "design_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_accounts" ADD CONSTRAINT "task_accounts_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_accounts" ADD CONSTRAINT "task_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
