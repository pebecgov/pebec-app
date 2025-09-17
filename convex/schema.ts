// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  users: defineTable({
    email: v.string(),
    clerkUserId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    state: v.optional(v.string()),
    address: v.optional(v.string()),
    businessName: v.optional(v.string()),
    industry: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("mda"),
      v.literal("staff"),
      v.literal("reform_champion"),
      v.literal("federal"),
      v.literal("saber_agent"),
      v.literal("deputies"),
      v.literal("magistrates"),
      v.literal("state_governor"),
      v.literal("president"),
      v.literal("vice_president"),
      v.literal("world_bank"),
      v.literal("ngf"),
      v.literal("dmo")
    )),
    jobTitle: v.optional(v.string()),
    roleRequest: v.optional(v.object({
      requestedRole: v.string(),
      mdaName: v.optional(v.string()),
      mdaId: v.optional(v.id("mdas")),
      jobTitle: v.optional(v.string()),
      state: v.optional(v.string()),
      address: v.optional(v.string()),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
      submittedAt: v.number()
    })),
    mdaId: v.optional(v.id("mdas")),
    mdaName: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    staffStream: v.optional(v.string()),
    ecConfirmed: v.optional(v.boolean())
  }).index("byClerkUserId", ["clerkUserId"]).index("byRole", ["role"]).index("byMdaId", ["mdaId"]).index("byState", ["state"]).index("byEmail", ["email"]),
  mdas: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    assignedUsers: v.array(v.id("users")),
    createdAt: v.number()
  }).index("byName", ["name"]),
  tickets: defineTable({
    title: v.string(),
    description: v.string(),
    resolvedByAdmin: v.optional(v.boolean()),
    businessName: v.optional(v.string()),
    ticketNumber: v.string(),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed")),
    createdBy: v.id("users"),
    assignedMDA: v.optional(v.id("mdas")),
    assignedAgent: v.optional(v.id("users")),
    fullName: v.string(),
    email: v.string(),
    phoneNumber: v.string(),
    incidentDate: v.number(),
    location: v.optional(v.string()),
    state: v.string(),
    address: v.string(),
    supportingDocuments: v.optional(v.array(v.id("_storage"))),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolutionNote: v.optional(v.string()),
    firstResponseAt: v.optional(v.number()),
    reassignedAt: v.optional(v.number())
  }).index("byUser", ["createdBy"]).index("byMDA", ["assignedMDA"]).index("byStatus", ["status"]).index("byTicketNumber", ["ticketNumber"]),
  ticket_comments: defineTable({
    content: v.string(),
    ticketId: v.id("tickets"),
    authorId: v.optional(v.id("users")),
    clerkUserId: v.optional(v.string()),
    authorName: v.optional(v.string()),
    authorImage: v.optional(v.string()),
    createdAt: v.number(),
    fileIds: v.optional(v.array(v.id("_storage")))
  }).index("byTicket", ["ticketId"]),
  ticket_internal_notes: defineTable({
    content: v.string(),
    ticketId: v.id("tickets"),
    authorId: v.id("users"),
    authorName: v.string(),
    authorRole: v.string(),
    createdAt: v.number()
  }).index("byTicket", ["ticketId"]).index("byAuthor", ["authorId"]),
  images: defineTable({
    storageId: v.id("_storage"),
    ticketId: v.optional(v.id("tickets")),
    uploadedBy: v.id("users")
  }),
  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    authorId: v.id("users"),
    likes: v.number()
  }).index("bySlug", ["slug"]),
  notifications: defineTable({
    userId: v.optional(v.id("users")),
    ticketId: v.optional(v.id("tickets")),
    meetingId: v.optional(v.id("meetings")),
    taskId: v.optional(v.id("tasks")),
    postId: v.optional(v.id("posts")),
    businessLetterId: v.optional(v.id("business_letters")),
    message: v.string(),
    isRead: v.boolean(),
    eventId: v.optional(v.id("events")),
    createdAt: v.number(),
    type: v.string(),
    // DLI reminder specific fields
    actionUrl: v.optional(v.string()),
    dliCategory: v.optional(v.string()),
    dliDeadline: v.optional(v.number()),
    dliItemName: v.optional(v.string()),
    reminderDate: v.optional(v.number()),
    style: v.optional(v.string()),
    metadata: v.optional(v.object({
      daysRemaining: v.optional(v.number()),
      deadline: v.optional(v.string()),
      state: v.optional(v.string()),
      status: v.optional(v.string()),
      reminderType: v.optional(v.string())
    }))
  }).index("byUser", ["userId"]).index("byType", ["type"]).index("byMeeting", ["meetingId"]).index("byTicket", ["ticketId"]).index("byTask", ["taskId"]).index("byUserAndTicket", ["userId", "ticketId"]),
  comments: defineTable({
    content: v.string(),
    postId: v.id("posts"),
    authorId: v.optional(v.id("users")),
    guestName: v.optional(v.string()),
    createdAt: v.number()
  }).index("byPost", ["postId"]),
  events: defineTable({
    title: v.string(),
    description: v.string(),
    eventDate: v.number(),
    location: v.string(),
    host: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    eventType: v.union(v.literal("vip"), v.literal("general"), v.literal("vip_and_general")),
    vipAccessCode: v.optional(v.string()),
    ticketLimit: v.optional(v.number()),
    vipTicketLimit: v.optional(v.number()),
    generalTicketLimit: v.optional(v.number()),
    signUpsDisabled: v.optional(v.boolean()),
    isVip: v.optional(v.boolean()),
    isSaberEvent: v.optional(v.boolean())
  }).index("byCreatedBy", ["createdBy"]).index("bySaberEvent", ["isSaberEvent"]),
  event_registrations: defineTable({
    eventId: v.id("events"),
    userId: v.optional(v.id("users")),
    ticketOwner: v.optional(v.id("users")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    organization: v.optional(v.string()),
    questionnaireAnswers: v.array(v.string()),
    registeredAt: v.number(),
    ticketNumber: v.string(),
    qrCode: v.optional(v.string()),
    ticketPdfId: v.optional(v.id("_storage")),
    email: v.optional(v.string()),
    isVip: v.optional(v.boolean())
  }).index("byEvent", ["eventId"]).index("byUser", ["userId"]).index("byTicketNumber", ["ticketNumber"]),
  event_questions: defineTable({
    eventId: v.id("events"),
    questionText: v.string(),
    questionType: v.union(v.literal("text"), v.literal("number"), v.literal("email"), v.literal("scale")),
    createdBy: v.id("users"),
    createdAt: v.number()
  }).index("byEvent", ["eventId"]).index("byCreatedBy", ["createdBy"]),
  reports: defineTable({
    title: v.string(),
    description: v.string(),
    fileId: v.id("_storage"),
    fileSize: v.number(),
    publishedAt: v.number(),
    reportCoverUrl: v.optional(v.id("_storage")),
    uploadedBy: v.id("users")
  }).index("byUploadedBy", ["uploadedBy"]),
  meetings: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    attendees: v.array(v.id("users")),
    acceptedAttendees: v.array(v.id("users")),
    declinedAttendees: v.array(v.id("users")),
    meetingDate: v.number(),
    duration: v.number(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("cancelled"), v.literal("declined")),
    createdAt: v.number()
  }).index("byCreatedBy", ["createdBy"]).index("byAttendee", ["attendees"]),
  report_templates: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    mdaName: v.optional(v.string()),
    role: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("mda"),
      v.literal("staff"),
      v.literal("reform_champion"),
      v.literal("federal"),
      v.literal("saber_agent"),
      v.literal("deputies"),
      v.literal("magistrates"),
      v.literal("state_governor"),
      v.literal("president"),
      v.literal("vice_president"),
      v.literal("world_bank"),
      v.literal("ngf"),
      v.literal("dmo")
    ),
    createdBy: v.id("users"),
    headers: v.array(v.object({
      name: v.string(),
      type: v.union(v.literal("text"), v.literal("number"), v.literal("textarea"), v.literal("dropdown"), v.literal("checkbox"), v.literal("date")),
      options: v.optional(v.array(v.string()))
    }))
  }).index("byRole", ["role"]).index("byCreatedBy", ["createdBy"]),
  submitted_reports: defineTable({
    templateId: v.optional(v.id("report_templates")),
    submittedBy: v.id("users"),
    role: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("mda"),
      v.literal("staff"),
      v.literal("reform_champion"),
      v.literal("federal"),
      v.literal("saber_agent"),
      v.literal("deputies"),
      v.literal("magistrates"),
      v.literal("state_governor"),
      v.literal("president"),
      v.literal("vice_president"),
      v.literal("world_bank"),
      v.literal("ngf"),
      v.literal("dmo")
    ),
    data: v.optional(v.array(v.array(v.string()))),
    submittedAt: v.number(),
    fileId: v.optional(v.id("_storage")),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    reportName: v.optional(v.string()),
    mdaName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    isDraft: v.optional(v.boolean()),
    updatedAt: v.optional(v.number())
  }).index("byTemplate", ["templateId"]).index("bySubmittedBy", ["submittedBy"]).index("byDate", ["submittedAt"]).index("byDraft", ["isDraft"]).index("bySubmittedByAndDraft", ["submittedBy", "isDraft"]),
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("to_do"), v.literal("in_progress"), v.literal("done"), v.literal("assigned")),
    assignedTo: v.optional(v.id("users")),
    assignedToName: v.optional(v.string()),
    assignedRole: v.optional(v.string()),
    priority: v.optional(v.string()),
    progress: v.optional(v.number()),
    comments: v.optional(v.number()),
    attachments: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("byStatus", ["status"]).index("byAssignedTo", ["assignedTo"]),
  reforms: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.string(),
    implementedDate: v.number(),
    imageId: v.optional(v.id("_storage")),
    videoLink: v.optional(v.string()),
    impact: v.array(v.string()),
    outcome: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("byCategory", ["category"]).index("byCreatedAt", ["createdAt"]),
  dli_templates: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    guideFileId: v.id("_storage"),
    guideFileName: v.string(),
    guideFileUrl: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    steps: v.array(v.string())
  }).index("byCreatedBy", ["createdBy"]),
  dli_submissions: defineTable({
    dliTemplateId: v.id("dli_templates"),
    submittedBy: v.id("users"),
    answers: v.array(v.object({
      stepTitle: v.string(),
      responses: v.array(v.object({
        question: v.string(),
        answer: v.optional(v.union(v.string(), v.array(v.string()), v.id("_storage")))
      }))
    })),
    submittedAt: v.number()
  }).index("byDliTemplate", ["dliTemplateId"]).index("bySubmittedBy", ["submittedBy"]),
  letters: defineTable({
    userId: v.id("users"),
    userFullName: v.optional(v.string()),
    userRole: v.optional(v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("mda"),
      v.literal("staff"),
      v.literal("reform_champion"),
      v.literal("federal"),
      v.literal("saber_agent"),
      v.literal("deputies"),
      v.literal("magistrates"),
      v.literal("state_governor"),
      v.literal("president"),
      v.literal("vice_president"),
      v.literal("world_bank"),
      v.literal("ngf"),
      v.literal("dmo")
    )),
    status: v.optional(v.union(v.literal("sent"), v.literal("acknowledged"), v.literal("in_progress"), v.literal("resolved"))),
    sentTo: v.optional(v.id("users")),
    assignedTo: v.optional(v.id("users")),
    letterName: v.string(),
    description: v.optional(v.string()),
    letterDate: v.number(),
    letterUploadId: v.optional(v.id("_storage"))
  }).index("byUser", ["userId"]).index("byRole", ["userRole"]),
  dli_progress: defineTable({
    userId: v.id("users"),
    dliTemplateId: v.id("dli_templates"),
    totalSteps: v.number(),
    state: v.string(),
    completedSteps: v.number(),
    steps: v.array(v.object({
      title: v.string(),
      completed: v.boolean(),
      completedAt: v.optional(v.number())
    })),
    status: v.union(v.literal("not_started"), v.literal("in_progress"), v.literal("completed")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("byUserAndDLI", ["userId", "dliTemplateId"]).index("byState", ["state"]),
  saber_materials: defineTable({
    title: v.string(),
    description: v.string(),
    fileSize: v.number(),
    roles: v.array(v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("mda"),
      v.literal("staff"),
      v.literal("reform_champion"),
      v.literal("federal"),
      v.literal("saber_agent"),
      v.literal("deputies"),
      v.literal("magistrates"),
      v.literal("state_governor"),
      v.literal("president"),
      v.literal("vice_president"),
      v.literal("world_bank")
    )),
    materialUploadId: v.id("_storage"),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    reference: v.optional(v.union(v.literal("saber"), v.literal("website"), v.literal("internal-general"), v.literal("framework"))),
    isPublic: v.optional(v.boolean())
  }).index("byRoles", ["roles"]).index("byCreatedBy", ["createdBy"]).index("byReference", ["reference"]).index("byPublic", ["isPublic"]),
  business_letters: defineTable({
    title: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    letterFileId: v.id("_storage"),
    supportingFileIds: v.array(v.id("_storage")),
    createdAt: v.number(),
    assignedTo: v.optional(v.array(v.id("users"))),
    assignedToName: v.optional(v.array(v.string())),
    assignedStream: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("acknowledged"), v.literal("in_progress"), v.literal("resolved")))
  }).index("byEmail", ["email"]).index("byStatus", ["status"]),
  newsletter_subscribers: defineTable({
    email: v.string(),
    isSubscribed: v.boolean(),
    subscribedAt: v.string(),
    unsubscribedAt: v.optional(v.string())
  }).index("by_email", ["email"]),
  newsletters: defineTable({
    subject: v.string(),
    message: v.string(),
    attachmentId: v.optional(v.id("_storage")),
    createdAt: v.string(),
    // Sending progress (optional for older rows)
    status: v.optional(v.union(v.literal("sending"), v.literal("completed"))),
    totalSubscribers: v.optional(v.number()),
    totalBatches: v.optional(v.number()),
    batchesCompleted: v.optional(v.number()),
    sentCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    startedAt: v.optional(v.string()),
    finishedAt: v.optional(v.string())
  }),
  access_codes: defineTable({
    code: v.string(),
    generatedAt: v.number()
  }).index("byDate", ["generatedAt"]),
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
    creatorName: v.optional(v.string()),
    creatorWorkstream: v.optional(v.string()),
    progress: v.number(),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("completed")),
    steps: v.array(v.object({
      title: v.string(),
      completed: v.boolean(),
      completedBy: v.optional(v.id("users")),
      completedAt: v.optional(v.number()),
      assignedTo: v.optional(v.id("users")),
      assignedToName: v.optional(v.string()),
      dueDate: v.optional(v.number()),
      order: v.optional(v.number())
    })),
    updates: v.array(v.object({
      text: v.string(),
      timestamp: v.number(),
      authorId: v.optional(v.id("users")),
      authorName: v.optional(v.string())
    })),
    collaborators: v.optional(v.array(v.object({
      userId: v.id("users"),
      role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
      addedAt: v.number(),
      addedBy: v.id("users")
    }))),
    visibility: v.optional(v.union(v.literal("private"), v.literal("workstream"), v.literal("cross_workstream"), v.literal("public"))),
    allowedWorkstreams: v.optional(v.array(v.string())),
    primaryWorkstream: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("byCreatedBy", ["createdBy"])
   .index("byPrimaryWorkstream", ["primaryWorkstream"])
   .index("byVisibility", ["visibility"])
   .index("byCollaborator", ["collaborators"]),
  availability: defineTable({
    userId: v.id("users"),
    day: v.string(),
    workstream: v.string(),
    date: v.string(),
    startTime: v.string(),
    duration: v.number(),
    createdAt: v.number(),
    deactivated: v.optional(v.boolean()),
    bookedBy: v.optional(v.id("users")),
    bookedAt: v.optional(v.number()),
    staffInfo: v.optional(v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      role: v.optional(v.string()),
      email: v.string()
    })),
    mdaInfo: v.optional(v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      role: v.optional(v.string()),
      mdaName: v.optional(v.string()),
      email: v.string()
    }))
  }),
  // Meeting room bookings for Staff Conference Room and DG Conference Room
  room_bookings: defineTable({
    room: v.union(
      v.literal("staff_conference"),
      v.literal("dg_conference")
    ),
    date: v.string(), // yyyy-MM-dd
    startTime: v.string(), // HH:mm (24h)
    endTime: v.string(),   // HH:mm (24h)
    createdBy: v.id("users"),
    createdAt: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    meetingType: v.optional(v.union(v.literal("internal"), v.literal("external"))),
    attendees: v.optional(v.array(v.id("users")))
  })
    .index("byDate", ["date"]) 
    .index("byRoomAndDate", ["room", "date"]) 
    .index("byCreatedBy", ["createdBy"]),
  media: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    pictureIds: v.array(v.id("_storage")),
    videoUrls: v.optional(v.array(v.string())),
    categoryId: v.id("mediaCategories"),
    eventDate: v.optional(v.number()),
    createdAt: v.number()
  }),
  mediaCategories: defineTable({
    name: v.string(),
    createdAt: v.number()
  }),
  email_verifications: defineTable({
    email: v.string(),
    code: v.string(),
    createdAt: v.number()
  }).index("byEmail", ["email"]),
  dli: defineTable({
    number: v.number(),
    title: v.string(),
    summary: v.string(),
    icon: v.string(),
    content: v.string()
  }),
  berap: defineTable({
    year: v.number(),
    title: v.string(),
    description: v.string(),
    privateSectorNotes: v.optional(v.string()),
    progressReport: v.optional(v.string()),
    approvedByExco: v.boolean()
  }),
  materials: defineTable({
    parentId: v.union(v.id("dli"), v.id("berap")),
    parentType: v.union(v.literal("dli"), v.literal("berap")),
    name: v.string(),
    type: v.union(v.literal("note"), v.literal("video"), v.literal("document")),
    fileId: v.optional(v.id("_storage")),
    content: v.optional(v.string()),
    link: v.optional(v.string()),
    uploadedAt: v.number()
  }),
  uploaded_files: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    uploadedAt: v.number()
  }),
  saber_reports: defineTable({
    submittedBy: v.id("users"),
    userName: v.string(),
    title: v.string(),
    state: v.string(),
    fileId: v.optional(v.id("_storage")),
    fileUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    submittedAt: v.number(),
    updatedAt: v.optional(v.number()),
    comments: v.optional(v.string())
  }).index("bySubmittedBy", ["submittedBy"]).index("byState", ["state"]).index("byStatus", ["status"]).index("byDate", ["submittedAt"]),
  
  // SABER Deadline Management Tables
  saber_deadlines: defineTable({
    dliCategory: v.string(), // "BERAP", "DLI4", "DLI5", "DLI6", "DLI8"
    indicator: v.string(), // The specific indicator name
    deadline: v.number(), // Timestamp of the deadline
    description: v.string(), // Detailed description of what needs to be done
    comments: v.optional(v.string()), // Additional comments about the deadline
    isRecurring: v.boolean(), // Whether this is a recurring deadline (like monthly reports)
    recurringType: v.optional(v.union(
      v.literal("monthly"), 
      v.literal("quarterly"), 
      v.literal("yearly")
    )),
    states: v.array(v.string()), // Which states this deadline applies to (empty array = all states)
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    actionUrl: v.optional(v.string()), // URL where SABER agents can take action
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    isActive: v.boolean() // Whether this deadline is currently active
  }).index("byCategory", ["dliCategory"]).index("byDeadline", ["deadline"]).index("byActive", ["isActive"]),
  
  deadline_reminders: defineTable({
    deadlineId: v.id("saber_deadlines"),
    userId: v.id("users"), // SABER agent who should receive the reminder
    state: v.string(), // State the SABER agent is responsible for
    reminderType: v.union(
      v.literal("30_days"), 
      v.literal("14_days"), 
      v.literal("7_days"), 
      v.literal("3_days")
    ),
    scheduledFor: v.number(), // When the reminder should be sent
    sentAt: v.optional(v.number()), // When the reminder was actually sent
    emailSent: v.boolean(), // Whether email was sent successfully
    notificationSent: v.boolean(), // Whether in-app notification was sent
    createdAt: v.number()
  }).index("byDeadline", ["deadlineId"]).index("byUser", ["userId"]).index("byScheduled", ["scheduledFor"]).index("byState", ["state"]),

  // Messaging System Tables
  conversations: defineTable({
    participants: v.array(v.id("users")), // Array of user IDs in the conversation
    lastMessageAt: v.number(), // Timestamp of the last message
    lastMessage: v.optional(v.string()), // Preview of the last message
    lastMessageSender: v.optional(v.id("users")), // Who sent the last message
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("byParticipant", ["participants"]).index("byLastMessageAt", ["lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    messageType: v.union(v.literal("text"), v.literal("image"), v.literal("file")),
    fileId: v.optional(v.id("_storage")), // For file/image messages
    fileName: v.optional(v.string()), // Original filename for file messages
    fileSize: v.optional(v.number()), // File size in bytes
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number()
  }).index("byConversation", ["conversationId"]).index("bySender", ["senderId"]).index("byCreatedAt", ["createdAt"]),

  message_read_status: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    readAt: v.number()
  }).index("byMessage", ["messageId"]).index("byUser", ["userId"]),

  user_activity: defineTable({
    userId: v.id("users"),
    activityType: v.union(
      v.literal("login"),
      v.literal("page_view"),
      v.literal("action"),
      v.literal("logout")
    ),
    page: v.optional(v.string()),
    action: v.optional(v.string()),
    metadata: v.optional(v.object({
      userAgent: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      sessionDuration: v.optional(v.number()),
      staffStream: v.optional(v.string()),
      elementType: v.optional(v.string()),
      elementText: v.optional(v.string()),
      formName: v.optional(v.string())
    })),
    timestamp: v.number()
  }).index("byUser", ["userId"]).index("byActivityType", ["activityType"]).index("byTimestamp", ["timestamp"])
});