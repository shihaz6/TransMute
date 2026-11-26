import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Package,
  PlusCircle,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import {
  Button,
  Card,
  cn,
  EmptyState,
  PageHeader,
  SearchInput,
  StatusChip,
} from '@/components/ui/Primitives';
import { formatRs } from '@/utils/format';

export function InventoryScreen() {
  const { inventory, createDraftPoFromInventory, setRoute } = useErp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [onlyLow, setOnlyLow] = useState(false);

  const categories = [
    'All',
    'Cooking Oil & Coconut',
    'Flour, Rice & Sugar',
    'Beverages',
    'Tea & Dairy',
    'Spices & Essentials',
  ];

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const total = item.warehouseStock + item.shopStock + item.vanStock;
      if (category !== 'All' && item.category !== category) return false;
      if (onlyLow && total > item.reorderLevel) return false;
      if (
        search.trim() &&
        !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !item.sku.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [inventory, category, onlyLow, search]);

  const reorderSuggestions = useMemo(
    () =>
      inventory.filter(
        (i) => i.suggestedReorderQty && i.warehouseStock + i.shopStock + i.vanStock <= i.reorderLevel * 1.25
      ),
    [inventory]
  );

  const totalStockValue = inventory.reduce(
    (sum, i) => sum + (i.warehouseStock + i.shopStock + i.vanStock) * i.unitCost,
    0
  );
  const whUnits = inventory.reduce((s, i) => s + i.warehouseStock, 0);
  const shopUnits = inventory.reduce((s, i) => s + i.shopStock, 0);
  const vanUnits = inventory.reduce((s, i) => s + i.vanStock, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Multi-Location Stock"
        subtitle="Live stock counts across Peliyagoda Stores, Pettah Shop, and Delivery Van 1 with AI-powered reorder suggestions."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setRoute('purchasing')}>
            View Draft POs <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        }
      />

      {/* Location Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Stock Value (Cost)</div>
          <div className="text-xl font-bold mt-1 tabular-nums">{formatRs(totalStockValue)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{inventory.length} active SKUs</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" /> Main Warehouse
          </div>
          <div className="text-xl font-bold mt-1 tabular-nums">{whUnits.toLocaleString()} units</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Peliyagoda Main Stores</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-[#EA581A]" /> Main Shop
          </div>
          <div className="text-xl font-bold mt-1 tabular-nums">{shopUnits.toLocaleString()} units</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Pettah Main Street Counter</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-500" /> Delivery Van 1
          </div>
          <div className="text-xl font-bold mt-1 tabular-nums">{vanUnits.toLocaleString()} units</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active Route: Nugegoda / Maharagama</div>
        </Card>
      </div>

      {/* AI Reorder Suggestions Panel */}
      <Card className="p-5 border-[#FFD5BE] dark:border-[#EA581A]/35 bg-gradient-to-r from-[#FFF4EE]/80 via-white to-white dark:from-[#EA581A]/10 dark:via-[#18181B] dark:to-[#18181B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EA581A]/15 text-[#EA581A] dark:text-[#FF9E66] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                AI Reorder Suggestions ({reorderSuggestions.length} SKUs)
              </h2>
              <p className="text-xs text-slate-500">
                Calculated from 14-day sales velocity + supplier lead times. Draft POs require your confirmation before sending.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {reorderSuggestions.map((item) => {
            const total = item.warehouseStock + item.shopStock + item.vanStock;
            const qty = item.suggestedReorderQty || 50;
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {item.name}
                    </div>
                    <StatusChip
                      label={`${item.daysUntilStockout ?? 2}d cover`}
                      tone={(item.daysUntilStockout ?? 5) <= 3 ? 'red' : 'amber'}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    On hand: <strong>{total} {item.unit}</strong> · Selling ~{item.dailyVelocity}/day
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Supplier: <span className="font-medium">{item.preferredSupplierName}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px]">
                    <div className="text-slate-400">Suggested PO</div>
                    <div className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {qty} {item.unit} · {formatRs(qty * item.unitCost)}
                    </div>
                  </div>
                  <Button
                    variant="gold"
                    size="xs"
                    icon={<PlusCircle className="w-3.5 h-3.5" />}
                    onClick={() => createDraftPoFromInventory(item)}
                  >
                    Create Draft PO
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stock Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer',
                  category === cat
                    ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                    : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyLow((v) => !v)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
                onlyLow
                  ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Only
            </button>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search SKU or product..."
              className="w-52"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="No inventory items match"
            description="Try clearing your category or low-stock filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Product & SKU</th>
                  <th className="px-3 py-3 font-medium text-right">Warehouse</th>
                  <th className="px-3 py-3 font-medium text-right">Shop</th>
                  <th className="px-3 py-3 font-medium text-right">Van 1</th>
                  <th className="px-4 py-3 font-medium">Reorder Health</th>
                  <th className="px-3 py-3 font-medium text-right">Cost / Sale</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((item) => {
                  const total = item.warehouseStock + item.shopStock + item.vanStock;
                  const ratio = total / item.reorderLevel;
                  const status =
                    ratio <= 0.5 ? 'Critical' : ratio <= 1 ? 'Low' : 'Healthy';
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.sku} · {item.category}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right font-medium tabular-nums">
                        {item.warehouseStock}
                      </td>
                      <td className="px-3 py-3.5 text-right font-medium tabular-nums">
                        {item.shopStock}
                      </td>
                      <td className="px-3 py-3.5 text-right font-medium tabular-nums">
                        {item.vanStock}
                      </td>
                      <td className="px-4 py-3.5 min-w-[175px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                            {total} {item.unit}
                          </span>
                          <StatusChip
                            label={status}
                            tone={
                              status === 'Critical'
                                ? 'red'
                                : status === 'Low'
                                ? 'amber'
                                : 'green'
                            }
                          />
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              status === 'Critical'
                                ? 'bg-red-500'
                                : status === 'Low'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            )}
                            style={{ width: `${Math.min(100, Math.round(ratio * 65))}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Reorder point: {item.reorderLevel} {item.unit}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {formatRs(item.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Cost {formatRs(item.unitCost)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant={status !== 'Healthy' ? 'gold' : 'secondary'}
                          size="xs"
                          onClick={() => createDraftPoFromInventory(item)}
                        >
                          Draft PO
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
