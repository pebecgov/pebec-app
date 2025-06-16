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
import type * as business_letters from "../business_letters.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as dli from "../dli.js";
import type * as email from "../email.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as internal_reports from "../internal_reports.js";
import type * as letters from "../letters.js";
import type * as media from "../media.js";
import type * as meetings from "../meetings.js";
import type * as newsletters from "../newsletters.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as reforms from "../reforms.js";
import type * as reports from "../reports.js";
import type * as saber from "../saber.js";
import type * as saber_materials from "../saber_materials.js";
import type * as saber_reports from "../saber_reports.js";
import type * as sendEmail from "../sendEmail.js";
import type * as sendTicketemail from "../sendTicketemail.js";
import type * as staff_projects from "../staff_projects.js";
import type * as tasks from "../tasks.js";
import type * as tickets from "../tickets.js";
import type * as ticket_comments from "../ticket_comments.js";
import type * as upload from "../upload.js";
import type * as uploadTicketsPdf from "../uploadTicketsPdf.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  business_letters: typeof business_letters;
  cleanup: typeof cleanup;
  crons: typeof crons;
  dli: typeof dli;
  email: typeof email;
  events: typeof events;
  http: typeof http;
  images: typeof images;
  internal_reports: typeof internal_reports;
  letters: typeof letters;
  media: typeof media;
  meetings: typeof meetings;
  newsletters: typeof newsletters;
  notifications: typeof notifications;
  posts: typeof posts;
  reforms: typeof reforms;
  reports: typeof reports;
  saber: typeof saber;
  saber_materials: typeof saber_materials;
  saber_reports: typeof saber_reports;
  sendEmail: typeof sendEmail;
  sendTicketemail: typeof sendTicketemail;
  staff_projects: typeof staff_projects;
  tasks: typeof tasks;
  tickets: typeof tickets;
  ticket_comments: typeof ticket_comments;
  upload: typeof upload;
  uploadTicketsPdf: typeof uploadTicketsPdf;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
