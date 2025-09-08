// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffMemberSelectorProps {
  selectedStaff: Id<"users">[];
  onStaffChange: (staffIds: Id<"users">[]) => void;
  disabled?: boolean;
}

export default function StaffMemberSelector({ selectedStaff, onStaffChange, disabled }: StaffMemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const staffMembers = useQuery(api.meetings.getAllStaffMembers) || [];

  const handleSelect = (staffId: Id<"users">) => {
    if (selectedStaff.includes(staffId)) {
      onStaffChange(selectedStaff.filter(id => id !== staffId));
    } else {
      onStaffChange([...selectedStaff, staffId]);
    }
  };

  const removeStaff = (staffId: Id<"users">) => {
    onStaffChange(selectedStaff.filter(id => id !== staffId));
  };

  const getStaffName = (staffId: Id<"users">) => {
    const staff = staffMembers.find(s => s._id === staffId);
    return staff ? `${staff.firstName || ""} ${staff.lastName || ""}`.trim() || staff.email : "Unknown";
  };

  const getStaffRole = (staffId: Id<"users">) => {
    const staff = staffMembers.find(s => s._id === staffId);
    return staff?.role || "staff";
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Invite Staff Members</label>
      
      {/* Selected Staff Badges */}
      {selectedStaff.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedStaff.map((staffId) => (
            <Badge 
              key={staffId} 
              variant="secondary" 
              className="flex items-center gap-1"
            >
              <span className="capitalize">{getStaffRole(staffId)}</span>
              <span className="font-medium">{getStaffName(staffId)}</span>
              <button
                type="button"
                onClick={() => removeStaff(staffId)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                disabled={disabled}
              >
                <span className="sr-only">Remove</span>
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Staff Selection Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span>Select staff members...</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <div className="max-h-60 overflow-y-auto">
              <CommandGroup>
              {staffMembers
                .filter((staff) => {
                  if (!searchValue) return true;
                  const fullName = `${staff.firstName || ""} ${staff.lastName || ""}`.trim();
                  const searchLower = searchValue.toLowerCase();
                  return (
                    fullName.toLowerCase().includes(searchLower) ||
                    staff.email.toLowerCase().includes(searchLower) ||
                    (staff.role || "").toLowerCase().includes(searchLower)
                  );
                })
                .map((staff) => (
                <CommandItem
                  key={staff._id}
                  onSelect={() => handleSelect(staff._id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          selectedStaff.includes(staff._id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div>
                        <div className="font-medium">
                          {`${staff.firstName || ""} ${staff.lastName || ""}`.trim() || staff.email}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {staff.role} • {staff.email}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {staff.role}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
              </CommandGroup>
            </div>
            <div className="border-t p-2">
              <CommandInput 
                placeholder="Search staff members..." 
                value={searchValue}
                onValueChange={setSearchValue}
                className="border-0 focus:ring-0"
              />
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      
      <p className="text-xs text-gray-500">
        Only available for internal meetings. Selected staff will receive notifications and email invitations.
      </p>
    </div>
  );
}
