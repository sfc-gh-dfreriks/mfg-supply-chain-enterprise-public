# Supply Chain Enterprise — public demo

A static, no-login build of the **Supply Chain Enterprise** app (manufacturing use case 11 in
[`mfg-use-cases`](https://github.com/sfc-gh-dfreriks/mfg-use-cases)), deployed to GitHub Pages:

**https://sfc-gh-dfreriks.github.io/mfg-supply-chain-enterprise-public/**

The app covers the supply chain end to end: demand planning and S&OP, demand sensing, MRP and capacity, inventory
optimization, production and OEE, asset health, BOM and engineering change, the digital thread, inbound supply and supplier
quality, order fulfillment and OTIF, logistics and freight, warehouse, cost variance, material master quality and the supply
network. It reads two SAP instances, each as SAP ECC, S/4HANA or SAP BDC, together with a planning tool, POS / EDI 852
sell-through, MES and sensors, a WMS, carriers, a supplier risk feed, weather, commodity indices and FX rates. The data flows
through dbt staging adapters, a canonical silver layer and gold marts on Snowflake, then to a semantic view, a Cortex Agent
and this React app. All data is synthetic.

**Pages:** Ask Cortex · Executive Control Tower · Demand & S&OP · Supply Planning & MRP · Capacity · Inventory Optimization ·
Production & OEE · Asset Health · BOM & Engineering Change · Digital Thread · Inbound Supply & Suppliers · Supplier Quality ·
Order Fulfillment & OTIF · Logistics & Freight · Warehouse · Cost Variance · Material Master Quality · Supply Network ·
Data Sources · Field Mapping · SAP Metadata · Sources & Lineage (dbt) · Pipeline in 3D

## How the public build works

- **Snapshot:** built with `VITE_STATIC=1`, the client reads pre-baked JSON in `public/data/` instead of a live `/api`.
  There is no Snowflake connection and no credentials are required. Source selection in the snapshot: SAP A = ECC,
  SAP B = S/4HANA, all non-SAP sources on.
- **Filters:** all plants, each single plant, and each product family for all plants or one plant are baked. Other
  combinations fall back to the nearest baked view.
- **Ask Cortex:** answers are pre-generated for each page's default analysis and every suggested question. Free-text
  questions need the full deployment.
- **Data Sources:** browse each source type and preview its native tables. Apply (which runs dbt in Snowflake) is disabled.

## Full deployment

For live queries, source switching and free-text Ask Cortex, deploy from the source repo:
```bash
git clone https://github.com/sfc-gh-dfreriks/mfg-use-cases
cd mfg-use-cases/use_cases/11_supply_chain_enterprise
npm run dev  # from app/
```
See [use_cases/11_supply_chain_enterprise/README.md](https://github.com/sfc-gh-dfreriks/mfg-use-cases/blob/main/use_cases/11_supply_chain_enterprise/README.md) for full setup instructions.
