import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

type WorkflowStepRow = {
  id: string;
  workflowId: string;
  order: number;
  role: string;
  condition: string | null;
};

let workflowStepConditionColumnPromise: Promise<boolean> | null = null;

export async function hasWorkflowStepConditionColumn() {
  if (!workflowStepConditionColumnPromise) {
    workflowStepConditionColumnPromise = prisma
      .$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'WorkflowStep'
            AND column_name = 'condition'
        ) AS "exists"
      `)
      .then((rows) => rows[0]?.exists ?? false)
      .catch(() => false);
  }

  return workflowStepConditionColumnPromise;
}

export function resetWorkflowStepConditionColumnCache() {
  workflowStepConditionColumnPromise = null;
}

export async function listWorkflowStepsByWorkflowIds(workflowIds: string[]) {
  if (!workflowIds.length) {
    return new Map<string, WorkflowStepRow[]>();
  }

  const hasCondition = await hasWorkflowStepConditionColumn();
  const rows = hasCondition
    ? await prisma.workflowStep.findMany({
        where: {
          workflowId: {
            in: workflowIds,
          },
        },
        orderBy: [{ workflowId: "asc" }, { order: "asc" }],
      })
    : await prisma.$queryRaw<WorkflowStepRow[]>(Prisma.sql`
        SELECT
          "id",
          "workflowId",
          "order",
          "role",
          NULL::text AS "condition"
        FROM "WorkflowStep"
        WHERE "workflowId" IN (${Prisma.join(workflowIds)})
        ORDER BY "workflowId" ASC, "order" ASC
      `);

  const stepsByWorkflowId = new Map<string, WorkflowStepRow[]>();

  for (const workflowId of workflowIds) {
    stepsByWorkflowId.set(workflowId, []);
  }

  for (const row of rows) {
    stepsByWorkflowId.get(row.workflowId)?.push({
      id: row.id,
      workflowId: row.workflowId,
      order: Number(row.order),
      role: row.role,
      condition: row.condition,
    });
  }

  return stepsByWorkflowId;
}
