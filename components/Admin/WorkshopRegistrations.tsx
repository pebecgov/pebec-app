'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Download, Search, CheckCircle, XCircle } from 'lucide-react';

export default function WorkshopRegistrations() {
  const registrations = useQuery(api.workshop.listRegistrations);
  const stats = useQuery(api.workshop.getRegistrationStats);
  const confirmRegistration = useMutation(api.workshop.confirmRegistration);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleConfirmRegistration = async (registrationId: string) => {
    try {
      await confirmRegistration({ registrationId: registrationId as any });
      toast.success("Registration confirmed successfully");
    } catch (error) {
      toast.error("Failed to confirm registration");
    }
  };

  const filteredRegistrations = registrations?.filter(reg => {
    const matchesSearch = 
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSector = sectorFilter === 'all' || reg.sector === sectorFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'confirmed' && reg.confirmedEntry) ||
      (statusFilter === 'pending' && !reg.confirmedEntry);
    
    return matchesSearch && matchesSector && matchesStatus;
  }) || [];

  const exportToCSV = () => {
    if (!registrations) return;
    
    const csvContent = [
      ['Registration Number', 'Name', 'Email', 'Phone', 'Organization', 'Designation', 'Sector', 'Registration Date', 'Confirmed Entry'],
      ...registrations.map(reg => [
        reg.registrationNumber,
        reg.name,
        reg.email,
        reg.phone,
        reg.organization,
        reg.designation,
        reg.sector,
        format(new Date(reg.createdAt), 'yyyy-MM-dd HH:mm'),
        reg.confirmedEntry ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workshop-registrations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!registrations || !stats) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-600">Total Registrations</h3>
          <p className="text-2xl font-bold text-blue-900">{stats.totalRegistrations}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-600">Confirmed</h3>
          <p className="text-2xl font-bold text-green-900">{stats.confirmedRegistrations}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-600">Pending</h3>
          <p className="text-2xl font-bold text-yellow-900">{stats.pendingRegistrations}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-600">Sectors</h3>
          <p className="text-2xl font-bold text-purple-900">{Object.keys(stats.sectorCounts).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search registrations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:w-1/3"
        />
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="md:w-1/4">
            <SelectValue placeholder="Filter by sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            <SelectItem value="Health">Health</SelectItem>
            <SelectItem value="IT/FinTech/Artificial Intelligence">IT/FinTech/AI</SelectItem>
            <SelectItem value="Agriculture">Agriculture</SelectItem>
            <SelectItem value="Shipping">Shipping</SelectItem>
            <SelectItem value="Aviation">Aviation</SelectItem>
            <SelectItem value="Renewable Energy">Renewable Energy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-1/4">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={exportToCSV} className="md:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRegistrations.map((registration) => (
              <TableRow key={registration._id}>
                <TableCell className="font-mono text-sm">
                  {registration.registrationNumber}
                </TableCell>
                <TableCell className="font-medium">{registration.name}</TableCell>
                <TableCell>{registration.email}</TableCell>
                <TableCell>{registration.organization}</TableCell>
                <TableCell>{registration.designation}</TableCell>
                <TableCell>
                  <Badge variant="outline">{registration.sector}</Badge>
                </TableCell>
                <TableCell>
                  {registration.confirmedEntry ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirmed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600">
                      <XCircle className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(registration.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  {!registration.confirmedEntry && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmRegistration(registration._id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirm
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredRegistrations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No registrations found matching your criteria.
        </div>
      )}
    </div>
  );
}
