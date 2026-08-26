import { escapeXml } from "./constants";

function encodeBase64(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin);
}

export async function twilioSignatureIsValid(args: {
  authToken: string;
  url: string;
  params: Record<string, string>;
  signature: string | null;
}): Promise<boolean> {
  if (!args.signature) return false;
  const sortedKeys = Object.keys(args.params).sort();
  let data = args.url;
  for (const key of sortedKeys) {
    data += key + args.params[key];
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(args.authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  const expected = encodeBase64(signed);
  if (expected.length !== args.signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ args.signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export function toTwimlMessage(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(body)}</Message></Response>`;
}

export function parseTwilioForm(rawBody: string): Record<string, string> {
  const params: Record<string, string> = {};
  const search = new URLSearchParams(rawBody);
  search.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
