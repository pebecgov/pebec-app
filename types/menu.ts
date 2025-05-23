// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
export type Menu = {
  id: number;
  title: string;
  path?: string;
  newTab: boolean;
  submenu?: Menu[];
};