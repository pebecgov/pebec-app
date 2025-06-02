// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { FaLaptopCode, FaSignOutAlt } from "react-icons/fa";
import { IoChevronDownOutline } from "react-icons/io5";
import { SignedIn, SignedOut, SignInButton, useClerk, UserButton, useUser } from "@clerk/nextjs";
import NotificationBadge from "../NotificationBadge";
import MobileMenu from "./mobileMenu";
import { Suspense } from "react";
import { MdDashboard, MdPeople, MdAnalytics, MdAssignment, MdContactMail, MdLibraryBooks } from "react-icons/md";
import { Button } from "../ui/button";
import { MenuHandler, MenuList, MenuItem, Card, Typography } from "@material-tailwind/react";
import { CursorArrowRaysIcon } from "@heroicons/react/24/solid";
import ReportGovModal from "@/app/(site)/reportgov-options/page";
import { Globe } from "lucide-react";
import { FaCameraRetro } from "react-icons/fa";
import { toast } from "sonner";
import VerifyPrimaryEmail from "../VerifyPrimaryEmail";
import { Menu, Transition } from "@headlessui/react";
const Header = () => {
  let hoverTimeout: NodeJS.Timeout;
  const [stickyMenu, setStickyMenu] = useState(false);
  const {
    openSignIn
  } = useClerk();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"about" | "resources" | null>(null);
  const [showReportGovModal, setShowReportGovModal] = useState(false);
  const {
    signOut
  } = useClerk();
  const router = useRouter();
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const pathname = usePathname();
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);
  useEffect(() => {
    setActiveDropdown(null);
  }, [pathname]);
  useEffect(() => {
    setAboutDropdownOpen(false);
    setResourcesDropdownOpen(false);
  }, [pathname]);
  useEffect(() => {
    setAboutDropdownOpen(false);
  }, [pathname]);
  const handleSignOut = async () => {
    toast("Signing out...", {
      duration: 500
    });
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("❌ Error signing out:", error);
      toast.error("Sign out failed.");
    }
  };
  const {
    user
  } = useUser();
  const userRole = user?.publicMetadata?.role;
  const staffStream = user?.publicMetadata?.stream;
  const dashboardLink = userRole === "admin" ? "/admin" : userRole === "mda" ? "/mda" : userRole === "staff" && staffStream === "investments" ? "/staff/projects" : userRole === "staff" && staffStream === "receptionist" ? "/staff/letters" : userRole === "staff" ? "/staff" : userRole === "reform_champion" ? "/reform_champion" : userRole === "deputies" ? "/deputies" : userRole === "magistrates" ? "/magistrates" : userRole === "state_governor" ? "/state_governor" : userRole === "vice_president" ? "/vice_president" : userRole === "president" ? "/president" : userRole === "receiptionist" ? "/receiptionist" : userRole === "account" ? "/account" : userRole === "auditor" ? "/auditor" : userRole === "saber_agent" ? "/saber_agent" : "/reportgov";
  const userRoleText = userRole === "staff" && staffStream === "investments" ? "Investments Dashboard" : userRole === "staff" && staffStream === "receptionist" ? "Reception Desk" : userRole === "admin" ? "Admin" : userRole === "mda" ? "ReportGov Agent" : userRole === "staff" ? "Staff Center" : userRole === "reform_champion" ? "Reform Champion" : userRole === "deputies" ? "Sheriffs Dashboard" : userRole === "magistrates" ? "Magistrate Center" : userRole === "state_governor" ? "State Governor " : userRole === "vice_president" ? "VP Dashboard" : userRole === "president" ? "President Dashboard" : userRole === "saber_agent" ? "Saber Dashboard" : "Dashboard";
  const pathUrl = usePathname();
  useEffect(() => {
    const handleStickyMenu = () => setStickyMenu(window.scrollY >= 80);
    window.addEventListener("scroll", handleStickyMenu);
    return () => window.removeEventListener("scroll", handleStickyMenu);
  }, []);
  const handleReportGovClick = () => {
    window.location.href = "/reportgov-ng";
  };
  return <header className={`fixed left-0 top-0 w-full py-6 transition duration-200 ${stickyMenu ? "bg-white !py-4 shadow dark:bg-black" : "bg-transparent"} ${modalOpen ? "pointer-events-none opacity-50" : "z-50"}`}>
      <div className="relative mx-auto max-w-7xl flex items-center justify-between px-4 md:px-8 xl:px-0">
        {}
        <a href="/" className="flex items-center gap-3">
          <Image src="/images/logo/logo_pebec1.PNG" alt="logo" width={140} height={40} priority />
        </a>

        {}
     {}
      <div className="xl:hidden flex items-center gap-2">
  {}
  <button onClick={handleReportGovClick} className="flex items-center rounded-full bg-[#FF3226] text-white text-xs font-bold px-2.5 py-1.5">
    reportgov
    <span className="ml-1 bg-[#2D8B10] text-white text-[10px] px-1 py-0.5 rounded">
      .ng
    </span>
  </button>

  {}
  <Link href="/saber" className="flex items-center gap-1 rounded-full bg-[#2563EB] text-white text-xs font-bold px-3 py-1.5">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 ..."></path>
    </svg>
    SABER
  </Link>

  {}
  <MobileMenu />
      </div>


        {}
        <nav className="hidden xl:flex ">
          <ul className="flex space-x-6 text-gray-700 dark:text-white text-[15px] font-medium">
            {}
            <li>
              <a href="/" className={`hover:text-[#2D8B10] dark:hover:text-gray-300 ${pathUrl === "/" ? "text-[#2D8B10] font-semibold" : ""}`}>
                Home
              </a>
            </li>

           {}
        {}
        <li className="relative" onMouseEnter={() => {
            clearTimeout(hoverTimeout);
            setActiveDropdown("about");
          }} onMouseLeave={() => {
            hoverTimeout = setTimeout(() => setActiveDropdown(null), 150);
          }}>
  {}
  <button className="flex items-center gap-1 hover:text-[#2D8B10]">
    About Us <IoChevronDownOutline className="text-gray-500 text-lg" />
  </button>

  {}
  {activeDropdown === "about" && <div className="absolute left-[-120px] top-[60px] w-[900px] bg-white shadow-xl rounded-xl py-8 px-10 grid grid-cols-3 gap-10 border border-gray-200 z-50">
      {}
      <div className="col-span-2 grid grid-cols-2 gap-x-10 gap-y-8">
        {[{
                  title: "Overview",
                  description: "Discover the vision and goals of PEBEC.",
                  icon: MdDashboard,
                  path: "/overview"
                }, {
                  title: "Members",
                  description: "Meet the people behind the transformation.",
                  icon: MdPeople,
                  path: "/members"
                }, {
                  title: "Reforms",
                  description: "Explore ongoing reforms and initiatives.",
                  icon: MdAssignment,
                  path: "/reforms"
                }, {
                  title: "Contact Us",
                  description: "Get in touch with us!",
                  icon: MdAnalytics,
                  path: "/support"
                }].map(({
                  title,
                  description,
                  icon: Icon,
                  path
                }) => <Link key={title} href={path}>
            <div className="flex items-start gap-4 p-5 rounded-lg transition-all hover:bg-gray-100">
              <Icon className="h-8 w-8 text-green-700" />
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{description}</p>
              </div>
            </div>
          </Link>)}
      </div>

      {}
      <div className="relative flex flex-col justify-center items-center rounded-lg p-8 text-white text-center shadow-lg hover:scale-[1.02] transition-all duration-300" style={{
                background: `linear-gradient(to bottom, rgba(34, 139, 34, 0.85), rgba(34, 139, 34, 0.7)), url('/images/vision.png')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "10px",
                marginTop: "10px"
              }}>
        <h5 className="text-lg font-bold leading-tight">Our Mission & Vision</h5>
        <p className="text-sm mt-2 opacity-95 leading-relaxed">
          Transforming the Nigerian business environment.
        </p>
        <Link href="/vision-mission">
          <button className="mt-6 bg-white text-green-700 px-6 py-2 rounded-md shadow-md transition-all hover:bg-gray-200">
            Learn More
          </button>
        </Link>
      </div>
    </div>}
          </li>



          <li className="relative" onMouseEnter={() => {
            clearTimeout(hoverTimeout);
            setActiveDropdown("resources");
          }} onMouseLeave={() => {
            hoverTimeout = setTimeout(() => setActiveDropdown(null), 150);
          }}>
  <button className="flex items-center gap-1 hover:text-[#2D8B10]">
    Resources <IoChevronDownOutline className="text-gray-500 text-lg" />
  </button>

  {activeDropdown === "resources" && <div className="absolute left-0 top-full w-[480px] bg-white shadow-lg rounded-md py-5 px-6 grid grid-cols-2 gap-4 z-50">
      {[{
                title: "Reports",
                path: "/reports",
                icon: MdLibraryBooks
              }, {
                title: "FAQ",
                path: "/faq",
                icon: MdContactMail
              }, {
                title: "Frameworks",
                path: "/frameworks",
                icon: MdAssignment
              }, {
                title: "Downloads",
                path: "/downloads",
                icon: MdAnalytics
              }, {
                title: "Gallery",
                path: "/media",
                icon: FaCameraRetro
              }].map((item, key) => <Link key={key} href={item.path} className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-100">
          <item.icon className="text-[#2D8B10] text-lg" />
          <div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-gray-500">Learn more</p>
          </div>
        </Link>)}
    </div>}
          </li>

            <li>
              <a href="/portal" className={`hover:text-[#2D8B10] dark:hover:text-gray-300 ${pathUrl === "/portal" ? "text-[#2D8B10] font-semibold" : ""}`}>
                ePortal
              </a>
            </li>

            <li>
              <a href="/events" className={`hover:text-[#2D8B10] dark:hover:text-gray-300 ${pathUrl === "/events" ? "text-[#2D8B10] font-semibold" : ""}`}>
                Events
              </a>
            </li>


          </ul>
        </nav>

          {}
      {}
      <div className="hidden xl:flex items-center gap-3">
  {}
  <SignedOut>
    <SignInButton mode="modal">
      <button className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-5 py-2 rounded-full shadow-md transition-all duration-200">
        Sign In
      </button>
    </SignInButton>
  </SignedOut>

  <SignedIn>
  <div className="flex items-center gap-3 relative">
    {}
    <Menu as="div" className="relative">
      <div>
        <Menu.Button className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden border border-gray-300 hover:ring-2 hover:ring-green-600 transition">
          <Image src={user?.imageUrl || "/default-avatar.png"} alt="Profile" width={40} height={40} className="object-cover w-full h-full" />
        </Menu.Button>
      </div>

      {}
      <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
        <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            {}
            <Menu.Item>
              {({
                        active
                      }) => <Link href={dashboardLink} className={`${active ? "bg-gray-100" : ""} block px-4 py-2 text-sm text-gray-700`}>
                  {userRoleText}
                </Link>}
            </Menu.Item>

            {}
            <Menu.Item>
              {({
                        active
                      }) => <button onClick={handleSignOut} className={`${active ? "bg-red-500 text-white" : "text-gray-700"} flex w-full items-center px-4 py-2 text-sm`}>
                  <FaSignOutAlt className="mr-2" />
                  Sign Out
                </button>}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>

    {}
    <Link href={dashboardLink} className="text-sm font-medium text-gray-800 hover:text-green-700 transition">
      {userRoleText}
    </Link>
  </div>
        </SignedIn>


  {}
  <div className="flex overflow-hidden text-sm font-semibold rounded-full shadow-md">
    <button onClick={handleReportGovClick} className="bg-[#FF3226] hover:bg-[#e02c21] text-white flex items-center gap-1 px-4 py-2 transition duration-200">
      reportgov
      <span className="bg-[#2D8B10] text-white px-1.5 py-0.5 text-[10px] rounded">
        .ng
      </span>
    </button>
    <Link href="/saber" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 transition duration-200">
      <Globe className="w-4 h-4" />
      SABER
    </Link>
  </div>

  {}
  {user && <NotificationBadge />}
  {showReportGovModal && <ReportGovModal onClose={() => setShowReportGovModal(false)} />}
      </div>

      </div>

    </header>;
};
export default Header;