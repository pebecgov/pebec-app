"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export const SABER_EC_PUBLIC_PATH = "/saber";
export const SABER_EC_SECTION_ID = "programme-eligibility-criteria";

export const SABER_EC_SOURCE_NOTE =
  "State Action on Business Enabling Reforms (SABER), Verification Protocol, Version 40, June 11, 2026";

export type SaberEcCriterionId = "ec1" | "ec2" | "ec3" | "ec4" | "ec5";

export type SaberEcCriterion = {
  id: SaberEcCriterionId;
  description: string;
  deadlines: string[];
};

/** The three EC result areas (top row of the FA table). */
export const SABER_EC_RESULT_AREAS = [
  "Improved planning and accountability of business-enabling reforms",
  "Continued transparency of annual State Budget and Audited Financial Statements",
  "Strengthened and transparent debt management",
] as const;

export type SaberEcFaItem = { letter: string; text: string };

export type SaberEcFaSection = {
  id: SaberEcCriterionId;
  number: number;
  intro: string;
  items: SaberEcFaItem[];
};

/** EC description exactly as per the Financing Agreement (FA), by disbursement period. */
export const SABER_EC_FA_SECTIONS: SaberEcFaSection[] = [
  {
    id: "ec1",
    number: 1,
    intro:
      "For eligibility for disbursements for Prior Results achieved prior to the Signature Date but after May 31, 2022, the relevant Participating State shall have met each of the following criteria:",
    items: [
      {
        letter: "a",
        text: "Annual FY21 audited financial statement, prepared in accordance with IPSAS, submitted to the State Assembly and published by 31 October 2022.",
      },
    ],
  },
  {
    id: "ec2",
    number: 2,
    intro:
      "For eligibility for disbursements for DLRs achieved during the Fiscal Year ending on December 31, 2023, the relevant Participating State shall have met each of the following criteria:",
    items: [
      {
        letter: "a",
        text: "Annual State Business-Enabling Reforms Action Plan for 2023 approved by the State Executive Council and published online by 31 January 2023;",
      },
      {
        letter: "b",
        text: "Annual State Business-Enabling Reforms Action Plan for 2024, prepared with, and including records of, private sector participation, approved by the State Executive Council and published online by 31 December 2023;",
      },
      {
        letter: "c",
        text: "Annual FY23 state budget, prepared under national Chart of Accounts, approved by the State Assembly and published online by 31 January 2023;",
      },
      {
        letter: "d",
        text: "Annual FY22 audited financial statement, prepared in accordance with IPSAS, submitted to the State Assembly and published by 31 July 2023; and",
      },
      {
        letter: "e",
        text: "Annual State Debt Sustainability Analysis and Debt Management Strategy Report (SDSA-DMSR) published online by 31 December 2022.",
      },
    ],
  },
  {
    id: "ec3",
    number: 3,
    intro:
      "For eligibility for disbursements for DLRs achieved during the Fiscal Year ending on December 31, 2024, the relevant Participating State shall have met each of the following criteria:",
    items: [
      {
        letter: "a",
        text: "Annual State Business-Enabling Reforms Action Plan for 2025, prepared with, and including records of, private sector participation, approved by the State Executive Council and published online by 31 December 2024;",
      },
      {
        letter: "b",
        text: "Previous year’s (2023) progress report submitted to the State Executive Council and published online by 31 July 2024;",
      },
      {
        letter: "c",
        text: "Annual FY24 state budget, prepared under national Chart of Accounts, approved by the State Assembly and published online by 31 January 2024;",
      },
      {
        letter: "d",
        text: "Annual FY23 audited financial statement, prepared in accordance with IPSAS, submitted to the State Assembly and published online by 31 July 2024; and",
      },
      {
        letter: "e",
        text: "Annual SDSA-DMSR published online by 31 December 2023.",
      },
    ],
  },
  {
    id: "ec4",
    number: 4,
    intro:
      "For eligibility for disbursements for DLRs achieved during the Fiscal Year ending on December 31, 2025, the relevant Participating State shall have met each of the following criteria:",
    items: [
      {
        letter: "a",
        text: "Annual State Business-Enabling Reforms Action Plan, prepared for 2026 with, and including records of, private sector participation, approved by State Executive Council and published online by 31 January 2026;",
      },
      {
        letter: "b",
        text: "Previous year’s (2024) progress report submitted to the State Executive Council and published online by 31 July 2025;",
      },
      {
        letter: "c",
        text: "Annual FY25 state budget, prepared under national Chart of Accounts, approved by the State Assembly and published online by 31 January 2025;",
      },
      {
        letter: "d",
        text: "Annual FY24 audited financial statement, prepared in accordance with IPSAS, submitted to the State Assembly and published online by 31 July 2025; and",
      },
      {
        letter: "e",
        text: "Annual SDSA-DMSR published online by 31 December 2024.",
      },
    ],
  },
  {
    id: "ec5",
    number: 5,
    intro:
      "For eligibility for disbursements for DLRs achieved during the Fiscal Year ending on December 31, 2026, the relevant Participating State shall have met each of the following criteria:",
    items: [
      {
        letter: "a",
        text: "Annual State Business-Enabling Reforms Action Plan, prepared for 2027 with, and including records of, private sector participation, approved by State Executive Council and published online by 31 December 2026;",
      },
      {
        letter: "b",
        text: "Previous year’s (2025) progress report submitted to the State Executive Council and published online by 31 July 2026;",
      },
      {
        letter: "c",
        text: "Annual FY26 state budget, prepared under national Chart of Accounts, approved by the State Assembly and published online by 31 January 2026;",
      },
      {
        letter: "d",
        text: "Annual FY25 audited financial statement, prepared in accordance with IPSAS, submitted to the State Assembly and published online by 31 July 2026; and,",
      },
      {
        letter: "e",
        text: "Annual SDSA-DMSR published online by 31 December 2025.",
      },
    ],
  },
];

