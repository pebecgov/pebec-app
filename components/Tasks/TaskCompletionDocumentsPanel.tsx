"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isOwnTaskCompletionDocument,
  moveTaskCompletionDocument,
  type TaskCompletionDocument
} from "@/lib/taskCompletionDocuments";
import { Id, Id as StorageId } from "@/convex/_generated/dataModel";
import { ArrowDown, ArrowUp, Download, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function TaskCompletionDocumentsPanel({
  documents,
  taskId,
  getCompletionDocumentUrl,
  currentUserId,
  completionRequestedBy,
  interactive = false,
  replacingStorageId,
  onReorder,
  onDelete,
  onReplace
}: {
  documents: TaskCompletionDocument[];
  taskId: Id<"tasks">;
  getCompletionDocumentUrl: (args: {
    storageId: StorageId<"_storage">;
    taskId: Id<"tasks">;
  }) => Promise<string | null>;
  currentUserId?: Id<"users">;
  completionRequestedBy?: Id<"users">;
  interactive?: boolean;
  replacingStorageId?: Id<"_storage"> | null;
  onReorder?: (orderedStorageIds: Id<"_storage">[]) => Promise<void> | void;
  onDelete?: (storageId: Id<"_storage">) => Promise<void> | void;
  onReplace?: (existingStorageId: Id<"_storage">, file: File) => Promise<void> | void;
}) {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<Id<"_storage"> | null>(null);
  const [busyStorageId, setBusyStorageId] = useState<string | null>(null);

  if (documents.length === 0) return null;

  const openDocument = async (doc: TaskCompletionDocument) => {
    try {
      const url = await getCompletionDocumentUrl({
        storageId: doc.storageId,
        taskId
      });
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Could not retrieve document");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to open document");
    }
  };

  const handleReorder = async (storageId: Id<"_storage">, direction: "up" | "down") => {
    if (!onReorder) return;
    const next = moveTaskCompletionDocument(documents, storageId, direction);
    if (next === documents) return;
    setBusyStorageId(String(storageId));
    try {
      await onReorder(next.map((doc) => doc.storageId));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder documents");
    } finally {
      setBusyStorageId(null);
    }
  };

  const handleDelete = async (storageId: Id<"_storage">) => {
    if (!onDelete) return;
    const confirmed = window.confirm("Remove this document from the task?");
    if (!confirmed) return;
    setBusyStorageId(String(storageId));
    try {
      await onDelete(storageId);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove document");
    } finally {
      setBusyStorageId(null);
    }
  };

  return (
    <div className="mt-3 mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
      <p className="text-sm font-medium text-purple-900 mb-2">
        Supporting Document{documents.length > 1 ? "s" : ""}:
      </p>
      <div className="space-y-2">
        {documents.map((doc, index) => {
          const own = isOwnTaskCompletionDocument(doc, currentUserId, completionRequestedBy);
          const busy = busyStorageId === String(doc.storageId) || replacingStorageId === doc.storageId;
          const uploaderLabel = own
            ? "You"
            : doc.uploadedByName?.trim() || (doc.uploadedBy ? "Teammate" : undefined);

          return (
            <div
              key={doc.storageId}
              className="flex flex-wrap items-center gap-2 rounded-md border border-purple-100 bg-white/70 p-2"
            >
              <span className="w-6 shrink-0 text-center text-xs font-semibold text-purple-700">
                {index + 1}
              </span>
              <FileText className="w-5 h-5 text-purple-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-purple-900 truncate">{doc.fileName}</p>
                {uploaderLabel && (
                  <p className="text-xs text-purple-700">Uploaded by {uploaderLabel}</p>
                )}
              </div>
              {interactive && documents.length > 1 && (
                <div className="flex shrink-0 flex-col">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-purple-700"
                    disabled={busy || index === 0}
                    onClick={() => void handleReorder(doc.storageId, "up")}
                    aria-label="Move document up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-purple-700"
                    disabled={busy || index === documents.length - 1}
                    onClick={() => void handleReorder(doc.storageId, "down")}
                    aria-label="Move document down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => void openDocument(doc)}
                className="text-purple-600 hover:text-purple-700 shrink-0"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              {interactive && own && onReplace && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setReplaceTargetId(doc.storageId);
                    replaceInputRef.current?.click();
                  }}
                  className="text-blue-600 hover:text-blue-700 shrink-0"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  {busy && replacingStorageId === doc.storageId ? "Replacing..." : "Replace"}
                </Button>
              )}
              {interactive && own && onDelete && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleDelete(doc.storageId)}
                  className="text-red-600 hover:text-red-700 shrink-0"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {interactive && onReplace && (
        <input
          ref={replaceInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={(event) => {
            const file = event.target.files?.[0];
            const targetId = replaceTargetId;
            event.target.value = "";
            setReplaceTargetId(null);
            if (file && targetId) {
              void onReplace(targetId, file);
            }
          }}
        />
      )}
    </div>
  );
}
