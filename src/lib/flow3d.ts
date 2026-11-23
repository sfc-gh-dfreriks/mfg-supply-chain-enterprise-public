// Shared model for the 3D pipeline views (Data Factory, 3D Sankey, Lineage Constellation).
// Built from endpoints that already exist in live and static mode: /api/sources (selection +
// per-object row counts), /api/lineage (dbt manifest graph) and /api/overview (spend by source).
export type Stage = 'source' | 'object' | 'mart' | 'snowflake';

export interface FlowNode {
  id: string;
  stage: Stage;
  label: string;
  sub?: string;
  family?: 'SAP' | 'Non-SAP';
  value: number;            // rows (sources, objects) or relative weight (marts)
  spend?: number;           // USD, sources only
  active: boolean;
  detail: Record<string, string | number>;
}
export interface FlowLink { source: string; target: string; value: number; active: boolean }
export interface FlowModel { nodes: FlowNode[]; links: FlowLink[]; lineage: { nodes: any[]; edges: any[] } }

const OBJECT_LABEL: Record<string, string> = {
  PLANT: 'Plant', MATERIAL: 'Material', MATERIAL_PLANT: 'Material plant', STORAGE_LOCATION: 'Storage location', WORK_CENTER: 'Work center', SUPPLIER: 'Supplier', CUSTOMER: 'Customer', SALES_ORDER_LINE: 'Sales order line', PLANNED_INDEP_REQ: 'Planned indep req', DEMAND_FORECAST: 'Demand forecast', CONSENSUS_PLAN: 'Consensus plan', SOP_SCENARIO: 'S&OP scenario', SELL_THROUGH: 'Sell through', WEATHER_DAILY: 'Weather daily', MRP_ELEMENT: 'MRP element', PLANNED_ORDER: 'Planned order', PURCHASE_REQ: 'Purchase req', WORK_CENTER_CAPACITY: 'Work center capacity', STOCK_BALANCE: 'Stock balance', BATCH_STOCK: 'Batch stock', GOODS_MOVEMENT: 'Goods movement', MATERIAL_VALUATION: 'Material valuation', WAREHOUSE_TASK: 'Warehouse task', BIN_OCCUPANCY: 'Bin occupancy', PRODUCTION_ORDER: 'Production order', ORDER_CONFIRMATION: 'Order confirmation', BOM_ITEM: 'BOM item', ENGINEERING_CHANGE: 'Engineering change', EQUIPMENT: 'Equipment', MAINT_NOTIFICATION: 'Maint notification', SENSOR_READING: 'Sensor reading', OPERATING_RATE: 'Operating rate', FINAL_TEST: 'Final test', SERIAL_GENEALOGY: 'Serial genealogy', PO_LINE: 'PO line', PO_RECEIPT: 'PO receipt', SUPPLIER_RISK: 'Supplier risk', INSPECTION_LOT: 'Inspection lot', QUALITY_NOTIFICATION: 'Quality notification', DELIVERY_LINE: 'Delivery line', SHIPMENT_COST: 'Shipment cost', SHIPMENT_EVENT: 'Shipment event', STANDARD_COST: 'Standard cost', ORDER_VARIANCE: 'Order variance', COMMODITY_PRICE: 'Commodity price', FX_RATE: 'FX rate',
};
// Gold in the 3D views = only the analytical marts the app's pages deliver. The dbt graph also tags
// per-source enrichment views (enr_*), metadata tables and source coverage as gold; those stay on the
// Lineage page but are left out here.
const MART_LABEL: Record<string, string> = {
  fct_bom_explosion: 'Bom explosion', fct_capacity_load: 'Capacity load', fct_consensus_plan: 'Consensus plan', fct_control_tower_alerts: 'Control tower alerts', fct_cost_variance: 'Cost variance', fct_demand_sensing: 'Demand sensing', fct_equipment_health: 'Equipment health', fct_equipment_outage: 'Equipment outage', fct_forecast_accuracy: 'Forecast accuracy', fct_freight_cost: 'Freight cost', fct_inventory_health: 'Inventory health', fct_material_master_quality: 'Material master quality', fct_mrp_exceptions: 'Mrp exceptions', fct_oee: 'Oee', fct_order_fulfillment: 'Order fulfillment', fct_production_order: 'Production order', fct_quality_notification: 'Quality notification', fct_safety_stock_reco: 'Safety stock reco', fct_serial_genealogy: 'Serial genealogy', fct_sop_scenario: 'Sop scenario', fct_supplier_performance: 'Supplier performance', fct_supplier_quality: 'Supplier quality', fct_supply_network: 'Supply network', fct_warehouse_productivity: 'Warehouse productivity', mart_sc_kpis: 'Headline kpis',
};
const isAppMart = (n: any) => n.layer === 'gold' && n.name in MART_LABEL;

