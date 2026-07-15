import { Package } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { formatMoney } from "@/lib/format";

export default async function ProductsPage() {
  const products = await api.listProducts().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-heading-lg text-neutral-900">Catalog</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          The product catalog the Context agent matches customer requests against.
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Run backend/scripts/seed_products.py to load the catalog."
        />
      ) : (
        <Table>
          <Thead>
            <Th>SKU</Th>
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Price</Th>
            <Th>Stock</Th>
            <Th>Active</Th>
          </Thead>
          <tbody>
            {products.map((product) => (
              <Tr key={product.id}>
                <Td className="font-mono text-body-sm text-neutral-500">{product.sku}</Td>
                <Td className="font-medium text-neutral-900">{product.name}</Td>
                <Td className="text-neutral-500">{product.category ?? "—"}</Td>
                <Td className="tabular-nums">{formatMoney(product.price)}</Td>
                <Td className="tabular-nums">{product.stock_quantity}</Td>
                <Td>
                  <Badge tone={product.is_active ? "success" : "neutral"}>
                    {product.is_active ? "Yes" : "No"}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
