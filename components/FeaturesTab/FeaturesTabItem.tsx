// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import React from "react";
import { FeatureTab } from "@/types/featureTab";
import Image from "next/image";
const FeaturesTabItem = ({
  featureTab
}: {
  featureTab: FeatureTab;
}) => {
  const {
    title,
    desc1,
    desc2,
    image,
    imageDark
  } = featureTab;
  return <>
      <div className="flex items-center gap-8 lg:gap-19">
        <div className="md:w-1/2">
          <h2 className="mb-7 text-3xl font-bold text-black dark:text-white xl:text-sectiontitle2">
            {title}
          </h2>
          <p className="mb-5">{desc1}</p>
          <p className="w-11/12">{desc2}</p>
        </div>
        <div className="relative mx-auto hidden md:block md:w-1/2">
  <div className="w-full overflow-hidden rounded-2xl shadow-xl border border-gray-200 dark:border-strokedark">
    <Image src={image} alt={title} width={562} height={366} className="w-full h-auto object-cover dark:hidden" />
    <Image src={imageDark} alt={title} width={562} height={366} className="w-full h-auto object-cover hidden dark:block" />
  </div>
      </div>

      </div>
    </>;
};
export default FeaturesTabItem;