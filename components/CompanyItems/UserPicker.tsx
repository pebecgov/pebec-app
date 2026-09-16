"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, UserRound, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type AssignableUser = {
  _id: Id<"users">;
  firstName?: string;
  lastName?: string;
  email: string;
  imageUrl?: string;
  role?: string;
  jobTitle?: string;
};

function userName(user: AssignableUser) {
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
}

function initials(user: AssignableUser) {
  const name = userName(user);
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function UserPicker({
  users,
  value,
  onChange,
  placeholder = "Keep in inventory (unassigned)",
  allowNone = true,
}: {
  users: AssignableUser[];
  value?: Id<"users">;
  onChange: (userId?: Id<"users">) => void;
  placeholder?: string;
  allowNone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = users.find((user) => user._id === value);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const haystack = `${userName(user)} ${user.email} ${user.jobTitle ?? ""} ${user.role ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-between rounded-xl border-emerald-100 bg-white px-3 font-normal hover:bg-emerald-50/60"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={selected.imageUrl} alt={userName(selected)} />
                <AvatarFallback className="bg-emerald-100 text-[10px] text-emerald-800">
                  {initials(selected)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-left">
                <span className="block text-sm font-medium text-gray-800">
                  {userName(selected)}
                </span>
                <span className="block text-xs text-gray-500">{selected.email}</span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-gray-500">
              <UserRound className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="flex items-center gap-2 px-1 pb-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff..."
            className="h-9 rounded-lg"
          />
          {selected && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {allowNone && (
            <button
              type="button"
              className={cn(
                "mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-emerald-50",
                !value && "bg-emerald-50 text-emerald-800",
              )}
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Keep in inventory
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-gray-500">No staff found</p>
          ) : (
            filtered.map((user) => (
              <button
                type="button"
                key={user._id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-emerald-50",
                  value === user._id && "bg-emerald-50",
                )}
                onClick={() => {
                  onChange(user._id);
                  setOpen(false);
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.imageUrl} alt={userName(user)} />
                  <AvatarFallback className="bg-emerald-100 text-[10px] text-emerald-800">
                    {initials(user)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-800">
                    {userName(user)}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {user.jobTitle || user.role || user.email}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
