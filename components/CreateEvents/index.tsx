// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import ImageUploader from "@/components/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle, X, Trash2 } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

type QuestionItem = {
  text: string;
  type: "text" | "number" | "email" | "scale" | "radio" | "checkbox" | "textarea";
  section?: string;
  order?: number;
  isRequired?: boolean;
  options?: string[];
  _id?: Id<"event_questions">;
};

export default function CreateEventPage({ eventId }: { eventId?: Id<"events"> }) {
  const { toast } = useToast();
  const router = useRouter();
  const createEventMutation = useMutation(api.events.createEvent);
  const editEventMutation = useMutation(api.events.editEvent);
  const createEventQuestionMutation = useMutation(api.events.createEventQuestion);
  const event = useQuery(api.events.getEventDetails, eventId ? { eventId } : "skip");
  const existingQuestions = useQuery(api.events.getEventQuestions, eventId && event ? { eventId } : "skip");
  const [formLoaded, setFormLoaded] = useState(false);
  const [questionsLoadedFromServer, setQuestionsLoadedFromServer] = useState(false);
  const [imageSelectedButNotUploaded, setImageSelectedButNotUploaded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [host, setHost] = useState("");
  const [coverImageId, setCoverImageId] = useState<Id<"_storage"> | undefined>(undefined);
  const [isSpecialEvent, setIsSpecialEvent] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"text" | "number" | "email" | "scale" | "radio" | "checkbox" | "textarea">("text");
  const [questionSection, setQuestionSection] = useState("");
  const [questionOrder, setQuestionOrder] = useState<number | "">("");
  const [isRequired, setIsRequired] = useState(false);
  const [questionOptions, setQuestionOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [eventType, setEventType] = useState<"vip" | "general" | "vip_and_general">("general");
  const [vipAccessCode, setVipAccessCode] = useState("");
  const [vipLimit, setVipLimit] = useState<number | "">("");
  const [generalLimit, setGeneralLimit] = useState<number | "">("");
  const [ticketLimit, setTicketLimit] = useState<number | "">("");
  const [customUrl, setCustomUrl] = useState("");
  const [customUrlError, setCustomUrlError] = useState("");

  // Pre-fill form when editing an existing event
  useEffect(() => {
    if (!eventId || !event || formLoaded) return;
    setTitle(event.title ?? "");
    setDescription(event.description ?? "");
    setEventDate(event.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : "");
    setRegistrationDeadline(event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : "");
    setLocation(event.location ?? "");
    setHost(event.host ?? "");
    setCoverImageId(event.coverImageId ?? undefined);
    setEventType(event.eventType ?? "general");
    setVipAccessCode(event.vipAccessCode ?? "");
    setTicketLimit(event.ticketLimit ?? "");
    setVipLimit(event.vipTicketLimit ?? "");
    setGeneralLimit(event.generalTicketLimit ?? "");
    setCustomUrl(event.customUrl ?? "");
    setIsSpecialEvent(event.isSpecialEvent ?? false);
    setFormLoaded(true);
  }, [eventId, event, formLoaded]);

  useEffect(() => {
    if (!eventId || existingQuestions === undefined || questionsLoadedFromServer) return;
    setQuestionsLoadedFromServer(true);
    setQuestions(existingQuestions.map(q => ({
      text: q.questionText,
      type: (q.questionType ?? "text") as QuestionItem["type"],
      section: q.section ?? undefined,
      order: q.order ?? undefined,
      isRequired: q.isRequired ?? false,
      options: q.options ?? undefined,
      _id: q._id
    })));
  }, [eventId, existingQuestions, questionsLoadedFromServer]);

  const handleSubmitEvent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customUrl && !/^[a-zA-Z0-9-_]+$/.test(customUrl)) {
      setCustomUrlError("Custom URL can only contain letters, numbers, hyphens, and underscores");
      return;
    }
    const payload = {
      title,
      description,
      eventDate: new Date(eventDate).getTime(),
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline).getTime() : undefined,
      location,
      host,
      coverImageId,
      eventType,
      vipAccessCode: vipAccessCode || undefined,
      ticketLimit: eventType === "vip_and_general" ? undefined : ticketLimit === "" ? undefined : ticketLimit,
      vipTicketLimit: eventType === "vip_and_general" && vipLimit !== "" ? vipLimit : undefined,
      generalTicketLimit: eventType === "vip_and_general" && generalLimit !== "" ? generalLimit : undefined,
      customUrl: customUrl.trim() || undefined,
      isSpecialEvent: isSpecialEvent || undefined
    };
    try {
      const createdEventId = await createEventMutation({
        title,
        description,
        eventDate: new Date(eventDate).getTime(),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline).getTime() : undefined,
        location,
        host,
        coverImageId,
        eventType,
        vipAccessCode: vipAccessCode || undefined,
        ticketLimit: eventType === "vip_and_general" ? undefined : ticketLimit === "" ? undefined : ticketLimit,
        vipTicketLimit: eventType === "vip_and_general" && vipLimit !== "" ? vipLimit : undefined,
        generalTicketLimit: eventType === "vip_and_general" && generalLimit !== "" ? generalLimit : undefined,
        customUrl: customUrl.trim() || undefined,
        isSpecialEvent: isSpecialEvent || undefined
      });
      await Promise.all(questions.map((question, index) => createEventQuestionMutation({
        eventId: createdEventId,
        questionText: question.text,
        questionType: question.type,
        isRequired: question.isRequired,
        options: question.options,
        section: question.section,
        order: question.order ?? index
      })));
      setTitle("");
      setDescription("");
      setEventDate("");
      setRegistrationDeadline("");
      setLocation("");
      setHost("");
      setCustomUrl("");
      setCustomUrlError("");
      setCoverImageId(undefined);
      setQuestions([]);
      setQuestionText("");
      setQuestionType("text");
      setQuestionSection("");
      setQuestionOrder("");
      setIsRequired(false);
      setQuestionOptions([]);
      setNewOption("");
      setIsSpecialEvent(false);
      setEventType("general");
      setVipAccessCode("");
      setTicketLimit("");
      setVipLimit("");
      setGeneralLimit("");
      toast({
        title: "Success!",
        description: "Event created successfully!"
      });
    } catch (error) {
      console.error("Error creating event:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create event. Try again!";
      
      // Handle custom URL validation errors
      if (errorMessage.includes("Custom URL")) {
        setCustomUrlError(errorMessage);
      }
    } catch (error) {
      console.error(eventId ? "Error updating event:" : "Error creating event:", error);
      const errorMessage = error instanceof Error ? error.message : (eventId ? "Failed to update event." : "Failed to create event. Try again!");
      if (errorMessage.includes("Custom URL")) setCustomUrlError(errorMessage);
      toast({ title: "Error!", description: errorMessage, variant: "destructive" });
    }
  };
  const handleAddQuestion = () => {
    if (!questionText.trim()) return;
    if ((questionType === "radio" || questionType === "checkbox") && questionOptions.length === 0) {
      toast({
        title: "Error!",
        description: "Please add at least one option for radio/checkbox questions",
        variant: "destructive"
      });
      return;
    }
    setQuestions([...questions, {
      text: questionText,
      type: questionType,
      section: questionSection || undefined,
      order: questionOrder === "" ? undefined : Number(questionOrder),
      isRequired: isRequired,
      options: questionOptions.length > 0 ? questionOptions : undefined
    }]);
    setQuestionText("");
    setQuestionType("text");
    setQuestionSection("");
    setQuestionOrder("");
    setIsRequired(false);
    setQuestionOptions([]);
    setNewOption("");
  };

  const handleAddOption = () => {
    if (newOption.trim() && !questionOptions.includes(newOption.trim())) {
      setQuestionOptions([...questionOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setQuestionOptions(questionOptions.filter((_, i) => i !== index));
  };
  return <div className="flex justify-center items-center min-h-screen px-4 sm:px-6">
      <div className="max-w-3xl w-full p-6 sm:p-8 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6">{eventId ? "Edit Event" : "Create New Event"}</h1>

        <div className="mb-4">
        <ImageUploader setImageId={storageId => {
          setCoverImageId(storageId as Id<"_storage">);
        }} onFileSelect={() => setImageSelectedButNotUploaded(true)} onUploadConfirmed={() => setImageSelectedButNotUploaded(false)} />
        </div>

        <form onSubmit={e => {
        if (imageSelectedButNotUploaded && !coverImageId) {
          e.preventDefault();
          setOpenModal(true);
          return;
        }
        handleSubmitEvent(e);
      }} className="space-y-5">
          <div>
            <Label>Event Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div>
            <Label>Event Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} required />
          </div>

          <div>
            <Label>Event Date & Time</Label>
            <Input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
          </div>

          <div>
            <Label>Registration Deadline (optional)</Label>
            <Input
              type="datetime-local"
              value={registrationDeadline}
              onChange={e => setRegistrationDeadline(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              When registration closes. Leave empty to allow registration until the event date.
            </p>
          </div>

          <div>
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} required />
          </div>

          <div>
            <Label>Host Name</Label>
            <Input value={host} onChange={e => setHost(e.target.value)} required />
          </div>

          <div>
            <Label>Custom URL (optional)</Label>
            <Input 
              value={customUrl} 
              onChange={e => {
                setCustomUrl(e.target.value);
                setCustomUrlError("");
              }} 
              placeholder="e.g., cop30, climate-summit-2024"
              pattern="[a-zA-Z0-9\-_]+"
              title="Only letters, numbers, hyphens, and underscores allowed"
            />
            {customUrlError && <p className="text-xs text-red-500 mt-1">{customUrlError}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Custom URL will be: pebec.gov.ng/events/{customUrl || '[auto-generated]'}
            </p>
          </div>

          <div>
            <Label>Event Type</Label>
            <select value={eventType} onChange={e => setEventType(e.target.value as any)} className="border p-2 rounded-md w-full">
              <option value="general">General</option>
              <option value="vip">VIP</option>
              <option value="vip_and_general">VIP + General</option>
            </select>
          </div>

          {eventType !== "general" && <div>
              <Label>VIP Access Code</Label>
              <Input value={vipAccessCode} onChange={e => setVipAccessCode(e.target.value)} />
            </div>}

          {eventType === "vip_and_general" ? <>
              <div>
                <Label>VIP Ticket Limit</Label>
                <Input type="number" value={vipLimit} onChange={e => setVipLimit(e.target.value === "" ? "" : Number(e.target.value))} min={1} />
              </div>
              <div>
                <Label>General Ticket Limit</Label>
                <Input type="number" value={generalLimit} onChange={e => setGeneralLimit(e.target.value === "" ? "" : Number(e.target.value))} min={1} />
              </div>
            </> : <div>
              <Label>Ticket Limit (optional)</Label>
              <Input type="number" value={ticketLimit} onChange={e => setTicketLimit(e.target.value === "" ? "" : Number(e.target.value))} min={1} />
            </div>}

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="specialEvent" 
              checked={isSpecialEvent}
              onChange={(e) => setIsSpecialEvent(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="specialEvent" className="cursor-pointer">
              Special Event (with advanced form fields)
            </Label>
          </div>

          {isSpecialEvent && (
            <div className="border-t pt-5 space-y-4">
              <h3 className="text-lg font-semibold">Add Questions</h3>
              
              <div className="space-y-3">
                <div>
                  <Label>Section (e.g., "Section 1: General Information")</Label>
                  <Input 
                    value={questionSection} 
                    onChange={e => setQuestionSection(e.target.value)} 
                    placeholder="Optional"
                  />
                </div>
                
                <div>
                  <Label>Order (optional)</Label>
                  <Input 
                    type="number" 
                    value={questionOrder} 
                    onChange={e => setQuestionOrder(e.target.value === "" ? "" : Number(e.target.value))} 
                    placeholder="Order within section"
                  />
                </div>

                <div>
                  <Label>Question Text *</Label>
                  <Textarea 
                    value={questionText} 
                    onChange={e => setQuestionText(e.target.value)} 
                    placeholder="Enter your question"
                    required
                  />
                </div>

                <div>
                  <Label>Question Type *</Label>
                  <select 
                    value={questionType} 
                    onChange={e => {
                      setQuestionType(e.target.value as any);
                      if (e.target.value !== "radio" && e.target.value !== "checkbox") {
                        setQuestionOptions([]);
                      }
                    }} 
                    className="border p-2 rounded-md w-full"
                  >
                    <option value="text">Text Input</option>
                    <option value="textarea">Text Area</option>
                    <option value="radio">Radio Buttons (Single Choice)</option>
                    <option value="checkbox">Checkboxes (Multiple Choice)</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="scale">Scale (1-5)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isRequired" 
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isRequired" className="cursor-pointer">
                    Required Field
                  </Label>
                </div>

                {(questionType === "radio" || questionType === "checkbox") && (
                  <div className="space-y-2">
                    <Label>Options *</Label>
                    <p className="text-xs text-gray-500">
                      Add an option named &quot;Other&quot; to let respondents enter their own text when they select it.
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Input 
                        value={newOption} 
                        onChange={e => setNewOption(e.target.value)}
                        onKeyPress={e => e.key === "Enter" && (e.preventDefault(), handleAddOption())}
                        placeholder="Add option"
                        className="flex-1 min-w-[140px]"
                      />
                      <Button type="button" onClick={handleAddOption} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4" />
                      </Button>
                      {!questionOptions.includes("Other") && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setQuestionOptions(prev => [...prev, "Other"]);
                          }}
                        >
                          Add &quot;Other&quot; (user can type their answer)
                        </Button>
                      )}
                    </div>
                    {questionOptions.length > 0 && (
                      <div className="space-y-1">
                        {questionOptions.map((option, index) => (
                          <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                            <span className="flex-1">{option}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveOption(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  type="button" 
                  onClick={handleAddQuestion}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!questionText.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Question
                </Button>
              </div>

              {questions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Added Questions ({questions.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {questions.map((q, index) => (
                      <div key={q._id ?? index} className="bg-gray-50 p-3 rounded flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{q.section && `${q.section} - `}{q.text}</span>
                            {q.isRequired && <span className="text-red-600 text-xs">*</span>}
                            {q._id && <span className="text-xs text-gray-500">(existing)</span>}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Type: {q.type}
                            {q.options && ` (${q.options.length} options)`}
                          </div>
                        </div>
                        {!q._id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuestions(questions.filter((_, i) => i !== index))}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" /> {eventId ? "Update Event" : "Create Event"}
          </Button>
        </form>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
  <DialogTrigger asChild></DialogTrigger>
  <DialogContent>
    <DialogTitle>Confirm Cover Image Upload</DialogTitle>
    <p>You selected a cover image but haven’t clicked “Confirm Upload.” Would you like to proceed anyway?</p>
    <DialogFooter className="mt-4 flex gap-2 justify-end">
      <Button variant="outline" onClick={() => setOpenModal(false)}>
        No, I Forgot
      </Button>
      <Button variant="destructive" onClick={() => {
              setOpenModal(false);
              handleSubmitEvent();
            }}>
        Yes, Continue
      </Button>
    </DialogFooter>
  </DialogContent>
      </Dialog>

      </div>

      <Toaster />
    </div>;
}