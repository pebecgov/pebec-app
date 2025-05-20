import { Menu } from "@/types/menu";

const menuData: Menu[] = [
  {
    id: 1,
    title: "Home",
    newTab: false,
    path: "/",
  },
  {
    id: 3,
    title: "About Us",
    newTab: false,
    submenu: [
      {
        id: 31,
        title: "Overview",
        newTab: false,
        path: "/overview",
      },
      {
        id: 34,
        title: "PEBEC Members ( Third Cohort )",
        newTab: false,
        path: "/members",
      },
      {
        id: 35,
        title: "Reforms Implemented",
        newTab: false,
        path: "/auth/signup",
      },
     
    ],
  },
  
  {
    id: 4,
    title: "Resources",
    newTab: false,
    submenu: [
      {
        id: 41,
        title: "Press Release",
        newTab: false,
        path: "/blog",
      },
      {
        id: 44,
        title: "Our Reports",
        newTab: false,
        path: "/auth/signin",
      },
      {
        id: 45,
        title: "FAQ",
        newTab: false,
        path: "/auth/signup",
      },
      
    ],
  },

  {
    id: 5,
    title: "Events",
    newTab: false,
    path: "/events",
  },


  {
    id: 4,
    title: "Contact us",
    newTab: false,
    path: "/support",
  },

];

export default menuData;
