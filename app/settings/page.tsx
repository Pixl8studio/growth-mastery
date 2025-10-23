/**
 * Settings Page
 * Redirects to profile settings by default
 */

import { redirect } from "next/navigation";

export default function SettingsPage() {
    redirect("/settings/profile");
}
