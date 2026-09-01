import { requireAdminOrNotFound } from "../../../../../lib/server-auth";
import AdminShell from "../../../AdminShell";
import AdminProductEditClient from "./AdminProductEditClient";

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
    await requireAdminOrNotFound();

    const { id } = await params;

    return (
        <AdminShell active="/admin/products" title="상품 수정">
            <AdminProductEditClient productId={id} />
        </AdminShell>
    );
}
