export type WhatsAppLang = "en" | "ha" | "ig" | "yo";

export const LANGUAGE_IDS = {
  en: "lang_en",
  ha: "lang_ha",
  ig: "lang_ig",
  yo: "lang_yo",
} as const;

type Copy = {
  languageListBody: string;
  languageListButton: string;
  languageEnglish: string;
  languageHausa: string;
  languageIgbo: string;
  languageYoruba: string;
  menuBody: string;
  menuSubmit: string;
  menuStatus: string;
  menuFollowUp: string;
  menuHelp: string;
  help: string;
  welcome: string;
  helpLong: string;
  emptyText: string;
  cancelled: string;
  askName: string;
  nameTooShort: string;
  askState: string;
  stateInvalid: string;
  askMda: string;
  mdaNone: string;
  confirmMda: (name: string) => string;
  chooseMda: (choices: string) => string;
  mdaChosenTitle: (name: string) => string;
  titleTooShort: string;
  askDescription: string;
  descriptionTooShort: string;
  missingDraft: string;
  submitted: (ticketNumber: string, mda: string) => string;
  zoneBody: string;
  selectRegion: string;
  stateBody: (zoneTitle: string) => string;
  selectState: string;
  mdaBody: string;
  selectMda: string;
  datePrompt: string;
  dateInvalid: string;
  complaintPrompt: string;
  evidencePrompt: string;
  evidenceReceived: string;
  sendEvidenceFile: string;
  attachEvidence: string;
  submitFiling: string;
  exited: string;
  missingFiling: string;
  submittedCloud: (
    ticketNumber: string,
    title: string,
    state: string,
    mda: string,
    dateLabel: string | null,
  ) => string;
  statusNotFound: string;
  noTickets: string;
  noTicketsCloud: string;
  recentTickets: string;
  sendTicketNumber: string;
  sendTicketNumberCloud: string;
  statusLabel: string;
  titleLabel: string;
  mdaLabel: string;
  resolutionLabel: string;
  unassigned: string;
  exitTitle: string;
  exitDescription: string;
};

const LANGUAGE_PICKER_BODY = [
  "Welcome to PEBEC / ReportGov",
  "",
  "Choose a language:",
  "Zaɓi harshe / Họrọ asụsụ / Yan èdè",
  "",
  "1 - English",
  "2 - Hausa",
  "3 - Igbo",
  "4 - Yoruba",
].join("\n");

