// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownShell =
  "text-gray-800 dark:text-slate-200 [&_a]:text-green-700 [&_a]:underline dark:[&_a]:text-cyan-300 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-green-500/40 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 dark:[&_blockquote]:border-cyan-500/40 dark:[&_blockquote]:text-slate-300 [&_code]:rounded-md [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:text-green-900 dark:[&_code]:bg-black/35 dark:[&_code]:text-cyan-100 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-gray-900 dark:[&_h1]:text-white [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 dark:[&_h3]:text-white [&_hr]:my-4 [&_hr]:border-gray-200 dark:[&_hr]:border-white/10 [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-0.5 [&_ol]:pl-5 [&_p]:mb-2 [&_p]:last:mb-0 [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top dark:[&_td]:border-white/15 [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left dark:[&_th]:border-white/15 dark:[&_th]:bg-white/10 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:pl-5 [&_ul_ul]:my-1 [&_ul_ul]:ml-1 [&_ul_ul]:list-[circle] [&_ul_ul]:space-y-0.5 [&_ul_ul]:pl-5";

type AssistantMarkdownProps = {
  content: string;
};

/** `[IV. Question 4: …] IV. Question 4: …` → single ### heading + body. */
function collapseDuplicateBracketHeading(s: string): string {
  const m = s.match(/^\[([^\]]+)\]\s*/);
  if (!m || m.index !== 0) return s;
  const inner = m[1].trim();
  const start = m[0].length;
  let i = start;
  let j = 0;
  while (j < inner.length && i < s.length && s[i] === inner[j]) {
    i++;
    j++;
  }
  while (i < s.length && /\s/.test(s[i])) i++;
  if (j !== inner.length) return s;
  const tail = s.slice(i).replace(/^\s+/, "");
  return `### ${inner}\n\n${tail}`;
}

function shouldApplyRiaFrameworkStructure(text: string): boolean {
  const head = text.slice(0, 6000);
  return (
    /Required\s+Key\s+Activities\s*:/i.test(head) ||
    (/^\s*\[[^\]]+\]\s+/m.test(head) &&
      /\bObjective\s*:/i.test(head) &&
      (/[●○]/.test(head) || /Question\s*\d/i.test(head)))
  );
}

/**
 * RIA / Critical Questions style: dedupe bracket title, section headings, hollow-circle sub-bullets,
 * then primary ● bullets as markdown lists (so nested ○ → sub-lists render correctly).
 */
function normalizeRiaFrameworkMarkdown(text: string): string {
  let s = text.replace(/\r\n/g, "\n");
  s = collapseDuplicateBracketHeading(s);
  s = s.replace(/\s*Objective:\s*/gi, "\n\n### Objective\n\n");
  s = s.replace(/\s*Required\s+Key\s+Activities:\s*/gi, "\n\n### Required key activities\n\n");
  s = s.replace(/:\s*○\s+/g, ":\n\n  - ");
  s = s.replace(/\s+○\s+/g, "\n  - ");
  s = s.replace(/\s*●\s+/g, "\n- ");
  return s.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").trimEnd();
}

/**
 * 1) ATX headings (# … ######) must start a Markdown block — strip a leading ●/• and add a blank line.
 * 2) PEBEC-style "A: Title ● …" — promote the letter-colon title at the start of the message to ###.
 * 3) Remaining ● / • — hard line break + ● at each new line.
 */
function normalizeAssistantMarkdown(text: string): string {
  let s = text.replace(/\r\n/g, "\n");
  s = s.replace(/\s*[●•]\s*(#{1,6}\s+)/g, "\n\n$1");
  s = s.replace(
    /^([A-L]\s*:\s[^\n●]+?)(\s*[●•])/i,
    (_m, title: string, after: string) => `### ${title.trim()}${after}`,
  );
  if (!/[●•]/.test(s)) {
    return s.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").trimEnd();
  }
  s = s
    .replace(/\s*[●•]\s*/g, "  \n● ")
    .replace(/^( {2}\n)+/, "");
  s = s.replace(/\s*●\s*(#{1,6}\s+)/g, "\n\n$1");
  return s.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").trimEnd();
}

export function AssistantMarkdown({ content }: AssistantMarkdownProps) {
  const preRia = shouldApplyRiaFrameworkStructure(content)
    ? normalizeRiaFrameworkMarkdown(content)
    : content;
  const normalized = normalizeAssistantMarkdown(preRia);
  return (
    <div className={markdownShell}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalized}</ReactMarkdown>
    </div>
  );
}
