import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ✅ Users Table (With Role)
  users: defineTable({
    email: v.string(),
    clerkUserId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    phoneNumber: v.optional(v.string()), // ✅ Added Phone Number
    state: v.optional(v.string()), // ✅ Added State
    address: v.optional(v.string()), // ✅ Added Address
    businessName: v.optional(v.string()), // ✅ Added Business Name
    industry: v.optional(v.string()), // ✅ Added Industry
    role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), 
    v.literal("reform_champion"),v.literal("federal"),v.literal("saber_agent"),v.literal("saber_agent"),v.literal("deputies"),v.literal("magistrates"),v.literal("state_governor"),
    v.literal("president"), v.literal("vice_president"),
    
  
  )), 
  jobTitle: v.optional(v.string()), // ✅ NEW FIELD
  roleRequest: v.optional(
    v.object({
      requestedRole: v.string(),
      mdaName: v.optional(v.string()),  // <-- add this line
      mdaId: v.optional(v.id("mdas")),
      jobTitle: v.optional(v.string()),
      state: v.optional(v.string()),
      address: v.optional(v.string()),
      firstName: v.optional(v.string()), // Add this
    lastName: v.optional(v.string()),  // Add this
      phoneNumber: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      ),
      submittedAt: v.number(),
    })
  ),
  

    mdaId: v.optional(v.id("mdas")), // ✅ Link to the MDA they belong to
    mdaName: v.optional(v.string()), // ✅ Store MDA name for easy reference
    permissions: v.optional(v.array(v.string())), // ✅ Store allowed pages
    staffStream: v.optional(v.string()), // ✅ New field: stores 'regulatory', 'judiciary', etc.
    ecConfirmed: v.optional(v.boolean()), // ✅ Track whether EC has been confirmed


  }).index("byClerkUserId", ["clerkUserId"]).index("byRole", ["role"]).index("byMdaId", ["mdaId"]).index("byState", ["state"]).index("byEmail", ["email"])
  ,

  mdas: defineTable({
    name: v.string(), // ✅ Name of the MDA
    description: v.optional(v.string()), // ✅ Description of the MDA
    email: v.optional(v.string()), // ✅ Contact email
    phoneNumber: v.optional(v.string()), // ✅ Contact phone number
    assignedUsers: v.array(v.id("users")), // ✅ List of assigned MDA users
    createdAt: v.number(),
  }).index("byName", ["name"]),

  // ✅ Tickets Table (Comprehensive Ticketing System)
  tickets: defineTable({
    // Ticket Identification
    title: v.string(),
    description: v.string(),
    resolvedByAdmin: v.optional(v.boolean()), // ✅ Track if resolved by admin/MDA
    businessName: v.optional(v.string()), // ✅ Add this field

    ticketNumber: v.string(), // ✅ Unique ticket number for tracking
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ), // ✅ Ticket status tracking

    // User & MDA Information
    createdBy: v.id("users"), // ✅ Link to the user who created the ticket
    assignedMDA: v.optional(v.id("mdas")), // ✅ Assign ticket to an MDA
    
    assignedAgent: v.optional(v.id("users")), // ✅ Admin or Agent assigned to the case

    // Complaint/Feedback Submission Details
    fullName: v.string(),
    email: v.string(),
    phoneNumber: v.string(),
    incidentDate: v.number(), // ✅ Timestamp of incident
    location: v.optional(v.string()),
    supportingDocuments: v.optional(v.array(v.id("_storage"))), // ✅ Optional file uploads
    state: v.optional(v.string()), // ✅ Optional to prevent breaking existing records
    address: v.optional(v.string()), // ✅ Optional to prevent breaking existing records
    // Tracking & Resolution
    reassignedAt: v.optional(v.number()),       // New reassignment date
    firstResponseAt: v.optional(v.number()),    // When MDA first responds
    createdAt: v.number(), // ✅ Timestamp when the ticket was created
    updatedAt: v.optional(v.number()), // ✅ Timestamp when the ticket was last updated
    resolutionNote: v.optional(v.string()),

  }).index("byUser", ["createdBy"])
    .index("byMDA", ["assignedMDA"])
    .index("byStatus", ["status"])
    .index("byTicketNumber", ["ticketNumber"]), // ✅ Indexed for filtering by status

  // ✅ Ticket Comments Table (Renamed from "comments" to avoid conflicts)
  ticket_comments: defineTable({
    content: v.string(),
    ticketId: v.id("tickets"), // ✅ Link comment to a ticket
    authorId: v.optional(v.id("users")), // ✅ Store user ID if logged in
    clerkUserId: v.optional(v.string()), // ✅ Add Clerk User ID
    authorName: v.optional(v.string()), // ✅ Store name for logged-in users
    authorImage: v.optional(v.string()), // ✅ Store image for logged-in users
    createdAt: v.number(), // ✅ Timestamp
    fileIds: v.optional(v.array(v.id("_storage"))),

  }).index("byTicket", ["ticketId"]),
  
  

  // ✅ Images Table (For Storing Uploaded Documents & Images)
  images: defineTable({
    storageId: v.id("_storage"),
    ticketId: v.optional(v.id("tickets")), // ✅ Associate images with tickets
    uploadedBy: v.id("users"), // ✅ Track who uploaded it
  }),

  // ✅ Posts Table (If Needed)
  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    authorId: v.id("users"),
    likes: v.number(),
  }).index("bySlug", ["slug"]),
  
  notifications: defineTable({
    userId: v.optional(v.id("users")),
    ticketId: v.optional(v.id("tickets")),
    meetingId: v.optional(v.id("meetings")), // ✅ Add Meeting ID here
    taskId: v.optional(v.id("tasks")), // ✅ ADDED: Allow notifications for tasks
    postId: v.optional(v.id("posts")),
    businessLetterId: v.optional(v.id("business_letters")),
    message: v.string(),
    isRead: v.boolean(),
    eventId: v.optional(v.id("events")),
    createdAt: v.number(),
    type: v.string(), // Type of notification (e.g., "ticket update", "comment", etc.)

  }).index("byUser", ["userId"]).index("byType", ["type"]).index("byMeeting", ["meetingId"]).index("byTicket", ["ticketId"])  .index("byTask", ["taskId"])  // ✅ Added Index for Tasks
  .index("byUserAndTicket", ["userId", "ticketId"]), // ✅ ADD THIS INDEX
  
  

  // ✅ General Comments Table (For Blog Post Comments)
  comments: defineTable({
    content: v.string(),
    postId: v.id("posts"), // ✅ Link comment to a post
    authorId: v.optional(v.id("users")), // ✅ User who wrote the comment
    guestName: v.optional(v.string()),
    createdAt: v.number(), // ✅ Timestamp
  }).index("byPost", ["postId"]), // Index to fetch comments by post

  events: defineTable({
    title: v.string(),
    description: v.string(),
    eventDate: v.number(), // Timestamp for the event date
    location: v.string(),
    host: v.string(),
    coverImageId: v.optional(v.id("_storage")), // Optional event cover image
    createdBy: v.id("users"), // Admin who created the event
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // ✅ New fields
  eventType: v.union(
    v.literal("vip"),
    v.literal("general"),
    v.literal("vip_and_general")
  ),
  vipAccessCode: v.optional(v.string()),
  ticketLimit: v.optional(v.number()),
  vipTicketLimit: v.optional(v.number()),
generalTicketLimit: v.optional(v.number()),
signUpsDisabled: v.optional(v.boolean()), // ✅ <--- Add this here

isVip: v.optional(v.boolean()),

  }).index("byCreatedBy", ["createdBy"]), // Index to list events created by the user (admin)

  event_registrations: defineTable({
    eventId: v.id("events"),
    userId: v.optional(v.id("users")), // ✅ Make userId optional
    ticketOwner: v.optional(v.id("users")), // ✅ Ticket owner is also optional
    firstName: v.optional(v.string()),
lastName: v.optional(v.string()),
phone: v.optional(v.string()),
    questionnaireAnswers: v.array(v.string()),
    registeredAt: v.number(),
    ticketNumber: v.string(),
    qrCode: v.optional(v.string()),
    ticketPdfId: v.optional(v.id("_storage")), // ✅ Store ticket PDF file
    email: v.optional(v.string()), // ✅ Add email field
    isVip: v.optional(v.boolean()),


  }).index("byEvent", ["eventId"]).index("byUser", ["userId"]).index("byTicketNumber", ["ticketNumber"]),
  
  
  event_questions: defineTable({
    eventId: v.id("events"), // The event to which the question belongs
    questionText: v.string(), // The question itself
    questionType: v.union(
      v.literal("text"),    // Simple text answer
      v.literal("number"),  // Numeric answer
      v.literal("email"),   // Email input
      v.literal("scale")    // Scale (e.g., 1-5)
    ), // The type of question
    createdBy: v.id("users"), // Admin who created the question
    createdAt: v.number(),    // Timestamp when the question was created
  }).index("byEvent", ["eventId"]).index("byCreatedBy", ["createdBy"]), // Index by event and createdBy for easy access

  reports: defineTable({
    title: v.string(), // ✅ Report Name
    description: v.string(), // ✅ Report Description
    fileId: v.id("_storage"), // ✅ File Storage ID
    fileSize: v.number(), // ✅ File Size in MB
    publishedAt: v.number(), // ✅ Date Published (Timestamp)
    reportCoverUrl: v.optional(v.id("_storage")), // ✅ Store ticket PDF file
    uploadedBy: v.id("users"), // ✅ User who uploaded (Must be Admin)
  }).index("byUploadedBy", ["uploadedBy"]),
  
  meetings: defineTable({
    title: v.string(), // ✅ Meeting title
    description: v.optional(v.string()), // ✅ Meeting description
    createdBy: v.id("users"), // ✅ User who created the meeting
    attendees: v.array(v.id("users")), // ✅ Array of users invited
    acceptedAttendees: v.array(v.id("users")), // ✅ Users who accepted the invite
    declinedAttendees: v.array(v.id("users")), // ✅ Users who declined
    meetingDate: v.number(), // ✅ Timestamp for the scheduled meeting
    duration: v.number(), // ✅ Duration in minutes
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("declined") // ✅ Added Declined Status
    ), // ✅ Meeting status
    createdAt: v.number(), // ✅ Timestamp when the meeting was created
  }).index("byCreatedBy", ["createdBy"])
    .index("byAttendee", ["attendees"]),


   // ✅ Add a new table for Report Templates
report_templates: defineTable({
  title: v.string(), // ✅ Report Name
  description: v.optional(v.string()), // ✅ Report Description
  role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), 
  v.literal("reform_champion"),v.literal("federal"),v.literal("saber_agent"),v.literal("deputies"),v.literal("magistrates"),v.literal("state_governor"),
  v.literal("president"), v.literal("vice_president"),

), // ✅ Assigned Role
  createdBy: v.id("users"), // ✅ User who created the template
  headers: v.array(
    v.object({
      name: v.string(), // ✅ Column Name
      type: v.union(v.literal("text"), v.literal("number"), v.literal("textarea"), v.literal("dropdown"),v.literal("checkbox"), v.literal("date")), // ✅ Field Type
      options: v.optional(v.array(v.string())), // ✅ Dropdown Options (If applicable)
    })
  ),
}).index("byRole", ["role"]).index("byCreatedBy", ["createdBy"]),

  
submitted_reports: defineTable({
  templateId: v.optional(v.id("report_templates")), // ✅ Optional for file uploads
  submittedBy: v.id("users"), // ✅ User who submitted
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
    v.literal("vice_president")
  ), // ✅ The user’s role
  data: v.optional(v.array(v.array(v.string()))), // ✅ Optional for file uploads
  submittedAt: v.number(), // ✅ Timestamp
  fileId: v.optional(v.id("_storage")), // ✅ Optional file upload
  fileUrl: v.optional(v.string()), // ✅ URL to the uploaded document
  fileName: v.optional(v.string()), // ✅ Name of the uploaded document
  reportName: v.optional(v.string()), // ✅ Add this line
  mdaName: v.optional(v.string()), // ✅ Must exist here
  fileSize: v.optional(v.number()), // ✅ File size in MB
})
  .index("byTemplate", ["templateId"])
  .index("bySubmittedBy", ["submittedBy"])
  .index("byDate", ["submittedAt"]), // ✅ Index for date filtering


  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("to_do"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("assigned") // ✅ FIXED ERROR: "assigned" is now a valid status
    ),
    assignedTo: v.optional(v.id("users")),
    assignedToName: v.optional(v.string()), // ✅ Store Assigned User's Name
    assignedRole: v.optional(v.string()),
    priority: v.optional(v.string()),
    progress: v.optional(v.number()),
    comments: v.optional(v.number()),
    attachments: v.optional(v.number()),
    dueDate: v.optional(v.number()), // ✅ New Field for Due Date
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    
}).index("byStatus", ["status"]).index("byAssignedTo", ["assignedTo"]),


