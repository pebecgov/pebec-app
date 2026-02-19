// Sectors and Subsectors Data Component
// Source: bizLink/components/onboarding/constants/sectors.ts

export interface Sector {
    name: string;
    subsectors: string[];
}

export const SECTORS: Sector[] = [
    {
        name: "Agriculture, Forestry & Fishing",
        subsectors: [
            "Grain Farming (Rice, Maize, Wheat, Sorghum)",
            "Vegetable & Melon Farming",
            "Fruit & Tree Nut Farming (Cashew, Cocoa, Palm Fruits)",
            "Oilseed Farming (Groundnut, Soybean, Sesame)",
            "Root & Tuber Farming (Cassava, Yam, Potato)",
            "Sugar Cane Farming",
            "Cotton Farming",
            "Cattle Ranching & Farming",
            "Poultry & Egg Production",
            "Sheep & Goat Farming",
            "Pig Farming",
            "Fish Farming & Hatcheries",
            "Shrimp Farming",
            "Timber Tract Operations",
            "Forest Nurseries & Gathering",
            "Cotton Ginning",
            "Soil Preparation, Planting & Cultivation",
            "Post-Harvest Crop Activities",
            "Farm Labor Contractors & Crew Leaders"
        ]
    },
    {
        name: "Mining & Quarrying",
        subsectors: [
            "Crude Petroleum Extraction",
            "Natural Gas Extraction",
            "Liquefied Natural Gas (LNG)",
            "Coal Mining",
            "Gold Ore Mining",
            "Iron Ore Mining",
            "Tin Ore Mining",
            "Lead & Zinc Ore Mining",
            "Limestone Mining",
            "Granite Mining",
            "Marble Quarrying",
            "Salt Mining",
            "Gemstone Mining",
            "Drilling Oil & Gas Wells",
            "Oil & Gas Exploration Services"
        ]
    },
    {
        name: "Manufacturing",
        subsectors: [
            "Animal Food Manufacturing",
            "Grain & Oilseed Milling",
            "Sugar & Confectionery Manufacturing",
            "Fruit & Vegetable Preserving",
            "Dairy Product Manufacturing",
            "Meat Processing",
            "Seafood Product Preparation",
            "Bakery & Tortilla Manufacturing",
            "Seasoning & Dressing Manufacturing",
            "Bottled Water Manufacturing",
            "Soft Drink Manufacturing",
            "Brewery",
            "Winery",
            "Distillery",
            "Tobacco Manufacturing",
            "Textile Mills",
            "Fabric Mills",
            "Textile & Fabric Finishing",
            "Apparel Manufacturing",
            "Leather & Hide Tanning",
            "Footwear Manufacturing",
            "Leather Good Manufacturing",
            "Sawmills & Wood Preservation",
            "Plywood Manufacturing",
            "Furniture Manufacturing",
            "Pulp, Paper & Paperboard Mills",
            "Packaging & Container Manufacturing",
            "Printing & Related Support Activities",
            "Newspaper Publishing",
            "Book Publishing",
            "Petroleum Refineries",
            "Asphalt Paving, Roofing & Coating Materials",
            "Lubricant Manufacturing",
            "Petrochemical Manufacturing",
            "Fertilizer Manufacturing",
            "Pharmaceutical Manufacturing",
            "Paint & Coating Manufacturing",
            "Soap & Cleaning Compound Manufacturing",
            "Cosmetics & Toiletries Manufacturing",
            "Pesticide Manufacturing",
            "Plastic Product Manufacturing",
            "Tire Manufacturing",
            "Rubber Product Manufacturing",
            "Cement Manufacturing",
            "Concrete Product Manufacturing",
            "Glass & Glass Product Manufacturing",
            "Ceramic Tile & Fixture Manufacturing",
            "Clay Building Material Manufacturing",
            "Iron & Steel Mills",
            "Alumina & Aluminum Production",
            "Metal Forging",
            "Metal Casting",
            "Metal Can Manufacturing",
            "Hardware Manufacturing",
            "Spring & Wire Product Manufacturing",
            "Machine Shops",
            "Coating, Engraving & Allied Services",
            "Agricultural Machinery Manufacturing",
            "Construction Machinery Manufacturing",
            "Industrial Machinery Manufacturing",
            "Computer & Peripheral Equipment Manufacturing",
            "Communications Equipment Manufacturing",
            "Audio & Video Equipment Manufacturing",
            "Electric Lighting Equipment Manufacturing",
            "Household Appliance Manufacturing",
            "Battery Manufacturing",
            "Motor Vehicle Manufacturing",
            "Motor Vehicle Parts Manufacturing",
            "Ship & Boat Building",
            "Aircraft Parts Manufacturing",
            "Household Furniture Manufacturing",
            "Office Furniture Manufacturing",
            "Mattress Manufacturing",
            "Medical Equipment & Supplies Manufacturing",
            "Jewelry Manufacturing",
            "Sporting Goods Manufacturing",
            "Toy Manufacturing"
        ]
    },
    {
        name: "Electricity, Gas, Steam & Air Conditioning",
        subsectors: [
            "Hydroelectric Power",
            "Thermal Power Generation",
            "Solar Power Generation",
            "Wind Power Generation",
            "Gas Turbine Power Generation",
            "Power Distribution Companies (DisCos)",
            "Power Transmission",
            "Natural Gas Distribution",
            "LPG Distribution"
        ]
    },
    {
        name: "Water Supply, Sewerage & Waste Management",
        subsectors: [
            "Water Collection, Treatment & Supply",
            "Sewage Treatment",
            "Waste Collection",
            "Waste Treatment & Disposal",
            "Materials Recovery",
            "Recycling Services"
        ]
    },
    {
        name: "Construction",
        subsectors: [
            "Residential Building Construction",
            "Non-Residential Building Construction",
            "Road & Highway Construction",
            "Bridge & Tunnel Construction",
            "Water & Sewer Line Construction",
            "Oil & Gas Pipeline Construction",
            "Power & Communication Line Construction",
            "Foundation & Structure Contractors",
            "Plumbing, Heating & Air Conditioning",
            "Electrical Contractors",
            "Painting & Wall Covering",
            "Flooring Contractors",
            "Roofing Contractors"
        ]
    },
    {
        name: "Wholesale & Retail Trade",
        subsectors: [
            "Motor Vehicle & Parts Wholesalers",
            "Furniture & Home Furnishing Wholesalers",
            "Lumber & Construction Materials",
            "Pharmaceutical Wholesalers",
            "Grocery & Related Product Wholesalers",
            "Farm Product Wholesalers",
            "Chemical Wholesalers",
            "Petroleum Product Wholesalers",
            "Electronics & Appliances Wholesalers",
            "Motor Vehicle Dealers",
            "Furniture Stores",
            "Electronics & Appliance Stores",
            "Building Material & Garden Equipment Stores",
            "Supermarkets & Grocery Stores",
            "Specialty Food Stores",
            "Pharmacies & Drug Stores",
            "Clothing Stores",
            "Shoe Stores",
            "Jewelry Stores",
            "Sporting Goods Stores",
            "Book Stores",
            "Department Stores",
            "General Merchandise Stores",
            "E-commerce & Online Retail"
        ]
    },
    {
        name: "Transportation & Storage",
        subsectors: [
            "Urban & Suburban Passenger Transit",
            "Interurban & Rural Bus Service",
            "Taxi & Ride-Hailing Services",
            "School & Employee Bus Transportation",
            "Freight Trucking",
            "Moving Services",
            "Deep Sea Freight Transportation",
            "Coastal & Great Lakes Freight",
            "Inland Water Freight Transportation",
            "Passenger Water Transportation",
            "Scheduled Air Transportation",
            "Non-Scheduled Air Transportation",
            "Air Cargo Services",
            "General Warehousing & Storage",
            "Refrigerated Warehousing & Storage",
            "Farm Product Warehousing",
            "Port & Harbor Operations",
            "Airport Operations",
            "Motor Vehicle Towing",
            "Freight Transportation Arrangement",
            "Customs Brokerage"
        ]
    },
    {
        name: "Accommodation & Food Services",
        subsectors: [
            "Hotels & Motels",
            "Short-Term Lodging",
            "Guest Houses",
            "Recreational & Vacation Camps",
            "Full-Service Restaurants",
            "Limited-Service Restaurants",
            "Fast Food Restaurants",
            "Cafeterias & Buffets",
            "Caterers",
            "Mobile Food Services",
            "Drinking Places (Bars, Pubs, Night Clubs)"
        ]
    },
    {
        name: "Information & Communication",
        subsectors: [
            "Newspaper Publishers",
            "Magazine Publishers",
            "Book Publishers",
            "Software Publishers",
            "Motion Picture & Video Production",
            "Sound Recording Studios",
            "Music Publishers",
            "Radio Broadcasting",
            "Television Broadcasting",
            "Cable & Satellite Programming",
            "Wired Telecommunications",
            "Wireless Telecommunications (GSM Operators)",
            "Satellite Telecommunications",
            "Internet Service Providers",
            "Data Processing & Hosting",
            "Software Development",
            "Computer Systems Design",
            "IT Consulting",
            "Web Hosting",
            "Cloud Services"
        ]
    },
    {
        name: "Financial & Insurance Activities",
        subsectors: [
            "Commercial Banks",
            "Microfinance Banks",
            "Mortgage Banks",
            "Development Banks",
            "Investment Banks",
            "Credit Unions",
            "Life Insurance",
            "Non-Life Insurance (General Insurance)",
            "Health Insurance",
            "Insurance Agencies & Brokerages",
            "Reinsurance",
            "Securities & Commodity Contracts Brokerage",
            "Asset Management",
            "Portfolio Management",
            "Investment Advisory Services",
            "Pension Fund Management",
            "Payment Processing Services",
            "Fintech Services",
            "Bureau de Change",
            "Financial Transaction Processing"
        ]
    },
    {
        name: "Real Estate Activities",
        subsectors: [
            "Residential Real Estate",
            "Commercial Real Estate",
            "Industrial Real Estate",
            "Real Estate Development",
            "Property Management",
            "Real Estate Agencies & Brokerages",
            "Real Estate Appraisal",
            "Facilities Management"
        ]
    },
    {
        name: "Professional, Scientific & Technical Activities",
        subsectors: [
            "Legal Services",
            "Accounting & Bookkeeping",
            "Tax Preparation Services",
            "Auditing Services",
            "Management Consulting",
            "Business Consulting",
            "HR Consulting",
            "Marketing Consulting",
            "Architectural Services",
            "Engineering Services",
            "Surveying & Mapping",
            "Testing Laboratories",
            "Biotechnology Research",
            "Physical & Life Sciences Research",
            "Social Sciences Research",
            "Advertising Agencies",
            "Public Relations",
            "Media Buying Agencies",
            "Market Research",
            "Graphic Design",
            "Photography",
            "Translation Services",
            "Veterinary Services"
        ]
    },
    {
        name: "Administrative & Support Services",
        subsectors: [
            "Office Administrative Services",
            "Facilities Support Services",
            "Employment Services & Recruitment",
            "Business Support Services",
            "Travel Agencies",
            "Security & Investigation Services",
            "Cleaning Services",
            "Landscaping Services",
            "Packaging & Labeling Services"
        ]
    },
    {
        name: "Public Administration & Defense",
        subsectors: [
            "Federal Government Administration",
            "State Government Administration",
            "Local Government Administration",
            "Defense & Military",
            "Police & Security Services",
            "Regulatory Activities"
        ]
    },
    {
        name: "Education",
        subsectors: [
            "Primary Schools",
            "Secondary Schools",
            "Special Education",
            "Universities",
            "Polytechnics",
            "Colleges of Education",
            "Professional Training Institutes",
            "Vocational Training",
            "Language Schools",
            "Computer Training",
            "Driving Schools",
            "Exam Preparation",
            "Online Education Platforms"
        ]
    },
    {
        name: "Human Health & Social Work",
        subsectors: [
            "Hospitals",
            "Specialist Medical Clinics",
            "General Medical Clinics",
            "Dental Practices",
            "Diagnostic Laboratories",
            "Pharmacies",
            "Nursing Care Facilities",
            "Home Health Care",
            "Child Care Services",
            "Elderly Care",
            "Community Development",
            "NGOs & Charitable Organizations"
        ]
    },
    {
        name: "Arts, Entertainment & Recreation",
        subsectors: [
            "Music Production",
            "Film Production (Nollywood)",
            "Theatre Companies",
            "Dance Companies",
            "Event Management",
            "Amusement Parks",
            "Casinos & Gaming",
            "Sports Clubs",
            "Fitness Centers",
            "Museums",
            "Historical Sites",
            "Botanical Gardens",
            "Nature Reserves"
        ]
    },
    {
        name: "Artisan",
        subsectors: [
            "Hair Salons & Barber Shops",
            "Beauty Salons & Spas",
            "Laundry & Dry Cleaning",
            "Funeral Services",
            "Wedding Planning",
            "Electronics Repair",
            "Automotive Repair",
            "Appliance Repair",
            "Watch & Jewelry Repair",
            "Religious Organizations",
            "Professional Associations",
            "Labor Unions",
            "Business Associations"
        ]
    },
    {
        name: "Renewable Energy & Environmental Services",
        subsectors: [
            "Solar Energy Systems",
            "Wind Energy",
            "Biomass Energy",
            "Environmental Consulting",
            "Renewable Energy Consulting",
            "Carbon Credit Services",
            "Environmental Impact Assessment"
        ]
    },
    {
        name: "Digital Economy & Technology",
        subsectors: [
            "E-commerce Platforms",
            "Digital Marketing Agencies",
            "Mobile App Development",
            "Blockchain & Cryptocurrency",
            "Artificial Intelligence Services",
            "Cybersecurity Services",
            "Data Analytics",
            "Digital Payment Solutions",
            "Gaming & Esports"
        ]
    },
    {
        name: "Creative & Media Industries",
        subsectors: [
            "Content Creation",
            "Influencer Marketing",
            "Podcast Production",
            "Animation Studios",
            "Photography & Videography",
            "Advertising Technology",
            "Brand Management",
            "Social Media Management"
        ]
    }
];

// Helper function to get subsectors by sector name
export function getSubsectorsBySector(sectorName: string): string[] {
    const sector = SECTORS.find(s => s.name === sectorName);
    return sector ? sector.subsectors : [];
}

// Helper function to get all sector names
export function getAllSectorNames(): string[] {
    return SECTORS.map(s => s.name);
}
