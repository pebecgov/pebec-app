// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { Metadata } from "next";
import InternalRequestContent from "./InternalRequestContent";
export const metadata: Metadata = {
  title: "Request Access",
  description: "Request internal access"
};
export default function InternalRequestPage() {
  return <InternalRequestContent />;
}