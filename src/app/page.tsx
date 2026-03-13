import { redirect } from "next/navigation"

export default function RootPage() {
  // Redirect to the dashboard sub-route to avoid infinite loop on the root
  redirect("/dashboard")
}
