async function renderCustomers() {
  document.getElementById('main-content').innerHTML = `
    <div class="card">
      <div class="flex-between mb-20">
        <h3>Customers</h3>
        <button class="btn btn-primary" onclick="showAddCustomerModal()"><i class="fas fa-plus"></i> Add Customer</button>
      </div>
      <div id="customer-list"></div>
    </div>
  `;
  loadCustomers();
}

async function loadCustomers() {
  const res = await getCustomers();
  const list = document.getElementById('customer-list');
  list.innerHTML = res.results.map(c => `<div class="flex-between">${c.name} - ${c.phone}</div>`).join('');
}