const COPY: Record<WhatsAppLang, Copy> = {
  en: {
    languageListBody: LANGUAGE_PICKER_BODY,
    languageListButton: "Language",
    languageEnglish: "English",
    languageHausa: "Hausa",
    languageIgbo: "Igbo",
    languageYoruba: "Yoruba",
    menuBody: "Welcome to PEBEC 👋\n\nHow can we help you?",
    menuSubmit: "Submit Complaint",
    menuStatus: "Check Complaint",
    menuFollowUp: "Follow Up",
    menuHelp: "Help",
    help: "Tap Submit Complaint to file an issue with a Ports & Customs MDA.\nTap Check Complaint to see ticket status.\nTap Follow Up to view the conversation and reply.\nType HELP for this message.\nType EXIT during filing to cancel.",
    welcome: [
      "Welcome to ReportGov.",
      "",
      "Reply:",
      "1 - File a complaint",
      "2 - Check complaint",
      "HELP - commands",
      "",
      "Use CANCEL anytime to stop a draft.",
    ].join("\n"),
    helpLong: [
      "ReportGov commands:",
      "NEW or 1 — start a complaint",
      "STATUS or 2 — list your tickets",
      "STATUS REP-DDMMYY-000 — one ticket",
      "CANCEL — stop the current draft",
      "MENU — show this welcome again",
    ].join("\n"),
    emptyText: "Please send a text message. File a complaint with NEW, or send STATUS.",
    cancelled: "Draft cancelled.",
    askName: "What is your full name?",
    nameTooShort: "Please send your full name.",
    askState: "Which state did this happen in? (e.g. Lagos, FCT, Kano)",
    stateInvalid:
      "I didn't match that to a Nigerian state. Try again, e.g. Lagos, Rivers, or FCT.",
    askMda:
      "Which MDA should handle this? Type part of the name, e.g. Customs, FIRS, or NIMC.",
    mdaNone: "No MDA matched that. Try a shorter name, e.g. Customs or Immigration.",
    confirmMda: (name) =>
      `Did you mean *${name}*?\nReply YES or 1 to confirm, or type another name.`,
    chooseMda: (choices) =>
      `Which one?\n${choices}\nReply with the number, or type another name.`,
    mdaChosenTitle: (name) => `MDA: ${name}\n\nSend a short title for the complaint.`,
    titleTooShort: "Please send a slightly longer title.",
    askDescription: "Describe what happened.",
    descriptionTooShort: "Please add a bit more detail (at least a sentence).",
    missingDraft: "Something was missing from the draft. Send NEW to start again.",
    submitted: (ticketNumber, mda) =>
      [
        "Complaint submitted.",
        `Ticket: ${ticketNumber}`,
        `MDA: ${mda}`,
        "",
        "MDAs will see this on the ReportGov portal.",
        "Send STATUS to check it, or NEW for another complaint.",
      ].join("\n"),
    zoneBody:
      "Step 1 of 5 — Where did this happen?\n\nTap Select region. Choose Exit to cancel.",
    selectRegion: "Select region",
    stateBody: (zoneTitle) =>
      `Step 2 of 5 — Which state in ${zoneTitle}?\nChoose Exit to cancel.`,
    selectState: "Select state",
    mdaBody:
      "Step 3 of 5 — Which Ports & Customs MDA should handle this?\n\nTap Select MDA and choose one agency.\nType EXIT to cancel.",
    selectMda: "Select MDA",
    datePrompt:
      "Step 4 of 5 — When did this happen?\n\nType the date as DD/MM/YYYY.\nType EXIT to cancel.",
    dateInvalid: "I could not read that date. Use a past date as DD/MM/YYYY.",
    complaintPrompt:
      "Step 5 of 5 — Describe what happened.\n\nType the details in your own words.\nType EXIT to cancel.",
    evidencePrompt:
      "If you have evidence, tap Attach and send a PDF, image, video, or audio.\n\nIf you do not have a file, tap Submit to file this complaint.\nType EXIT to cancel.",
    evidenceReceived:
      "Your evidence has been received.\n\nSend another file, or tap Submit to file this complaint.",
    sendEvidenceFile:
      "Send your evidence now as a PDF, image, video, or audio.\n\nThen tap Submit, or send another file.\nType EXIT to cancel.",
    attachEvidence: "Attach Evidence",
    submitFiling: "Submit",
    exited: "Complaint cancelled. Nothing was submitted.",
    missingFiling:
      "Something was missing from this filing. Send Hi and start again.",
    submittedCloud: (ticketNumber, title, state, mda, dateLabel) => {
      const lines = [
        "Complaint submitted to ReportGov.",
        `Ticket: ${ticketNumber}`,
        `Title: ${title}`,
        `State: ${state}`,
        `MDA: ${mda}`,
      ];
      if (dateLabel) lines.push(`Date: ${dateLabel}`);
      lines.push("");
      lines.push("Keep this ticket number to track your complaint.");
      lines.push("Tap Check Complaint or send the ticket number anytime.");
      return lines.join("\n");
    },
    statusNotFound:
      "No ticket with that number was found for this WhatsApp number.",
    noTickets: "No tickets on this number yet. Send NEW to file one.",
    noTicketsCloud:
      "No tickets on this WhatsApp number yet. Tap Submit Complaint to file one.",
    recentTickets: "Your recent tickets:",
    sendTicketNumber: "Send STATUS REP-… for one ticket.",
    sendTicketNumberCloud: "Send a ticket number (REP-…) for one ticket.",
    statusLabel: "Status",
    titleLabel: "Title",
    mdaLabel: "MDA",
    resolutionLabel: "Resolution",
    unassigned: "Unassigned",
    exitTitle: "Exit",
    exitDescription: "Cancel this complaint",
  },
  ha: {
    languageListBody: LANGUAGE_PICKER_BODY,
    languageListButton: "Harshe",
    languageEnglish: "English",
    languageHausa: "Hausa",
    languageIgbo: "Igbo",
    languageYoruba: "Yoruba",
    menuBody: "Barka da zuwa PEBEC 👋\n\nYaya za mu taimake ka?",
    menuSubmit: "Gabatar da kara",
    menuStatus: "Duba kara",
    menuFollowUp: "Bi diddigi",
    menuHelp: "Taimako",
    help: "Danna Gabatar da kara don kai matsala ga hukumar tashoshin ruwa da kwastam.\nDanna Duba kara don ganin matsayin tikiti.\nDanna Bi diddigi don duba tattaunawa da amsawa.\nRubuta HELP don wannan saƙo.\nRubuta EXIT yayin kai kara don soke.",
    welcome: [
      "Barka da zuwa ReportGov.",
      "",
      "Amsa:",
      "1 - Kai kara",
      "2 - Duba kara",
      "HELP - umarni",
      "",
      "Yi amfani da CANCEL a kowane lokaci don tsayarda.",
    ].join("\n"),
    helpLong: [
      "Umarnin ReportGov:",
      "NEW ko 1 — fara kara",
      "STATUS ko 2 — jerin tikitocinka",
      "STATUS REP-DDMMYY-000 — tikiti guda",
      "CANCEL — tsayarda wannan kara",
      "MENU — nuna marhaba kuma",
    ].join("\n"),
    emptyText:
      "Da fatan za ka aika saƙon rubutu. Kai kara da NEW, ko aika STATUS.",
    cancelled: "An soke daftarin.",
    askName: "Mene ne cikakken sunanka?",
    nameTooShort: "Da fatan za ka aika cikakken sunanka.",
    askState: "A wace jiha wannan ya faru? (misali Lagos, FCT, Kano)",
    stateInvalid:
      "Ban gane wannan a matsayin jihar Najeriya ba. Sake gwadawa, misali Lagos, Rivers, ko FCT.",
    askMda:
      "Wace hukuma za ta kula da wannan? Rubuta wani bangare na suna, misali Customs, FIRS, ko NIMC.",
    mdaNone:
      "Babu hukuma da ta dace. Gwada suna gajere, misali Customs ko Immigration.",
    confirmMda: (name) =>
      `Kana nufin *${name}*?\nAmsa YES ko 1 don tabbatarwa, ko rubuta wani suna.`,
    chooseMda: (choices) =>
      `Wace ce?\n${choices}\nAmsa da lamba, ko rubuta wani suna.`,
    mdaChosenTitle: (name) => `Hukuma: ${name}\n\nAika gajeren take na kara.`,
    titleTooShort: "Da fatan za ka aika take mai tsawo kadan.",
    askDescription: "Bayyana abin da ya faru.",
    descriptionTooShort: "Da fatan za ka kara bayani (a kalla jumla daya).",
    missingDraft: "Wani abu ya rage daga daftarin. Aika NEW ka fara sake.",
    submitted: (ticketNumber, mda) =>
      [
        "An aika kara.",
        `Tikiti: ${ticketNumber}`,
        `Hukuma: ${mda}`,
        "",
        "Hukumomi za su ga wannan a shafin ReportGov.",
        "Aika STATUS don duba, ko NEW don wani kara.",
      ].join("\n"),
    zoneBody:
      "Mataki 1 cikin 5 — A ina wannan ya faru?\n\nDanna Zaɓi yanki. Zaɓi Fita don soke.",
    selectRegion: "Zabi yanki",
    stateBody: (zoneTitle) =>
      `Mataki 2 cikin 5 — Wace jiha ce a ${zoneTitle}?\nZaɓi Fita don soke.`,
    selectState: "Zabi jiha",
    mdaBody:
      "Mataki 3 cikin 5 — Wace hukuma ta tashoshin ruwa da kwastam za ta kula da wannan?\n\nDanna Zaɓi hukuma ka zaɓi daya.\nRubuta EXIT don soke.",
    selectMda: "Zabi hukuma",
    datePrompt:
      "Mataki 4 cikin 5 — Yaushe wannan ya faru?\n\nRubuta kwanan wata a tsarin DD/MM/YYYY.\nRubuta EXIT don soke.",
    dateInvalid:
      "Ban iya karanta wannan kwanan wata ba. Yi amfani da kwanan wata da ta wuce a tsarin DD/MM/YYYY.",
    complaintPrompt:
      "Mataki 5 cikin 5 — Bayyana abin da ya faru.\n\nRubuta cikakken bayani da kalmomin ka.\nRubuta EXIT don soke.",
    evidencePrompt:
      "Idan kana da shaida, danna Sanya shaida ka aika PDF, hoto, bidiyo, ko sauti.\n\nIdan ba ka da fayil, danna Aika don kai wannan kara.\nRubuta EXIT don soke.",
    evidenceReceived:
      "An karɓi shaidarka.\n\nAika wani fayil, ko danna Aika don kai wannan kara.",
    sendEvidenceFile:
      "Aika shaidarka yanzu a matsayin PDF, hoto, bidiyo, ko sauti.\n\nSannan danna Aika, ko aika wani fayil.\nRubuta EXIT don soke.",
    attachEvidence: "Sanya shaida",
    submitFiling: "Aika",
    exited: "An soke kara. Ba a aika komai ba.",
    missingFiling: "Wani abu ya rage daga wannan kara. Aika Hi ka fara sake.",
    submittedCloud: (ticketNumber, title, state, mda, dateLabel) => {
      const lines = [
        "An aika kara zuwa ReportGov.",
        `Tikiti: ${ticketNumber}`,
        `Take: ${title}`,
        `Jiha: ${state}`,
        `Hukuma: ${mda}`,
      ];
      if (dateLabel) lines.push(`Kwanan wata: ${dateLabel}`);
      lines.push("");
      lines.push("Ajiye lambar tikiti don bin diddigin kara.");
      lines.push("Danna Duba kara ko aika lambar tikiti a kowane lokaci.");
      return lines.join("\n");
    },
    statusNotFound: "Babu tikiti da wannan lamba a wannan lambar WhatsApp.",
    noTickets: "Babu tikiti a wannan lamba tukuna. Aika NEW don kai daya.",
    noTicketsCloud:
      "Babu tikiti a wannan lambar WhatsApp tukuna. Danna Gabatar da kara don kai daya.",
    recentTickets: "Tikitocin ka na kwanan nan:",
    sendTicketNumber: "Aika STATUS REP-… don tikiti guda.",
    sendTicketNumberCloud: "Aika lambar tikiti (REP-…) don tikiti guda.",
    statusLabel: "Matsayi",
    titleLabel: "Take",
    mdaLabel: "Hukuma",
    resolutionLabel: "Warwarewa",
    unassigned: "Ba a sanya ba",
    exitTitle: "Fita",
    exitDescription: "Soke wannan kara",
  },
  ig: {
    languageListBody: LANGUAGE_PICKER_BODY,
    languageListButton: "Asusu",
    languageEnglish: "English",
    languageHausa: "Hausa",
    languageIgbo: "Igbo",
    languageYoruba: "Yoruba",
    menuBody: "Nnoo na PEBEC 👋\n\nKedu ka anyi ga-esi nyere gi aka?",
    menuSubmit: "Tinye mkpesa",
    menuStatus: "Lelee mkpesa",
    menuFollowUp: "Soro mkpesa",
    menuHelp: "Enyemaka",
    help: "Pia Tinye mkpesa iji koo nsogbu nye ulo oru Ports & Customs.\nPia Lelee mkpesa iji hu onodu tiketi.\nPia Soro mkpesa iji lee mkparita ma zaa.\nDee HELP maka ozi a.\nDee EXIT mgbe i na-etinye mkpesa iji kagbuo.",
    welcome: [
      "Nnoo na ReportGov.",
      "",
      "Zaa:",
      "1 - Tinye mkpesa",
      "2 - Lelee mkpesa",
      "HELP - iwu",
      "",
      "Jiri CANCEL mgbe obula iji kwusi.",
    ].join("\n"),
    helpLong: [
      "Iwu ReportGov:",
      "NEW ma obu 1 — malite mkpesa",
      "STATUS ma obu 2 — depụta tiketi gi",
      "STATUS REP-DDMMYY-000 — otu tiketi",
      "CANCEL — kwusi ntinye a",
      "MENU — gosi nnoo ozo",
    ].join("\n"),
    emptyText:
      "Biko zipu ozi ederede. Tinye mkpesa site na NEW, ma obu zipu STATUS.",
    cancelled: "A kagburu ntinye.",
    askName: "Kedu aha gi zuru ezu?",
    nameTooShort: "Biko zipu aha gi zuru ezu.",
    askState: "Kedu steeti ebe nke a mere? (di ka Lagos, FCT, Kano)",
    stateInvalid:
      "Ahughi m steeti Naijiria nke ahu. Nwaa ozo, di ka Lagos, Rivers, ma obu FCT.",
    askMda:
      "Kedu MDA ga-elekota nke a? Dee akuku aha, di ka Customs, FIRS, ma obu NIMC.",
    mdaNone: "Onweghi MDA dabara. Nwaa aha di mkpukpu, di ka Customs ma obu Immigration.",
    confirmMda: (name) =>
      `I chere *${name}*?\nZaa YES ma obu 1 iji kwado, ma obu dee aha ozo.`,
    chooseMda: (choices) =>
      `Kedu nke?\n${choices}\nZaa nọmba, ma obu dee aha ozo.`,
    mdaChosenTitle: (name) => `MDA: ${name}\n\nZipu isiokwu mkpesa di nkenke.`,
    titleTooShort: "Biko zipu isiokwu di ogologo ntakiri.",
    askDescription: "Kowaa ihe mere.",
    descriptionTooShort: "Biko tinye nkowa ozo (o pecara otu ahiriokwu).",
    missingDraft: "Ihe foduru na ntinye a. Zipu NEW malite ozo.",
    submitted: (ticketNumber, mda) =>
      [
        "E tinyere mkpesa.",
        `Tiketi: ${ticketNumber}`,
        `MDA: ${mda}`,
        "",
        "NDA ga-ahu nke a na ReportGov.",
        "Zipu STATUS iji lelee, ma obu NEW maka mkpesa ozo.",
      ].join("\n"),
    zoneBody:
      "Nzoukwa 1 n'ime 5 — Ebee ka nke a mere?\n\nPia Horo mpaghara. Horo Puo iji kagbuo.",
    selectRegion: "Horo mpaghara",
    stateBody: (zoneTitle) =>
      `Nzoukwa 2 n'ime 5 — Kedu steeti n'ime ${zoneTitle}?\nHoro Puo iji kagbuo.`,
    selectState: "Horo steeti",
    mdaBody:
      "Nzoukwa 3 n'ime 5 — Kedu ulo oru Ports & Customs ga-elekota nke a?\n\nPia Horo MDA horo otu.\nDee EXIT iji kagbuo.",
    selectMda: "Horo MDA",
    datePrompt:
      "Nzoukwa 4 n'ime 5 — Kedu mgbe nke a mere?\n\nDee ubochi dika DD/MM/YYYY.\nDee EXIT iji kagbuo.",
    dateInvalid:
      "Enweghi m ike igu ubochi ahu. Jiri ubochi gara aga dika DD/MM/YYYY.",
    complaintPrompt:
      "Nzoukwa 5 n'ime 5 — Kowaa ihe mere.\n\nDee nkowa n'okwu nke gi.\nDee EXIT iji kagbuo.",
    evidencePrompt:
      "O buru na i nwere ihe akaebe, pia Tinye fael zipu PDF, oyiyo, vidio, ma obu ụda.\n\nO buru na i nweghi fael, pia Zipu iji tinye mkpesa a.\nDee EXIT iji kagbuo.",
    evidenceReceived:
      "Anatara ihe akaebe gi.\n\nZipu fael ozo, ma obu pia Zipu iji tinye mkpesa a.",
    sendEvidenceFile:
      "Zipu ihe akaebe gi ugbu a dika PDF, oyiyo, vidio, ma obu ụda.\n\nMgbe ahu pia Zipu, ma obu zipu fael ozo.\nDee EXIT iji kagbuo.",
    attachEvidence: "Tinye fael",
    submitFiling: "Zipu",
    exited: "A kagburu mkpesa. E tinyeghi ihe obula.",
    missingFiling: "Ihe foduru na ntinye a. Zipu Hi malite ozo.",
    submittedCloud: (ticketNumber, title, state, mda, dateLabel) => {
      const lines = [
        "E tinyere mkpesa na ReportGov.",
        `Tiketi: ${ticketNumber}`,
        `Isiokwu: ${title}`,
        `Steeti: ${state}`,
        `MDA: ${mda}`,
      ];
      if (dateLabel) lines.push(`Ubochi: ${dateLabel}`);
      lines.push("");
      lines.push("Chekwaa nọmba tiketi a iji soro mkpesa gi.");
      lines.push("Pia Lelee mkpesa ma obu zipu nọmba tiketi mgbe obula.");
      return lines.join("\n");
    },
    statusNotFound: "Onweghi tiketi nwere nọmba ahu maka nọmba WhatsApp a.",
    noTickets: "Onweghi tiketi na nọmba a. Zipu NEW iji tinye otu.",
    noTicketsCloud:
      "Onweghi tiketi na nọmba WhatsApp a. Pia Tinye mkpesa iji tinye otu.",
    recentTickets: "Tiketi gi nso nso a:",
    sendTicketNumber: "Zipu STATUS REP-… maka otu tiketi.",
    sendTicketNumberCloud: "Zipu nọmba tiketi (REP-…) maka otu tiketi.",
    statusLabel: "Onodu",
    titleLabel: "Isiokwu",
    mdaLabel: "MDA",
    resolutionLabel: "Mkpebi",
    unassigned: "E kenyeghi",
    exitTitle: "Puo",
    exitDescription: "Kagbuo mkpesa a",
  },
  yo: {
    languageListBody: LANGUAGE_PICKER_BODY,
    languageListButton: "Ede",
    languageEnglish: "English",
    languageHausa: "Hausa",
    languageIgbo: "Igbo",
    languageYoruba: "Yoruba",
    menuBody: "E kaabo si PEBEC 👋\n\nBawo ni a se le ran yin lowo?",
    menuSubmit: "Fi esun sile",
    menuStatus: "Wo esun",
    menuFollowUp: "Tele esun",
    menuHelp: "Iranlowo",
    help: "Te Fi esun sile lati fi isoro ranse si ile-ise Ports & Customs.\nTe Wo esun lati ri ipo tiketi.\nTe Tele esun lati wo iwiregbe ki o dahun.\nKo HELP fun ifiranse yii.\nKo EXIT nigba ifile lati fagilee.",
    welcome: [
      "E kaabo si ReportGov.",
      "",
      "Dahun:",
      "1 - Fi esun sile",
      "2 - Wo esun",
      "HELP - awon ase",
      "",
      "Lo CANCEL nigbakugba lati da duro.",
    ].join("\n"),
    helpLong: [
      "Awon ase ReportGov:",
      "NEW tabi 1 — bere esun",
      "STATUS tabi 2 — akojopo tiketi re",
      "STATUS REP-DDMMYY-000 — tiketi kan",
      "CANCEL — da ifile yii duro",
      "MENU — fi kaabo han leekan si",
    ].join("\n"),
    emptyText:
      "Jowo fi ifiranse oro ranse. Fi esun sile pelu NEW, tabi fi STATUS ranse.",
    cancelled: "A ti fagilee iwe-akoso naa.",
    askName: "Kini oruko re kikun?",
    nameTooShort: "Jowo fi oruko re kikun ranse.",
    askState: "Ipinle wo ni eyi ti sele? (bii Lagos, FCT, Kano)",
    stateInvalid:
      "Mi o ri ipinle Naijiria yen. Gbiyanju leekan si, bii Lagos, Rivers, tabi FCT.",
    askMda:
      "MDA wo ni yoo mu eyi? Ko apa oruko, bii Customs, FIRS, tabi NIMC.",
    mdaNone: "Ko si MDA to baamu. Gbiyanju oruko kukuru, bii Customs tabi Immigration.",
    confirmMda: (name) =>
      `Se *${name}* lo nso?\nDahun YES tabi 1 lati jeewo, tabi ko oruko miiran.`,
    chooseMda: (choices) =>
      `Ewo ninu won?\n${choices}\nDahun pelu nọmba, tabi ko oruko miiran.`,
    mdaChosenTitle: (name) => `MDA: ${name}\n\nFi akori kukuru fun esun naa ranse.`,
    titleTooShort: "Jowo fi akori ti o gun die ranse.",
    askDescription: "So ohun to sele.",
    descriptionTooShort: "Jowo fi alaye die kun (o kere ju gbolohun kan).",
    missingDraft: "Nnkan o pe ninu iwe-akoso yii. Fi NEW ranse ki o tun bere.",
    submitted: (ticketNumber, mda) =>
      [
        "A ti fi esun silẹ.",
        `Tiketi: ${ticketNumber}`,
        `MDA: ${mda}`,
        "",
        "Awọn MDA yoo ri eyi lori ReportGov.",
        "Fi STATUS ranse lati wo, tabi NEW fun esun miiran.",
      ].join("\n"),
    zoneBody:
      "Igbese 1 ninu 5 — Nibo ni eyi ti sele?\n\nTe Yan agbegbe. Yan Jade lati fagilee.",
    selectRegion: "Yan agbegbe",
    stateBody: (zoneTitle) =>
      `Igbese 2 ninu 5 — Ipinle wo ni inu ${zoneTitle}?\nYan Jade lati fagilee.`,
    selectState: "Yan ipinle",
    mdaBody:
      "Igbese 3 ninu 5 — Ise-ijoba Ports ati Customs wo ni yoo mu eyi?\n\nTe Yan MDA ki o yan okan.\nKo EXIT lati fagilee.",
    selectMda: "Yan MDA",
    datePrompt:
      "Igbese 4 ninu 5 — Nigba wo ni eyi ti sele?\n\nKo ojo gege bi DD/MM/YYYY.\nKo EXIT lati fagilee.",
    dateInvalid: "Mi o le ka ojo yen. Lo ojo to ti koja gege bi DD/MM/YYYY.",
    complaintPrompt:
      "Igbese 5 ninu 5 — So ohun to sele.\n\nKo alaye ni oro tire.\nKo EXIT lati fagilee.",
    evidencePrompt:
      "Ti o ba ni eri, te Fi eri kun ki o fi PDF, aworan, fidio, tabi ohun ranse.\n\nTi o ko ba ni faili, te Firanse lati fi esun yii sile.\nKo EXIT lati fagilee.",
    evidenceReceived:
      "A ti gba eri re.\n\nFi faili miiran ranse, tabi te Firanse lati fi esun yii sile.",
    sendEvidenceFile:
      "Fi eri re ranse nisinsinyii gege bi PDF, aworan, fidio, tabi ohun.\n\nLehin naa te Firanse, tabi fi faili miiran ranse.\nKo EXIT lati fagilee.",
    attachEvidence: "Fi eri kun",
    submitFiling: "Firanse",
    exited: "A ti fagilee esun. A ko fi nkankan sile.",
    missingFiling: "Nnkan o pe ninu ifile yii. Fi Hi ranse ki o tun bere.",
    submittedCloud: (ticketNumber, title, state, mda, dateLabel) => {
      const lines = [
        "A ti fi esun ranse si ReportGov.",
        `Tiketi: ${ticketNumber}`,
        `Akori: ${title}`,
        `Ipinle: ${state}`,
        `MDA: ${mda}`,
      ];
      if (dateLabel) lines.push(`Ojo: ${dateLabel}`);
      lines.push("");
      lines.push("Pa nọmba tiketi yi mo lati tele esun re.");
      lines.push("Te Wo esun tabi fi nọmba tiketi ranse nigbakugba.");
      return lines.join("\n");
    },
    statusNotFound: "Ko si tiketi pelu nọmba yen fun nọmba WhatsApp yii.",
    noTickets: "Ko si tiketi lori nọmba yii sibẹ. Fi NEW ranse lati fi okan sile.",
    noTicketsCloud:
      "Ko si tiketi lori nọmba WhatsApp yii sibẹ. Te Fi esun sile lati fi okan sile.",
    recentTickets: "Awon tiketi re to sese:",
    sendTicketNumber: "Fi STATUS REP-… ranse fun tiketi kan.",
    sendTicketNumberCloud: "Fi nọmba tiketi (REP-…) ranse fun tiketi kan.",
    statusLabel: "Ipo",
    titleLabel: "Akori",
    mdaLabel: "MDA",
    resolutionLabel: "Ipinnu",
    unassigned: "A ko yan",
    exitTitle: "Jade",
    exitDescription: "Fagilee esun yi",
  },
};

