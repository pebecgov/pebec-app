// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function UngaRegistrations() {
  const regs = useQuery(api.unga.listRegistrations);
  const toggle = useMutation(api.unga.toggleConfirmed);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!regs) return [];
    const term = search.toLowerCase();
    return regs.filter(r =>
      r.name.toLowerCase().includes(term) ||
      r.email.toLowerCase().includes(term) ||
      r.phone.toLowerCase().includes(term) ||
      String(r.assignedNumber).includes(term)
    );
  }, [regs, search]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <Input placeholder="Search name, email, phone or number..." value={search} onChange={e=>setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="overflow-x-auto bg-white rounded-md shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Org</TableHead>
              <TableHead>Confirmed Entry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r._id}>
                <TableCell className="font-medium">{r.assignedNumber}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell>{r.org}</TableCell>
                <TableCell>
                  <label className="inline-flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={!!r.confirmedEntry}
                      onChange={e => toggle({ registrationId: r._id as any, confirmed: e.target.checked })}
                      className="h-4 w-4 accent-green-600"
                    />
                    <span className="text-sm">{r.confirmedEntry ? 'Checked-in' : 'Not checked-in'}</span>
                  </label>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


