// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import Signup from "@/components/Auth/Signup";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Sign Up Page - Solid SaaS Boilerplate",
  description: "This is Sign Up page for Startup Pro"
};
export default function Register() {
  return <>
      <Signup />
    </>;
}