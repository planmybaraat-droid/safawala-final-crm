import { redirect } from "next/navigation"

// The delivery portal merged into the Fulfillment Portal — this stub keeps
// old bookmarks and stored notification action_urls from dead-ending.
export default function Page() {
  redirect("/portal/fulfillment/deliveries")
}