/** Keep the dbt graph to what feeds the app marts: drop non-app gold nodes, then anything left unconnected. */
function appLineage(nodes: any[], edges: any[]) {
  const dropped = new Set(nodes.filter((n) => n.layer === 'gold' && !isAppMart(n)).map((n) => n.id));
  const es = edges.filter((e) => !dropped.has(e.source) && !dropped.has(e.target));
  const linked = new Set(es.flatMap((e) => [e.source, e.target]));
  return { nodes: nodes.filter((n) => !dropped.has(n.id) && linked.has(n.id)), edges: es };
}

export function buildFlowModel(sources: any, lineage: any, overview: any): FlowModel {
  const slots: any[] = sources?.slots ?? [];
  const coverage: any[] = sources?.coverage ?? [];
  const systems: any[] = sources?.systems ?? [];
  const spendBySystem = new Map<string, number>((overview?.bySource ?? []).map((r: any) => [r.name, r.spend]));
  const sysName = (code: string) => systems.find((s: any) => s.code === code)?.name ?? code;

  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];

  // Sources: one per slot, named after the chosen system type.
  for (const s of slots) {
    const rows = coverage.filter((c) => c.sourceSlot === s.sourceSlot).reduce((a, c) => a + (c.rowCount ?? 0), 0);
    const system = coverage.find((c) => c.sourceSlot === s.sourceSlot)?.sourceSystem ?? sysName(s.systemCode);
    nodes.push({
      id: `src:${s.sourceSlot}`, stage: 'source', label: system, sub: s.label, family: s.kind === 'SAP' ? 'SAP' : 'Non-SAP',
      value: rows, spend: spendBySystem.get(system) ?? 0, active: !!s.enabled,
      detail: { Slot: s.sourceSlot, Scope: s.scope ?? '', 'Rows into silver': rows, 'Billed (USD)': Math.round(spendBySystem.get(system) ?? 0) },
    });
  }
  // Canonical objects (silver), with rows contributed per source.
  const objects = [...new Set(coverage.map((c) => c.objectName))];
  for (const o of objects) {
    const rows = coverage.filter((c) => c.objectName === o).reduce((a, c) => a + (c.rowCount ?? 0), 0);
    nodes.push({ id: `obj:${o}`, stage: 'object', label: OBJECT_LABEL[o] ?? o, sub: o, value: rows, active: rows > 0,
      detail: { 'Canonical object': o, Rows: rows, Sources: coverage.filter((c) => c.objectName === o && c.rowCount > 0).length } });
    for (const c of coverage.filter((x) => x.objectName === o && x.rowCount > 0))
      links.push({ source: `src:${c.sourceSlot}`, target: `obj:${o}`, value: c.rowCount, active: true });
  }

  // Gold marts and silver → gold edges from the dbt graph (following silver → silver hops).
  const { nodes: ln, edges: le } = appLineage(lineage?.nodes ?? [], lineage?.edges ?? []);
  const byId = new Map(ln.map((n) => [n.id, n]));
  const gold = ln.filter(isAppMart);
  const silverObject = (n: any) => objects.find((o) => o.toLowerCase() === String(n.name).toLowerCase());
  const objectsFeeding = (goldId: string) => {
    const seen = new Set<string>(); const out = new Set<string>(); const stack = [goldId];
    while (stack.length) {
      const id = stack.pop()!;
      for (const e of le.filter((x) => x.target === id)) {
        if (seen.has(e.source)) continue; seen.add(e.source);
        const n = byId.get(e.source); if (!n) continue;
        if (n.layer === 'silver') { const o = silverObject(n); if (o) out.add(o); else stack.push(n.id); }
        else if (n.layer === 'gold') stack.push(n.id);
      }
    }
    return [...out];
  };
  for (const g of gold) {
    const feeds = objectsFeeding(g.id);
    const weight = feeds.reduce((a, o) => a + (nodes.find((n) => n.id === `obj:${o}`)?.value ?? 0), 0) / Math.max(1, feeds.length);
    nodes.push({ id: `mart:${g.name}`, stage: 'mart', label: MART_LABEL[g.name] ?? g.name, sub: g.name, value: weight, active: true,
      detail: { Model: g.name, Materialized: g.materialized ?? '', 'Built from': feeds.map((o) => OBJECT_LABEL[o] ?? o).join(', ') || 'gold marts', Description: g.description ?? '' } });
    for (const o of feeds) links.push({ source: `obj:${o}`, target: `mart:${g.name}`, value: weight / Math.max(1, feeds.length), active: true });
  }
  const totalRows = nodes.filter((n) => n.stage === 'source').reduce((a, n) => a + n.value, 0);
  nodes.push({ id: 'snowflake', stage: 'snowflake', label: 'Snowflake', sub: 'Semantic view · Cortex Agent · apps', value: totalRows, active: true,
    detail: { Serves: 'Semantic view SUPPLY_CHAIN_ENTERPRISE, Cortex Agent, React app', 'Gold marts': gold.length, 'Rows unified': totalRows } });
  for (const g of gold) links.push({ source: `mart:${g.name}`, target: 'snowflake', value: nodes.find((n) => n.id === `mart:${g.name}`)!.value, active: true });

  // Sources that are switched off still show, dimmed, with no outgoing flow.
  for (const n of nodes) if (n.stage === 'source' && !n.active) n.value = 0;
  return { nodes, links, lineage: { nodes: ln, edges: le } };
}

