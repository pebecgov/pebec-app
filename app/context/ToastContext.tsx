// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { Toaster } from "react-hot-toast";
const ToasterContext = () => {
  return <div>
      <Toaster position="top-center" reverseOrder={false} />
    </div>;
};
export default ToasterContext;