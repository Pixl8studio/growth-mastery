/**
 * Dashboard Page
 * Redirects to funnel builder (main landing page)
 */

import { redirect } from "next/navigation";

export default function DashboardPage() {
    redirect("/funnel-builder");
}
