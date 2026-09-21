// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users";

const ASSET_LIMIT = 500;
const ISSUE_LIMIT = 500;
const USER_LIMIT = 500;

const COMMON_ITEM_TYPES = [
  "Laptop",
  "Phone",
  "Camera",
  "Tablet",
  "Monitor",
  "Printer",
  "Projector",
  "Access card",
];

const statusValidator = v.union(v.literal("available"), v.literal("issued"));

const typeValidator = v.object({
  _id: v.id("company_asset_types"),
  name: v.string(),
  createdAt: v.number(),
});

const assignableUserValidator = v.object({
  _id: v.id("users"),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.string(),
  imageUrl: v.optional(v.string()),
  role: v.optional(v.string()),
  jobTitle: v.optional(v.string()),
});

const issueValidator = v.object({
  _id: v.id("company_asset_issues"),
  assetId: v.id("company_assets"),
  userId: v.optional(v.id("users")),
  staffName: v.string(),
  dateIssued: v.string(),
  issueRemark: v.optional(v.string()),
  dateReturned: v.optional(v.string()),
  returnRemark: v.optional(v.string()),
  isReturned: v.boolean(),
  undertakingStorageId: v.optional(v.id("_storage")),
  undertakingFileName: v.optional(v.string()),
  undertakingUrl: v.union(v.string(), v.null()),
  issuedBy: v.id("users"),
  issuedByName: v.string(),
  returnedBy: v.optional(v.id("users")),
  returnedByName: v.optional(v.string()),
  createdAt: v.number(),
});

const assetListItemValidator = v.object({
  _id: v.id("company_assets"),
  typeId: v.id("company_asset_types"),
  typeName: v.string(),
  serialNumber: v.string(),
  label: v.optional(v.string()),
  status: statusValidator,
  currentHolderUserId: v.optional(v.id("users")),
  currentHolderName: v.optional(v.string()),
  currentIssueId: v.optional(v.id("company_asset_issues")),
  dateIssued: v.optional(v.string()),
  issueRemark: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function displayName(user: {
  firstName?: string;
  lastName?: string;
  email: string;
}) {
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
}

function normalizeSerial(serial: string) {
  return serial.trim().toUpperCase();
}

function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function assertAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can manage company properties.");
  }
  return user;
}

async function findAssetBySerial(
  ctx: QueryCtx | MutationCtx,
  serialNormalized: string,
) {
  return await ctx.db
    .query("company_assets")
    .withIndex("by_serial", (q) => q.eq("serialNormalized", serialNormalized))
    .first();
}

