// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Id } from '@/convex/_generated/dataModel';
import * as XLSX from 'xlsx';
import { Link, Download } from 'lucide-react';
import { useRouter } from "next/navigation";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function EventDetailsPage() {
  const params = useParams();
  const rawEventId = params.eventId as string;
  const eventId = rawEventId as Id<'events'>;
  const event = useQuery(api.events.getEventDetails, {
    eventId
  });
  const [ticketType, setTicketType] = useState<'all' | 'vip' | 'general'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const [searchTerm, setSearchTerm] = useState('');
  const toggleSignUps = useMutation(api.events.toggleSignUps);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const router = useRouter();
  const registrations = useQuery(api.events.getEventRegistrationsWithUserDetails, {
    eventId,
    ticketType: ticketType === 'all' ? undefined : ticketType
  });
  const specialEventData = useQuery(api.events.getSpecialEventResponses, event?.isSpecialEvent ? {
    eventId
  } : "skip");
  // Decimal numbering for special event questions (Section 1 → 1.1, 1.2; Section 2 → 2.1, 2.2, ...)
  const specialEventQuestionsWithLabels = useMemo(() => {
    if (!specialEventData?.questions?.length) return [];
    const questions = specialEventData.questions;
    const sections = questions.reduce((acc: Record<string, typeof questions>, q) => {
      const section = q.section || "General";
      if (!acc[section]) acc[section] = [];
      acc[section].push(q);
      return acc;
    }, {});
    Object.keys(sections).forEach(section => {
      sections[section].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    const sectionNames = Object.keys(sections).sort(
      (a, b) => Math.min(...sections[a].map(q => q.order ?? 0)) - Math.min(...sections[b].map(q => q.order ?? 0))
    );
    const result: { questionId: Id<"event_questions">; label: string; question: (typeof questions)[0] }[] = [];
    sectionNames.forEach((sectionName, sectionIndex) => {
      const sectionNumber = sectionIndex + 1;
      sections[sectionName].forEach((q, questionIndex) => {
        const questionNumber = questionIndex + 1;
        result.push({
          questionId: q._id,
          label: `${sectionNumber}.${questionNumber} ${q.questionText}`,
          question: q
        });
      });
    });
    return result;
  }, [specialEventData?.questions]);
  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    return registrations.filter(reg => {
      const term = searchTerm.toLowerCase();
      return reg.ticketNumber?.toLowerCase().includes(term) || reg.firstName?.toLowerCase().includes(term) || reg.lastName?.toLowerCase().includes(term) || reg.email?.toLowerCase().includes(term) || reg.phone?.toLowerCase().includes(term);
    });
  }, [registrations, searchTerm]);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRegistrations.slice(start, start + pageSize);
  }, [filteredRegistrations, page]);
  const totalPages = registrations ? Math.ceil(registrations.length / pageSize) : 1;
  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };
  const handleExport = (format: 'pdf' | 'excel', filter?: 'vip' | 'general') => {
    if (!filteredRegistrations || !event) return;
    const filteredData = filter ? filteredRegistrations.filter(reg => filter === 'vip' ? reg.isVip : !reg.isVip) : filteredRegistrations;
    
    // For special events, include structured responses
    let exportData: any[];
    if (event.isSpecialEvent && specialEventData) {
      exportData = filteredData.map(reg => {
        const row: any = {
          'Ticket Number': reg.ticketNumber,
          'First Name': reg.firstName || '',
          'Last Name': reg.lastName || '',
          'Email': reg.email || '',
          'Phone': reg.phone || '',
          'Organization': reg.organization || '',
          'Designation': reg.designation || '',
          'Ticket Type': reg.isVip ? 'VIP' : 'General',
          'Registered At': new Date(reg.registeredAt).toLocaleString()
        };
        // Add all question responses with decimal labels (e.g. "5.1 Question text")
        if (reg.structuredResponses && specialEventQuestionsWithLabels.length) {
          specialEventQuestionsWithLabels.forEach(({ questionId, label }) => {
            const data = reg.structuredResponses?.[questionId];
            const answer = data?.answer;
            row[label] = Array.isArray(answer) ? answer.join("; ") : (answer ?? '');
          });
        }
        return row;
      });
    } else {
      exportData = filteredData.map(reg => ({
        'Ticket Number': reg.ticketNumber,
        'First Name': reg.firstName || '',
        'Last Name': reg.lastName || '',
        'Email': reg.email || '',
        'Phone': reg.phone || '',
        'Ticket Type': reg.isVip ? 'VIP' : 'General'
      }));
    }
    if (format === 'excel') {
      exportToExcel(exportData, filter ? `Attendees_${filter}` : 'Attendees_All');
    } else {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const style = `
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1, h2 { margin-bottom: 5px; }
          p { margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
        </style>
      `;
      const tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Ticket Number</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Ticket Type</th>
            </tr>
          </thead>
          <tbody>
            ${exportData.map(reg => `
              <tr>
                <td>${reg['Ticket Number']}</td>
                <td>${reg['First Name']}</td>
                <td>${reg['Last Name']}</td>
                <td>${reg['Email']}</td>
                <td>${reg['Phone']}</td>
                <td>${reg['Ticket Type']}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      const eventDate = new Date(event.eventDate).toLocaleString();
      printWindow.document.write(`
        <html>
          <head><title>Print Attendees</title>${style}</head>
          <body>
            <h1>${event.title}</h1>
            <p><strong>Date & Time:</strong> ${eventDate}</p>
            <h2>Attendees List (${filter?.toUpperCase() || 'ALL'})</h2>
            ${tableHtml}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };
  if (!event) return <div>Loading...</div>;
  return <div className="max-w-7xl mx-auto p-6">
   <div className="mb-4">
  <a href="/admin/events" className="inline-flex items-center text-sm text-green-700 hover:underline">
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Events
  </a>
    </div>

      <h1 className="text-3xl font-bold text-green-700 mb-6">{event.title}</h1>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">Event details</h2>
      <hr className="my-4 border-gray-200" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <p className="text-gray-600"><strong>Event Date:</strong> {format(new Date(event.eventDate), 'PPpp')}</p>
      {event.registrationDeadline != null && (
        <p className="text-gray-600"><strong>Registration Deadline:</strong> {format(new Date(event.registrationDeadline), 'PPpp')}</p>
      )}
      <p className="text-gray-600"><strong>Host:</strong> {event.host}</p>
      <p className="text-gray-600"><strong>Location:</strong> {event.location}</p>
    </div>
    <div>
      <p className="text-gray-600"><strong>VIP Tickets:</strong> {event.vipTicketsSold}</p>
      <p className="text-gray-600"><strong>General Tickets:</strong> {event.generalTicketsSold}</p>
      <p className="text-gray-600"><strong>Total Attendees:</strong> {event.totalAttendees}</p>
      {event.vipAccessCode && <p className="text-gray-600">
    <strong>VIP Access Code:</strong> {event.vipAccessCode}
  </p>}

    </div>
    <div className="mt-4">
  <p className="text-sm text-gray-600">
    <strong>Sign-Ups:</strong>{" "}
    <span className={event.signUpsDisabled ? "text-red-600" : "text-green-600"}>
      {event.signUpsDisabled ? "Disabled" : "Enabled"}
    </span>
  </p>
  <Button onClick={() => toggleSignUps({
            eventId,
            disable: !event.signUpsDisabled
          })} className={`mt-2 ${event.signUpsDisabled ? "bg-green-600" : "bg-red-600"} text-white`}>
    {event.signUpsDisabled ? "Enable Sign-Ups" : "Disable Sign-Ups"}
  </Button>

  <div className="mt-4 flex gap-4">
  <Link href={`/admin/create-events/${eventId}`}>
    <Button variant="outline">✏️ Edit Event</Button>
  </Link>
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="destructive">🗑️ Delete Event</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Deletion</DialogTitle>
      </DialogHeader>
      <p>Are you sure you want to delete <strong>{event.title}</strong>? This will also notify all attendees.</p>
      <DialogFooter className="mt-4">
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive" onClick={async () => {
                    try {
                      await deleteEvent({
                        eventId
                      });
                      toast.success("Event deleted successfully");
                      router.push("/admin/events");
                    } catch (err) {
                      toast.error("Failed to delete event");
                      console.error(err);
                    }
                  }}>
          Confirm Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
          </div>

        </div>


  </div>
  <p className="text-gray-600 mt-4"><strong>Description:</strong> {event.description}</p>
    </div>



    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
  <div className="flex items-center gap-2">
    <Select value={ticketType} onValueChange={val => setTicketType(val as 'all' | 'vip' | 'general')}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Filter by Ticket Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="vip">VIP</SelectItem>
        <SelectItem value="general">General</SelectItem>
      </SelectContent>
    </Select>
    <Input placeholder="Search attendees..." value={searchTerm} onChange={e => {
          setSearchTerm(e.target.value);
          setPage(1);
        }} className="w-full md:w-64" />
  </div>

  <div className="flex flex-wrap gap-2 w-full md:w-auto">
  <div className="flex-1 min-w-[150px]">
    <Button variant="outline" className="w-full" onClick={() => handleExport('excel')}>
      Export All (Excel)
    </Button>
  </div>
  <div className="flex-1 min-w-[150px]">
    <Button variant="outline" className="w-full" onClick={() => handleExport('excel', 'vip')}>
      Export VIP (Excel)
    </Button>
  </div>
  <div className="flex-1 min-w-[150px]">
    <Button variant="outline" className="w-full" onClick={() => handleExport('excel', 'general')}>
      Export General (Excel)
    </Button>
  </div>
  <div className="flex-1 min-w-[180px]">
    <Button variant="default" className="w-full bg-green-600 text-white hover:bg-green-700" onClick={() => handleExport('pdf')}>
      🖨️ Print Attendees List
    </Button>
  </div>
      </div>

    </div>


      {event.isSpecialEvent && specialEventData ? (
        <Tabs defaultValue="attendees" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="responses">Form Responses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="attendees">
            <div className="overflow-x-auto bg-white rounded-md shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket Number</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Ticket Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(reg => <TableRow key={reg._id}>
                      <TableCell>{reg.ticketNumber}</TableCell>
                      <TableCell>{reg.firstName}</TableCell>
                      <TableCell>{reg.lastName}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell>{reg.phone}</TableCell>
                      <TableCell>{reg.isVip ? 'VIP' : 'General'}</TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="responses">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  onClick={() => {
                    if (!specialEventData) return;
                    const exportData: any[] = [];
                    specialEventData.registrations.forEach(reg => {
                      const row: any = {
                        'Ticket Number': reg.ticketNumber,
                        'First Name': reg.firstName || '',
                        'Last Name': reg.lastName || '',
                        'Email': reg.email || '',
                        'Phone': reg.phone || '',
                        'Organization': reg.organization || '',
                        'Designation': reg.designation || '',
                        'Registered At': new Date(reg.registeredAt).toLocaleString()
                      };
                      specialEventQuestionsWithLabels.forEach(({ questionId, label }) => {
                        const data = reg.structuredResponses?.[questionId];
                        const answer = data?.answer;
                        row[label] = Array.isArray(answer) ? answer.join("; ") : (answer ?? '');
                      });
                      exportData.push(row);
                    });
                    exportToExcel(exportData, `${event.title}_Responses`);
                  }}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All Responses (Excel)
                </Button>
              </div>
              
              <div className="overflow-x-auto bg-white rounded-md shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Organization</TableHead>
                      {specialEventQuestionsWithLabels.map(({ questionId, label, question }) => (
                        <TableHead key={questionId} className="max-w-xs">
                          {label}
                          {question.isRequired && <span className="text-red-600 ml-1">*</span>}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specialEventData.registrations.map(reg => (
                      <TableRow key={reg._id}>
                        <TableCell className="font-medium">{reg.ticketNumber}</TableCell>
                        <TableCell>{reg.firstName} {reg.lastName}</TableCell>
                        <TableCell>{reg.email}</TableCell>
                        <TableCell>{reg.organization}</TableCell>
                        {specialEventQuestionsWithLabels.map(({ questionId, question }) => {
                          const response = reg.structuredResponses?.[questionId];
                          const answer = response?.answer;
                          return (
                            <TableCell key={questionId} className="max-w-xs">
                              {Array.isArray(answer) ? (
                                <div className="space-y-1">
                                  {answer.map((a, idx) => (
                                    <div key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">{a}</div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm">{answer || '-'}</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="overflow-x-auto bg-white rounded-md shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket Number</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Ticket Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(reg => <TableRow key={reg._id}>
                  <TableCell>{reg.ticketNumber}</TableCell>
                  <TableCell>{reg.firstName}</TableCell>
                  <TableCell>{reg.lastName}</TableCell>
                  <TableCell>{reg.email}</TableCell>
                  <TableCell>{reg.phone}</TableCell>
                  <TableCell>{reg.isVip ? 'VIP' : 'General'}</TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>;
}