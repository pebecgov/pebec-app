"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Send, Users, AlertCircle, CheckCircle, Info, Mail, Eye, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Deadline {
  _id: string;
  dliCategory: string;
  indicator: string;
  deadline: number;
  description: string;
  comments?: string;
  priority: "high" | "medium" | "low";
  isActive: boolean;
  stats: {
    totalReminders: number;
    sentReminders: number;
    pendingReminders: number;
    futureReminders: number;
  };
}

const SaberDeadlineManager = () => {
  const [selectedDeadline, setSelectedDeadline] = useState<string>("");
  const [reminderType, setReminderType] = useState<string>("custom");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [triggerDate, setTriggerDate] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedDeadlineForRecipients, setSelectedDeadlineForRecipients] = useState<string>("");

  // Queries
  const deadlines = useQuery(api.saber_deadlines.getAllDeadlinesForAdmin) as Deadline[] | undefined;
  const reminderStats = useQuery(api.saber_deadlines.getReminderStatistics);
  const reminderRecipients = useQuery(
    api.saber_deadlines.getDeadlineReminderRecipients,
    selectedDeadlineForRecipients ? { deadlineId: selectedDeadlineForRecipients as any } : "skip"
  );
  const reminderStatsForDeadline = useQuery(
    api.saber_deadlines.getDeadlineReminderStats,
    selectedDeadlineForRecipients ? { deadlineId: selectedDeadlineForRecipients as any } : "skip"
  );

  // Mutations
  const triggerCustomReminder = useMutation(api.saber_deadlines.triggerCustomReminder);
  const initializeDeadlines = useMutation(api.saber_deadlines.initializeSaberDeadlines);
  const triggerReminderProcessing = useMutation(api.saber_deadlines.triggerReminderProcessing);
  const testAdminCCLogic = useMutation(api.saber_deadlines.testAdminCCLogic);

  const handleTriggerReminder = async () => {
    if (!selectedDeadline) {
      toast.error("Please select a deadline");
      return;
    }

    try {
      const triggerTimestamp = triggerDate ? new Date(triggerDate).getTime() : undefined;
      
      const result = await triggerCustomReminder({
        deadlineId: selectedDeadline as any,
        reminderType: reminderType as any,
        customMessage: customMessage || undefined,
        triggerDate: triggerTimestamp,
      });

      toast.success(result.message);

      // Reset form
      setCustomMessage("");
      setTriggerDate("");
    } catch (error) {
      toast.error("Failed to send reminder. Please try again.");
    }
  };

  const handleInitializeSystem = async () => {
    try {
      const result = await initializeDeadlines({});
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to initialize system. Please try again.");
    }
  };

  const handleProcessReminders = async () => {
    try {
      await triggerReminderProcessing({});
      toast.success("Reminder processing has been initiated");
    } catch (error) {
      toast.error("Failed to trigger processing. Please try again.");
    }
  };

  const handleTestAdminCC = async () => {
    try {
      const result = await testAdminCCLogic({});
      toast.success(`Test sent to ${result.saberReminderAdmins} admins. Check your email.`);
    } catch (error) {
      toast.error("Failed to test admin CC logic. Please try again.");
    }
  };

  const filteredDeadlines = deadlines?.filter(deadline => 
    filterCategory === "all" || deadline.dliCategory === filterCategory
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (deadline: Deadline) => {
    const daysRemaining = Math.ceil((deadline.deadline - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysRemaining <= 3) return "text-red-600";
    if (daysRemaining <= 7) return "text-orange-600";
    if (daysRemaining <= 14) return "text-yellow-600";
    return "text-green-600";
  };

  const categories = Array.from(new Set(deadlines?.map(d => d.dliCategory) || []));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SABER Deadline Manager</h1>
          <p className="text-gray-600 mt-1">Manage and trigger custom reminders for SABER deadlines</p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={handleInitializeSystem} variant="outline">
            <CheckCircle className="w-4 h-4 mr-2" />
            Initialize System
          </Button>
          <Button onClick={handleProcessReminders} variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Process Reminders
          </Button>
        </div>
      </div>

      {/* System Statistics */}
      {reminderStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deadlines</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reminderStats.totalDeadlines}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent Reminders</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reminderStats.sentReminders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reminders</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{reminderStats.pendingReminders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SABER Agents</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{reminderStats.saberAgents}</div>
              <p className="text-xs text-muted-foreground mt-1">{reminderStats.activeStates} states</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custom Reminder Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Trigger Custom Reminder
            </CardTitle>
            <CardDescription>
              Send custom reminders to SABER agents for specific deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deadline-select">Select Deadline</Label>
              <Select value={selectedDeadline} onValueChange={setSelectedDeadline}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a deadline..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredDeadlines?.map((deadline) => (
                    <SelectItem key={deadline._id} value={deadline._id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{deadline.indicator}</span>
                        <span className="text-sm text-gray-500">{deadline.dliCategory}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-type">Reminder Type</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">📢 Custom Message</SelectItem>
                  <SelectItem value="30_days">🔵 30 Days Before</SelectItem>
                  <SelectItem value="14_days">🔔 14 Days Before</SelectItem>
                  <SelectItem value="7_days">⚠️ 7 Days Before</SelectItem>
                  <SelectItem value="3_days">🚨 3 Days Before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-message">Custom Message (Optional)</Label>
              <Textarea
                id="custom-message"
                placeholder="Enter custom reminder message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger-date">Trigger Date (Optional)</Label>
              <Input
                id="trigger-date"
                type="datetime-local"
                value={triggerDate}
                onChange={(e) => setTriggerDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Leave empty to trigger immediately
              </p>
            </div>

            <Button 
              onClick={handleTriggerReminder} 
              className="w-full"
              disabled={!selectedDeadline}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
            
            <Button 
              onClick={handleTestAdminCC} 
              variant="outline"
              className="w-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              Test Admin CC Logic
            </Button>
          </CardContent>
        </Card>

        {/* Deadlines List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All SABER Deadlines</CardTitle>
                <CardDescription>
                  Monitor and manage all active deadlines
                </CardDescription>
              </div>
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredDeadlines?.map((deadline) => {
                const daysRemaining = Math.ceil((deadline.deadline - Date.now()) / (24 * 60 * 60 * 1000));
                const deadlineDate = format(new Date(deadline.deadline), "MMM dd, yyyy");
                
                return (
                  <div
                    key={deadline._id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedDeadline === deadline._id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedDeadline(deadline._id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{deadline.indicator}</h3>
                        <p className="text-sm text-gray-600 mt-1">{deadline.description}</p>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Badge className={getPriorityColor(deadline.priority)}>
                          {deadline.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {deadline.dliCategory}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-4">
                        <span className={`flex items-center gap-1 ${getStatusColor(deadline)}`}>
                          <Calendar className="w-4 h-4" />
                          {deadlineDate} ({daysRemaining} days)
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-gray-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          {deadline.stats.sentReminders} sent
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-blue-600" />
                          {deadline.stats.futureReminders} scheduled
                        </span>
                        {deadline.stats.pendingReminders > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            {deadline.stats.pendingReminders} pending
                          </span>
                        )}
                        
                        {deadline.stats.sentReminders > 0 && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedDeadlineForRecipients(deadline._id)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                View Recipients
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <UserCheck className="w-5 h-5" />
                                  Reminder Recipients
                                </DialogTitle>
                                <DialogDescription>
                                  List of people who have received reminders for: {deadline.indicator}
                                </DialogDescription>
                              </DialogHeader>
                              
                              {reminderRecipients && (
                                <div className="space-y-4">
                                  <div className="flex gap-4 text-sm">
                                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                      Total Recipients: {reminderRecipients.totalRecipients}
                                    </div>
                                    {reminderStatsForDeadline && (
                                      <>
                                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                          Emails Sent: {reminderStatsForDeadline.sentReminders}
                                        </div>
                                        <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                                          Pending: {reminderStatsForDeadline.pendingReminders}
                                        </div>
                                        <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                                          Future: {reminderStatsForDeadline.futureReminders}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead>Reminder Type</TableHead>
                                        <TableHead>Sent Date</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {reminderRecipients.recipients.map((recipient) => (
                                        <TableRow key={recipient.reminderId}>
                                          <TableCell className="font-medium">
                                            {recipient.userName}
                                          </TableCell>
                                          <TableCell>{recipient.userEmail}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline">{recipient.state}</Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Badge 
                                              variant={
                                                recipient.reminderType === "3_days" ? "destructive" :
                                                recipient.reminderType === "7_days" ? "destructive" :
                                                recipient.reminderType === "14_days" ? "secondary" :
                                                "default"
                                              }
                                            >
                                              {recipient.reminderType.replace("_", " ")}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {recipient.sentAt ? format(new Date(recipient.sentAt), "MMM dd, yyyy HH:mm") : "Not sent"}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex gap-2">
                                              {recipient.emailSent && (
                                                <Badge variant="outline" className="text-green-600">
                                                  <Mail className="w-3 h-3 mr-1" />
                                                  Email
                                                </Badge>
                                              )}
                                              {recipient.notificationSent && (
                                                <Badge variant="outline" className="text-blue-600">
                                                  <Info className="w-3 h-3 mr-1" />
                                                  Notification
                                                </Badge>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  
                                  {reminderStatsForDeadline && (
                                    <div className="mt-6 space-y-4">
                                      <h4 className="font-semibold">Statistics by Reminder Type</h4>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(reminderStatsForDeadline.byType).map(([type, stats]) => (
                                          <div key={type} className="bg-gray-50 p-3 rounded-lg">
                                            <div className="text-sm font-medium">{type.replace("_", " ")}</div>
                                            <div className="text-xs text-gray-600">
                                              {stats.sent} sent / {stats.total} total
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      <h4 className="font-semibold">Statistics by State</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                        {Object.entries(reminderStatsForDeadline.byState).map(([state, stats]) => (
                                          <div key={state} className="bg-gray-50 p-2 rounded text-sm">
                                            <div className="font-medium">{state}</div>
                                            <div className="text-xs text-gray-600">
                                              {stats.sent} sent, {stats.pending} pending, {stats.future} future
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaberDeadlineManager;