/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai_helpers from "../ai_helpers.js";
import type * as ai_helper_scoring from "../ai_helper_scoring.js";
import type * as bulkImportStateScores from "../bulkImportStateScores.js";
import type * as business_letters from "../business_letters.js";
import type * as calendar from "../calendar.js";
import type * as chat from "../chat.js";
import type * as cleanup from "../cleanup.js";
import type * as config_indicators from "../config/indicators.js";
import type * as contact_messages from "../contact_messages.js";
import type * as crons from "../crons.js";
import type * as dli from "../dli.js";
import type * as dmo_reports from "../dmo_reports.js";
import type * as email from "../email.js";
import type * as events from "../events.js";
import type * as excel from "../excel.js";
import type * as fuel_requests from "../fuel_requests.js";
import type * as holidayAnnouncements from "../holidayAnnouncements.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as internal_notes from "../internal_notes.js";
import type * as internal_reports from "../internal_reports.js";
import type * as leaveRequests from "../leaveRequests.js";
import type * as letters from "../letters.js";
import type * as mda_scoring from "../mda_scoring.js";
import type * as media from "../media.js";
import type * as meetings from "../meetings.js";
import type * as messages from "../messages.js";
import type * as migrations_cleanupGettingCredit from "../migrations/cleanupGettingCredit.js";
import type * as migrations_cleanupInfrastructure from "../migrations/cleanupInfrastructure.js";
import type * as migrations_cleanupInvalidStates from "../migrations/cleanupInvalidStates.js";
import type * as migrations_mergeFCTEntries from "../migrations/mergeFCTEntries.js";
import type * as migrations_migrateExportImportFacilitation from "../migrations/migrateExportImportFacilitation.js";
import type * as migrations_resetAccessToSkilledLabour from "../migrations/resetAccessToSkilledLabour.js";
import type * as migrations_resetDigitalConnectivity from "../migrations/resetDigitalConnectivity.js";
import type * as migrations_resetInfrastructure from "../migrations/resetInfrastructure.js";
import type * as migrations_resetInvestorAftercare from "../migrations/resetInvestorAftercare.js";
import type * as migrations_resetLandRegistration from "../migrations/resetLandRegistration.js";
import type * as migrations_resetMarketAccess from "../migrations/resetMarketAccess.js";
import type * as migrations_resetStateScores from "../migrations/resetStateScores.js";
import type * as migrations_resetWorkforceDevelopment from "../migrations/resetWorkforceDevelopment.js";
import type * as migrations_updateCrisisResilience from "../migrations/updateCrisisResilience.js";
import type * as migrations from "../migrations.js";
import type * as newsletters from "../newsletters.js";
import type * as notifications from "../notifications.js";
import type * as plainText from "../plainText.js";
import type * as posts from "../posts.js";
import type * as reforms from "../reforms.js";
import type * as reports from "../reports.js";
import type * as saber from "../saber.js";
import type * as saber_deadlines from "../saber_deadlines.js";
import type * as saber_materials from "../saber_materials.js";
import type * as saber_reports from "../saber_reports.js";
import type * as saveStateScore from "../saveStateScore.js";
import type * as scoring_config from "../scoring_config.js";
import type * as sendEmail from "../sendEmail.js";
import type * as sendgridMail from "../sendgridMail.js";
import type * as sendTicketemail from "../sendTicketemail.js";
import type * as staff_projects from "../staff_projects.js";
import type * as stateUtils from "../stateUtils.js";
import type * as state_scores from "../state_scores.js";
import type * as tasks from "../tasks.js";
import type * as tickets from "../tickets.js";
import type * as ticket_comments from "../ticket_comments.js";
import type * as ungaThankYouEmail from "../ungaThankYouEmail.js";
import type * as upload from "../upload.js";
import type * as uploadTicketsPdf from "../uploadTicketsPdf.js";
import type * as users from "../users.js";
import type * as utils_appResult from "../utils/appResult.js";
import type * as workshop from "../workshop.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai_helpers: typeof ai_helpers;
  ai_helper_scoring: typeof ai_helper_scoring;
  bulkImportStateScores: typeof bulkImportStateScores;
  business_letters: typeof business_letters;
  calendar: typeof calendar;
  chat: typeof chat;
  cleanup: typeof cleanup;
  "config/indicators": typeof config_indicators;
  contact_messages: typeof contact_messages;
  crons: typeof crons;
  dli: typeof dli;
  dmo_reports: typeof dmo_reports;
  email: typeof email;
  events: typeof events;
  excel: typeof excel;
  fuel_requests: typeof fuel_requests;
  holidayAnnouncements: typeof holidayAnnouncements;
  http: typeof http;
  images: typeof images;
  internal_notes: typeof internal_notes;
  internal_reports: typeof internal_reports;
  leaveRequests: typeof leaveRequests;
  letters: typeof letters;
  mda_scoring: typeof mda_scoring;
  media: typeof media;
  meetings: typeof meetings;
  messages: typeof messages;
  "migrations/cleanupGettingCredit": typeof migrations_cleanupGettingCredit;
  "migrations/cleanupInfrastructure": typeof migrations_cleanupInfrastructure;
  "migrations/cleanupInvalidStates": typeof migrations_cleanupInvalidStates;
  "migrations/mergeFCTEntries": typeof migrations_mergeFCTEntries;
  "migrations/migrateExportImportFacilitation": typeof migrations_migrateExportImportFacilitation;
  "migrations/resetAccessToSkilledLabour": typeof migrations_resetAccessToSkilledLabour;
  "migrations/resetDigitalConnectivity": typeof migrations_resetDigitalConnectivity;
  "migrations/resetInfrastructure": typeof migrations_resetInfrastructure;
  "migrations/resetInvestorAftercare": typeof migrations_resetInvestorAftercare;
  "migrations/resetLandRegistration": typeof migrations_resetLandRegistration;
  "migrations/resetMarketAccess": typeof migrations_resetMarketAccess;
  "migrations/resetStateScores": typeof migrations_resetStateScores;
  "migrations/resetWorkforceDevelopment": typeof migrations_resetWorkforceDevelopment;
  "migrations/updateCrisisResilience": typeof migrations_updateCrisisResilience;
  migrations: typeof migrations;
  newsletters: typeof newsletters;
  notifications: typeof notifications;
  plainText: typeof plainText;
  posts: typeof posts;
  reforms: typeof reforms;
  reports: typeof reports;
  saber: typeof saber;
  saber_deadlines: typeof saber_deadlines;
  saber_materials: typeof saber_materials;
  saber_reports: typeof saber_reports;
  saveStateScore: typeof saveStateScore;
  scoring_config: typeof scoring_config;
  sendEmail: typeof sendEmail;
  sendgridMail: typeof sendgridMail;
  sendTicketemail: typeof sendTicketemail;
  staff_projects: typeof staff_projects;
  stateUtils: typeof stateUtils;
  state_scores: typeof state_scores;
  tasks: typeof tasks;
  tickets: typeof tickets;
  ticket_comments: typeof ticket_comments;
  ungaThankYouEmail: typeof ungaThankYouEmail;
  upload: typeof upload;
  uploadTicketsPdf: typeof uploadTicketsPdf;
  users: typeof users;
  "utils/appResult": typeof utils_appResult;
  workshop: typeof workshop;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
