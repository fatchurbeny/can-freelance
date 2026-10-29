-- Slide Master Builder F2: path folder Dropbox + snapshot isi folder per task. Aditif; aman dijalankan ulang.
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dropbox_folder_path" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dropbox_files" JSONB;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dropbox_scanned_at" TIMESTAMPTZ(6);