/** Per-criterion view (one per FA disbursement period) used by the agent confirmation modal. */
export const SABER_EC_CRITERIA: SaberEcCriterion[] = SABER_EC_FA_SECTIONS.map(
  (section) => ({
    id: section.id,
    description: section.intro,
    deadlines: section.items.map((item) => `(${item.letter}) ${item.text}`),
  })
);

export function ProgrammeEligibilityCriteriaTable({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  return (
    <section className="space-y-4" id={SABER_EC_SECTION_ID}>
      {showTitle && (
        <h2 className="text-2xl font-bold text-gray-900">Programme Eligibility Criteria (EC)</h2>
      )}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="min-w-full text-left text-sm border-collapse">
          <tbody>
            <tr className="align-top">
              <th className="p-3 border font-semibold bg-[#e8ecf7] w-48 md:w-64">
                Eligibility Criteria
              </th>
              <td className="p-3 border bg-[#e8ecf7]">
                <ul className="space-y-1 font-semibold text-gray-900">
                  {SABER_EC_RESULT_AREAS.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </td>
            </tr>
            <tr className="align-top">
              <th className="p-3 border font-semibold bg-[#ecf4e8] w-48 md:w-64">
                EC description as per Financing Agreement (FA)
              </th>
              <td className="p-3 border bg-[#ecf4e8]">
                <div className="space-y-4">
                  {SABER_EC_FA_SECTIONS.map((section) => (
                    <div key={section.id}>
                      <p className="font-semibold">
                        {section.number}. {section.intro}
                      </p>
                      <ul className="mt-2 space-y-1 pl-5">
                        {section.items.map((item) => (
                          <li key={item.letter}>
                            <span className="font-medium">({item.letter})</span> {item.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs italic text-gray-500">{SABER_EC_SOURCE_NOTE}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export type EcChecksState = Record<SaberEcCriterionId, boolean>;

export const INITIAL_EC_CHECKS: EcChecksState = {
  ec1: false,
  ec2: false,
  ec3: false,
  ec4: false,
  ec5: false,
};

export function ProgrammeEligibilityCriteriaModal({
  checks,
  onCheckChange,
  onConfirm,
  confirmDisabled,
}: {
  checks: EcChecksState;
  onCheckChange: (id: SaberEcCriterionId, checked: boolean) => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 text-center">
        Confirm that your state meets the eligibility criteria for each disbursement period below. The same criteria are
        published on the public SABER page.
      </p>

      <div className="overflow-x-auto border rounded-lg bg-gray-50 text-sm max-h-[50vh] overflow-y-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[#ecf4e8] sticky top-0">
            <tr>
              <th className="p-2 border font-semibold w-10" aria-label="Confirm" />
              <th className="p-2 border font-semibold">Eligibility criteria (per Financing Agreement)</th>
            </tr>
          </thead>
          <tbody>
            {SABER_EC_FA_SECTIONS.map((section) => (
              <tr key={section.id} className="align-top bg-white">
                <td className="p-2 border">
                  <Checkbox
                    checked={checks[section.id]}
                    onCheckedChange={(v) => onCheckChange(section.id, Boolean(v))}
                  />
                </td>
                <td className="p-2 border">
                  <p className="font-medium">
                    {section.number}. {section.intro}
                  </p>
                  <ul className="mt-1 space-y-0.5 pl-4 text-xs text-gray-600">
                    {section.items.map((item) => (
                      <li key={item.letter}>
                        ({item.letter}) {item.text}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs italic text-gray-500 text-center">{SABER_EC_SOURCE_NOTE}</p>

      <p className="text-sm text-center">
        <Link
          href={`${SABER_EC_PUBLIC_PATH}#${SABER_EC_SECTION_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6b8f3e] font-medium underline hover:text-[#5a7a35]"
        >
          See more details on the public SABER page
        </Link>
        {" "}
        (full programme background, DLIs, and expanded EC guidance).
      </p>

      <p className="text-red-600 text-sm">
        <strong>N.B:</strong> Meeting <strong>ALL</strong> the Eligibility Criteria above is a prerequisite for
        receiving disbursement. Failing to meet EC will result in <strong>NO DISBURSEMENT</strong>.
      </p>

      <Button
        onClick={onConfirm}
        disabled={confirmDisabled}
        className={`w-full ${confirmDisabled ? "bg-gray-400" : "bg-green-600"} text-white`}
      >
        Confirm Eligibility
      </Button>
    </div>
  );
}
