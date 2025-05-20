"use client";
import Image from "next/image";
import Link from "next/link";

const President = () => {
  return (
    <section className="w-full bg-[#0c3c1a] text-white py-12 px-6 md:px-16">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10">
      {/* Text */}
        <div className="flex-1 text-center lg:text-left">
          <h2 className="text-xl md:text-2xl font-semibold uppercase mb-2 tracking-widest">
            His Excellency
          </h2>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            BOLA AHMED TINUBU <span className="text-sm align-super">GCFR</span>
          </h1>
          <p className="text-lg md:text-xl font-medium">
            PRESIDENT AND COMMANDER-IN-CHIEF OF THE ARMED FORCES<br />
            FEDERAL REPUBLIC OF NIGERIA
          </p>

            {/* Social Media */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mt-7">
            <Link href="https://x.com/officialabat" target="_blank">
              <button className="relative w-12 h-12 rounded-full group">
                <div className="floater w-full h-full absolute top-0 left-0 bg-black rounded-full duration-300 group-hover:-top-2 group-hover:shadow-2xl" />
                <div className="icon relative z-10 w-full h-full flex items-center justify-center border-2 border-black rounded-full">
                  <svg fill="white" viewBox="0 0 22 22" height="20" width="20">
                    <path d="M12.8115 9.3155L20.8253 0H18.9263L11.9679 8.08852L6.41015 0H0L8.40433 12.2313L0 22H1.89914L9.24745 13.4583L15.1168 22H21.5269L12.811 9.3155H12.8115ZM10.2103 12.339L9.35878 11.1211L2.58343 1.42964H5.5004L10.9682 9.25094L11.8197 10.4689L18.9272 20.6354H16.0102L10.2103 12.3395V12.339Z" />
                  </svg>
                </div>
              </button>
            </Link>

            <Link href="https://www.facebook.com/officialasiwajubat" target="_blank">
              <button className="relative w-12 h-12 rounded-full group">
                <div className="floater w-full h-full absolute top-0 left-0 bg-blue-600 rounded-full duration-300 group-hover:-top-2 group-hover:shadow-2xl" />
                <div className="icon relative z-10 w-full h-full flex items-center justify-center border-2 border-blue-600 rounded-full">
                  <svg fill="white" viewBox="0 0 13 22" height="20" width="13">
                    <path d="M7.71289 22H4.1898C3.60134 22 3.12262 21.5213 3.12262 20.9328V12.9863H1.06717C0.478672 12.9863 0 12.5074 0 11.9191V8.514C0 7.9255 0.478672 7.44683 1.06717 7.44683H3.12262V5.74166C3.12262 4.05092 3.6535 2.6125 4.65773 1.58207C5.6665 0.546992 7.07627 0 8.7346 0L11.4214 0.00438281C12.0089 0.00537109 12.4868 0.484086 12.4868 1.07151V4.23311C12.4868 4.82157 12.0083 5.30028 11.4199 5.30028L9.61091 5.30093C9.05919 5.30093 8.91868 5.41153 8.88864 5.44543C8.83914 5.50172 8.78023 5.66062 8.78023 6.09954V7.4467H11.284C11.4725 7.4467 11.6551 7.49319 11.812 7.58076C12.1506 7.76995 12.3611 8.12762 12.3611 8.51417L12.3597 11.9193C12.3597 12.5074 11.881 12.9861 11.2926 12.9861H8.78019V20.9328C8.78023 21.5213 8.30139 22 7.71289 22Z" />
                  </svg>
                </div>
              </button>
            </Link>

            <Link href="https://www.instagram.com/officialasiwajubat/" target="_blank">
              <button className="relative w-12 h-12 rounded-full group">
                <div className="floater w-full h-full absolute top-0 left-0 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full duration-300 group-hover:-top-2 group-hover:shadow-2xl" />
                <div className="icon relative z-10 w-full h-full flex items-center justify-center border-2 border-pink-500 rounded-full">
                <svg
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  fill="white"
  viewBox="0 0 448 512"
>
  <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9S160.5 370.9 224.1 370.9 339 319.6 339 255.9 287.7 141 224.1 141zm0 189.6c-41.2 0-74.7-33.5-74.7-74.7S182.9 181.2 224.1 181.2s74.7 33.5 74.7 74.7-33.5 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.9-26.9 26.9-14.9 0-26.9-12-26.9-26.9s12-26.9 26.9-26.9c14.9 0 26.9 12 26.9 26.9zm76.1 27.2c-1.7-35.7-9.9-67.2-36.3-93.6S368.4 24.6 332.7 22.9C297 21.1 256.5 21 224.1 21s-72.9.1-108.6 1.8c-35.7 1.7-67.2 9.9-93.6 36.3S24.6 143.6 22.9 179.3C21.1 215 21 255.5 21 287.9s.1 72.9 1.8 108.6c1.7 35.7 9.9 67.2 36.3 93.6s57.9 34.6 93.6 36.3c35.7 1.7 76.2 1.8 108.6 1.8s72.9-.1 108.6-1.8c35.7-1.7 67.2-9.9 93.6-36.3s34.6-57.9 36.3-93.6c1.7-35.7 1.8-76.2 1.8-108.6s-.1-72.9-1.8-108.6zm-48.5 236.4c-7.8 19.6-22.9 34.6-42.5 42.5-29.4 11.7-99.3 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.6-22.9-42.5-42.5-11.7-29.4-9-99.3-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.6 42.5-42.5 29.4-11.7 99.3-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.6 22.9 42.5 42.5 11.7 29.4 9 99.3 9 132.1s2.6 102.7-9 132.1z" />
</svg>

                </div>
              </button>
            </Link>
          </div>
        </div>
           

        {/* Image */}
        <div className="flex-1 w-full max-w-sm"> 
          <Image
            src="/images/president.jpg"
            alt="President Bola Ahmed Tinubu"
            width={400}
            height={500}
            className="rounded-lg shadow-lg object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default President;