async function toIssueDto(
  ctx: QueryCtx,
  issue: Doc<"company_asset_issues">,
) {
  const undertakingUrl = issue.undertakingStorageId
    ? await ctx.storage.getUrl(issue.undertakingStorageId)
    : null;

  return {
    _id: issue._id,
    assetId: issue.assetId,
    userId: issue.userId,
    staffName: issue.staffName,
    dateIssued: issue.dateIssued,
    issueRemark: issue.issueRemark,
    dateReturned: issue.dateReturned,
    returnRemark: issue.returnRemark,
    isReturned: issue.isReturned,
    undertakingStorageId: issue.undertakingStorageId,
    undertakingFileName: issue.undertakingFileName,
    undertakingUrl,
    issuedBy: issue.issuedBy,
    issuedByName: issue.issuedByName,
    returnedBy: issue.returnedBy,
    returnedByName: issue.returnedByName,
    createdAt: issue.createdAt,
  };
}

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const listTypes = query({
  args: {},
  returns: v.array(typeValidator),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const types = await ctx.db.query("company_asset_types").take(200);
    return types
      .map((type) => ({
        _id: type._id,
        name: type.name,
        createdAt: type.createdAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createType = mutation({
  args: { name: v.string() },
  returns: v.id("company_asset_types"),
  handler: async (ctx, args) => {
    const user = await assertAdmin(ctx);
    const name = args.name.trim();
    if (!name) {
      throw new Error("Property type name is required");
    }

    const existing = await ctx.db.query("company_asset_types").take(200);
    const duplicate = existing.find(
      (type) => type.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new Error("A property type with this name already exists");
    }

    return await ctx.db.insert("company_asset_types", {
      name,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const updateType = mutation({
  args: {
    typeId: v.id("company_asset_types"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const type = await ctx.db.get(args.typeId);
    if (!type) {
      throw new Error("Property type not found");
    }

    const name = args.name.trim();
    if (!name) {
      throw new Error("Property type name is required");
    }

    const existing = await ctx.db.query("company_asset_types").take(200);
    const duplicate = existing.find(
      (item) =>
        item._id !== args.typeId &&
        item.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new Error("A property type with this name already exists");
    }

    await ctx.db.patch(args.typeId, { name });
    return null;
  },
});

export const deleteType = mutation({
  args: { typeId: v.id("company_asset_types") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const type = await ctx.db.get(args.typeId);
    if (!type) {
      throw new Error("Property type not found");
    }

    const inUse = await ctx.db
      .query("company_assets")
      .withIndex("by_type", (q) => q.eq("typeId", args.typeId))
      .first();
    if (inUse) {
      throw new Error("This property type is in use and cannot be deleted");
    }

    await ctx.db.delete(args.typeId);
    return null;
  },
});

export const seedCommonTypes = mutation({
  args: {},
  returns: v.object({ added: v.number() }),
  handler: async (ctx) => {
    const user = await assertAdmin(ctx);
    const existing = await ctx.db.query("company_asset_types").take(200);
    const existingNames = new Set(
      existing.map((type) => type.name.toLowerCase()),
    );

    let added = 0;
    for (const name of COMMON_ITEM_TYPES) {
      if (existingNames.has(name.toLowerCase())) continue;
      await ctx.db.insert("company_asset_types", {
        name,
        createdBy: user._id,
        createdAt: Date.now(),
      });
      added += 1;
    }

    return { added };
  },
});

export const listAssignableUsers = query({
  args: {},
  returns: v.array(assignableUserValidator),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const staff = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "staff"))
      .take(USER_LIMIT);
    const admins = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "admin"))
      .take(USER_LIMIT);

    return [...staff, ...admins]
      .map((user) => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        imageUrl: user.imageUrl,
        role: user.role,
        jobTitle: user.jobTitle,
      }))
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  },
});

export const getStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    issued: v.number(),
    available: v.number(),
    staffWithItems: v.number(),
  }),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const assets = await ctx.db.query("company_assets").take(ASSET_LIMIT);
    const issued = assets.filter((asset) => asset.status === "issued");
    const holders = new Set(
      issued
        .map((asset) => asset.currentHolderUserId)
        .filter((id): id is Id<"users"> => Boolean(id)),
    );

    return {
      total: assets.length,
      issued: issued.length,
      available: assets.length - issued.length,
      staffWithItems: holders.size,
    };
  },
});

