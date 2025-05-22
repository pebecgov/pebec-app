// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

type ReformHeroProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};
export default function ReformHero({
  searchQuery,
  setSearchQuery
}: ReformHeroProps) {
  return <section className="relative bg-cover bg-center text-white py-28 px-4 text-center mt-25" style={{
    backgroundImage: "url('/images/reforms/reformshero.svg')"
  }}>
      <div className="bg-black/40 backdrop-blur-sm py-10 px-4 rounded-lg">
        <h1 className="text-4xl font-extrabold mb-4">Explore Nigeria's Business Reforms</h1>
        <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
          Driving growth, efficiency & transparency.
        </p>

        {}
        <div className="max-w-xl mx-auto">
          <input type="text" placeholder="Search reforms..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent border border-gray-300 rounded-lg py-3 px-4 text-white placeholder:text-gray-300 focus:ring-2 focus:ring-green-500 focus:outline-none" />
        </div>
      </div>
    </section>;
}