export const STAGE_X: Record<Stage, number> = { source: -9, object: -2.5, mart: 4, snowflake: 10 };
export const STAGE_LABEL: Record<Stage, string> = { source: 'SAP & non-SAP sources', object: 'Canonical silver', mart: 'Gold analytical marts', snowflake: 'Served on Snowflake' };

export const COLOR = {
  sap: '#29b5e8', nonSap: '#8b5cf6', object: '#10b981', mart: '#f59e0b', snowflake: '#29b5e8', inactive: '#94a3b8',
};
export const nodeColor = (n: FlowNode) => !n.active ? COLOR.inactive
  : n.stage === 'source' ? (n.family === 'SAP' ? COLOR.sap : COLOR.nonSap)
  : n.stage === 'object' ? COLOR.object : n.stage === 'mart' ? COLOR.mart : COLOR.snowflake;

/** Vertical layout for one stage: evenly spaced, centred on 0. */
export function layout(model: FlowModel, gap = 1.6) {
  const pos = new Map<string, [number, number, number]>();
  for (const stage of ['source', 'object', 'mart', 'snowflake'] as Stage[]) {
    const ns = model.nodes.filter((n) => n.stage === stage);
    // Long stages (e.g. 46 canonical objects) zig-zag into two staggered sub-columns so the scene stays wide, not tall.
    const cols = ns.length > 20 ? 2 : 1;
    const rows = Math.ceil(ns.length / cols);
    ns.forEach((n, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const dx = cols === 1 ? 0 : (c === 0 ? -1.1 : 1.1);
      pos.set(n.id, [STAGE_X[stage] + dx, ((rows - 1) / 2 - r) * gap + (cols === 1 ? 0 : (c === 0 ? gap / 4 : -gap / 4)), cols === 1 ? 0 : (c === 0 ? -1.2 : 1.2)]);
    });
  }
  return pos;
}
