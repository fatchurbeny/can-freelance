-- AlterTable
ALTER TABLE "designers" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "doctypes" ADD COLUMN     "pages" DOUBLE PRECISION,
ADD COLUMN     "pool_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- CreateTable
CREATE TABLE "notion_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encrypted_api_key" TEXT NOT NULL,
    "encrypted_database_id" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notion_configs_pkey" PRIMARY KEY ("id")
);
