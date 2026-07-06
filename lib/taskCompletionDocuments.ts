import type { Id } from "@/convex/_generated/dataModel";

export type TaskCompletionDocument = {
  storageId: Id<"_storage">;
  fileName: string;
};

export function getCompletionDocumentsFromTask(task: {
  completionDocuments?: TaskCompletionDocument[];
  completionDocumentId?: Id<"_storage">;
  completionDocumentName?: string;
}): TaskCompletionDocument[] {
  if (task.completionDocuments && task.completionDocuments.length > 0) {
    return task.completionDocuments;
  }
  if (task.completionDocumentId && task.completionDocumentName) {
    return [{ storageId: task.completionDocumentId, fileName: task.completionDocumentName }];
  }
  return [];
}

export function completionDocumentSetsMatch(
  existing: TaskCompletionDocument[],
  incoming: TaskCompletionDocument[]
): boolean {
  if (existing.length !== incoming.length) return false;
  const existingIds = new Set(existing.map((doc) => String(doc.storageId)));
  return incoming.every((doc) => existingIds.has(String(doc.storageId)));
}
