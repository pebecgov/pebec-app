import { redirect } from "next/navigation";

export default function TrackerRedirect() {
  // Official letters were sent with /tracker links
  // Redirect to states as the default tracker page
  redirect("/tracker/states");
}