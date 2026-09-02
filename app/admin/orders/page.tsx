import { requireAdminOrNotFound } from "../../../lib/server-auth";
import AdminOrdersClient from "./AdminOrdersClient";

export default async function AdminOrdersPage() {
    await requireAdminOrNotFound();

    return <AdminOrdersClient />;
}
