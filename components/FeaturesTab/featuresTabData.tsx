import { FeatureTab } from "@/types/featureTab";

const featuresTabData: FeatureTab[] = [
  {
    id: "tabOne",
    title: "Regulatory Reforms",
    desc1: `Reform policies that will impact the government rules and regulations to improve efficiency, transparency and effectiveness in the various economic sectors`,
    desc2: ``,
    image: "/images/regulators.jpg", // ✅ Image for Tab 01
    imageDark: "/images/regulators.jpg",
  },
  {
    id: "tabTwo",
    title: "Subnational EOD Reforms",
    desc1: `Enabling reforms at the Subnational level to support a conducive business environment for inclusive growth`,
    desc2: ``,
    image: "/images/eod_reforms.svg", // ✅ Image for Tab 02
    imageDark: "/images/eod_reforms.svg",
  },
  {
    id: "tabThree",
    title: "Legislative / Judicial Reforms",
    desc1: `An embodiment of review select existing laws relating to business facilitation in a single legislation and Specialized fast-track courts established within existing structure of Magistrates Courts`,
    desc2: `Designated to provide claimants with an accessible, inexpensive, and speedy resolution platform for simple and liquidated debt recovery disputes`,
    image: "/images/judiciary_reform.png", // ✅ Image for Tab 03
    imageDark: "/images/judiciary_reform.png",
  },
];

export default featuresTabData;
