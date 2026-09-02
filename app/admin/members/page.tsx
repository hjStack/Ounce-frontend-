import { requireAdminOrNotFound } from "../../../lib/server-auth";
import AdminMembersClient from "./AdminMembersClient";

export default async function AdminMembersPage() {
    await requireAdminOrNotFound();

    return <AdminMembersClient />;
}
