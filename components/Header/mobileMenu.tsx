// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaTimes, FaBars, FaUser, FaHome, FaBriefcase, FaFileAlt, FaBell, FaUserCog, FaCalendarAlt, FaPhone, FaInfoCircle, FaSignInAlt, FaSignOutAlt, FaChevronDown, FaGlobe } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton, SignOutButton, useClerk, UserButton, useUser } from "@clerk/nextjs";
import NotificationBadge from "../NotificationBadge";
import { Home, Briefcase, User, Phone } from "lucide-react";
import { Menu, Transition } from "@headlessui/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { FaTicket } from "react-icons/fa6";
interface NavItemProps {
  id: string;
  href: string;
  label: string;
  Icon: React.ComponentType<{
    className?: string;
  }>;
  activeItem: string;
  onClick: () => void;
  isNotification?: boolean;
  pathname: string;
}
const MobileMenu = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
  const {
    user
  } = useUser();
  const [activeItem, setActiveItem] = useState("");
  const pathname = usePathname();
  const {
    openSignIn
  } = useClerk();
  const {
    signOut
  } = useClerk();
  const router = useRouter();
  const userRole = user?.publicMetadata?.role;
  const staffStream = user?.publicMetadata?.stream;
  const dashboardLink = userRole === "admin" ? "/admin" : userRole === "mda" ? "/mda" : userRole === "staff" && staffStream === "investments" ? "/staff/projects" : userRole === "staff" && staffStream === "receptionist" ? "/staff/letters" : userRole === "staff" ? "/staff" : userRole === "reform_champion" ? "/reform_champion" : userRole === "deputies" ? "/deputies" : userRole === "magistrates" ? "/magistrates" : userRole === "state_governor" ? "/state_governor" : userRole === "vice_president" ? "/vice_president" : userRole === "president" ? "/president" : userRole === "receiptionist" ? "/receiptionist" : userRole === "account" ? "/account" : userRole === "auditor" ? "/auditor" : userRole === "saber_agent" ? "/saber_agent" : "/reportgov";
  const userRoleText = userRole === "staff" && staffStream === "investments" ? "Investments Dashboard" : userRole === "staff" && staffStream === "receptionist" ? "Reception Desk" : userRole === "admin" ? "Admin" : userRole === "mda" ? "ReportGov Agent" : userRole === "staff" ? "Staff Center" : userRole === "reform_champion" ? "Reform Champion" : userRole === "deputies" ? "Deputy Sheriffs" : userRole === "magistrates" ? "Magistrate Center" : userRole === "state_governor" ? "State Governor" : userRole === "vice_president" ? "VP Dashboard" : userRole === "president" ? "President Dashboard" : userRole === "saber_agent" ? "Saber Dashboard" : "Dashboard";
  const handleReportGovClick = () => {
    if (!user) {
      openSignIn();
    } else if (userRole === "admin") {
      window.location.href = "/admin";
    } else if (userRole === "mda") {
      window.location.href = "/mda";
    } else {
      window.location.href = "/user";
    }
  };
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuOpen && !(event.target as HTMLElement).closest(".mobile-menu") && !(event.target as HTMLElement).closest(".mobile-menu-button")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [menuOpen]);
  const toggleDropdown = (id: string) => {
    setDropdownOpen(prev => ({
      ...Object.fromEntries(Object.keys(prev).map(key => [key, false])),
      [id]: !prev[id]
    }));
  };
  const handleNavClick = (id: string, fromMoreMenu: boolean = false) => {
    if (id !== "notifications") {
      if (fromMoreMenu) {
        setActiveItem("");
      } else {
        setActiveItem(id);
      }
    }
    setMenuOpen(false);
  };
  return <>
   {}
   <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-lg shadow-lg rounded-t-2xl px-4 py-3 flex justify-around items-center text-gray-400 border-t border-gray-700 z-50">
        <NavItem id="home" href="/" label="Home" Icon={FaHome} activeItem={activeItem} pathname={pathname} onClick={() => setActiveItem("home")} />
        <NavItem id="portal" href="/portal" label="e-Portal" Icon={FaGlobe} activeItem={activeItem} pathname={pathname} onClick={() => setActiveItem("portal")} />

        {}
        {user ? <NavItem id="notifications" href="#" label="Alerts" Icon={NotificationBadge} pathname={pathname} activeItem={activeItem} onClick={() => setActiveItem("notifications")} /> : <NavItem id="contact" href="/support" label="Contact" Icon={FaPhone} activeItem={activeItem} pathname={pathname} onClick={() => setActiveItem("contact")} />}

        {}
        <button className="relative flex flex-col items-center text-sm text-gray-400" onClick={() => setMenuOpen(true)}>
          <FaBars className="text-2xl" />
          <span className="text-xs mt-1">More</span>
        </button>
      </div>

      {}
      {menuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-80 bg-white h-full shadow-lg p-6 overflow-y-auto relative rounded-l-2xl mobile-menu">
            
            {}
            <button className="absolute top-3 right-3 p-2 bg-gray-200 rounded-full shadow-md z-50" onClick={() => setMenuOpen(false)}>
              <FaTimes size={20} className="text-gray-700" />
            </button>

            {}
            {user ? <div className="flex flex-col items-center gap-4 mt-10 mb-6 p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg shadow-md">
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
    </Menu>                <div className="text-center">
                  <p className="text-lg font-semibold">{user.fullName}</p>
                  <p className="text-sm">{user.primaryEmailAddress?.emailAddress}</p>
                </div>
                <Link href={dashboardLink} className="flex items-center gap-2 text-white font-medium">
                  <FaUserCog className="text-xl" />
                  <span>{userRoleText}</span>
                </Link>
              </div> : <SignedOut>
                <div className="w-full flex justify-center mt-10 mb-4">
                  <SignInButton mode="modal">
                    <Button className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg">
                      <FaSignInAlt /> Sign In
                    </Button>
                  </SignInButton>
                </div>
              </SignedOut>}

            {}
            <nav className="mt-2">
              <ul className="space-y-4 text-lg font-medium text-gray-900">
                <li>
                <Link href="/" onClick={() => handleNavClick("home", false)} className="p-3 bg-gray-100 rounded-lg flex items-center gap-2">
                <FaHome /> Home
                  </Link>
                </li>

                {}
                <li>
                  <button onClick={() => toggleDropdown("about")} className="flex items-center justify-between w-full p-3 bg-gray-100 rounded-lg">
                    <span className="flex items-center gap-2">
                      <FaInfoCircle /> About Us
                    </span>
                    <FaChevronDown />
                  </button>
                  {dropdownOpen["about"] && <div className="ml-4 mt-2 space-y-2 bg-gray-50 p-3 rounded-lg">
                        <ul className="ml-4 mt-2 space-y-2 bg-gray-50 p-3 rounded-lg"> {}

                    <li>
      <Link href="/overview" className="text-gray-600 hover:text-green-700">
        Overview
      </Link>
    </li>
    <li>
      <Link href="/members" className="text-gray-600 hover:text-green-700">
        Members
      </Link>
    </li>
    <li>
      <Link href="/reforms" className="text-gray-600 hover:text-green-700">
        Reforms
      </Link>
    </li>
    </ul>
                      {}
                      <div className="mt-4 bg-green-600 text-white p-4 rounded-lg shadow-md text-center">
                        <h5 className="text-lg font-bold">Our Mission & Vision</h5>
                        <p className="text-sm mt-2 opacity-95">
                          Transforming Nigeria’s business environment.
                        </p>
                        <Link href="/vision-mission">
                          <button className="mt-3 bg-white text-green-700 px-4 py-1 rounded-md shadow-md transition-all hover:bg-gray-200">
                            Learn More
                          </button>
                        </Link>
                      </div>
                    </div>}
                </li>

                {}
                <li>
                  <button onClick={() => toggleDropdown("resources")} className="flex items-center justify-between w-full p-3 bg-gray-100 rounded-lg">
                    <span className="flex items-center gap-2">
                      <FaFileAlt /> Resources
                    </span>
                    <FaChevronDown />
                  </button>
                  {dropdownOpen["resources"] && <ul className="ml-4 mt-2 space-y-2 bg-gray-50 p-3 rounded-lg">
                      <li><Link href="/reports">Reports</Link></li>
                      <li><Link href="/faq">FAQ</Link></li>
                      <li><Link href="/frameworks">Frameworks</Link></li>
                      <li><Link href="/downloads">Downloads</Link></li>
                      <li><Link href="/media">Gallery</Link></li>

                    </ul>}
                </li>
                <li>
                  <Link href="/events" className="p-3 bg-gray-100 rounded-lg flex items-center gap-2">
                    <FaTicket /> Events
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="p-3 bg-gray-100 rounded-lg flex items-center gap-2">
                    <FaPhone /> Contact Us
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>}
    </>;
};
const NavItem: React.FC<NavItemProps> = ({
  id,
  href,
  label,
  Icon,
  activeItem,
  onClick,
  isNotification,
  pathname
}) => {
  const isActive = pathname === href && !isNotification;
  return <Link href={href || "#"} onClick={onClick} className="relative flex flex-col items-center text-sm">
      <div className="relative flex items-center justify-center">
        <AnimatePresence>
          {isActive && <motion.div initial={{
          scale: 0.5,
          y: 15,
          opacity: 0
        }} animate={{
          scale: 1.2,
          y: -20,
          opacity: 1
        }} exit={{
          scale: 0.5,
          y: 15,
          opacity: 0
        }} transition={{
          type: "spring",
          stiffness: 200,
          damping: 20
        }} className="absolute -top-7 w-14 h-14 bg-green-800 rounded-full shadow-lg" />}
        </AnimatePresence>

        <motion.div animate={{
        y: isActive ? -30 : 0
      }} transition={{
        type: "spring",
        stiffness: 200,
        damping: 15
      }} className={`relative z-10 text-2xl ${isActive ? "text-white" : "text-gray-400"}`}>
          {isNotification ? <NotificationBadge /> : <Icon />}
        </motion.div>
      </div>
      <span className={`text-xs mt-3 ${isActive ? "text-green-800 font-bold" : "text-gray-400"}`}>
        {label}
      </span>
    </Link>;
};
export default MobileMenu;