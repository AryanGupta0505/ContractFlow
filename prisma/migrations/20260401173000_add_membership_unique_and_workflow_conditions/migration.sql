-- Add optional condition support to workflow steps
ALTER TABLE "WorkflowStep"
ADD COLUMN "condition" TEXT;

-- Prevent duplicate memberships within the same organization
CREATE UNIQUE INDEX "Membership_userId_organizationId_key"
ON "Membership"("userId", "organizationId");