export function copyFor(lang: WhatsAppLang | undefined): Copy {
  return COPY[lang ?? "en"];
}

export function parseLanguageChoice(input: string): WhatsAppLang | null {
  const normalized = input.trim().toLowerCase();
  if (
    normalized === "1" ||
    normalized === "en" ||
    normalized === "english" ||
    normalized === LANGUAGE_IDS.en
  ) {
    return "en";
  }
  if (
    normalized === "2" ||
    normalized === "ha" ||
    normalized === "hausa" ||
    normalized === LANGUAGE_IDS.ha
  ) {
    return "ha";
  }
  if (
    normalized === "3" ||
    normalized === "ig" ||
    normalized === "igbo" ||
    normalized === LANGUAGE_IDS.ig
  ) {
    return "ig";
  }
  if (
    normalized === "4" ||
    normalized === "yo" ||
    normalized === "yoruba" ||
    normalized === "yorùbá" ||
    normalized === LANGUAGE_IDS.yo
  ) {
    return "yo";
  }
  return null;
}

export function isGreeting(normalized: string): boolean {
  return (
    normalized === "hi" ||
    normalized === "hello" ||
    normalized === "hey" ||
    normalized === "start" ||
    normalized === "menu" ||
    normalized === "sannu" ||
    normalized === "salama" ||
    normalized === "ndewo" ||
    normalized === "kedu" ||
    normalized === "nnoo" ||
    normalized === "nnọọ" ||
    normalized === "bawo" ||
    normalized === "pelu" ||
    normalized.startsWith("hello") ||
    normalized.startsWith("hi ") ||
    normalized.startsWith("hey ") ||
    normalized.startsWith("good morning") ||
    normalized.startsWith("good afternoon") ||
    normalized.startsWith("good evening") ||
    normalized.startsWith("e kaaro") ||
    normalized.startsWith("ẹ káàrọ") ||
    normalized.startsWith("e kaasan") ||
    normalized.startsWith("e ku irole")
  );
}

