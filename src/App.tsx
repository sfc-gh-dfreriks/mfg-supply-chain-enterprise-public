import { useEffect, useMemo, useState } from 'react';
import { FilterProvider, useFilters } from '@/hooks/useFilters';
import Sidebar, { NAV_ITEMS, type PageId } from '@/components/Sidebar';
import AskCortex from '@/components/AskCortex';
import AskCortexPage from '@/pages/AskCortexPage';
import SupplyChainPage from '@/pages/SupplyChainPage';
import DataSources from '@/pages/DataSources';
import FieldMapping from '@/pages/FieldMapping';
import SapMetadata from '@/pages/SapMetadata';
import Lineage from '@/pages/Lineage';
import Pipeline3D from '@/pages/Pipeline3D';
import ASK_TOPICS from '@/ask_topics.json';
import { NATIVE, STATIC, fetchDeliverables, type Deliverable } from '@/lib/api';

// Engine pages are always shown, whatever CONFIG.DELIVERABLES says.
const ENGINE_PAGES = new Set<string>(['ask-cortex', 'overview', 'data-sources', 'field-mapping', 'sap-metadata', 'lineage', 'pipeline-3d']);

// Ask Cortex: per-page topic (server TOPICS in routes/askCortex.ts) + suggested questions.
const ASK: Record<string, { topic: string; suggestions: string[] }> = ASK_TOPICS.pages;

// Business pages are server-driven specs rendered by SupplyChainPage; the engine pages keep their own components.
const SC_PAGES: PageId[] = ['overview', 'demand', 'mrp', 'capacity', 'inventory', 'production', 'assets', 'bom', 'digital-thread', 'inbound',
  'supplier-quality', 'fulfillment', 'logistics', 'warehouse', 'cost', 'masterdata', 'network'];
const PAGE_COMPONENTS = {
  'ask-cortex': AskCortexPage,
  ...Object.fromEntries(SC_PAGES.map((id) => [id, (props: { onNavigate?: (p: PageId) => void }) => <SupplyChainPage page={id} {...props} />])),
  'data-sources': DataSources,
  'field-mapping': FieldMapping,
  'sap-metadata': SapMetadata,
  lineage: Lineage,
  'pipeline-3d': Pipeline3D,
} as unknown as Record<PageId, React.FC<{ onNavigate?: (p: PageId) => void }>>;

function AppShell() {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  useEffect(() => { fetchDeliverables().then(setDeliverables); }, []);
  // Pages excluded for this landscape (no row, or no table, means included).
  const excluded = useMemo(() => deliverables
    .filter((d) => d.kind === 'page' && !d.included && !ENGINE_PAGES.has(d.componentId) && NAV_ITEMS.some((n) => n.id === d.componentId))
    .map((d) => ({ id: d.componentId as PageId, label: d.label || NAV_ITEMS.find((n) => n.id === d.componentId)!.label, reason: d.reason })), [deliverables]);
  useEffect(() => { if (excluded.some((e) => e.id === activePage)) setActivePage('overview'); }, [excluded, activePage]);
  const navItem = NAV_ITEMS.find((n) => n.id === activePage)!;
  const Icon = navItem.icon;
  const PageComponent = PAGE_COMPONENTS[activePage];
  const { dataVersion } = useFilters();
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activePage={activePage} onNavigate={setActivePage} excluded={excluded} />
      <main className="ml-64 min-h-screen p-6">
        <div className="mb-6 flex items-center gap-3">
          <Icon className="h-6 w-6 text-sf-primary" />
          <h1 className="text-2xl font-bold text-sf-deeper">{navItem.label}</h1>
        </div>
        {NATIVE && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs text-sky-900">
            Snowflake Native App: live queries over synthetic data bundled in this installation (SAP A = ECC, SAP B = S/4HANA, all non-SAP sources on).
            Ask Cortex runs live. Switching source systems needs the full deployment.
          </div>
        )}
        {STATIC && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            Public demo: a read-only snapshot of synthetic data (SAP A = ECC, SAP B = S/4HANA, all non-SAP sources on). Filters show all plants or one
            plant, each for all product families or one. Cortex answers are pre-generated for the suggested questions.
          </div>
        )}
        {ASK[activePage] && (
          <div className="mb-6">
            <AskCortex key={`${activePage}-${dataVersion}`} topic={ASK[activePage].topic}
              label={`Ask Cortex about ${navItem.label}`} suggestions={ASK[activePage].suggestions} />
          </div>
        )}
        <PageComponent onNavigate={setActivePage} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FilterProvider>
      <AppShell />
    </FilterProvider>
  );
}
