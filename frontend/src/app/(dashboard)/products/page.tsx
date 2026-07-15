import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";

export default async function ProductsPage() {
  const products = await api.listProducts().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Catalog</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The product catalog the Context agent matches customer requests against.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-zinc-500">No products yet — run backend/scripts/seed_products.py.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[.08] text-left text-xs uppercase tracking-wide text-zinc-400 dark:border-white/[.145]">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-black/[.06] last:border-0 dark:border-white/[.08]">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{product.sku}</td>
                  <td className="px-4 py-3 text-black dark:text-zinc-50">{product.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{product.category ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(product.price)}</td>
                  <td className="px-4 py-3 tabular-nums">{product.stock_quantity}</td>
                  <td className="px-4 py-3">{product.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
