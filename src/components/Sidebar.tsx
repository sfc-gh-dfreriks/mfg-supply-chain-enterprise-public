import { LayoutDashboard, TrendingUp, ListChecks, Gauge, Boxes, Factory, Network, Layers, Truck, ShieldCheck, PackageCheck, Ship, Warehouse,
  HeartPulse, Fingerprint, Calculator, DatabaseZap, Map, Database, GitBranch, Check, Sparkles, Columns3, BookOpen } from 'lucide-react';
import { useFilters } from '@/hooks/useFilters';
import { cn } from '@/lib/utils';

export type PageId = 'ask-cortex' | 'overview' | 'demand' | 'mrp' | 'capacity' | 'inventory' | 'production' | 'assets' | 'bom' | 'digital-thread'
  | 'inbound' | 'supplier-quality' | 'fulfillment' | 'logistics' | 'warehouse' | 'cost' | 'masterdata' | 'network'
  | 'data-sources' | 'field-mapping' | 'sap-metadata' | 'lineage' | 'pipeline-3d';

export interface NavItem { id: PageId; label: string; icon: React.ElementType; }

export const NAV_ITEMS: NavItem[] = [
  { id: 'ask-cortex', label: 'Ask Cortex', icon: Sparkles },
  { id: 'overview', label: 'Executive Control Tower', icon: LayoutDashboard },
  { id: 'demand', label: 'Demand & S&OP', icon: TrendingUp },
  { id: 'mrp', label: 'Supply Planning & MRP', icon: ListChecks },
  { id: 'capacity', label: 'Capacity', icon: Gauge },
  { id: 'inventory', label: 'Inventory Optimization', icon: Boxes },
  { id: 'production', label: 'Production & OEE', icon: Factory },
  { id: 'assets', label: 'Asset Health', icon: HeartPulse },
  { id: 'bom', label: 'BOM & Engineering Change', icon: Layers },
  { id: 'digital-thread', label: 'Digital Thread', icon: Fingerprint },
  { id: 'inbound', label: 'Inbound Supply & Suppliers', icon: Truck },
  { id: 'supplier-quality', label: 'Supplier Quality', icon: ShieldCheck },
  { id: 'fulfillment', label: 'Order Fulfillment & OTIF', icon: PackageCheck },
  { id: 'logistics', label: 'Logistics & Freight', icon: Ship },
  { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { id: 'cost', label: 'Cost Variance', icon: Calculator },
  { id: 'masterdata', label: 'Material Master Quality', icon: DatabaseZap },
  { id: 'network', label: 'Supply Network', icon: Map },
  { id: 'data-sources', label: 'Data Sources', icon: Database },
  { id: 'field-mapping', label: 'Field Mapping', icon: Columns3 },
  { id: 'sap-metadata', label: 'SAP Metadata', icon: BookOpen },
  { id: 'lineage', label: 'Sources & Lineage (dbt)', icon: GitBranch },
  { id: 'pipeline-3d', label: 'Pipeline in 3D', icon: Network },
];

export interface ExcludedPage { id: PageId; label: string; reason: string | null; }
interface SidebarProps { activePage: PageId; onNavigate: (page: PageId) => void; excluded?: ExcludedPage[]; }

function FilterGroup({ label, items, selected, setSelected }: {
  label: string; items: string[]; selected: string[]; setSelected: (v: string[]) => void;
}) {
  const toggle = (item: string) =>
    setSelected(selected.includes(item) ? selected.filter((s) => s !== item) : [...selected, item]);
  return (
    <div className="border-t border-white/10 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-sf-pale/70">{label}</span>
        <div className="flex gap-2 text-[10px]">
          <button onClick={() => setSelected([...items])} className="text-sf-light hover:underline">All</button>
          <button onClick={() => setSelected([])} className="text-sf-light hover:underline">None</button>
        </div>
      </div>
      <div className="max-h-28 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const checked = selected.includes(it);
          return (
            <button key={it} onClick={() => toggle(it)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-sf-pale/80 hover:bg-white/5">
              <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                checked ? 'border-sf-primary bg-sf-primary' : 'border-sf-pale/40')}>
                {checked && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              <span className="truncate">{it}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar({ activePage, onNavigate, excluded = [] }: SidebarProps) {
  const hidden = new Set<string>(excluded.map((e) => e.id));
  const { companies, selectedCompanies, setSelectedCompanies, categories, selectedCategories, setSelectedCategories } = useFilters();
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-gradient-to-b from-sf-dark to-sf-deeper text-white">
      <div className="flex flex-col gap-1.5 border-b border-white/10 px-5 py-4">
        <img src={`${import.meta.env.BASE_URL}snowflake_logo.svg`} alt="Snowflake" className="h-7 w-auto self-start" />
        <span className="text-lg font-bold leading-tight tracking-tight text-white">Supply Chain Enterprise</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.filter((item) => !hidden.has(item.id)).map((item) => {
            const Icon = item.icon; const active = activePage === item.id;
            return (
              <li key={item.id}>
                <button onClick={() => onNavigate(item.id)}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    active ? 'bg-sf-primary/20 text-sf-light font-medium' : 'text-sf-pale/80 hover:bg-white/5 hover:text-white')}>
                  <Icon className="h-4 w-4 shrink-0" />{item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {excluded.length > 0 && (
        <p className="border-t border-white/10 px-5 py-2 text-[10px] leading-relaxed text-sf-pale/50"
          title={excluded.map((e) => `${e.label}: ${e.reason ?? 'data source not available'}`).join('\n')}>
          Not included for this landscape: {excluded.map((e) => e.label).join(', ')}
        </p>
      )}
      <FilterGroup label="Plant" items={companies} selected={selectedCompanies} setSelected={setSelectedCompanies} />
      <FilterGroup label="Product Family" items={categories} selected={selectedCategories} setSelected={setSelectedCategories} />
      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[10px] leading-relaxed text-sf-pale/50">SAP ECC · S/4HANA · BDC · Planning · MES · EDI 852 · WMS · Carrier · Supplier risk<br />dbt medallion · Cortex Agent · USD</p>
      </div>
    </aside>
  );
}
