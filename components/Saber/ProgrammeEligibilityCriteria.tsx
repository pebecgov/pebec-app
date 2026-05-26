"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export const SABER_EC_PUBLIC_PATH = "/saber";
export const SABER_EC_SECTION_ID = "programme-eligibility-criteria";

export type SaberEcCriterionId = "ec1" | "ec2" | "ec3" | "ec4" | "ec5";

export type SaberEcCriterion = {
  id: SaberEcCriterionId;
  description: string;
  deadlines: string[];
};

export const SABER_EC_TABLE_ROWS = [
  {
    resultArea:
      "Improved planning and accountability of business enabling reforms",
    descriptions: [
      "Annual State Business Enabling Reforms Action Plan (BERAP) prepared with private sector participation (with records), approved by the State Executive Council and published online. (For the 2023 report, private sector participation not required).",
      "Previous year's progress report submitted to the State Executive Council and published online.",
    ],
    deadlines: [
      "YEAR 1 (2023): BERAP 2023 by Jan-31, 2023",
      "YEAR 1 (2023): BERAP 2024 by Dec-31, 2023",
      "YEAR 2 (2024): 2023 progress report by Jul 30,2024",
      "YEAR 2 (2024): BERAP 2025 by Dec-31, 2024",
    ],
  },
  {
    resultArea:
      "Continuation of selected criteria from SFTAS: Continued transparency of annual State Budget and Audited Financial Statements AND Strengthened and transparent debt management",
    descriptions: [
      "Annual State budget, prepared under national Chart of Accounts, approved by the State Assembly and published online by end January the next year (Former SFTAS EC).",
      "Annual audited financial statement (AFS), prepared in accordance with IPSAS, submitted to the State Assembly and published by July the next year (Former SFTAS EC).",
      "Annual State Debt Sustainability Analysis and Debt Management Strategy Report (SDSA-DMSR) published end-December as per the criteria set in the verification protocol (former SFTAS DLI).",
    ],
    deadlines: [
      "YEAR 1 (2023): FY23 Budget by Jan-31, 2023",
      "YEAR 2 (2024): FY24 Budget by Jan-31, 2024",
      "YEAR 3 (2025): FY25 Budget by Jan-31,2025",
      "Prior Results: FY21 AFS by Oct-31, 2022",
      "YEAR 1 (2023): FY22 AFS by Jul-31, 2023",
      "YEAR 2 (2024): FY23 AFS by Jul-31, 2024",
      "YEAR 1 (2023): SDSA-DMSR by Dec-31, 2022",
      "YEAR 2 (2024): SDSA-DMSR by Dec-31, 2023",
      "YEAR 3 (2025): SDSA-DMSR by Dec-31, 2024.",
    ],
  },
] as const;

export const SABER_EC_CRITERIA: SaberEcCriterion[] = [
  {
    id: "ec1",
    description: SABER_EC_TABLE_ROWS[0].descriptions[0],
    deadlines: [
      "YEAR 1 (2023): BERAP 2023 by Jan-31, 2023",
      "YEAR 1 (2023): BERAP 2024 by Dec-31, 2023",
    ],
  },
  {
    id: "ec2",
    description: SABER_EC_TABLE_ROWS[0].descriptions[1],
    deadlines: [
      "YEAR 2 (2024): 2023 progress report by Jul 30,2024",
      "YEAR 2 (2024): BERAP 2025 by Dec-31, 2024",
    ],
  },
  {
    id: "ec3",
    description: SABER_EC_TABLE_ROWS[1].descriptions[0],
    deadlines: [
      "YEAR 1 (2023): FY23 Budget by Jan-31, 2023",
      "YEAR 2 (2024): FY24 Budget by Jan-31, 2024",
      "YEAR 3 (2025): FY25 Budget by Jan-31,2025",
    ],
  },
  {
    id: "ec4",
    description: SABER_EC_TABLE_ROWS[1].descriptions[1],
    deadlines: [
      "Prior Results: FY21 AFS by Oct-31, 2022",
      "YEAR 1 (2023): FY22 AFS by Jul-31, 2023",
      "YEAR 2 (2024): FY23 AFS by Jul-31, 2024",
    ],
  },
  {
    id: "ec5",
    description: SABER_EC_TABLE_ROWS[1].descriptions[2],
    deadlines: [
      "YEAR 1 (2023): SDSA-DMSR by Dec-31, 2022",
      "YEAR 2 (2024): SDSA-DMSR by Dec-31, 2023",
      "YEAR 3 (2025): SDSA-DMSR by Dec-31, 2024.",
    ],
  },
];

const EMPHASIZED_DEADLINES = new Set([
  "YEAR 2 (2024): BERAP 2025 by Dec-31, 2024",
  "YEAR 3 (2025): FY25 Budget by Jan-31,2025",
  "YEAR 3 (2025): SDSA-DMSR by Dec-31, 2024.",
]);

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
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#ecf4e8]">
            <tr>
              <th className="p-3 border font-semibold">Result Area</th>
              <th className="p-3 border font-semibold">Description</th>
              <th className="p-3 border font-semibold">Recent/Upcoming deadlines</th>
            </tr>
          </thead>
          <tbody>
            {SABER_EC_TABLE_ROWS.map((row) => (
              <tr key={row.resultArea} className="align-top">
                <td className="p-3 border font-semibold">{row.resultArea}</td>
                <td className="p-3 border">
                  <ul className="list-disc pl-5 space-y-2">
                    {row.descriptions.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-3 border space-y-1">
                  {row.deadlines.map((d) => (
                    <p key={d} className={EMPHASIZED_DEADLINES.has(d) ? "font-semibold" : undefined}>
                      {d}
                    </p>
                  ))}
                </td>
              </tr>
            ))}
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
        Confirm that your state meets each requirement below. The same criteria and deadlines are published on the
        public SABER page.
      </p>

      <div className="overflow-x-auto border rounded-lg bg-gray-50 text-sm max-h-[50vh] overflow-y-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[#ecf4e8] sticky top-0">
            <tr>
              <th className="p-2 border font-semibold w-10" aria-label="Confirm" />
              <th className="p-2 border font-semibold">Requirement</th>
              <th className="p-2 border font-semibold">Recent/Upcoming deadlines</th>
            </tr>
          </thead>
          <tbody>
            {SABER_EC_CRITERIA.map((criterion) => (
              <tr key={criterion.id} className="align-top bg-white">
                <td className="p-2 border">
                  <Checkbox
                    checked={checks[criterion.id]}
                    onCheckedChange={(v) => onCheckChange(criterion.id, Boolean(v))}
                  />
                </td>
                <td className="p-2 border">{criterion.description}</td>
                <td className="p-2 border">
                  <ul className="list-none space-y-0.5 text-xs text-gray-600">
                    {criterion.deadlines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
        <strong>N.B:</strong> Meeting <strong>ALL 5</strong> Eligibility Criteria above is a prerequisite for receiving
        disbursement. Failing to meet EC will result in <strong>NO DISBURSEMENT</strong>.
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
