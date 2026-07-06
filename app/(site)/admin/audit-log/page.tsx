import AuditLog from "@/components/Admin/AuditLog";

export default function AdminAuditLogPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review important administrative actions across the system.
        </p>
      </div>
      <AuditLog />
    </div>
  );
}
