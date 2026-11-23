import { usePageDeps } from '@/hooks/useFilters';
import { useQuery } from '@/hooks/useQuery';
import { fetchPage } from '@/lib/api';
import { formatDollar, formatNumber, formatPct, cn } from '@/lib/utils';
import MetricCard, { Gauge } from '@/components/MetricCard';
import ChartCard from '@/components/ChartCard';
import DataTable from '@/components/DataTable';
import ReactECharts from '@/components/Chart';
import Bars from '@/components/Bars';
import PageState from '@/components/PageState';
import type { PageId } from '@/components/Sidebar';

// Every Supply Chain Enterprise page is a spec from the server (routes/api*.ts): KPI cards, then panels of ranked bars,
// trend lines, tables and the network map. Formats: usd, pct, num, days, x, date, text.
const PALETTE = ['#29b5e8', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#64748b'];
export function fmt(kind: string | undefined, v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  switch (kind) {
    case 'usd': return formatDollar(Number(v));
    case 'pct': return formatPct(Number(v));
    case 'num': return formatNumber(Number(v));
    case 'days': return `${Number(v).toFixed(1)} d`;
    case 'x': return Number(v).toFixed(2);
    case 'date': return String(v).slice(0, 10);
    default: return String(v);
  }
}

function LinePanel({ p }: { p: any }) {
  const rows = p.rows ?? [];
  return (
    <ReactECharts keepOrder option={{
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => fmt(p.fmt, v) }, legend: { top: 0 },
      grid: { left: 60, right: 20, bottom: 30, top: 40 },
      xAxis: { type: 'category', data: rows.map((r: any) => r[p.x]) },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmt(p.fmt, v) } },
      series: p.series.map((s: any, i: number) => ({
        name: s.name, type: 'line', smooth: true, showSymbol: rows.length < 40, connectNulls: true,
        data: rows.map((r: any) => (r[s.key] === null || r[s.key] === undefined ? null : Number(r[s.key]))), itemStyle: { color: PALETTE[i % PALETTE.length] },
        ...(i === 0 && p.refLine ? { markLine: { silent: true, symbol: 'none', data: [{ yAxis: p.refLine }], lineStyle: { color: '#ef4444', type: 'dashed' } } } : {}),
      })),
    }} style={{ height: 300 }} />
  );
}

function MapPanel({ p }: { p: any }) {
  const nodes = p.nodes ?? [];
  const flows = p.flows ?? [];
  const maxV = Math.max(1, ...flows.map((f: any) => Number(f.value) || 0));
  return (
    <ReactECharts option={{
      tooltip: { formatter: (x: any) => x.data?.tip ?? x.name },
      grid: { left: 40, right: 40, top: 20, bottom: 30 },
      xAxis: { type: 'value', min: -110, max: 20, name: 'longitude', splitLine: { show: false } },
      yAxis: { type: 'value', min: -30, max: 60, name: 'latitude', splitLine: { show: false } },
      series: [
        { type: 'lines', coordinateSystem: 'cartesian2d', polyline: false, effect: { show: true, symbolSize: 5, period: 6 },
          data: flows.map((f: any) => ({ coords: [[f.slon, f.slat], [f.tlon, f.tlat]], tip: `${f.src} → ${f.dst}: ${fmt('usd', f.value)} / month`,
                                         lineStyle: { width: 1 + 5 * (Number(f.value) || 0) / maxV, color: '#29b5e8', opacity: 0.6, curveness: 0.2 } })) },
        { type: 'scatter', symbolSize: (v: any) => (v[2] === 'DC' ? 12 : 18),
          data: nodes.map((n: any) => ({ value: [n.lon, n.lat, n.type], name: n.name, tip: `${n.plant} ${n.name} (${n.type}, ${n.country})`,
                                         itemStyle: { color: n.type === 'DC' ? '#8b5cf6' : '#10b981' } })),
          label: { show: true, formatter: (x: any) => x.name, position: 'right', fontSize: 10 } },
      ],
    }} style={{ height: 420 }} />
  );
}

export default function SupplyChainPage({ page, onNavigate }: { page: PageId; onNavigate?: (p: PageId) => void }) {
  const { apiCompanies, apiCategories, deps, empty } = usePageDeps();
  const { data, loading, error } = useQuery(() => fetchPage(page, apiCompanies, apiCategories), [page, ...deps]);
  const kpis = data?.kpis ?? [];
  const panels = data?.panels ?? [];
  return (
    <PageState loading={loading} error={error} empty={empty}>
      <div className="space-y-6">
        <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', kpis.length > 4 ? 'lg:grid-cols-4' : `lg:grid-cols-${Math.max(kpis.length, 1)}`)}>
          {kpis.map((k: any) => (
            <MetricCard key={k.title} title={k.title} value={fmt(k.fmt, k.value)} icon={Gauge} delta={k.hint}
              deltaType={k.good === undefined || k.good === null ? 'neutral' : k.good ? 'positive' : 'negative'}
              accent="border-sky-300/50 bg-gradient-to-br from-sky-50 to-cyan-50" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {panels.map((p: any) => (
            <ChartCard key={p.title} title={p.title} subtitle={p.subtitle} className={p.span === 2 ? 'lg:col-span-2' : undefined}>
              {p.kind === 'bars' && (
                <Bars rows={p.rows} label={p.label} value={p.value} color={p.color ?? '#29b5e8'} format={(v) => fmt(p.fmt, v)}
                  height={Math.max(180, Math.min(420, 28 * (p.rows?.length ?? 0) + 40))} leftPad={220} />
              )}
              {p.kind === 'line' && <LinePanel p={p} />}
              {p.kind === 'map' && <MapPanel p={p} />}
              {p.kind === 'table' && (
                <DataTable data={(p.rows ?? []).map((r: any) => (p.linkKey && onNavigate ? { ...r, __page: r[p.linkKey] } : r))}
                  columns={p.columns.map((c: any) => ({ key: c.key, label: c.label, format: c.fmt ? (v: any) => fmt(c.fmt, v) : undefined }))}
                  onRowClick={p.linkKey && onNavigate ? (r: any) => r.__page && onNavigate(r.__page as PageId) : undefined} />
              )}
            </ChartCard>
          ))}
        </div>
      </div>
    </PageState>
  );
}
