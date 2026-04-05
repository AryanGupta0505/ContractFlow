CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "workflowId" TEXT,
    "contentJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Contract"
ADD COLUMN "templateId" TEXT;

ALTER TABLE "Template"
ADD CONSTRAINT "Template_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Template"
ADD CONSTRAINT "Template_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Contract"
ADD CONSTRAINT "Contract_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Template_organizationId_name_idx" ON "Template"("organizationId", "name");
CREATE INDEX "Template_organizationId_type_idx" ON "Template"("organizationId", "type");
CREATE INDEX "Contract_templateId_idx" ON "Contract"("templateId");
