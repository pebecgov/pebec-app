// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import Signin from "@/components/Auth/Signin";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Login Page - Solid SaaS Boilerplate",
  description: "This is Login page for Startup Pro"
};
const SigninPage = () => {
  return <>
      <Signin />
    </>;
};
export default SigninPage;