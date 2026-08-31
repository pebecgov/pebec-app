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

export function parseUserListSearchCursor(
  cursor: string | null
): UserListSearchCursor {
  if (!cursor) {
    return { lastCreationTime: null, pendingMatchIds: [] };
  }
  try {
    const parsed = JSON.parse(cursor) as Partial<UserListSearchCursor> & {
      dbCursor?: string | null;
    };
    return {
      lastCreationTime:
        typeof parsed.lastCreationTime === "number"
          ? parsed.lastCreationTime
          : null,
      pendingMatchIds: Array.isArray(parsed.pendingMatchIds)
        ? parsed.pendingMatchIds
        : [],
    };
  } catch {
    return { lastCreationTime: null, pendingMatchIds: [] };
  }
}

export function encodeUserListSearchCursor(
  cursor: UserListSearchCursor
): string {
  return JSON.stringify(cursor);
}