reforms: defineTable({
  title: v.string(),
  description: v.string(),
  category: v.string(), // ✅ Added category
  implementedDate: v.number(),
  imageId: v.optional(v.id("_storage")), // ✅ Image stored in Convex storage
  videoLink: v.optional(v.string()),
  impact: v.array(v.string()), // ✅ Array of impact items
  outcome: v.array(v.string()), // ✅ Array of outcomes
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
}).index("byCategory", ["category"]) // ✅ Index for category filtering
  .index("byCreatedAt", ["createdAt"]),

  

  dli_templates: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    guideFileId: v.id("_storage"), // ✅ Store the PDF Guide
    guideFileName: v.string(), // ✅ Store the filename
    guideFileUrl: v.string(), // ✅ Store the file URL
    createdBy: v.id("users"),
    createdAt: v.number(),
    steps: v.array(v.string()), // ✅ Store step names inside the template

  }).index("byCreatedBy", ["createdBy"]),

  dli_submissions: defineTable({
    dliTemplateId: v.id("dli_templates"),
    submittedBy: v.id("users"),
    answers: v.array(
      v.object({
        stepTitle: v.string(),
        responses: v.array(
          v.object({
            question: v.string(),
            answer: v.optional(v.union(v.string(), v.array(v.string()), v.id("_storage")))
          })
        ),
      })
    ),
    submittedAt: v.number(),
  }).index("byDliTemplate", ["dliTemplateId"]).index("bySubmittedBy", ["submittedBy"]),


  // ✅ Letters Table
  letters: defineTable({
    userId: v.id("users"), // ✅ Link to the user who sent the letter
    userFullName: v.optional(v.string()), // ✅ Now optional
    userRole: v.optional(
      v.union(
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
        v.literal("vice_president")
      )
    ), // ✅ Now optional
    // Add to the letters table
status: v.optional(
  v.union(
    v.literal("sent"),
    v.literal("acknowledged"),
    v.literal("in_progress"),
    v.literal("resolved")
  )
),

    sentTo: v.optional(v.id("users")), // ID of recipient user
    assignedTo: v.optional(v.id("users")),

    letterName: v.string(), // ✅ Name of the letter
    letterDate: v.number(), // ✅ Timestamp of when the letter was sent
    letterUploadId: v.id("_storage"), // ✅ The uploaded letter file
  })
    .index("byUser", ["userId"])
    .index("byRole", ["userRole"]), // ✅ Indexed by role for admin filtering


    dli_progress: defineTable({
      userId: v.id("users"),
      dliTemplateId: v.id("dli_templates"),
      totalSteps: v.number(),
      state: v.string(), // ✅ Store state of user

      completedSteps: v.number(),
      steps: v.array(
        v.object({
          title: v.string(), // ✅ Name of the Step
          completed: v.boolean(), // ✅ Whether the step is completed
          completedAt: v.optional(v.number()), // ✅ Timestamp for when it was completed

        })
      ),
      status: v.union(v.literal("not_started"), v.literal("in_progress"), v.literal("completed")),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    }).index("byUserAndDLI", ["userId", "dliTemplateId"]).index("byState", ["state"]),
    
    

    saber_materials: defineTable({
      title: v.string(),
      description: v.string(),
      fileSize: v.number(), // in bytes or MB depending on your UI logic
      roles: v.array(
        v.union(
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
          v.literal("vice_president")
        )
      ),
      materialUploadId: v.id("_storage"),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
      reference: v.optional(v.union(
        v.literal("saber"),
        v.literal("website"),
        v.literal("internal-general"),
        v.literal("framework")

      )),
    })
      .index("byRoles", ["roles"])
      .index("byCreatedBy", ["createdBy"])
      .index("byReference", ["reference"]) ,


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
        assignedStream: v.optional(v.string()), // ✅ NEW
        status: v.optional(
          v.union(
            v.literal("pending"),       // Before staff sees
            v.literal("acknowledged"),  // Staff has seen/received
            v.literal("in_progress"),   // Work started
            v.literal("resolved")       // Done
          )
        )
              })
        .index("byEmail", ["email"])
        .index("byStatus", ["status"]),


      // Store users who subscribed to the newsletter
  newsletter_subscribers: defineTable({
    email: v.string(),
    isSubscribed: v.boolean(),
    subscribedAt: v.string(),
    unsubscribedAt: v.optional(v.string()),
  }).index("by_email", ["email"]),

  // Store composed newsletters
  newsletters: defineTable({
    subject: v.string(),
    message: v.string(),
    attachmentId: v.optional(v.id("_storage")),
    createdAt: v.string(),
  }),


  access_codes: defineTable({
    code: v.string(),
    generatedAt: v.number(), // timestamp
  }).index("byDate", ["generatedAt"]),
  


  projects: defineTable({
    name: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
    progress: v.number(), // % completion (0-100)
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    steps: v.array(
      v.object({
        title: v.string(),
        completed: v.boolean(),
      })
    ),
    updates: v.array(
      v.object({
        text: v.string(),
        timestamp: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("byCreatedBy", ["createdBy"]),


  availability: defineTable({
    userId: v.id("users"),
    day: v.string(),
    workstream: v.string(), // ✅ <-- ADD THIS LINE
    date: v.string(),
    startTime: v.string(),
    duration: v.number(),
    createdAt: v.number(),
    deactivated: v.optional(v.boolean()), // ✅ Add this line
    bookedBy: v.optional(v.id("users")),
bookedAt: v.optional(v.number()),
staffInfo: v.optional(
  v.object({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    role: v.optional(v.string()),
    email: v.string(),
  })
  
),

mdaInfo: v.optional(
  v.object({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    role: v.optional(v.string()),
    mdaName: v.optional(v.string()),
    email: v.string(),
  })
),

  }),
  
  media: defineTable({
    userId: v.id("users"),           // Who posted this
    title: v.string(),               // Title of the post
    description: v.string(),         // Description text
    pictureIds: v.array(v.id("_storage")), // ✅ Multiple image file references
    videoUrls: v.optional(v.array(v.string())), // ✅ Now supports multiple video URLs
    categoryId: v.id("mediaCategories"), // Linked category
    createdAt: v.number(),            // Timestamp
  }),

  mediaCategories: defineTable({
    name: v.string(),       // Category name (e.g., Events, Reforms)
    createdAt: v.number(),  // Timestamp
  }),
  
  email_verifications: defineTable({
    email: v.string(),
    code: v.string(),
    createdAt: v.number(), // Unix timestamp in milliseconds
  }).index("byEmail", ["email"]),
  

  dli: defineTable({
    number: v.number(),
    title: v.string(),
    summary: v.string(),
    icon: v.string(),
    content: v.string(),
  }),

  berap: defineTable({
    year: v.number(),
    title: v.string(),
    description: v.string(),
    privateSectorNotes: v.optional(v.string()),
    progressReport: v.optional(v.string()),
    approvedByExco: v.boolean(),
  }),

  materials: defineTable({
    parentId: v.union(v.id("dli"), v.id("berap")),
    parentType: v.union(v.literal("dli"), v.literal("berap")),
    name: v.string(),
    type: v.union(v.literal("note"), v.literal("video"), v.literal("document")),
    fileId: v.optional(v.id("_storage")),
    content: v.optional(v.string()),
    link: v.optional(v.string()),
    uploadedAt: v.number(),
  }),

  uploaded_files: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    uploadedAt: v.number(),
  })
  
});





