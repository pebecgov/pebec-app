import type { Id } from "@/convex/_generated/dataModel";

export type TaskCompletionDocument = {
  storageId: Id<"_storage">;
  fileName: string;
  uploadedBy?: Id<"users">;
  uploadedByName?: string;
};

export function getCompletionDocumentsFromTask(task: {
  completionDocuments?: TaskCompletionDocument[];
  completionDocumentId?: Id<"_storage">;
  completionDocumentName?: string;
}): TaskCompletionDocument[] {
  if (task.completionDocuments) {
    return task.completionDocuments;
  }
  if (task.completionDocumentId && task.completionDocumentName) {
    return [{ storageId: task.completionDocumentId, fileName: task.completionDocumentName }];
  }
  return [];
}

export function isOwnTaskCompletionDocument(
  doc: TaskCompletionDocument,
  currentUserId?: Id<"users">,
  completionRequestedBy?: Id<"users">
): boolean {
  if (!currentUserId) return false;
  if (doc.uploadedBy) {
    return String(doc.uploadedBy) === String(currentUserId);
  }
  if (completionRequestedBy) {
    return String(completionRequestedBy) === String(currentUserId);
  }
  return false;
}

export function moveTaskCompletionDocument(
  documents: TaskCompletionDocument[],
  storageId: Id<"_storage">,
  direction: "up" | "down"
): TaskCompletionDocument[] {
  const index = documents.findIndex((doc) => String(doc.storageId) === String(storageId));
  if (index < 0) return documents;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= documents.length) return documents;
  const next = [...documents];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
