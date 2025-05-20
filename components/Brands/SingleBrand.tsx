"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/types/brand";

interface Props {
  brand: Brand;
}

const SingleBrand: React.FC<Props> = ({ brand }) => {
  return (
    <div className="relative group flex justify-center items-center">
      <Link href={brand.href}>
        <div className="flex items-center justify-center w-16 h-12 md:w-20 md:h-14 transition-transform duration-200 hover:scale-105">
          <Image
            src={brand.image}
            alt={brand.name}
            fill
            className="object-contain dark:hidden"
          />
          <Image
            src={brand.imageLight}
            alt={brand.name}
            fill
            className="object-contain hidden dark:block"
          />
        </div>
      </Link> 

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-max whitespace-nowrap rounded bg-black px-3 py-1 text-xs text-white opacity-0 transition-all group-hover:opacity-100 group-hover:block z-10">
        {brand.tooltip}
      </div>
    </div>
  );
};

export default SingleBrand;
