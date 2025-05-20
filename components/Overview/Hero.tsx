"use client";
import Image from "next/image";

export default function AboutSection() {
  return (
    <section className=" pl-5 pr-5 overflow-hidden pt-20 pb-12 lg:pt-[100px] lg:pb-[80px] bg-white dark:bg-gray-900">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        {/* Left - Images */}
        <div className="w-full lg:w-6/12 flex mb-25 items-center space-x-4">
          <div className="space-y-4">
            <div className="relative w-48 md:w-56 lg:w-64 h-48 md:h-56 lg:h-64">
              <Image
                src="/images/about/overview1.2.png"
                alt="Collaboration"
                width={250}
                height={180}
                className="rounded-2xl object-cover"
              />
            </div>
            <div className="relative w-48 md:w-56 lg:w-64 h-48 md:h-56 lg:h-64">
              <Image
                src="/images/about/overview1.11.png"
                alt="Teamwork"
                width={250}
                height={180}
                className="rounded-2xl object-cover"
              />
            </div>
          </div>
          <div className="relative z-10">
            <div className="relative w-56 md:w-64 lg:w-72 h-56 md:h-64 lg:h-72">
              <Image
                src="/images/about/overview1.3.png"
                alt="Success"
                width={280}
                height={200}
                className="rounded-2xl object-cover"
              />
            </div>
            {/* Dotted Pattern */}
            <span className="absolute -right-7 -bottom-7 z-[-1]">
              <svg
                width="134"
                height="106"
                viewBox="0 0 134 106"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {[...Array(10)].map((_, i) => (
                  <circle
                    key={i}
                    cx={i * 15}
                    cy="104"
                    r="1.66667"
                    fill="#3056D3"
                  />
                ))}
              </svg>
            </span>
          </div>
        </div>

        {/* Right - Text */}
        <div className="w-full lg:w-5/12 mt-10 lg:mt-0">
          <span className="block mb-4 text-lg font-semibold text-green-600">
            About PEBEC
          </span>
          <h2 className="mb-5 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Driving Business Reforms in Nigeria
          </h2>
          <p className="mb-5 text-gray-600 dark:text-gray-400">
            The Presidential Enabling Business Environment Council (PEBEC) is
            dedicated to simplifying bureaucratic processes and creating a
            business-friendly environment in Nigeria.
          </p>
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            Through targeted reforms, strategic interventions, and optimized
            regulatory frameworks, PEBEC fosters economic growth and enhances
            business opportunities nationwide.
          </p>
          {/* <a
            href="/learn-more"
            className="inline-flex items-center justify-center py-3 text-white bg-green-600 hover:bg-green-700 rounded-md px-7 font-medium transition"
          >
            Learn More
          </a> */}
        </div>
      </div>
    </section>
  );
}
