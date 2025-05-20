'use client'
import React, { useState } from "react";
import { members } from "@/lib/members";

const memberBadges = {
  "His Excellency Kashim Shettima": "VP",
  "Dr. Jumoke Oduwole": "VC",
  "Princess Zahrah Mustapha Audu": "DG",
  "Senator Dr. George Akume": "SGF",
  "Mrs. Didi Esther Walson-Jack, OON, MNI": "HCSF",
  "Mr. Olayemi Cardoso": "CBN Gov",
  "Gov. AbdulRahman AbdulRazaq":"State Gov.",
  "Mr Olawale Edun": "FMF",
  "Abubakar Kyari CON": "Agri",
  "Festus Keyamo SAN, CON, FCIArb(UK)": "Aviation",
  "Abubakar Atiku Bagudu CON": "Budget",
  "Dr. Bosun Tijani": "Digital Economy",
  "Nyesom Wike CON": "FCT",
  "H. E. Amb. Yusuf Maitama Tuggar, OON": "Foreign Affairs",
  "Alhaji Muhammad Idris": "Info & Orientation",
  "Honourable Olubunmi Tunji-Ojo": "Interior",
  "Chief Lateef Fagbemi SAN": "Justice",
  "H.E. Adegboyega Oyetola, CON": "Marine & Blue Economy",
  "(Dr.) Senator Ibrahim Gaidam CON, FCNA, FCPA, FIMCN": "Police Affairs",
  "Senator Said Ahmed Alkali": "Transportation",
  "H.E. Senator (Engr) David Umahi CON": "Works",
  "Chief Adebayo Adelabu": "Power"
};

const PEBECMembers = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="font-[sans-serif] pb-16 ">
      {/* Reform Banner */}
      <section
  className="relative w-full h-[300px] md:h-[320px] bg-cover bg-center bg-no-repeat flex items-center mt-[-60px] pt-[80px]"
  style={{ backgroundImage: "url('/images/members_banner.png')" }}
>
  <div className="absolute inset-0 bg-black/40"></div>
  
  <div className="relative z-10 w-full px-6 md:px-12">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      
      {/* Left: Title & Description */}
      <div className="text-white max-w-lg">
        <h1 className="text-left text-3xl md:text-5xl font-extrabold tracking-tight">
          PEBEC Council
        </h1>
        <p className="mt-2 text-left text-sm md:text-base max-w-md">
          Meet the professionals driving business reforms in Nigeria.
        </p>
      </div>

      {/* Right: Search */}
      <div className="w-full max-w-md">
        <input
          type="text"
          className="w-full p-4 text-sm md:text-base rounded-full shadow-md text-gray-900 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:outline-none"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  </div>
</section>

      {/* Members Section */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-6 text-center">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-lg p-4 shadow-md hover:scale-105 transition-all duration-500 border border-gray-200 relative">
              {/* Custom Member Badge */}
              <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow-md">
                {memberBadges[member.name] || "Member"}
              </span>
              
              <div className="lg:min-h-[200px]">
                <img src={member.image} className="w-full rounded-lg inline-block" alt={member.name} />
              </div>
              <div className="mt-4">
                <h4 className="inline-block bg-green-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  {member.name}
                </h4>
                <p className="text-xs text-gray-600 mt-2">{member.title}</p>
                <div className="flex justify-center space-x-3 mt-3">
                  {member.socials.facebook && (
                    <a href={member.socials.facebook} target="_blank" className="text-gray-500 hover:text-blue-600">
                      <i className="fab fa-facebook-f"></i>
                    </a>
                  )}
                  {member.socials.twitter && (
                    <a href={member.socials.twitter} target="_blank" className="text-gray-500 hover:text-blue-400">
                      <i className="fab fa-twitter"></i>
                    </a>
                  )}
                  {member.socials.linkedin && (
                    <a href={member.socials.linkedin} target="_blank" className="text-gray-500 hover:text-blue-800">
                      <i className="fab fa-linkedin-in"></i>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PEBECMembers;