// src/types.ts

/**
 * Interface for the data specific to 'type1' reports.
 * All fields are defined as they appear in the Convex schema's v.object.
 */
export interface Type1Data {
  question2: string[]; // Array of 4 fixed strings, managed by multiple inputs
  question3: string;
  question4: string;
  question5: string[]; // Array of strings, managed by multiple inputs
  question6: string;
  question7: string[]; // Array of strings, managed by multiple inputs
  question8: string[]; // Array of strings, managed by multiple inputs
  question9: string[]; // Array of strings, managed by multiple inputs
  question10: string[]; // Array of strings, managed by multiple inputs
  question11: string[]; // Array of strings, managed by multiple inputs
}

/**
 * Interface for the data specific to 'type2' reports.
 */
export interface Type2Data {
  announceInvestment: string[]; // Array of strings
  dateOfAnnouncement: string;
  media_platform: string;
}

/**
 * Interface for the data specific to 'type3' reports.
 */
export interface Type3Data {
  noim: string[];
  lri: string[];
  sectors: string[];
  elibility: string[];
  description: string[];
  duration: string[];
  aaia: string[];
  noiri2022: string[];
  noiri2023: string[];
  noiri2024: string[];
}

/**
 * Main FormData interface that encompasses all possible report types.
 *
 * This interface is used for the centralized `formData` state in your
 * `ReportFormContainer` component. The `type1Data`, `type2Data`, and
 * `type3Data` properties are optional because only one will be present
 * based on the selected `reportType`.
 */
export interface FormData {
  reportType: "type1" | "type2" | "type3"; // The selected report type
  type1Data?: Type1Data; // Optional data for 'type1' reports
  type2Data?: Type2Data; // Optional data for 'type2' reports
  type3Data?: Type3Data; // Optional data for 'type3' reports
}