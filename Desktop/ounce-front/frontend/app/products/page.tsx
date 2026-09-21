import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background-cream pt-28" />}>
            <ProductsClient />
        </Suspense>
    );
}
