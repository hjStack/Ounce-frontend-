import { requireAdminOrNotFound } from "../../lib/server-auth";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
    await requireAdminOrNotFound();

    return <AdminDashboardClient />;
}
