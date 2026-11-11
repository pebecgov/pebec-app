import type { WhatsAppLang } from "./i18n";

type AiCopy = {
  reading: string;
  softWelcome: string;
  changeLanguage: string;
  checkComplaint: string;
  guidedSteps: string;
  needTextForMedia: string;
  exitButton: string;
  menuButton: string;
  outOfScope: (agency?: string | null) => string;
  abusive: string;
  confirmBody: (args: {
    state: string;
    mda: string;
    dateLabel: string;
    description: string;
    title?: string;
    verifyHints: string[];
  }) => string;
  confirmButton: string;
  editButton: string;
  startOverButton: string;
  askState: string;
  askMda: string;
  askDate: string;
  askDescription: string;
  editPrompt: string;
  fallbackClassic: string;
  submitWithoutEvidence: string;
  attachEvidence: string;
  evidenceAfterConfirm: string;
  evidenceAlreadyAttached: string;
};

const EN: AiCopy = {
  reading: "Reading your message…",
  softWelcome: [
    "Welcome to PEBEC ReportGov.",
    "",
    "Just type your complaint in any language (English, Hausa, Igbo, or Yoruba).",
    "Tell us what happened — we will ask only if something is missing.",
    "",
    "This line is for Ports & Customs issues (Customs, Immigration, Ports, and related agencies).",
  ].join("\n"),
  changeLanguage: "Language",
  checkComplaint: "Check status",
  guidedSteps: "Step-by-step",
  needTextForMedia:
    "We received your file. Please also type a short message explaining what happened (any language).",
  exitButton: "Exit",
  menuButton: "Menu",
  outOfScope: (agency) =>
    [
      "This WhatsApp line is only for Ports & Customs issues",
      "(Customs, Immigration, Ports, Quarantine, NDLEA, NIMASA, and similar).",
      agency ? `It looks like this may be about: ${agency}.` : null,
      "",
      "For other agencies, please use the ReportGov website.",
      "Or tap Step-by-step to pick a Ports & Customs agency here.",
    ]
      .filter(Boolean)
      .join("\n"),
  abusive:
    "We cannot process abusive messages. Type your complaint calmly when you are ready, or tap Menu.",
  confirmBody: ({ state, mda, dateLabel, description, title, verifyHints }) => {
    const lines = [
      "Please confirm I understood correctly:",
      "",
      title ? `• Title: ${title}` : null,
      `• State: ${state}`,
      `• Agency: ${mda}`,
      `• Date: ${dateLabel}`,
      `• Issue: ${description}`,
    ].filter(Boolean) as string[];
    if (verifyHints.length) {
      lines.push("");
      lines.push(`Please double-check: ${verifyHints.join(", ")}`);
    }
    lines.push("");
    lines.push("Tap Confirm to continue, Edit to correct, or Start over.");
    return lines.join("\n");
  },
  confirmButton: "Confirm",
  editButton: "Edit",
  startOverButton: "Start over",
  askState: "Which Nigerian state did this happen in?",
  askMda: "Which agency should handle this? (Ports & Customs only)",
  askDate:
    "When did this happen? Type a past date as DD/MM/YYYY (for example 15/10/2026).",
  askDescription: "Please describe what happened in a bit more detail.",
  editPrompt:
    "Tell me what to correct (state, agency, date, or description), or tap Start over.",
  fallbackClassic:
    "I could not fully understand that. Let's go step by step — tap a region to begin.",
  submitWithoutEvidence: "Submit now",
  attachEvidence: "Attach evidence",
  evidenceAfterConfirm:
    "Almost done.\n\nIf you have evidence, send a photo, PDF, video, or audio now.\nIf not, tap Submit now.",
  evidenceAlreadyAttached:
    "We already saved the file you sent.\n\nYou can send another file now, or tap Submit now to file your complaint.",
};

