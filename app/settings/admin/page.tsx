/**
 * Admin Dashboard Index
 * Redirects to the overview page
 */

import { redirect } from "next/navigation";

export default function AdminPage() {
    redirect("/settings/admin/overview");
}
