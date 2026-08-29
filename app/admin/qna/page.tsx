import { requireAdminOrNotFound } from "../../../lib/server-auth";
import AdminQnaClient from "./AdminQnaClient";

export default async function AdminQnaPage() {
    await requireAdminOrNotFound();

    return <AdminQnaClient />;
}
