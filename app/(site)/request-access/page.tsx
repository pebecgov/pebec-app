import { Metadata } from "next";
import InternalRequestContent from "./InternalRequestContent";

export const metadata: Metadata = {
  title: "Request Access",
  description: "Request internal access",
};

export default function InternalRequestPage() {
  return <InternalRequestContent />;
}
