const USER_LIST_SEARCH_CURSOR_PREFIX = "uls1:";

export function buildUserSearchText(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}) {
  return [
    user.firstName,
    user.lastName,
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    user.email,
    user.phoneNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function userMatchesSearch(
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  },
  search?: string
) {
  const term = search?.trim().toLowerCase();
  if (!term) return true;
  return buildUserSearchText(user).includes(term);
}

type UserListSearchCursor = {
  lastCreationTime: number | null;
  pendingMatchIds: Array<string>;
};

/** True when cursor was produced by our custom search path (not Convex .paginate). */
export function isUserListSearchCursor(cursor: string | null | undefined): boolean {
  return typeof cursor === "string" && cursor.startsWith(USER_LIST_SEARCH_CURSOR_PREFIX);
}

export function parseUserListSearchCursor(
  cursor: string | null
): UserListSearchCursor {
  if (!isUserListSearchCursor(cursor)) {
    return { lastCreationTime: null, pendingMatchIds: [] };
  }

  try {
    const raw = cursor!.slice(USER_LIST_SEARCH_CURSOR_PREFIX.length);
    const parsed = JSON.parse(raw) as Partial<UserListSearchCursor>;
    return {
      lastCreationTime:
        typeof parsed.lastCreationTime === "number"
          ? parsed.lastCreationTime
          : null,
      pendingMatchIds: Array.isArray(parsed.pendingMatchIds)
        ? parsed.pendingMatchIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return { lastCreationTime: null, pendingMatchIds: [] };
  }
}

export function encodeUserListSearchCursor(
  cursor: UserListSearchCursor
): string {
  return `${USER_LIST_SEARCH_CURSOR_PREFIX}${JSON.stringify(cursor)}`;
}
