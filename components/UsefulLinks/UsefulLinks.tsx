import React from 'react';

const UsefulLinks = () => {
  const links = [
    {
      name: 'Federal Ministry of Finance',
      url: 'https://www.finance.gov.ng/',
      description: 'Manages the finances of the Federal Government of Nigeria, including revenue and expenditure.',
    },
    {
      name: 'Federal Ministry of Agriculture and Rural Development',
      url: 'https://fmard.gov.ng/',
      description: 'Oversees agricultural research, development, and rural development initiatives.',
    },
    {
      name: 'Federal Ministry of Industry, Trade and Investment',
      url: 'https://fmiti.gov.ng/',
      description: 'Promotes industrialization, trade, and investment opportunities in Nigeria.',
    },
    {
      name: 'Federal Ministry of Justice',
      url: 'https://justice.gov.ng/',
      description: 'Provides legal services to the government and ensures justice administration.',
    },
    {
      name: 'Federal Ministry of Health',
      url: 'https://www.health.gov.ng/',
      description: 'Responsible for health policy formulation and implementation.',
    },
    {
      name: 'Federal Ministry of Education',
      url: 'http://education.gov.ng/',
      description: 'Oversees education policy and administration at the federal level.',
    },
    {
      name: 'Federal Ministry of Environment',
      url: 'https://environment.gov.ng/',
      description: 'Formulates policies on environmental issues and sustainable development.',
    },
    {
      name: 'Federal Ministry of Transportation',
      url: 'https://transportation.gov.ng/',
      description: 'Manages transportation infrastructure and services across Nigeria.',
    },
    {
      name: 'Federal Ministry of Power',
      url: 'https://power.gov.ng/',
      description: 'Responsible for electricity generation, transmission, and distribution.',
    },
    {
      name: 'Federal Ministry of Works and Housing',
      url: 'https://worksandhousing.gov.ng/',
      description: 'Oversees public works and housing development projects.',
    },
    {
      name: 'Federal Ministry of Labour and Employment',
      url: 'https://labour.gov.ng/',
      description: 'Handles labour relations, employment services, and productivity.',
    },
    {
      name: 'Federal Ministry of Science, Technology and Innovation',
      url: 'https://scienceandtech.gov.ng/',
      description: 'Promotes scientific research and technological innovation.',
    },
    {
      name: 'Federal Ministry of Water Resources',
      url: 'https://waterresources.gov.ng/',
      description: 'Manages water resources and sanitation services.',
    },
    {
      name: 'Federal Ministry of Youth and Sports Development',
      url: 'https://youthandsports.gov.ng/',
      description: 'Focuses on youth empowerment and sports development.',
    },
    {
      name: 'Federal Ministry of Women Affairs',
      url: 'https://womenaffairs.gov.ng/',
      description: 'Advocates for women’s rights and gender equality.',
    },
    {
      name: 'Federal Ministry of Humanitarian Affairs, Disaster Management and Social Development',
      url: 'http://www.fmhds.gov.ng/',
      description: 'Coordinates humanitarian interventions and social development programs.',
    },
    {
      name: 'Federal Ministry of Communications and Digital Economy',
      url: 'https://fmcide.gov.ng/',
      description: 'Oversees communications, innovation, and digital economy policies.',
    },
    {
      name: 'Federal Ministry of Defence',
      url: 'https://defence.gov.ng/',
      description: 'Manages the defense of Nigeria and its armed forces.',
    },
    {
      name: 'Federal Ministry of Foreign Affairs',
      url: 'https://foreignaffairs.gov.ng/',
      description: 'Handles Nigeria’s foreign relations and diplomatic missions.',
    },
    {
      name: 'Federal Ministry of Petroleum Resources',
      url: 'https://petroleumresources.gov.ng/',
      description: 'Regulates the petroleum industry and resources.',
    },
    {
      name: 'Federal Ministry of Aviation',
      url: 'https://aviation.gov.ng/',
      description: 'Regulates air travel and aviation services.',
    },
    {
      name: 'Federal Ministry of Information and Culture',
      url: 'https://fmic.gov.ng/',
      description: 'Manages information dissemination and cultural affairs.',
    },
    {
      name: 'Federal Ministry of Interior',
      url: 'https://interior.gov.ng/',
      description: 'Provides internal security and related services.',
    },
    {
      name: 'Federal Ministry of Niger Delta Affairs',
      url: 'https://nigerdelta.gov.ng/',
      description: 'Coordinates development efforts in the Niger Delta region.',
    },
    {
      name: 'Federal Ministry of Police Affairs',
      url: 'https://policeaffairs.gov.ng/',
      description: 'Oversees the Nigeria Police Force and related matters.',
    },
    {
      name: 'Federal Ministry of Budget and National Planning',
      url: 'https://nationalplanning.gov.ng/',
      description: 'Handles budget preparation and national development planning.',
    },
    {
      name: 'Federal Ministry of Mines and Steel Development',
      url: 'https://minesandsteel.gov.ng/',
      description: 'Promotes mining and steel industry development.',
    },
    {
      name: 'Federal Ministry of Special Duties and Inter-Governmental Affairs',
      url: 'https://specialduties.gov.ng/',
      description: 'Coordinates special projects and inter-governmental affairs.',
    },
    {
      name: 'Federal Ministry of Tourism',
      url: 'https://tourism.gov.ng/',
      description: 'Develops and promotes tourism in Nigeria.',
    },
    {
      name: 'Federal Ministry of Solid Minerals Development',
      url: 'https://msmd.gov.ng/',
      description: 'Focuses on the development of solid mineral resources.',
    },
    {
      name: 'Federal Ministry of Marine and Blue Economy',
      url: 'https://fmmbe.gov.ng/',
      description: 'Oversees marine resources and the blue economy sector.',
    },
    {
      name: 'Federal Ministry of Steel Development',
      url: 'https://msd.gov.ng/',
      description: 'Responsible for steel industry development.',
    },
    {
      name: 'Corporate Affairs Commission (CAC)',
      url: 'https://www.cac.gov.ng/',
      description: 'Registers companies and regulates corporate affairs.',
    },
    {
      name: 'Federal Inland Revenue Service (FIRS)',
      url: 'https://www.firs.gov.ng/',
      description: 'Administers tax laws and collects federal taxes.',
    },
    {
      name: 'Central Bank of Nigeria (CBN)',
      url: 'https://www.cbn.gov.ng/',
      description: 'Serves as the central bank and regulates monetary policy.',
    },
    {
      name: 'Nigeria Deposit Insurance Corporation (NDIC)',
      url: 'https://www.ndic.gov.ng/',
      description: 'Provides deposit insurance and banking supervision.',
    },
    {
      name: 'Nigerian Communications Commission (NCC)',
      url: 'https://www.ncc.gov.ng/',
      description: 'Regulates telecommunications services and providers.',
    },
    {
      name: 'National Information Technology Development Agency (NITDA)',
      url: 'https://www.nitda.gov.ng/',
      description: 'Develops and regulates information technology practices in Nigeria.',
    },
    {
      name: 'Nigeria Communications Satellite Limited (NIGCOMSAT)',
      url: 'https://www.nigcomsat.gov.ng/',
      description: 'Manages Nigeria’s communication satellites for various services.',
    },
    {
      name: 'Nigerian Broadcasting Commission (NBC)',
      url: 'https://www.nbc.gov.ng/',
      description: 'Regulates broadcasting services and licenses broadcasters in Nigeria.',
    },
    {
      name: 'Nigerian Postal Service (NIPOST)',
      url: 'https://www.nipost.gov.ng/',
      description: 'Provides postal services and manages postal infrastructure in Nigeria.',
    },
    {
      name: 'National Frequency Management Council',
      url: 'https://www.nfmc.gov.ng/',
      description: 'Manages the allocation and use of radio frequencies in Nigeria.',
    },
    {
      name: 'Nigerian Television Authority (NTA)',
      url: 'https://www.nta.ng/',
      description: 'Nigeria’s government-owned television network providing news and programs.',
    },
    {
      name: 'Galaxy Backbone (GBB)',
      url: 'https://www.galaxybackbone.com.ng/',
      description: 'Provides ICT infrastructure and services to government institutions.',
    },
    {
      name: 'Universal Service Provision Fund (USPF)',
      url: 'https://www.uspf.gov.ng/',
      description: 'Promotes universal access to ICT services in underserved areas.',
    },
    {
      name: 'Federal Airports Authority of Nigeria (FAAN)',
      url: 'https://www.faan.gov.ng/',
      description: 'Manages all commercial airports in Nigeria.',
    },
    {
      name: 'Nigerian Airspace Management Agency (NAMA)',
      url: 'https://www.nama.gov.ng/',
      description: 'Provides air navigation services in Nigeria’s airspace.',
    },
    {
      name: 'Nigerian Civil Aviation Authority (NCAA)',
      url: 'https://www.ncaa.gov.ng/',
      description: 'Regulates civil aviation activities in Nigeria.',
    },
    {
      name: 'Nigerian Safety Investigation Bureau (NSIB)',
      url: 'https://www.aib.gov.ng/',
      description: 'Investigates air accidents and incidents in Nigeria.',
    },
    {
      name: 'Nigerian Meteorological Agency (NIMET)',
      url: 'https://www.nimet.gov.ng/',
      description: 'Provides weather and climate information services.',
    },
    {
      name: 'Nigerian College of Aviation Technology (NCAT)',
      url: 'https://www.ncat.gov.ng/',
      description: 'Provides aviation training and education.',
    },
    {
      name: 'Cocoa Research Institute of Nigeria (CRIN)',
      url: 'https://www.crin.gov.ng/',
      description: 'Conducts research on cocoa and other crops.',
    },
    {
      name: 'National Agricultural Extension, Research and Liaison Services (NAERLS)',
      url: 'http://www.naerls.gov.ng/site2/',
      description: 'Provides agricultural extension and research services.',
    },
    {
      name: 'National Veterinary Research Institute (NVRI)',
      url: 'http://www.nvri.gov.ng/',
      description: 'Conducts research on animal diseases and vaccines.',
    },
    {
      name: 'Nigerian Agricultural Insurance Corporation (NAIC)',
      url: 'http://www.naic.org.ng/',
      description: 'Provides agricultural insurance services.',
    },
    {
      name: 'National Root Crops Research Institute (NCRI)',
      url: 'http://www.nrcri.gov.ng/',
      description: 'Researches root and tuber crops.',
    },
    {
      name: 'Agricultural Research Council of Nigeria',
      url: 'https://iart.gov.ng/IT/agricultural-research-council-of-nigeria/',
      description: 'Coordinates agricultural research activities.',
    },
    {
      name: 'Nigerian Institute for Oceanography and Marine Research',
      url: 'http://www.niomr.gov.ng/',
      description: 'Conducts research on oceanography and marine resources.',
    },
    {
      name: 'Nigerian Institute for Oil Palm Research (NIFOR)',
      url: 'http://nifor.gov.ng/',
      description: 'Researches oil palm and other palms.',
    },
    {
      name: 'Nigeria Agricultural Quarantine Service (NAQS)',
      url: 'http://www.naqs.gov.ng/',
      description: 'Ensures agricultural quarantine and biosecurity.',
    },
    {
      name: 'National Horticultural Research Institute (NIHORT)',
      url: 'http://www.nihort.gov.ng/',
      description: 'Conducts research on horticultural crops.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h4 className="text-2xl font-semibold text-gray-700 mb-6">Useful Links</h4>
      <ul className="space-y-4">
        {links.map((link, index) => (
          <li key={index} className="flex flex-col">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {link.name}
            </a>
            <p className="text-sm text-gray-600 mt-1">{link.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsefulLinks;
