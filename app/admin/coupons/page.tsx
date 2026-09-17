import { requireAdminOrNotFound } from "../../../lib/server-auth";
import AdminCouponsClient from "./AdminCouponsClient";

export default async function AdminCouponsPage() {
  await requireAdminOrNotFound();

  return <AdminCouponsClient />;
}