export function isCancelCommand(normalized: string): boolean {
  return (
    normalized === "cancel" ||
    normalized === "exit" ||
    normalized === "stop" ||
    normalized === "soke" ||
    normalized === "fita" ||
    normalized === "kagbuo" ||
    normalized === "puo" ||
    normalized === "pụọ" ||
    normalized === "fagilee" ||
    normalized === "jade"
  );
}

type FollowUpCopy = {
  none: string;
  listBody: string;
  listButton: string;
  viewConversation: string;
  addInformation: string;
  whatNext: string;
  lastUpdate: string;
  yourComplaint: string;
  officer: string;
  noOfficer: string;
  wouldYouRespond: string;
  conversationTitle: string;
  you: string;
  menuButton: string;
  reply: string;
  attach: string;
  typeResponse: string;
  typeMore: string;
  sendFile: string;
  responseSent: string;
  fileReceived: string;
  fileFailed: string;
  backToMenu: string;
  attachFirst: string;
  statusOpen: string;
  statusInProgress: string;
  statusResolved: string;
  statusClosed: string;
  noUpdates: string;
  officerUpdate: (ticketNumber: string, comment: string) => string;
};

const FOLLOW_UP: Record<WhatsAppLang, FollowUpCopy> = {
  en: {
    none: "No complaints on this WhatsApp number yet. Tap Submit Complaint to file one.",
    listBody: "Your complaints\n\nPlease select a complaint:",
    listButton: "Complaints",
    viewConversation: "View Conversation",
    addInformation: "Add Information",
    whatNext: "What would you like to do?",
    lastUpdate: "Last update:",
    yourComplaint: "Your complaint:",
    officer: "Officer:",
    noOfficer: "No officer message yet. You can add information below.",
    wouldYouRespond: "Would you like to respond?",
    conversationTitle: "Conversation:",
    you: "You:",
    menuButton: "Menu",
    reply: "Reply",
    attach: "Attach Document",
    typeResponse:
      "Please type your response.\n\nYou can also attach a PDF, image, video, or audio with this reply. We will save everything on this conversation.",
    typeMore:
      "Please type the extra information.\n\nYou can also attach a PDF, image, video, or audio with this message.",
    sendFile: "Send a PDF, image, video, or audio for this complaint.",
    responseSent:
      "Your response has been sent to the officer ✅\n\nYou can still send a document for this reply.\nTap Exit when you are done with this ticket.",
    fileReceived:
      "Your evidence has been received ✅\n\nYou can send another file, type more, or tap Exit when you are done with this ticket.",
    fileFailed: "Could not save that file. Please try again.",
    backToMenu: "OK. You have left this ticket.",
    attachFirst: "To attach a file, tap Follow Up and select a complaint first.",
    statusOpen: "Under Review",
    statusInProgress: "In Progress",
    statusResolved: "Resolved",
    statusClosed: "Closed",
    noUpdates: "No updates yet.",
    officerUpdate: (ticketNumber, comment) =>
      [
        `Update on ${ticketNumber}`,
        "",
        "An officer has responded to your complaint.",
        "",
        comment,
      ].join("\n"),
  },
  ha: {
    none: "Babu kara a wannan lambar WhatsApp tukuna. Danna Gabatar da kara don kai daya.",
    listBody: "Karakun ka\n\nDa fatan za ka zaɓi kara:",
    listButton: "Kara",
    viewConversation: "Duba tattaunawa",
    addInformation: "Kara bayani",
    whatNext: "Me kake so ka yi?",
    lastUpdate: "Sabuntawa ta ƙarshe:",
    yourComplaint: "Karan ka:",
    officer: "Jami'i:",
    noOfficer: "Babu saƙon jami'i tukuna. Za ka iya ƙara bayani a ƙasa.",
    wouldYouRespond: "Kana son amsawa?",
    conversationTitle: "Tattaunawa:",
    you: "Kai:",
    menuButton: "Menu",
    reply: "Amsa",
    attach: "Sanya fayil",
    typeResponse:
      "Da fatan za ka rubuta amsarka.\n\nHaka kuma za ka iya sanya PDF, hoto, bidiyo, ko sauti tare da wannan amsa. Za mu ajiye duka a tattaunawar.",
    typeMore:
      "Da fatan za ka rubuta ƙarin bayani.\n\nHaka kuma za ka iya sanya PDF, hoto, bidiyo, ko sauti tare da wannan saƙo.",
    sendFile: "Aika PDF, hoto, bidiyo, ko sauti na wannan kara.",
    responseSent:
      "An aika amsarka zuwa jami'in ✅\n\nHar yanzu za ka iya aika fayil.\nDanna Fita idan ka gama da wannan kara.",
    fileReceived:
      "An karɓi shaidarka ✅\n\nZa ka iya aika wani fayil, rubuta ƙarin, ko danna Fita idan ka gama.",
    fileFailed: "An kasa ajiye wannan fayil. Sake gwadawa.",
    backToMenu: "To. Ka fita daga wannan kara.",
    attachFirst: "Don sanya fayil, danna Bi diddigi ka zaɓi kara da farko.",
    statusOpen: "Ana duba",
    statusInProgress: "Ana aiki",
    statusResolved: "An warware",
    statusClosed: "An rufe",
    noUpdates: "Babu sabuntawa tukuna.",
    officerUpdate: (ticketNumber, comment) =>
      [
        `Sabuntawa akan ${ticketNumber}`,
        "",
        "Jami'i ya amsa karan ka.",
        "",
        comment,
      ].join("\n"),
  },
  ig: {
    none: "Onweghi mkpesa na nọmba WhatsApp a. Pia Tinye mkpesa iji tinye otu.",
    listBody: "Mkpesa gi\n\nBiko horo mkpesa:",
    listButton: "Mkpesa",
    viewConversation: "Lee mkparita",
    addInformation: "Tinye ozi",
    whatNext: "Gini ka i choro ime?",
    lastUpdate: "Mmelite ikpeazu:",
    yourComplaint: "Mkpesa gi:",
    officer: "Onye oru:",
    noOfficer: "Onweghi ozi onye oru. I nwere ike tinye ozi n'okpuru.",
    wouldYouRespond: "I choro izaa?",
    conversationTitle: "Mkparita:",
    you: "Gi:",
    menuButton: "Menu",
    reply: "Zaa",
    attach: "Tinye fael",
    typeResponse:
      "Biko dee aziza gi.\n\nI nwekwara ike itinye PDF, oyiyo, vidio, ma obu ụda tinyere aziza a. Anyi ga-echekwa ihe nile na mkparita a.",
    typeMore:
      "Biko dee ozi ozo.\n\nI nwekwara ike itinye PDF, oyiyo, vidio, ma obu ụda tinyere ozi a.",
    sendFile: "Zipu PDF, oyiyo, vidio, ma obu ụda maka mkpesa a.",
    responseSent:
      "E zigara onye oru aziza gi ✅\n\nI ka nwere ike izipu fael.\nPia Puo mgbe i mechara mkpesa a.",
    fileReceived:
      "Anatara ihe akaebe gi ✅\n\nI nwere ike izipu fael ozo, dee ozi, ma obu pia Puo mgbe i mechara.",
    fileFailed: "Enweghi ike ichekwa fael ahu. Nwaa ozo.",
    backToMenu: "O di mma. I hapuru mkpesa a.",
    attachFirst: "Iji tinye fael, pia Soro mkpesa horo mkpesa na mbu.",
    statusOpen: "A na-enyocha",
    statusInProgress: "A na-arụ ọrụ",
    statusResolved: "E doziela",
    statusClosed: "E mechiri",
    noUpdates: "Onweghi mmelite.",
    officerUpdate: (ticketNumber, comment) =>
      [
        `Mmelite na ${ticketNumber}`,
        "",
        "Onye oru azala mkpesa gi.",
        "",
        comment,
      ].join("\n"),
  },
  yo: {
    none: "Ko si esun lori nọmba WhatsApp yii sibẹ. Te Fi esun sile lati fi okan sile.",
    listBody: "Awon esun re\n\nJowo yan esun kan:",
    listButton: "Esun",
    viewConversation: "Wo iwiregbe",
    addInformation: "Fi alaye kun",
    whatNext: "Kini o fe se?",
    lastUpdate: "Imudojuiwọn to kejẹ:",
    yourComplaint: "Esun re:",
    officer: "Osise:",
    noOfficer: "Ko si ifiranse osise sibẹ. O le fi alaye kun ni isalẹ.",
    wouldYouRespond: "Se o fe dahun?",
    conversationTitle: "Iwiregbe:",
    you: "Iwo:",
    menuButton: "Menu",
    reply: "Dahun",
    attach: "Fi faili kun",
    typeResponse:
      "Jowo ko esi re.\n\nO tun le fi PDF, aworan, fidio, tabi ohun kun esi yii. A o fipamọ gbogbo rẹ sori iwiregbe yii.",
    typeMore:
      "Jowo ko alaye die si i.\n\nO tun le fi PDF, aworan, fidio, tabi ohun kun ifiranse yii.",
    sendFile: "Fi PDF, aworan, fidio, tabi ohun ranse fun esun yii.",
    responseSent:
      "A ti fi esi re ranse si osise ✅\n\nO tun le fi faili ranse.\nTe Jade nigbati o ba pari pẹlu esun yii.",
    fileReceived:
      "A ti gba ẹri re ✅\n\nO le fi faili miiran ranse, ko si i, tabi te Jade nigbati o ba pari.",
    fileFailed: "A ko le fipamọ faili yen. Gbiyanju leekan si.",
    backToMenu: "O dara. O ti kuro ninu esun yii.",
    attachFirst: "Lati fi faili kun, te Tele esun ki o yan esun kọkọ.",
    statusOpen: "A n ṣayẹwo",
    statusInProgress: "A n ṣiṣẹ",
    statusResolved: "A ti yanju",
    statusClosed: "A ti tilekun",
    noUpdates: "Ko si imudojuiwọn sibẹ.",
    officerUpdate: (ticketNumber, comment) =>
      [
        `Imudojuiwọn lori ${ticketNumber}`,
        "",
        "Osise ti dahun si esun re.",
        "",
        comment,
      ].join("\n"),
  },
};

export function followUpCopy(lang: WhatsAppLang | undefined): FollowUpCopy {
  return FOLLOW_UP[lang ?? "en"];
}

export function statusLabel(copy: FollowUpCopy, status: string): string {
  if (status === "in_progress") return copy.statusInProgress;
  if (status === "resolved") return copy.statusResolved;
  if (status === "closed") return copy.statusClosed;
  return copy.statusOpen;
}

export function languageListSpec() {
  const copy = COPY.en;
  return {
    button: copy.languageListButton,
    body: copy.languageListBody,
    sections: [
      {
        title: "Language",
        rows: [
          {
            id: LANGUAGE_IDS.en,
            title: copy.languageEnglish,
            description: "Continue in English",
          },
          {
            id: LANGUAGE_IDS.ha,
            title: copy.languageHausa,
            description: "Ci gaba da Hausa",
          },
          {
            id: LANGUAGE_IDS.ig,
            title: copy.languageIgbo,
            description: "Gaa n'ihu n'Igbo",
          },
          {
            id: LANGUAGE_IDS.yo,
            title: copy.languageYoruba,
            description: "Tesiwaju ni Yoruba",
          },
        ],
      },
    ],
  };
}
