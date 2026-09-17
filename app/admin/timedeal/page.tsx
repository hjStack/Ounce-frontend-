import { requireAdminOrNotFound } from "../../../lib/server-auth";
import AdminShell from "../AdminShell";
import AdminTimeDealClient from "./AdminTimeDealClient";

export default async function AdminTimeDealPage() {
  await requireAdminOrNotFound();

  return (
    <AdminShell active="/admin/timedeal" title="미드나이트 관리">
      <AdminTimeDealClient />
    </AdminShell>
  );
}
