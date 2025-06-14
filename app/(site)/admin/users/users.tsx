// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { setRole } from "./action";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Roles } from "@/global";
import { mdasList } from "@/components/mdaList";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
export default function Admin() {
  const users = useQuery(api.users.getUsers) || [];
  const mdas = useQuery(api.users.getMDAs) || [];
  const assignUserToMDA = useMutation(api.users.assignUserToMDA);
  const updateUserRoleInConvex = useMutation(api.users.updateUserRoleInConvex);
  const removeUserFromMDA = useMutation(api.users.removeUserFromMDA);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<Roles>("user");
  const [selectedMda, setSelectedMda] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<"all" | string>("all");
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [selectedStreamFilter, setSelectedStreamFilter] = useState("all");
  const [hasManuallySelectedRole, setHasManuallySelectedRole] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>("");
  const nigeriaStates = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
  useEffect(() => {
    if (!selectedUser) return;
    if (!hasManuallySelectedRole) {
      setSelectedRole(selectedUser.role || "user");
    }
    setSelectedMda(mdas.find(mda => mda._id === selectedUser.mdaId)?.name || "");
  }, [selectedUser, mdas, hasManuallySelectedRole]);
  useEffect(() => {
    if (selectedUser) {
      const user = users.find(u => u.clerkUserId === selectedUser);
      if (user) {
        setFirstName(user.firstName ?? "N/A");
        setLastName(user.lastName ?? "N/A");
        setEmail(user.email ?? "N/A");
        setPhoneNumber(user.phoneNumber ?? "N/A");
        setSelectedRole(user.role ?? "user");
        setSelectedStream(user.staffStream ?? "");
        setSelectedState(user.state ?? "");
        
        // Handle permissions for both admin and staff users
        if (user.role === "admin" || user.role === "staff") {
          if (user.role === "staff" && user.staffStream) {
            // For staff users, extract only the additional admin permissions
            // (exclude the base staff permissions that come from their stream)
            const permissionMap: Record<string, string[]> = {
              regulatory: ["/staff", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
              sub_national: ["/staff", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
              innovation: ["/staff", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
              judiciary: ["/staff", "/staff/deputies-reports", "/staff/magistrates-reports", "/staff/assigned-letters", "/staff/materials", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
              communications: ["/staff", "/staff/bfa-reports", "/staff/reportgov", "/staff/meetings", "/staff/assigned-letters", "/staff/newsletters", "/staff/subscribers", "/staff/received-letters", "/staff/send-letters", "/staff/materials", "/staff/profile"],
              investments: ["/staff", "/staff/projects", "/staff/assigned-letters", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
              receptionist: ["/staff/letters", "/staff/business-letters", "/staff/send-letters", "/staff/received-letters", "/staff/profile"],
              account: ["/staff/assigned-letters", "/staff/send-letters", "/staff/received-letters", "/staff/profile"],
              auditor: ["/staff/assinged-letters", "/staff/send-letters", "/staff/received-letters", "/staff/profile"]
            };
            
            const baseStaffPermissions = permissionMap[user.staffStream] ?? [];
            const userPermissions = user.permissions ?? [];
            
            // Extract only additional admin permissions (not in base staff permissions)
            const additionalPermissions = userPermissions.filter(
              permission => !baseStaffPermissions.includes(permission)
            );
            setPermissions(additionalPermissions);
          } else {
            // For admin users, show all their permissions
            setPermissions(user.permissions ?? []);
          }
        } else {
          setPermissions([]);
        }
        
        if (mdas.length > 0 && user.mdaId) {
          const userMda = mdas.find(mda => mda._id === user.mdaId);
          if (userMda) {
            console.log("✅ User MDA Found:", userMda);
            setSelectedMda(userMda.name);
          } else {
            console.log("⚠ No MDA found for user:", user.mdaId);
            setSelectedMda("");
          }
        }
      }
    }
  }, [selectedUser, users, mdas]);
  const handleSave = async () => {
    if (!selectedUser) return;
    setIsLoading(true);
    setActiveUserId(null);
    setSelectedState("");
    try {
      const formData = new FormData();
      formData.append("id", selectedUser);
      formData.append("role", selectedRole);
      if (selectedRole === "staff" && selectedStream.trim()) {
        formData.append("staffStream", selectedStream);
      }
      await setRole(formData);
      const existingUser = users.find(u => u.clerkUserId === selectedUser);
      const wasInMDA = !!existingUser?.mdaId;
      if (["state_governor", "saber_agent", "magistrates", "deputies"].includes(selectedRole)) {
        if (!selectedState || selectedState.trim() === "") {
          toast("Missing State", {
            description: "Please select a state for this role."
          });
          setIsLoading(false);
          return;
        }
      }
      const convexPayload = {
        clerkUserId: selectedUser,
        role: selectedRole,
        ...(selectedRole === "staff" && selectedStream ? {
          staffStream: selectedStream
        } : {}),
        ...((selectedRole === "admin" || selectedRole === "staff") && permissions.length > 0 ? {
          permissions
        } : {}),
        ...(["reform_champion", "state_governor", "saber_agent", "magistrates", "deputies"].includes(selectedRole) ? {
          state: selectedState.trim()
        } : {})
      };
      console.log("⛳ Convex Payload:", convexPayload);
      await updateUserRoleInConvex(convexPayload);
      if (!["mda", "reform_champion"].includes(selectedRole) && wasInMDA) {
        await removeUserFromMDA({
          clerkUserId: selectedUser
        });
      }
      if (["mda", "reform_champion"].includes(selectedRole)) {
        await assignUserToMDA({
          clerkUserId: selectedUser,
          mdaName: selectedMda,
          phoneNumber
        });
      }
      toast("User role updated", {
        description: `Role changed to ${selectedRole}`
      });
      setDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("user");
      setSelectedStream("");
      setSelectedMda("");
      setSelectedState("");
      setPermissions([]);
    } catch (error) {
      console.error("❌ Error updating user:", error);
      toast("Error", {
        description: `Something went wrong. Please try again.`
      });
    } finally {
      setIsLoading(false);
    }
  };
  const filteredUsers = users.filter(user => user.clerkUserId && !user.clerkUserId.startsWith("guest_")).filter(user => {
    const matchesSearch = [user.firstName, user.lastName, user.email, user.phoneNumber].some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRoleFilter === "all" || user.role === selectedRoleFilter;
    const matchesStream = selectedStreamFilter === "all" || user.role === "staff" && user.staffStream === selectedStreamFilter;
    return matchesSearch && matchesRole && matchesStream;
  });
  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);
  return <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-6">
    <h1 className="text-2xl font-semibold mb-4">Manage Users</h1>

      {}
      {}
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm mb-6">
  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    {}
    <div className="w-full md:w-1/2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Search users
      </label>
      <Input placeholder="Search by name, email or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border-gray-300" />
    </div>

    {}
    <div className="w-full md:w-1/4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Filter by Role
      </label>
      <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
        <SelectTrigger className="w-full border-gray-300">
          <SelectValue placeholder="Select Role" />
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
        <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="mda">ReportGov Agent</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
          <SelectItem value="saber_agent">Saber Agent</SelectItem>
          <SelectItem value="deputies">Sherrif</SelectItem>
          <SelectItem value="magistrates">Magistrates</SelectItem>
          <SelectItem value="state_governor">State Governor</SelectItem>
          <SelectItem value="president">President</SelectItem>
          <SelectItem value="vice_president">Vice President</SelectItem>
          <SelectItem value="world_bank">World Bank</SelectItem>
        </SelectContent>
      </Select>
    </div>

    


    {}
    {selectedRoleFilter === "staff" && <div className="w-full md:w-1/4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Stream
        </label>
        <Select value={selectedStreamFilter} onValueChange={setSelectedStreamFilter}>
          <SelectTrigger className="w-full border-gray-300">
            <SelectValue placeholder="Select Stream" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Streams</SelectItem>
            <SelectItem value="regulatory">Regulatory</SelectItem>
            <SelectItem value="sub_national">Sub National</SelectItem>
            <SelectItem value="innovation">Innovation & Technology</SelectItem>
            <SelectItem value="judiciary">Judicial</SelectItem>
            <SelectItem value="communications">Communications</SelectItem>
            <SelectItem value="investments">Investments</SelectItem>
            <SelectItem value="receptionist">Receptionist - Front Officer</SelectItem>
            <SelectItem value="account">Finance & Account</SelectItem>
            <SelectItem value="auditor">Auditor</SelectItem>


          </SelectContent>
        </Select>
      </div>}
  </div>
    </div>

    <div className="relative w-full overflow-x-auto rounded-md border border-gray-300 shadow-sm scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
      <Table className="min-w-[1200px]">
    <TableHeader className="bg-gray-100 text-xs text-gray-600 uppercase">
      <TableRow>
        <TableHead className="p-4">User</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Stream / MDA</TableHead>
        <TableHead className="text-center">Action</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {paginatedUsers.map(user => <TableRow key={user._id} className="hover:bg-gray-50 transition-all">
          {}
          <TableCell className="py-3 px-4 whitespace-nowrap max-w-xs">
  <div className="flex items-center gap-3">
    <Image src={user.imageUrl || "/default-avatar.png"} alt="Profile" width={36} height={36} className="rounded-full object-cover border border-gray-300" />
    <div className="flex flex-col max-w-[160px] overflow-hidden">
      <span className="font-medium text-sm leading-tight text-ellipsis overflow-hidden whitespace-nowrap">
        {user.firstName} {user.lastName}
      </span>
    </div>
  </div>
            </TableCell>



          {}
          <TableCell className="text-sm text-gray-700 whitespace-nowrap">
          {user.email ?? "—"}
          </TableCell>

          {}
          <TableCell className="text-sm text-gray-700 whitespace-nowrap">
            {user.phoneNumber ?? "—"}
          </TableCell>

          {}
          <TableCell className="capitalize text-sm text-gray-800 whitespace-nowrap">
            {user.role}
          </TableCell>

          {}
          <TableCell className="text-sm text-gray-700 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
          {user.role === "staff" ? user.staffStream ?? "—" : user.mdaName ?? "—"}
          </TableCell>

          {}
          <TableCell className="text-center whitespace-nowrap">
          <Dialog open={activeUserId === user.clerkUserId} onOpenChange={open => {
                if (!open) {
                  setSelectedUser(null);
                  setActiveUserId(null);
                  setHasManuallySelectedRole(false);
                  setSelectedRole("user");
                  setSelectedStream("");
                  setSelectedMda("");
                }
              }}>



                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => {
                    setSelectedUser(user.clerkUserId ?? null);
                    setActiveUserId(user.clerkUserId ?? null);
                  }} className="text-xs px-3 py-1">
  ✏️ Edit Role
                  </Button>

  </DialogTrigger>

              <DialogContent className="max-w-md w-full p-6 rounded-lg">
                <DialogTitle>Edit User Role</DialogTitle>

                {}
                <Select onValueChange={val => {
                    setSelectedRole(val as Roles);
                    setHasManuallySelectedRole(true);
                  }} value={selectedRole}>

                  <SelectTrigger className="mt-4">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="mda">ReportGov Agent</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="reform_champion">Reform Champion</SelectItem>
                    <SelectItem value="saber_agent">Saber</SelectItem>
                    <SelectItem value="deputies">Sherrif</SelectItem>
                    <SelectItem value="magistrates">Magistrates</SelectItem>
                    <SelectItem value="state_governor">State Governor</SelectItem>
                    <SelectItem value="president">President</SelectItem>
                    <SelectItem value="vice_president">Vice President</SelectItem>
                    <SelectItem value="world_bank">World Bank</SelectItem>
                  </SelectContent>
                </Select>



                {}
                {selectedRole === "staff" && <Select value={selectedStream} onValueChange={val => setSelectedStream(val)}>
                  <SelectTrigger className="mt-4 w-[90%] whitespace-normal break-words min-h-[2.5rem]">
                    <SelectValue placeholder="Select Staff Stream" className="whitespace-normal break-words" />
                    </SelectTrigger>
                  <SelectContent className="whitespace-normal break-words">
                    <SelectItem value="regulatory" className="whitespace-normal break-words">Regulatory</SelectItem>
                    <SelectItem value="sub_national" className="whitespace-normal break-words">Sub National</SelectItem>
                    <SelectItem value="innovation" className="whitespace-normal break-words">Innovation & Technology</SelectItem>
                    <SelectItem value="judiciary" className="whitespace-normal break-words">Judicial</SelectItem>
                    <SelectItem value="communications" className="whitespace-normal break-words">Communications</SelectItem>
                    <SelectItem value="investments" className="whitespace-normal break-words">Investments</SelectItem>
                    <SelectItem value="receptionist" className="whitespace-normal break-words">Receptionist - Front Officer</SelectItem>
                    <SelectItem value="account" className="whitespace-normal break-words">Account</SelectItem>
                    <SelectItem value="auditor" className="whitespace-normal break-words">Auditor</SelectItem>
                    </SelectContent>
                  </Select>}

                {}
                {["state_governor", "saber_agent", "magistrates", "deputies"].includes(selectedRole) && <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="mt-4 w-[90%] whitespace-normal break-words min-h-[2.5rem]">
                    <SelectValue placeholder="Select State" className="whitespace-normal break-words" />
                    </SelectTrigger>
                  <SelectContent className="whitespace-normal break-words">
                    {nigeriaStates.map(state => <SelectItem key={state} value={state} className="whitespace-normal break-words">{state}</SelectItem>)}
                    </SelectContent>
                  </Select>}

                {}
                {["mda", "reform_champion"].includes(selectedRole) && (
                  <div className="w-full bg-transparent  p-0.5 overflow-x-hidden">
                    <Select value={selectedMda} onValueChange={setSelectedMda}>
                      <SelectTrigger className="mt-4 w-full whitespace-normal break-words min-h-[2.5rem]">
                        <SelectValue placeholder="Select MDA" className="whitespace-normal break-words" />
    </SelectTrigger>
                      <SelectContent className="max-h-64 overflow-auto whitespace-normal break-words">
                        {mdasList.map((mda, index) => (
                          <SelectItem
                            key={index}
                            value={`${mda.abbreviation} - ${mda.name}`}
                            className="whitespace-normal break-words"
                          >
          {mda.abbreviation} - {mda.name}
                          </SelectItem>
                        ))}
    </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Staff Additional Admin Access */}
                {selectedRole === "staff" && <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Admin Access (optional)
                  </label>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
                    <div className="grid grid-cols-1 gap-3">
                      
                      {/* Saber Program Access */}
                      <div className="border-b border-gray-100 pb-2">
                        <h4 className="font-medium text-gray-800 mb-2">Saber Program</h4>
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          {[
                            { label: "Saber Overview", value: "/admin/saber-overview" },
                            { label: "Saber Reports", value: "/admin/saber-reports" },
                            { label: "DLI Management", value: "/admin/dli" },
                            { label: "Saber Management", value: "/admin/saber-management" },
                            { label: "DLIs Status", value: "/admin/saber" }
                          ].map(item => (
                            <label key={item.value} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={permissions.includes(item.value)} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPermissions(prev => 
                                    checked 
                                      ? [...prev, item.value] 
                                      : prev.filter(p => p !== item.value)
                                  );
                                }} 
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* User & System Management */}
                      <div className="border-b border-gray-100 pb-2">
                        <h4 className="font-medium text-gray-800 mb-2">👥 User & System Management</h4>
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          {[
                            { label: "User Management", value: "/admin/users" },
                            { label: "Analytics Dashboard", value: "/admin/analytics" },
                            { label: "Admin Dashboard", value: "/admin" }
                          ].map(item => (
                            <label key={item.value} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={permissions.includes(item.value)} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPermissions(prev => 
                                    checked 
                                      ? [...prev, item.value] 
                                      : prev.filter(p => p !== item.value)
                                  );
                                }} 
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Reports & Documentation */}
                      <div className="border-b border-gray-100 pb-2">
                        <h4 className="font-medium text-gray-800 mb-2">📊 Reports & Documentation</h4>
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          {[
                            { label: "All Submitted Reports", value: "/admin/submitted-reports" },
                            { label: "Report Templates", value: "/admin/internal-reports" },
                            { label: "Generate Reports", value: "/admin/generate-ticket-reports" },
                            { label: "All Tickets (ReportGov)", value: "/admin/tickets" }
                          ].map(item => (
                            <label key={item.value} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={permissions.includes(item.value)} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPermissions(prev => 
                                    checked 
                                      ? [...prev, item.value] 
                                      : prev.filter(p => p !== item.value)
                                  );
                                }} 
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Content Management */}
                      <div className="border-b border-gray-100 pb-2">
                        <h4 className="font-medium text-gray-800 mb-2">📝 Content Management</h4>
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          {[
                            { label: "Manage Articles", value: "/admin/posts" },
                            { label: "Create Articles", value: "/admin/create-article" },
                            { label: "Upload Reports", value: "/admin/reports" },
                            { label: "Manage Events", value: "/admin/events" },
                            { label: "Create Events", value: "/admin/create-events" },
                            { label: "Media Posts", value: "/admin/create-media-posts" }
                          ].map(item => (
                            <label key={item.value} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={permissions.includes(item.value)} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPermissions(prev => 
                                    checked 
                                      ? [...prev, item.value] 
                                      : prev.filter(p => p !== item.value)
                                  );
                                }} 
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Communications */}
                      <div className="border-b border-gray-100 pb-2">
                        <h4 className="font-medium text-gray-800 mb-2">📧 Communications</h4>
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          {[
                            { label: "Newsletter Management", value: "/admin/newsletters" },
                            { label: "Subscriber Management", value: "/admin/subscribers" },
                            { label: "All Internal Letters", value: "/admin/letters" },
                            { label: "Business Letters", value: "/admin/business-letters" },
                            { label: "Send Letters", value: "/admin/send-letters" }
                          ].map(item => (
                            <label key={item.value} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={permissions.includes(item.value)} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPermissions(prev => 
                                    checked 
                                      ? [...prev, item.value] 
                                      : prev.filter(p => p !== item.value)
                                  );
                                }} 
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Project & Resource Management */}
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">🎯 Projects & Resources</h4>
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          {[
                            { label: "All Projects", value: "/admin/projects" },
                            { label: "Material Management", value: "/admin/materials" },
                            { label: "Saber Materials", value: "/admin/saber-materials" },
                            { label: "Shared Tasks (Kanban)", value: "/admin/kanban" },
                            { label: "Meetings Management", value: "/admin/meetings" },
                            { label: "Reforms Management", value: "/admin/reforms" }
                          ].map(item => (
                            <label key={item.value} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={permissions.includes(item.value)} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPermissions(prev => 
                                    checked 
                                      ? [...prev, item.value] 
                                      : prev.filter(p => p !== item.value)
                                  );
                                }} 
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 These permissions will be added to their existing staff stream permissions
                  </p>
                </div>}

                <Button onClick={handleSave} disabled={isLoading} className="mt-6 w-full">
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogContent>
            </Dialog>
            <Link href={`/admin/users/${user.clerkUserId}`}>
  <Button size="sm" variant="secondary" className="mt-2 text-xs px-3 py-1">
    👁️ See Full Details
  </Button>
              </Link>
          </TableCell>
        </TableRow>)}
    </TableBody>
  </Table>
    </div>


      {}
      <div className="flex justify-center items-center mt-6 gap-4">
        <Button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
          Previous
        </Button>
        <span className="text-gray-600">Page {currentPage} of {totalPages}</span>
        <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
          Next
        </Button>
      </div>
    </div>;
}