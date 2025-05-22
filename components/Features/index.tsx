// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React from "react";
import featuresData from "./featuresData";
import SingleFeature from "./SingleFeature";
import SectionHeader from "../Common/SectionHeader";
const Feature = () => {
  return <>
      {}
      <section id="features" className="py-20 lg:py-25 xl:py-30">
        <div className="mx-auto max-w-c-1315 px-4 md:px-8 xl:px-0">
          {}
          <SectionHeader headerInfo={{
          title: "PEBEC REFORMS",
          subtitle: "Key Features of Business Reforms",
          description: `PEBEC is making it easier to do business in Nigeria by streamlining regulations, embracing digital solutions, and supporting investors for a thriving business environment.`
        }} />
          {}

          <div className="mt-12.5 grid grid-cols-1 gap-7.5 md:grid-cols-2 lg:mt-15 lg:grid-cols-3 xl:mt-20 xl:gap-12.5">
            {}
            {featuresData.map((feature, key) => <SingleFeature feature={feature} key={key} />)}
            {}
          </div>
        </div>
      </section>
      {}
    </>;
};
export default Feature;