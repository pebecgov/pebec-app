import { MutationCtx, QueryCtx } from "../_generated/server";

export type AppErrorCode =
  | "NOT_AUTHENTICATED"
  | "USER_NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_FAILED"
  | "RESOURCE_NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type AppError = {
  code: AppErrorCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type AppResult<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

export class StructuredError extends Error {
  readonly code: AppErrorCode;
  readonly meta?: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

export const createError = (
  code: AppErrorCode,
  message: string,
  meta?: Record<string, unknown>
) => new StructuredError(code, message, meta);

const MESSAGE_MAP: Record<string, { code: AppErrorCode; message: string }> = {
  "Not authenticated": {
    code: "NOT_AUTHENTICATED",
    message: "Please sign in to continue.",
  },
  "User not found": {
    code: "USER_NOT_FOUND",
    message: "We couldn't find your account in the directory.",
  },
  "🚨 Only admins can change roles!": {
    code: "FORBIDDEN",
    message: "You need admin access to complete this action.",
  },
  Unauthorized: {
    code: "FORBIDDEN",
    message: "You don't have permission to do that.",
  },
  "Forbidden: Admins only.": {
    code: "FORBIDDEN",
    message: "Admin access is required.",
  },
  "Announcement not found": {
    code: "RESOURCE_NOT_FOUND",
    message: "That record no longer exists.",
  },
  "Ticket not found": {
    code: "RESOURCE_NOT_FOUND",
    message: "We couldn't find that ticket.",
  },
  "Meeting not found": {
    code: "RESOURCE_NOT_FOUND",
    message: "We couldn't find that meeting.",
  },
  "User not authenticated": {
    code: "NOT_AUTHENTICATED",
    message: "Please sign in to continue.",
  },
};

export const toAppError = (error: unknown): AppError => {
  if (error instanceof StructuredError) {
    return { code: error.code, message: error.message, meta: error.meta };
  }

  if (error instanceof Error) {
    const mapped = MESSAGE_MAP[error.message];
    if (mapped) {
      return mapped;
    }

    return {
      code: "INTERNAL_ERROR",
      message: error.message || "Something went wrong.",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Something went wrong.",
    meta: { error },
  };
};

export const wrapHandler = <Args, Result>(
  handler: (ctx: MutationCtx | QueryCtx, args: Args) => Promise<Result>
) => {
  return async (
    ctx: MutationCtx | QueryCtx,
    args: Args
  ): Promise<Result extends { success: boolean } ? Result : AppResult<Result>> => {
    try {
      const data = await handler(ctx, args);
      if (typeof data === "object" && data !== null && "success" in data) {
        return data as Result extends { success: boolean } ? Result : AppResult<Result>;
      }
      return { success: true, data } as Result extends { success: boolean } ? Result : AppResult<Result>;
    } catch (error) {
      const appError = toAppError(error);
      return { success: false, error: appError } as Result extends { success: boolean } ? Result : AppResult<Result>;
    }
  };
};

export const wrapVoidHandler = <Args>(
  handler: (ctx: MutationCtx | QueryCtx, args: Args) => Promise<void>
) => {
  return async (
    ctx: MutationCtx | QueryCtx,
    args: Args
  ): Promise<AppResult<null>> => {
    try {
      await handler(ctx, args);
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
};

