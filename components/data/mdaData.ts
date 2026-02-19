// MDA Services Data Component
// Source: bizLink/convex/seed_all_mdas.ts

export interface MDAService {
    name: string;
    timeline: string;
    requirements: string;
    cost: string;
}

export interface MDA {
    name: string;
    acronym: string;
    description: string;
    sectors: string[];
    services: MDAService[];
}

export const MDA_DATA: MDA[] = [
    {
        name: "Corporate Affairs Commission",
        acronym: "CAC",
        description: "Registration and regulation of companies in Nigeria.",
        sectors: ["All"],
        services: [
            { name: "Availability (Name Search)", timeline: "4 Hours", requirements: "N/A", cost: "N/A" },
            { name: "New Registration (LLC)", timeline: "24 Hours", requirements: "N/A", cost: "N/A" },
            { name: "Annual Returns", timeline: "Instant", requirements: "N/A", cost: "N/A" },
            { name: "Letter of Good Standing", timeline: "3-5 Working Days", requirements: "N/A", cost: "N/A" },
        ]
    },
    {
        name: "Standards Organisation of Nigeria",
        acronym: "SON",
        description: "Standards and quality control for products.",
        sectors: ["Manufacturing", "Wholesale & Retail Trade"],
        services: [
            { name: "SONCAP Certificate", timeline: "4 Days", requirements: "Facility Inspection report, Lab test report, Proforma Invoices", cost: "$500 - $2,000" },
            { name: "Product Registration", timeline: "30 Days", requirements: "CAC Cert, Trade Mark Cert, Agreements", cost: "Service Charge" },
            { name: "MANCAP", timeline: "60 Days", requirements: "Application Form, CAC Cert, SOPs", cost: "Admin Charges" },
        ]
    },
    {
        name: "Nigerian Investment Promotion Commission",
        acronym: "NIPC",
        description: "Investment promotion and coordination.",
        sectors: ["All"],
        services: [
            { name: "Business Registration", timeline: "2 Days", requirements: "SWIP portal, CAC Docs, Memo & Articles", cost: "₦150,000" },
            { name: "Pioneer Status (PSI)", timeline: "NA", requirements: "Application forms, Project presentation, Due Diligence", cost: "₦4,500,000+" },
        ]
    },
    {
        name: "Oil and Gas Free Zones Authority",
        acronym: "OGFZA",
        description: "Regulation of Oil and Gas Free Zones.",
        sectors: ["Mining & Quarrying"],
        services: [
            { name: "Free Zone Service Licence", timeline: "7 Days", requirements: "App Form, Registration Docs, Business Plan, EIA Report", cost: "$7,500 total approx" },
            { name: "Examination / Assessment (Import Release)", timeline: "48 Hours", requirements: "BL/AWB, Invoice, Form M, PAAR", cost: "$250 per BL/AWB" },
        ]
    },
    {
        name: "National Pension Commission",
        acronym: "PenCom",
        description: "Regulation of the pension industry.",
        sectors: ["Financial & Insurance Activities", "Human Health & Social Work", "Education"],
        services: [
            { name: "Pension Clearance Certificate (PCC)", timeline: "15 Working Days", requirements: "Employee list, Remittance evidence (3 yrs), Group Life Insurance", cost: "N/A" },
            { name: "Licensing of PFA", timeline: "120 Working Days", requirements: "App letter, CAC Cert, N5B Capital, Feasibility", cost: "₦6,000,000 total" },
        ]
    },
    {
        name: "Nigerian Maritime Administration & Safety Agency",
        acronym: "NIMASA",
        description: "Maritime safety and administration.",
        sectors: ["Transportation & Storage"],
        services: [
            { name: "Registration of Foreign-Owned Coastal Vessels", timeline: "48 Hours", requirements: "Proof of foreign ownership", cost: "Min $50,000" },
            { name: "Sailing Clearance", timeline: "48 Hours", requirements: "Payment of bills", cost: "Settlement of bills" },
        ]
    },
    {
        name: "Federal Road Safety Corps",
        acronym: "FRSC",
        description: "Road safety and traffic management.",
        sectors: ["Transportation & Storage"],
        services: [
            { name: "Fleet Operator Registration", timeline: "12 Weeks", requirements: "Fleet 5+ vehicles, Safety Manager, Policy Manual", cost: "No Cost" },
            { name: "Speed Limiting Device Vendor Accreditation", timeline: "8 Weeks", requirements: "CAC, Tax Clearance, SON Product Cert", cost: "N/A" },
        ]
    },
    {
        name: "Nigerian Content Development and Monitoring Board",
        acronym: "NCDMB",
        description: "Nigerian content monitoring in the oil and gas industry.",
        sectors: ["Mining & Quarrying"],
        services: [
            { name: "NOGIC JQS Registration", timeline: "3 Working Days", requirements: "Online registration", cost: "No fee" },
            { name: "Expatriate Quota Processing", timeline: "45 Working Days", requirements: "Application documents", cost: "₦0" },
        ]
    },
    {
        name: "Federal Airports Authority of Nigeria",
        acronym: "FAAN",
        description: "Airport management and security.",
        sectors: ["Transportation & Storage"],
        services: [
            { name: "Land Lease", timeline: "12 Weeks", requirements: "Business Plan, Survey plans, EIA report", cost: "Processing + Premium" },
            { name: "Advertising License", timeline: "6 Weeks", requirements: "CAC docs, ARCON registration, Tax evidence", cost: "Processing fee" },
        ]
    },
    {
        name: "Nigerian Communications Commission",
        acronym: "NCC",
        description: "Telecommunications regulation.",
        sectors: ["Information & Communication", "Digital Economy & Technology"],
        services: [
            { name: "Licensing", timeline: "NA", requirements: "Compliance with Act", cost: "NA" },
            { name: "Type Approval", timeline: "NA", requirements: "Technical standards compliance", cost: "NA" },
        ]
    },
    {
        name: "National Drug Law Enforcement Agency",
        acronym: "NDLEA",
        description: "Drug control and enforcement.",
        sectors: ["All"],
        services: [
            { name: "Visa Clearance Certificate", timeline: "7 Working Days", requirements: "Application", cost: "₦20,000" },
        ]
    },
    {
        name: "Nigeria Agricultural Quarantine Service",
        acronym: "NAQS",
        description: "Agricultural quarantine services.",
        sectors: ["Agriculture, Forestry & Fishing"],
        services: [
            { name: "Phytosanitary Certificate", timeline: "24-48 Hours", requirements: "Inspection", cost: "₦3,000+" },
        ]
    },
    {
        name: "National Inland Waterways Authority",
        acronym: "NIWA",
        description: "Waterways management.",
        sectors: ["Transportation & Storage"],
        services: [
            { name: "Dredging Permit", timeline: "1 Week", requirements: "Application", cost: "₦25,000+" },
        ]
    },
    {
        name: "Nigerian Exports Promotion Council",
        acronym: "NEPC",
        description: "Export promotion.",
        sectors: ["Agriculture, Forestry & Fishing", "Wholesale & Retail Trade"],
        services: [
            { name: "Exporter Registration", timeline: "1-3 Days", requirements: "Application", cost: "₦13,500 - ₦50,000" },
        ]
    },
    {
        name: "Nigerian Custom Service",
        acronym: "NCS",
        description: "Customs and trade facilitation.",
        sectors: ["Wholesale & Retail Trade", "Transportation & Storage"],
        services: [
            { name: "Import Clearance", timeline: "1-7 Days", requirements: "NXP, Invoices, BL", cost: "Duties" },
        ]
    },
    {
        name: "National Identity Management Council",
        acronym: "NIMC",
        description: "Identity management.",
        sectors: ["All"],
        services: [
            { name: "NIN Enrollment", timeline: "Same Day", requirements: "N/A", cost: "Free" },
        ]
    },
    {
        name: "Federal Competition and Consumer Protection Commission",
        acronym: "FCCPC",
        description: "Consumer protection and competition regulation.",
        sectors: ["All"],
        services: [
            { name: "Complaint Resolution", timeline: "21 Working Days", requirements: "Complaint details", cost: "Free" },
        ]
    },
    {
        name: "Nigerian Export Processing Zone Authority",
        acronym: "NEPZA",
        description: "Regulation of export processing zones.",
        sectors: ["Manufacturing", "Wholesale & Retail Trade"],
        services: [
            { name: "Free Zone Designation", timeline: "12 Working Days", requirements: "App letter, Inspection", cost: "$10,000 + $400,000" },
        ]
    },
    {
        name: "National Environmental Standards and Regulations Enforcement Agency",
        acronym: "NESREA",
        description: "Environmental standards enforcement.",
        sectors: ["All"],
        services: [
            { name: "Waste & Toxic Permit", timeline: "4-6 Weeks", requirements: "EMP, CAC docs", cost: "₦20,000" },
        ]
    },
    {
        name: "Nigeria Immigration Service",
        acronym: "NIS",
        description: "Immigration and passport control.",
        sectors: ["All"],
        services: [
            { name: "Business Visa", timeline: "48 Hours", requirements: "Passport, invitation letter", cost: "Varies" },
        ]
    },
    {
        name: "National Office for Technology Acquisition and Promotion",
        acronym: "NOTAP",
        description: "Technology transfer registration.",
        sectors: ["Digital Economy & Technology", "Information & Communication"],
        services: [
            { name: "Tech Transfer Agreement Registration", timeline: "SLA timeline", requirements: "Executed agreement", cost: "Turnover-based" },
        ]
    },
    {
        name: "Special Control Unit Against Money Laundering",
        acronym: "SCUML",
        description: "Anti-money laundering compliance.",
        sectors: ["Financial & Insurance Activities", "Real Estate Activities"],
        services: [
            { name: "DNFBP Registration", timeline: "Online", requirements: "CAC docs, TIN", cost: "Free" },
        ]
    },
    {
        name: "Nigerian Upstream Petroleum Regulatory Commission",
        acronym: "NUPRC",
        description: "Upstream petroleum regulation.",
        sectors: ["Mining & Quarrying"],
        services: [
            { name: "Petroleum Exploration Licence", timeline: "90 Working Days", requirements: "App form, CAC, Proof of payment", cost: "Bid round" },
        ]
    },
    {
        name: "National Information Technology Development Agency",
        acronym: "NITDA",
        description: "IT development and regulation.",
        sectors: ["Digital Economy & Technology", "Information & Communication"],
        services: [
            { name: "IT Project Clearance", timeline: "14 Working Days", requirements: "Project docs", cost: "Free" },
        ]
    },
    {
        name: "Nigerian Port Authority",
        acronym: "NPA",
        description: "Port administration.",
        sectors: ["Transportation & Storage"],
        services: [
            { name: "Register shipping company", timeline: "1 Hour", requirements: "Application, CAC documents", cost: "As per tariff" },
        ]
    },
    {
        name: "Nigerian Shippers Council",
        acronym: "NSC",
        description: "Shippers' rights and tariff regulation.",
        sectors: ["Transportation & Storage"],
        services: [
            { name: "Registration of port service providers", timeline: "48 Hours", requirements: "CAC, NPA & NIMASA reg", cost: "₦20,000-₦300,000" },
            { name: "Operating license for Inland Dry Port", timeline: "3 Months", requirements: "EOI, feasibility, CAC docs", cost: "$25,000" },
        ]
    },
    {
        name: "Nigeria Social Insurance Trust Fund",
        acronym: "NSITF",
        description: "Social insurance and workplace safety.",
        sectors: ["All"],
        services: [
            { name: "Registration of employers", timeline: "24 Hours", requirements: "ECS forms, CAC docs", cost: "Free" },
            { name: "Yearly compliance certification", timeline: "48 Hours", requirements: "Proof of contributions", cost: "₦20,000-₦30,000" },
        ]
    },
    {
        name: "Commercial Law & Trademarks Registry",
        acronym: "CLTR",
        description: "Trademarks and intellectual property registration.",
        sectors: ["All"],
        services: [
            { name: "Trademarks Preliminary search", timeline: "72 Hours", requirements: "Name/Logo", cost: "₦1,500" },
            { name: "Trademark Certificate", timeline: "3-6 Months", requirements: "Particulars, Form 10", cost: "₦10,000" },
        ]
    },
    {
        name: "Federal Ministry of Justice",
        acronym: "FMoJ",
        description: "Legal and justice administration.",
        sectors: ["All"],
        services: [
            { name: "Registration of Companies Limited by Guarantee", timeline: "5 Working Days", requirements: "HAGF Consent via CAC", cost: "N/A" },
        ]
    },
    {
        name: "National Insurance Commission",
        acronym: "NAICOM",
        description: "Insurance industry regulation.",
        sectors: ["Financial & Insurance Activities"],
        services: [
            { name: "Insurance Product Approval", timeline: "3-5 Days", requirements: "Proposal, Brochure, Feasibility", cost: "NA" },
            { name: "Registration of Insurance Co.", timeline: "NA", requirements: "LOI, Director profiles, 5-yr plan", cost: "NA" },
        ]
    },
    {
        name: "National Agency for Food and Drug Administration and Control",
        acronym: "NAFDAC",
        description: "Food and drug regulation.",
        sectors: ["Manufacturing", "Agriculture, Forestry & Fishing", "Human Health & Social Work"],
        services: [
            { name: "Product Registration", timeline: "90 Days", requirements: "Standard specs, application", cost: "NA" },
        ]
    },
    {
        name: "Industrial Training Fund",
        acronym: "ITF",
        description: "Industrial training and skills development.",
        sectors: ["All"],
        services: [
            { name: "Training Approvals (Overseas)", timeline: "3 Weeks", requirements: "Application", cost: "N/A" },
            { name: "Reimbursement Claims", timeline: "3 Months", requirements: "Submit by June 30th", cost: "N/A" },
        ]
    }
];

// Helper function to get MDAs by sector
export function getMDAsBySector(sector: string): MDA[] {
    return MDA_DATA.filter(mda =>
        mda.sectors.includes("All") || mda.sectors.includes(sector)
    );
}

// Helper function to get all unique sectors
export function getAllSectors(): string[] {
    const sectors = new Set<string>();
    MDA_DATA.forEach(mda => {
        mda.sectors.forEach(sector => {
            if (sector !== "All") {
                sectors.add(sector);
            }
        });
    });
    return Array.from(sectors).sort();
}
