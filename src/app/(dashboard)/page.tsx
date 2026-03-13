import { redirect } from "next/navigation"

export default function RootDashboardEntry() {
  // Ensure that even if the route group root is hit, it points to the explicit dashboard route
  redirect("/dashboard")
}
