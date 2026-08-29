import { requireAdminOrNotFound } from "../../../lib/server-auth";
import AdminShell from "../AdminShell";
import ProductRegister from "../ProductRegister";

export default async function AdminProductsPage() {
    await requireAdminOrNotFound();

    return (
        <AdminShell active="/admin/products" title="상품 관리">
            <ProductRegister />
        </AdminShell>
    );
}