export const listAssets = query({
  args: {
    status: v.optional(v.union(statusValidator, v.literal("all"))),
    typeId: v.optional(v.id("company_asset_types")),
  },
  returns: v.array(assetListItemValidator),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    let assets: Doc<"company_assets">[];
    if (args.typeId) {
      assets = await ctx.db
        .query("company_assets")
        .withIndex("by_type", (q) => q.eq("typeId", args.typeId!))
        .take(ASSET_LIMIT);
    } else if (args.status && args.status !== "all") {
      assets = await ctx.db
        .query("company_assets")
        .withIndex("by_status", (q) => q.eq("status", args.status as "available" | "issued"))
        .take(ASSET_LIMIT);
    } else {
      assets = await ctx.db.query("company_assets").take(ASSET_LIMIT);
    }

    if (args.status && args.status !== "all" && args.typeId) {
      assets = assets.filter((asset) => asset.status === args.status);
    }

    const typeIds = [...new Set(assets.map((asset) => asset.typeId))];
    const types = await Promise.all(typeIds.map((id) => ctx.db.get(id)));
    const typeNameById = new Map(
      types
        .filter((type): type is Doc<"company_asset_types"> => type !== null)
        .map((type) => [type._id, type.name]),
    );

    const currentIssues = await Promise.all(
      assets.map((asset) =>
        asset.currentIssueId ? ctx.db.get(asset.currentIssueId) : null,
      ),
    );

    return assets
      .map((asset, index) => {
        const currentIssue = currentIssues[index];
        return {
          _id: asset._id,
          typeId: asset.typeId,
          typeName: typeNameById.get(asset.typeId) ?? "Unknown",
          serialNumber: asset.serialNumber,
          label: asset.label,
          status: asset.status,
          currentHolderUserId: asset.currentHolderUserId,
          currentHolderName: asset.currentHolderName,
          currentIssueId: asset.currentIssueId,
          dateIssued: currentIssue?.dateIssued,
          issueRemark: currentIssue?.issueRemark,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getAsset = query({
  args: { assetId: v.id("company_assets") },
  returns: v.union(
    v.object({
      _id: v.id("company_assets"),
      typeId: v.id("company_asset_types"),
      typeName: v.string(),
      serialNumber: v.string(),
      label: v.optional(v.string()),
      status: statusValidator,
      currentHolderUserId: v.optional(v.id("users")),
      currentHolderName: v.optional(v.string()),
      currentIssueId: v.optional(v.id("company_asset_issues")),
      createdAt: v.number(),
      updatedAt: v.number(),
      issues: v.array(issueValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset) return null;

    const type = await ctx.db.get(asset.typeId);
    const issues = await ctx.db
      .query("company_asset_issues")
      .withIndex("by_asset", (q) => q.eq("assetId", args.assetId))
      .take(ISSUE_LIMIT);

    const issueDtos = await Promise.all(
      issues
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((issue) => toIssueDto(ctx, issue)),
    );

    return {
      _id: asset._id,
      typeId: asset.typeId,
      typeName: type?.name ?? "Unknown",
      serialNumber: asset.serialNumber,
      label: asset.label,
      status: asset.status,
      currentHolderUserId: asset.currentHolderUserId,
      currentHolderName: asset.currentHolderName,
      currentIssueId: asset.currentIssueId,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      issues: issueDtos,
    };
  },
});

export const listStaffHolders = query({
  args: {},
  returns: v.array(
    v.object({
      userId: v.id("users"),
      name: v.string(),
      email: v.string(),
      imageUrl: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      currentlyHeld: v.number(),
      totalIssued: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const assets = await ctx.db.query("company_assets").take(ASSET_LIMIT);
    const issues = await ctx.db.query("company_asset_issues").take(1000);

    const counts = new Map<
      Id<"users">,
      { currentlyHeld: number; totalIssued: number }
    >();

    for (const issue of issues) {
      if (!issue.userId) continue;
      const current = counts.get(issue.userId) ?? {
        currentlyHeld: 0,
        totalIssued: 0,
      };
      current.totalIssued += 1;
      counts.set(issue.userId, current);
    }

    for (const asset of assets) {
      if (asset.status !== "issued" || !asset.currentHolderUserId) continue;
      const current = counts.get(asset.currentHolderUserId) ?? {
        currentlyHeld: 0,
        totalIssued: 0,
      };
      current.currentlyHeld += 1;
      counts.set(asset.currentHolderUserId, current);
    }

    const userIds = [...counts.keys()];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));

    return users
      .filter((user): user is Doc<"users"> => user !== null)
      .map((user) => {
        const count = counts.get(user._id) ?? {
          currentlyHeld: 0,
          totalIssued: 0,
        };
        return {
          userId: user._id,
          name: displayName(user),
          email: user.email,
          imageUrl: user.imageUrl,
          jobTitle: user.jobTitle,
          currentlyHeld: count.currentlyHeld,
          totalIssued: count.totalIssued,
        };
      })
      .sort((a, b) => {
        if (b.currentlyHeld !== a.currentlyHeld) {
          return b.currentlyHeld - a.currentlyHeld;
        }
        return a.name.localeCompare(b.name);
      });
  },
});

export const getStaffAssets = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      name: v.string(),
      email: v.string(),
      imageUrl: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      role: v.optional(v.string()),
      currentlyHeld: v.array(assetListItemValidator),
      history: v.array(
        v.object({
          issue: issueValidator,
          serialNumber: v.string(),
          typeName: v.string(),
          label: v.optional(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const heldAssets = await ctx.db
      .query("company_assets")
      .withIndex("by_holder", (q) => q.eq("currentHolderUserId", args.userId))
      .take(ASSET_LIMIT);

    const currentlyHeld = await Promise.all(
      heldAssets
        .filter((asset) => asset.status === "issued")
        .map(async (asset) => {
          const type = await ctx.db.get(asset.typeId);
          const currentIssue = asset.currentIssueId
            ? await ctx.db.get(asset.currentIssueId)
            : null;
          return {
            _id: asset._id,
            typeId: asset.typeId,
            typeName: type?.name ?? "Unknown",
            serialNumber: asset.serialNumber,
            label: asset.label,
            status: asset.status,
            currentHolderUserId: asset.currentHolderUserId,
            currentHolderName: asset.currentHolderName,
            currentIssueId: asset.currentIssueId,
            dateIssued: currentIssue?.dateIssued,
            issueRemark: currentIssue?.issueRemark,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          };
        }),
    );

    const issues = await ctx.db
      .query("company_asset_issues")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(ISSUE_LIMIT);

    const history = await Promise.all(
      issues
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (issue) => {
          const asset = await ctx.db.get(issue.assetId);
          const type = asset ? await ctx.db.get(asset.typeId) : null;
          return {
            issue: await toIssueDto(ctx, issue),
            serialNumber: asset?.serialNumber ?? "Unknown",
            typeName: type?.name ?? "Unknown",
            label: asset?.label,
          };
        }),
    );

    return {
      userId: user._id,
      name: displayName(user),
      email: user.email,
      imageUrl: user.imageUrl,
      jobTitle: user.jobTitle,
      role: user.role,
      currentlyHeld,
      history,
    };
  },
});

export const createAsset = mutation({
  args: {
    typeId: v.id("company_asset_types"),
    serialNumber: v.string(),
    label: v.optional(v.string()),
    assignToUserId: v.optional(v.id("users")),
    dateIssued: v.optional(v.string()),
    issueRemark: v.optional(v.string()),
    undertakingStorageId: v.optional(v.id("_storage")),
    undertakingFileName: v.optional(v.string()),
  },
  returns: v.id("company_assets"),
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const type = await ctx.db.get(args.typeId);
    if (!type) {
      throw new Error("Property type not found. Add it in Configure first.");
    }

    const serialNumber = args.serialNumber.trim();
    if (!serialNumber) {
      throw new Error("Serial number is required");
    }

    const serialNormalized = normalizeSerial(serialNumber);
    const existing = await findAssetBySerial(ctx, serialNormalized);
    if (existing) {
      throw new Error("A property with this serial number already exists");
    }

    const now = Date.now();
    const label = args.label?.trim() || undefined;
    const assetId = await ctx.db.insert("company_assets", {
      typeId: args.typeId,
      serialNumber,
      serialNormalized,
      label,
      status: "available",
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });

    if (args.assignToUserId) {
      const holder = await ctx.db.get(args.assignToUserId);
      if (!holder) {
        throw new Error("Selected staff member was not found");
      }

      const staffName = displayName(holder);
      const issueId = await ctx.db.insert("company_asset_issues", {
        assetId,
        userId: holder._id,
        staffName,
        dateIssued: args.dateIssued?.trim() || todayIsoDate(),
        issueRemark: args.issueRemark?.trim() || undefined,
        isReturned: false,
        undertakingStorageId: args.undertakingStorageId,
        undertakingFileName: args.undertakingFileName,
        issuedBy: admin._id,
        issuedByName: displayName(admin),
        createdAt: now,
      });

      await ctx.db.patch(assetId, {
        status: "issued",
        currentHolderUserId: holder._id,
        currentHolderName: staffName,
        currentIssueId: issueId,
        updatedAt: now,
      });
    }

    return assetId;
  },
});

export const updateAsset = mutation({
  args: {
    assetId: v.id("company_assets"),
    typeId: v.id("company_asset_types"),
    serialNumber: v.string(),
    label: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Property not found");
    }

    const type = await ctx.db.get(args.typeId);
    if (!type) {
      throw new Error("Property type not found");
    }

    const serialNumber = args.serialNumber.trim();
    if (!serialNumber) {
      throw new Error("Serial number is required");
    }

    const serialNormalized = normalizeSerial(serialNumber);
    const existing = await findAssetBySerial(ctx, serialNormalized);
    if (existing && existing._id !== args.assetId) {
      throw new Error("A property with this serial number already exists");
    }

    await ctx.db.patch(args.assetId, {
      typeId: args.typeId,
      serialNumber,
      serialNormalized,
      label: args.label?.trim() || undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteAsset = mutation({
  args: { assetId: v.id("company_assets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Property not found");
    }
    if (asset.status === "issued") {
      throw new Error("Return this property before deleting it");
    }

    const issues = await ctx.db
      .query("company_asset_issues")
      .withIndex("by_asset", (q) => q.eq("assetId", args.assetId))
      .take(ISSUE_LIMIT);

    for (const issue of issues) {
      if (issue.undertakingStorageId) {
        await ctx.storage.delete(issue.undertakingStorageId);
      }
      await ctx.db.delete(issue._id);
    }

    await ctx.db.delete(args.assetId);
    return null;
  },
});

export const issueAsset = mutation({
  args: {
    assetId: v.id("company_assets"),
    assignToUserId: v.id("users"),
    dateIssued: v.optional(v.string()),
    issueRemark: v.optional(v.string()),
    undertakingStorageId: v.optional(v.id("_storage")),
    undertakingFileName: v.optional(v.string()),
  },
  returns: v.id("company_asset_issues"),
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Property not found");
    }
    if (asset.status === "issued") {
      throw new Error("This property is already with a staff member");
    }

    const holder = await ctx.db.get(args.assignToUserId);
    if (!holder) {
      throw new Error("Selected staff member was not found");
    }

    const now = Date.now();
    const staffName = displayName(holder);
    const issueId = await ctx.db.insert("company_asset_issues", {
      assetId: args.assetId,
      userId: holder._id,
      staffName,
      dateIssued: args.dateIssued?.trim() || todayIsoDate(),
      issueRemark: args.issueRemark?.trim() || undefined,
      isReturned: false,
      undertakingStorageId: args.undertakingStorageId,
      undertakingFileName: args.undertakingFileName,
      issuedBy: admin._id,
      issuedByName: displayName(admin),
      createdAt: now,
    });

    await ctx.db.patch(args.assetId, {
      status: "issued",
      currentHolderUserId: holder._id,
      currentHolderName: staffName,
      currentIssueId: issueId,
      updatedAt: now,
    });

    return issueId;
  },
});

export const returnAsset = mutation({
  args: {
    assetId: v.id("company_assets"),
    dateReturned: v.optional(v.string()),
    returnRemark: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Property not found");
    }
    if (asset.status !== "issued" || !asset.currentIssueId) {
      throw new Error("This property is not currently issued");
    }

    const issue = await ctx.db.get(asset.currentIssueId);
    if (!issue) {
      throw new Error("Issue record not found");
    }

    await ctx.db.patch(issue._id, {
      dateReturned: args.dateReturned?.trim() || todayIsoDate(),
      returnRemark: args.returnRemark?.trim() || undefined,
      isReturned: true,
      returnedBy: admin._id,
      returnedByName: displayName(admin),
    });

    await ctx.db.patch(args.assetId, {
      status: "available",
      currentHolderUserId: undefined,
      currentHolderName: undefined,
      currentIssueId: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const updateIssue = mutation({
  args: {
    issueId: v.id("company_asset_issues"),
    dateIssued: v.optional(v.string()),
    issueRemark: v.optional(v.string()),
    dateReturned: v.optional(v.string()),
    returnRemark: v.optional(v.string()),
    undertakingStorageId: v.optional(v.id("_storage")),
    undertakingFileName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) {
      throw new Error("Issue record not found");
    }

    const patch: Partial<Doc<"company_asset_issues">> = {};
    if (args.dateIssued !== undefined) {
      const dateIssued = args.dateIssued.trim();
      if (!dateIssued) throw new Error("Date issued is required");
      patch.dateIssued = dateIssued;
    }
    if (args.issueRemark !== undefined) {
      patch.issueRemark = args.issueRemark.trim() || undefined;
    }
    if (args.dateReturned !== undefined) {
      patch.dateReturned = args.dateReturned.trim() || undefined;
    }
    if (args.returnRemark !== undefined) {
      patch.returnRemark = args.returnRemark.trim() || undefined;
    }
    if (args.undertakingStorageId !== undefined) {
      if (
        issue.undertakingStorageId &&
        issue.undertakingStorageId !== args.undertakingStorageId
      ) {
        await ctx.storage.delete(issue.undertakingStorageId);
      }
      patch.undertakingStorageId = args.undertakingStorageId;
    }
    if (args.undertakingFileName !== undefined) {
      patch.undertakingFileName = args.undertakingFileName || undefined;
    }

    await ctx.db.patch(args.issueId, patch);
    return null;
  },
});
