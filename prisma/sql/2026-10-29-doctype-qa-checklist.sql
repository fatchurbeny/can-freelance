-- Checklist QA per Doctype (Slide Master Builder F1). Aditif; aman dijalankan ulang.
ALTER TABLE "doctypes" ADD COLUMN IF NOT EXISTS "qa_checklist" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Doctype presentasi di platform output Dropbox: lima deliverable wajib
UPDATE "doctypes" d
SET "qa_checklist" = ARRAY['Preview', 'Master Slides', 'Keynote', 'PPT', 'PPTX']
FROM "platforms" p
WHERE p.id = d.platform_id
  AND p.output_type = 'dropbox_link'
  AND d.category = 'Presentation'
  AND cardinality(d.qa_checklist) = 0;
