export function convexErrorMessage(error: unknown, fallback: string) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "";

  if (!raw) return fallback;

  if (raw.includes("Uncaught Error: ")) {
    const extracted = raw.split("Uncaught Error: ")[1]?.split("\n")[0]?.trim();
    if (extracted) return extracted;
  }

  return raw;
}
