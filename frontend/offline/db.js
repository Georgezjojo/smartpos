// Dexie already loaded in index.html
const db = new Dexie('SmartPOSOffline');
db.version(1).stores({
  products: 'id, name, sku, price, cost, min_stock, discount_percent, discount_name, stock_quantity',
  customers: 'id, name, phone, email',
  offlineSales: '++id, saleData, created'
});

// Sync products & customers when online
async function syncMasterData() {
  if (!navigator.onLine) return;
  try {
    const [prodRes, custRes] = await Promise.all([
      api.get('/inventory/products/'),
      api.get('/sales/customers/')
    ]);
    // Products
    await db.products.clear();
    const products = prodRes.data.results || [];
    for (let p of products) {
      await db.products.put({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        min_stock: p.min_stock,
        discount_percent: p.discount_percent || 0,
        discount_name: p.discount_name || '',
        stock_quantity: p.stock_quantity || 0
      });
    }
    // Customers
    await db.customers.clear();
    const customers = custRes.data.results || [];
    for (let c of customers) {
      await db.customers.put({ id: c.id, name: c.name, phone: c.phone || '', email: c.email || '' });
    }
  } catch (e) { /* silently fail, offline */ }
}

// Get queued offline sales count
async function getOfflineSalesCount() {
  return await db.offlineSales.count();
}

// Add a sale to local queue
async function queueOfflineSale(saleData) {
  await db.offlineSales.put({ saleData, created: new Date().toISOString() });
}

// Sync all queued sales to server
async function syncOfflineSales() {
  const sales = await db.offlineSales.toArray();
  if (sales.length === 0) return { synced: 0, failed: 0 };
  let synced = 0, failed = 0;
  for (let s of sales) {
    try {
      await api.post('/sales/sync-offline/', s.saleData);
      await db.offlineSales.delete(s.id);
      synced++;
    } catch (e) {
      failed++;
    }
  }
  return { synced, failed };
}