const COPY: Record<WhatsAppLang, AiCopy> = {
  en: EN,
  ha: {
    ...EN,
    reading: "Ina karanta saƙonka…",
    softWelcome: [
      "Barka da zuwa PEBEC ReportGov.",
      "",
      "Rubuta kararka a kowane harshe (Turanci, Hausa, Igbo, ko Yoruba).",
      "Faɗi abin da ya faru — za mu tambaya kawai idan wani abu ya rage.",
      "",
      "Wannan layi na al'amuran Ports & Customs ne kawai.",
    ].join("\n"),
    changeLanguage: "Harshe",
    checkComplaint: "Duba matsayi",
    guidedSteps: "Mataki-mataki",
    needTextForMedia:
      "Mun karɓi fayil ɗinka. Da fatan za ka rubuta ɗan bayani game da abin da ya faru.",
    exitButton: "Fita",
    menuButton: "Menu",
    confirmButton: "Tabbatar",
    editButton: "Gyara",
    startOverButton: "Fara sabo",
    askState: "A wace jihar Najeriya wannan ya faru?",
    askMda: "Wace hukuma za ta kula da wannan? (Ports & Customs kawai)",
    askDate:
      "Yaushe wannan ya faru? Rubuta kwanan wata a matsayin DD/MM/YYYY (misali 15/10/2026).",
    askDescription: "Da fatan za ka ƙara bayyana abin da ya faru.",
    editPrompt:
      "Faɗi abin da za a gyara (jiha, hukuma, kwanan wata, ko bayani), ko danna Fara sabo.",
    fallbackClassic:
      "Ban gane sosai ba. Mu yi mataki-mataki — zaɓi yanki don farawa.",
    submitWithoutEvidence: "Aika yanzu",
    attachEvidence: "Haɗa shaida",
    evidenceAfterConfirm:
      "Ya kusan ƙare.\n\nIdan kana da shaida, aika hoto, PDF, bidiyo, ko audio yanzu.\nIdan ba ka da, danna Aika yanzu.",
    evidenceAlreadyAttached:
      "Mun riga mun ajiye fayil ɗin da ka aika.\n\nZa ka iya aika wani fayil, ko danna Aika yanzu don gabatar da kara.",
    confirmBody: ({ state, mda, dateLabel, description, title, verifyHints }) => {
      const lines = [
        "Da fatan ka tabbatar na gane daidai:",
        "",
        title ? `• Take: ${title}` : null,
        `• Jiha: ${state}`,
        `• Hukuma: ${mda}`,
        `• Kwanan wata: ${dateLabel}`,
        `• Matsala: ${description}`,
      ].filter(Boolean) as string[];
      if (verifyHints.length) {
        lines.push("");
        lines.push(`Da fatan ka sake duba: ${verifyHints.join(", ")}`);
      }
      lines.push("");
      lines.push("Danna Tabbatar don ci gaba, Gyara don gyarawa, ko Fara sabo.");
      return lines.join("\n");
    },
    outOfScope: (agency) =>
      [
        "Wannan layin WhatsApp na al'amuran Ports & Customs kawai ne",
        "(Customs, Immigration, Ports, Quarantine, NDLEA, NIMASA, da makamantansu).",
        agency ? `Da alama wannan yana magana ne game da: ${agency}.` : null,
        "",
        "Ga sauran hukumomi, yi amfani da gidan yanar gizon ReportGov.",
        "Ko danna Mataki-mataki don zaɓar hukumar Ports & Customs a nan.",
      ]
        .filter(Boolean)
        .join("\n"),
    abusive:
      "Ba za mu iya sarrafa saƙonnin cin zarafi ba. Rubuta kararka cikin natsuwa idan ka shirya, ko danna Menu.",
  },
  ig: {
    ...EN,
    reading: "A na m agụ ozi gị…",
    softWelcome: [
      "Nnọọ na PEBEC ReportGov.",
      "",
      "Dee mkpesa gị n'asụsụ ọ bụla (Bekee, Hausa, Igbo, ma ọ bụ Yoruba).",
      "Kọwaa ihe mere — anyị ga-ajụ naanị ma ọ bụrụ na ihe fọdụrụ.",
    ].join("\n"),
    changeLanguage: "Asụsụ",
    checkComplaint: "Lelee ọnọdụ",
    guidedSteps: "Nzọụkwụ",
    needTextForMedia:
      "Anyị natara faịlụ gị. Biko dee obere ozi kọwaa ihe mere.",
    exitButton: "Puo",
    menuButton: "Menu",
    confirmButton: "Kwenye",
    editButton: "Dezie",
    startOverButton: "Malite ọzọ",
    askState: "Kedu steeti Naijiria ebe nke a mere?",
    askMda: "Kedu ụlọ ọrụ ga-elekọta nke a? (Ports & Customs naanị)",
    askDate: "Kedu mgbe nke a mere? Dee ụbọchị dị ka DD/MM/YYYY (dịka 15/10/2026).",
    askDescription: "Biko kọwaa ihe mere nke ọma.",
    fallbackClassic:
      "Aghọtaghị m nke ọma. Ka anyị jiri nzọụkwụ — họrọ mpaghara ịmalite.",
    submitWithoutEvidence: "Zipu ugbu a",
    attachEvidence: "Tinye ihe akaebe",
    evidenceAfterConfirm:
      "Ọ fọdụrụ ntakịrị.\n\nỌ bụrụ na ị nwere ihe akaebe, zipụ foto, PDF, vidiyo, ma ọ bụ ọdịyo ugbu a.\nỌ bụrụ na ị nweghị, pịa Zipu ugbu a.",
    evidenceAlreadyAttached:
      "Anyị echekwalarị faịlụ ị zipụrụ.\n\nỊ nwere ike zipụ ọzọ, ma ọ bụ pịa Zipu ugbu a.",
  },
  yo: {
    ...EN,
    reading: "Mo n ka ifiranṣẹ rẹ…",
    softWelcome: [
      "Kaabo si PEBEC ReportGov.",
      "",
      "Kọ ẹsun rẹ ni ede eyikeyi (English, Hausa, Igbo, tabi Yoruba).",
      "So ohun to sele — a o beere tipẹ tipẹ bi nnkan ba ku.",
    ].join("\n"),
    changeLanguage: "Ede",
    checkComplaint: "Ṣayẹwo ipo",
    guidedSteps: "Igbese",
    needTextForMedia:
      "A ti gba faili rẹ. Jowo kọ ifiranṣẹ kukuru lati ṣalaye ohun to ṣẹlẹ.",
    exitButton: "Jade",
    menuButton: "Menu",
    confirmButton: "Jẹ́rìí",
    editButton: "Ṣàtúnṣe",
    startOverButton: "Bẹ̀rẹ̀ tuntun",
    askState: "Ipinle Naijiria wo ni eyi ti sele?",
    askMda: "Ile-ise wo ni yoo mu eyi? (Ports & Customs nikan)",
    askDate: "Nigba wo ni eyi ṣẹlẹ? Kọ ọjọ bi DD/MM/YYYY (fun apẹẹrẹ 15/10/2026).",
    askDescription: "Jọ̀wọ́ ṣàlàyé ohun tó ṣẹlẹ̀ síwájú sí i.",
    fallbackClassic:
      "Mi ò lóye dáadáa. Jẹ́ ká lo ìgbésẹ̀ — yan agbègbè láti bẹ̀rẹ̀.",
    submitWithoutEvidence: "Fi ranṣẹ́ nísìnyí",
    attachEvidence: "So ẹ̀rí pọ̀",
    evidenceAfterConfirm:
      "O ti fẹrẹ pari.\n\nTi o ba ni ẹri, fi aworan, PDF, fidio, tabi ohun ranṣẹ nisinyi.\nTi o ko ba ni, tẹ Fi ranṣẹ́ nísìnyí.",
    evidenceAlreadyAttached:
      "A ti fi faili ti o ranṣẹ pamọ.\n\nO le fi omiran ranṣẹ, tabi tẹ Fi ranṣẹ́ nísìnyí.",
  },
};

export function aiCopy(lang: WhatsAppLang | undefined): AiCopy {
  return COPY[lang ?? "en"] ?? EN;
}
