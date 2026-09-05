/**
 * HORIZON PROPERTIES — AUSTIN, TEXAS
 * Frontend Application Controller (Navy Blue & White Theme)
 */

// Application State
const state = {
  activeView: 'catalog',      // 'catalog' | 'signin' | 'my-bookings' | 'admin'
  viewMode: 'grid',           // 'grid' | 'table'
  properties: [],
  filteredProperties: [],
  myBookings: [],
  allBookings: [],
  stats: null,
  activeProperty: null,
  editingProperty: null,
  pendingBookingPropId: null, // Property ID customer wanted to book before signing in
  currentUser: null,          // { id, name, email, phone, role }
  filters: {
    type: 'all',
    neighborhood: 'all',
    min_price: '',
    max_price: '',
    search: '',
    sort: 'newest'
  },
  adminSubTab: 'properties'   // 'properties' | 'bookings' | 'n8n'
};

// API Service
const api = {
  async getProperties(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        query.append(key, val);
      }
    });
    const res = await fetch(`/api/properties?${query.toString()}`);
    return await res.json();
  },

  async getProperty(id) {
    const res = await fetch(`/api/properties/${id}`);
    return await res.json();
  },

  async createProperty(data) {
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateProperty(id, data) {
    const res = await fetch(`/api/properties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async deleteProperty(id) {
    const res = await fetch(`/api/properties/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  async getBookings(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        query.append(key, val);
      }
    });
    const res = await fetch(`/api/bookings?${query.toString()}`);
    return await res.json();
  },

  async createBooking(data) {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateBooking(id, data) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async deleteBooking(id) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  async getStats() {
    const res = await fetch('/api/stats');
    return await res.json();
  },

  async login(email, role) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    return await res.json();
  },

  async register(name, email, phone) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone })
    });
    return await res.json();
  }
};

// Utilities
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// USER & AUTH MANAGEMENT
// ==========================================

function initAuth() {
  const savedUser = localStorage.getItem('horizon_user');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
    } catch (e) {
      state.currentUser = null;
    }
  }

  // Default demo user: Customer (Sarah Miller)
  if (!state.currentUser) {
    state.currentUser = {
      id: 'USR-001',
      name: 'Sarah Miller',
      email: 'sarah@atxlife.com',
      phone: '(512) 555-0142',
      role: 'customer'
    };
    localStorage.setItem('horizon_user', JSON.stringify(state.currentUser));
  }

  updateAuthUI();
}

function updateAuthUI() {
  const user = state.currentUser;
  const userPill = document.getElementById('user-profile-pill');
  const loginBtn = document.getElementById('btn-show-login');
  const demoSelect = document.getElementById('demo-user-select');
  const adminNavWrapper = document.getElementById('nav-admin-wrapper');

  if (user) {
    if (userPill) {
      userPill.style.display = 'flex';
      document.getElementById('user-name-display').textContent = user.name;
      document.getElementById('user-role-display').textContent = user.role;
      document.getElementById('user-avatar-initial').textContent = user.name.charAt(0).toUpperCase();
    }
    if (loginBtn) loginBtn.style.display = 'none';

    if (demoSelect) {
      if (user.role === 'admin') {
        demoSelect.value = 'admin';
      } else if (user.email === 'sarah@atxlife.com') {
        demoSelect.value = 'customer';
      } else {
        demoSelect.value = 'custom';
      }
    }

    // Admin Dashboard navigation: ONLY visible to admin!
    if (adminNavWrapper) {
      adminNavWrapper.style.display = user.role === 'admin' ? 'block' : 'none';
    }
  } else {
    if (userPill) userPill.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (demoSelect) demoSelect.value = 'guest';
    if (adminNavWrapper) adminNavWrapper.style.display = 'none';
  }

  loadMyBookings();
}

function signOut() {
  state.currentUser = null;
  localStorage.removeItem('horizon_user');
  updateAuthUI();
  showToast('Signed out successfully');
  switchView('catalog');
}

function switchDemoAccount(type) {
  if (type === 'customer') {
    state.currentUser = {
      id: 'USR-001',
      name: 'Sarah Miller',
      email: 'sarah@atxlife.com',
      phone: '(512) 555-0142',
      role: 'customer'
    };
    showToast('Switched to Demo Customer: Sarah Miller');
  } else if (type === 'admin') {
    state.currentUser = {
      id: 'USR-002',
      name: 'Horizon Admin',
      email: 'admin@horizonproperties.com',
      phone: '(512) 555-0100',
      role: 'admin'
    };
    showToast('Switched to Horizon Properties Admin (Admin features unlocked)');
  } else if (type === 'guest') {
    state.currentUser = null;
    localStorage.removeItem('horizon_user');
    showToast('Signed out (Browsing as Guest)');
  }

  if (state.currentUser) {
    localStorage.setItem('horizon_user', JSON.stringify(state.currentUser));
  }
  updateAuthUI();

  // If user was on admin view and switched to non-admin, redirect to catalog
  if (state.activeView === 'admin' && (!state.currentUser || state.currentUser.role !== 'admin')) {
    switchView('catalog');
  } else if (state.activeView === 'my-bookings') {
    loadMyBookings();
  }
}

// ==========================================
// NAVIGATION & VIEW ROUTING
// ==========================================

function switchView(viewName) {
  // If attempting to open admin but not admin, guide to login
  if (viewName === 'admin') {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Admin Dashboard is restricted to Horizon administrators.', 'error');
      switchView('signin');
      return;
    }
  }

  state.activeView = viewName;

  // Update nav buttons active status
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Views elements
  const catalogView = document.getElementById('catalog-view');
  const signinView = document.getElementById('signin-view');
  const myBookingsView = document.getElementById('my-bookings-view');
  const adminView = document.getElementById('admin-view');

  if (catalogView) catalogView.style.display = viewName === 'catalog' ? 'block' : 'none';
  if (signinView) signinView.style.display = viewName === 'signin' ? 'block' : 'none';
  if (myBookingsView) myBookingsView.style.display = viewName === 'my-bookings' ? 'block' : 'none';
  if (adminView) adminView.style.display = viewName === 'admin' ? 'block' : 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'catalog') {
    loadProperties();
  } else if (viewName === 'my-bookings') {
    loadMyBookings();
  } else if (viewName === 'admin') {
    loadAdminDashboard();
  }
}

// ==========================================
// PROPERTIES CATALOG & FILTERS
// ==========================================

async function loadProperties() {
  try {
    const res = await api.getProperties(state.filters);
    if (res.success) {
      state.properties = res.data;
      renderProperties();
    }
  } catch (err) {
    console.error('Failed to load properties:', err);
    showToast('Failed to load properties. Check backend server.', 'error');
  }
}

function renderProperties() {
  const container = document.getElementById('properties-container');
  const countEl = document.getElementById('results-count-number');
  if (countEl) countEl.textContent = state.properties.length;

  if (!container) return;

  if (state.properties.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🏡</div>
        <h3>No Austin Properties Found</h3>
        <p>No listings matched your active filter criteria. Try expanding your price range or selecting another Austin neighborhood.</p>
        <button class="btn btn-outline" id="btn-empty-reset">Reset All Filters</button>
      </div>
    `;
    const emptyReset = document.getElementById('btn-empty-reset');
    if (emptyReset) emptyReset.addEventListener('click', resetFilters);
    return;
  }

  if (state.viewMode === 'grid') {
    container.className = 'properties-grid';
    container.innerHTML = state.properties.map(p => `
      <article class="property-card" data-id="${p.id}">
        <div class="card-media">
          <img src="${p.image_url}" alt="${p.title}" class="card-img" loading="lazy" />
          <div class="card-badges">
            <span class="badge badge-type">${p.type}</span>
            <span class="badge badge-status-${p.status.toLowerCase()}">${p.status}</span>
          </div>
        </div>
        <div class="card-content">
          <div class="card-price-row">
            <div class="card-price">${formatCurrency(p.price)}</div>
            <div class="card-prop-id">${p.id}</div>
          </div>
          <h3 class="card-title">${p.title}</h3>
          <div class="card-neighborhood">
            <span>📍</span>
            <span>${p.neighborhood} • ${p.address.split(',')[0]}</span>
          </div>
          <div class="card-specs">
            ${p.type === 'Land' ? `
              <div class="spec-item"><strong>${(p.area_sqft / 43560).toFixed(2)}</strong> Acres</div>
              <div class="spec-item"><strong>${p.area_sqft.toLocaleString()}</strong> sqft</div>
            ` : `
              <div class="spec-item">🛏️ <strong>${p.bedrooms}</strong> Beds</div>
              <div class="spec-item">🛁 <strong>${p.bathrooms}</strong> Baths</div>
              <div class="spec-item">📐 <strong>${p.area_sqft.toLocaleString()}</strong> sqft</div>
            `}
          </div>
          <p class="card-desc">${p.description}</p>
          <div class="card-actions">
            <button class="btn btn-outline btn-view-details" data-id="${p.id}">View Details</button>
            <button class="btn btn-primary btn-book-visit" data-id="${p.id}" ${p.status === 'Sold' ? 'disabled' : ''}>
              ${p.status === 'Sold' ? 'Sold Out' : 'Book a Visit'}
            </button>
          </div>
        </div>
      </article>
    `).join('');
  } else {
    // Table View
    container.className = 'table-responsive';
    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>ID</th>
            <th>Title & Neighborhood</th>
            <th>Type</th>
            <th>Price</th>
            <th>Specs</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.properties.map(p => `
            <tr>
              <td><img src="${p.image_url}" alt="${p.title}" class="table-thumb" /></td>
              <td><span style="font-family: monospace; font-size: 0.78rem; font-weight: 700;">${p.id}</span></td>
              <td>
                <div style="font-weight: 700; color: var(--navy-900);">${p.title}</div>
                <div style="font-size: 0.78rem; color: var(--slate-500);">📍 ${p.neighborhood} • ${p.address}</div>
              </td>
              <td><span class="badge badge-type">${p.type}</span></td>
              <td><strong style="color: var(--navy-900); font-family: var(--font-serif);">${formatCurrency(p.price)}</strong></td>
              <td>
                ${p.type === 'Land' ? `${p.area_sqft.toLocaleString()} sqft` : `${p.bedrooms} bd | ${p.bathrooms} ba | ${p.area_sqft} sqft`}
              </td>
              <td><span class="badge badge-status-${p.status.toLowerCase()}">${p.status}</span></td>
              <td style="text-align: right; white-space: nowrap;">
                <button class="btn btn-outline btn-sm btn-view-details" data-id="${p.id}">Details</button>
                <button class="btn btn-primary btn-sm btn-book-visit" data-id="${p.id}" ${p.status === 'Sold' ? 'disabled' : ''}>Book</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Attach event listeners
  container.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', () => openPropertyDetails(btn.dataset.id));
  });

  container.querySelectorAll('.btn-book-visit').forEach(btn => {
    btn.addEventListener('click', () => handleBookVisitClick(btn.dataset.id));
  });
}

function setupFilterListeners() {
  const typeFilter = document.getElementById('filter-type');
  const neighborhoodFilter = document.getElementById('filter-neighborhood');
  const minPriceFilter = document.getElementById('filter-min-price');
  const maxPriceFilter = document.getElementById('filter-max-price');
  const searchInput = document.getElementById('filter-search');
  const sortSelect = document.getElementById('select-sort');
  const btnReset = document.getElementById('btn-reset-filters');

  let debounceTimer = null;
  const applyFiltersDebounced = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.filters.type = typeFilter ? typeFilter.value : 'all';
      state.filters.neighborhood = neighborhoodFilter ? neighborhoodFilter.value : 'all';
      state.filters.min_price = minPriceFilter ? minPriceFilter.value : '';
      state.filters.max_price = maxPriceFilter ? maxPriceFilter.value : '';
      state.filters.search = searchInput ? searchInput.value.trim() : '';
      if (sortSelect) state.filters.sort = sortSelect.value;
      loadProperties();
    }, 250);
  };

  if (typeFilter) typeFilter.addEventListener('change', applyFiltersDebounced);
  if (neighborhoodFilter) neighborhoodFilter.addEventListener('change', applyFiltersDebounced);
  if (minPriceFilter) minPriceFilter.addEventListener('input', applyFiltersDebounced);
  if (maxPriceFilter) maxPriceFilter.addEventListener('input', applyFiltersDebounced);
  if (searchInput) searchInput.addEventListener('input', applyFiltersDebounced);
  if (sortSelect) sortSelect.addEventListener('change', applyFiltersDebounced);

  if (btnReset) {
    btnReset.addEventListener('click', resetFilters);
  }

  // Quick neighborhood pills in hero
  document.querySelectorAll('.quick-tag').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.quick-tag').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const nh = pill.dataset.neighborhood;
      if (neighborhoodFilter) neighborhoodFilter.value = nh;
      state.filters.neighborhood = nh;
      loadProperties();
    });
  });

  // View Mode Toggles (Grid vs Table)
  const btnGrid = document.getElementById('btn-view-grid');
  const btnTable = document.getElementById('btn-view-table');

  if (btnGrid && btnTable) {
    btnGrid.addEventListener('click', () => {
      state.viewMode = 'grid';
      btnGrid.classList.add('active');
      btnTable.classList.remove('active');
      renderProperties();
    });

    btnTable.addEventListener('click', () => {
      state.viewMode = 'table';
      btnTable.classList.add('active');
      btnGrid.classList.remove('active');
      renderProperties();
    });
  }
}

function resetFilters() {
  const typeFilter = document.getElementById('filter-type');
  const neighborhoodFilter = document.getElementById('filter-neighborhood');
  const minPriceFilter = document.getElementById('filter-min-price');
  const maxPriceFilter = document.getElementById('filter-max-price');
  const searchInput = document.getElementById('filter-search');

  if (typeFilter) typeFilter.value = 'all';
  if (neighborhoodFilter) neighborhoodFilter.value = 'all';
  if (minPriceFilter) minPriceFilter.value = '';
  if (maxPriceFilter) maxPriceFilter.value = '';
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.quick-tag').forEach(p => p.classList.remove('active'));
  const allPill = document.querySelector('.quick-tag[data-neighborhood="all"]');
  if (allPill) allPill.classList.add('active');

  state.filters = {
    type: 'all',
    neighborhood: 'all',
    min_price: '',
    max_price: '',
    search: '',
    sort: 'newest'
  };

  loadProperties();
  showToast('Filters cleared');
}

// ==========================================
// PROPERTY DETAILS MODAL
// ==========================================

async function openPropertyDetails(propertyId) {
  try {
    const res = await api.getProperty(propertyId);
    if (!res.success) {
      showToast('Property not found', 'error');
      return;
    }

    const p = res.data;
    state.activeProperty = p;

    const content = document.getElementById('modal-property-content');
    const pricePerSqft = p.area_sqft ? Math.round(p.price / p.area_sqft) : 0;
    const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;

    content.innerHTML = `
      <div class="prop-detail-hero">
        <img src="${p.image_url}" alt="${p.title}" />
        <div class="card-badges">
          <span class="badge badge-type" style="font-size: 0.85rem; padding: 0.35rem 0.8rem;">${p.type}</span>
          <span class="badge badge-status-${p.status.toLowerCase()}" style="font-size: 0.85rem; padding: 0.35rem 0.8rem;">${p.status}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
        <h2 style="font-family: var(--font-serif); font-size: 1.65rem; color: var(--navy-900); font-weight: 800;">${p.title}</h2>
        <div style="font-size: 1.75rem; font-weight: 800; color: var(--navy-900); font-family: var(--font-serif);">${formatCurrency(p.price)}</div>
      </div>

      <div style="margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; color: var(--slate-600);">
        <span>📍 <strong>${p.neighborhood}</strong> — ${p.address}</span>
        <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--navy-900); text-decoration: underline; font-size: 0.82rem; font-weight: 700;">View on Map ↗</a>
      </div>

      <div class="prop-detail-meta">
        <div>
          <div class="meta-label">Bedrooms</div>
          <div class="meta-val">${p.type === 'Land' ? '—' : p.bedrooms}</div>
        </div>
        <div>
          <div class="meta-label">Bathrooms</div>
          <div class="meta-val">${p.type === 'Land' ? '—' : p.bathrooms}</div>
        </div>
        <div>
          <div class="meta-label">Square Feet</div>
          <div class="meta-val">${p.area_sqft.toLocaleString()}</div>
        </div>
        <div>
          <div class="meta-label">Est. $/SqFt</div>
          <div class="meta-val">${pricePerSqft ? `$${pricePerSqft}` : '—'}</div>
        </div>
      </div>

      <h4 style="font-size: 1rem; color: var(--navy-900); margin-bottom: 0.5rem; font-weight: 700;">Description</h4>
      <p style="color: var(--slate-600); line-height: 1.7; margin-bottom: 1.5rem;">${p.description}</p>

      <div style="background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
        <h4 style="font-size: 0.82rem; text-transform: uppercase; color: var(--navy-900); margin-bottom: 0.4rem; letter-spacing: 0.05em; font-weight: 800;">Austin Neighborhood Highlights</h4>
        <div style="font-size: 0.9rem; color: var(--slate-700);">
          Located in central Austin's <strong>${p.neighborhood}</strong> district. Minutes from Lady Bird Lake trails, culinary hubs, and live music. Zoned for Austin ISD.
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--slate-200); padding-top: 1.25rem;">
        <div style="font-family: monospace; color: var(--slate-400); font-size: 0.8rem;">Ref: ${p.id}</div>
        <button class="btn btn-primary btn-book-from-modal" data-id="${p.id}" ${p.status === 'Sold' ? 'disabled' : ''}>
          ${p.status === 'Sold' ? 'Property Sold' : '📅 Book a Visit / Reserve'}
        </button>
      </div>
    `;

    const bookBtn = content.querySelector('.btn-book-from-modal');
    if (bookBtn && p.status !== 'Sold') {
      bookBtn.addEventListener('click', () => {
        closeModal('modal-property-details');
        handleBookVisitClick(p.id);
      });
    }

    openModal('modal-property-details');
  } catch (err) {
    console.error('Error opening details:', err);
  }
}

// ==========================================
// CUSTOMER BOOKING FLOW
// ==========================================

function handleBookVisitClick(propertyId) {
  // Check if user is logged in
  if (!state.currentUser) {
    state.pendingBookingPropId = propertyId;
    showToast('Please sign in to schedule your property tour');
    switchView('signin');
    return;
  }

  openBookingModal(propertyId);
}

async function openBookingModal(propertyId) {
  try {
    const res = await api.getProperty(propertyId);
    if (!res.success) {
      showToast('Property not found', 'error');
      return;
    }

    const prop = res.data;
    state.activeProperty = prop;

    // Fill form
    document.getElementById('booking-prop-id').value = prop.id;
    document.getElementById('booking-prop-title').textContent = prop.title;
    document.getElementById('booking-prop-address').textContent = `${prop.neighborhood} • ${prop.address}`;
    document.getElementById('booking-prop-price').textContent = formatCurrency(prop.price);
    document.getElementById('booking-prop-img').src = prop.image_url;

    // Prefill customer details
    if (state.currentUser) {
      document.getElementById('booking-customer-name').value = state.currentUser.name || '';
      document.getElementById('booking-customer-email').value = state.currentUser.email || '';
      document.getElementById('booking-customer-phone').value = state.currentUser.phone || '';
    }

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('booking-date');
    dateInput.min = new Date().toISOString().split('T')[0];
    dateInput.value = tomorrow.toISOString().split('T')[0];

    openModal('modal-booking');
  } catch (err) {
    console.error(err);
  }
}

async function submitBookingForm(e) {
  e.preventDefault();

  const propertyId = document.getElementById('booking-prop-id').value;
  const name = document.getElementById('booking-customer-name').value.trim();
  const email = document.getElementById('booking-customer-email').value.trim();
  const phone = document.getElementById('booking-customer-phone').value.trim();
  const date = document.getElementById('booking-date').value;
  const time = document.getElementById('booking-time').value;
  const notes = document.getElementById('booking-notes').value.trim();

  if (!propertyId || !name || !email || !phone || !date) {
    showToast('Please fill in all required booking fields', 'error');
    return;
  }

  try {
    const payload = {
      property_id: propertyId,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      booking_date: date,
      booking_time: time,
      notes: notes,
      status: 'Pending'
    };

    const res = await api.createBooking(payload);
    if (res.success) {
      closeModal('modal-booking');
      showToast(`Visit booked successfully! Reference: ${res.data.id}`);
      loadMyBookings();
      switchView('my-bookings');
    } else {
      showToast(res.error || 'Failed to create booking', 'error');
    }
  } catch (err) {
    console.error('Booking error:', err);
    showToast('Network error while scheduling visit', 'error');
  }
}

// ==========================================
// DEDICATED CUSTOMER SIGN IN PAGE
// ==========================================

function setupCustomerSignInPage() {
  const tabLogin = document.getElementById('auth-page-tab-login');
  const tabReg = document.getElementById('auth-page-tab-register');
  const formLogin = document.getElementById('form-page-login');
  const formReg = document.getElementById('form-page-register');
  const btnFillCustomer = document.getElementById('btn-fill-customer-demo');
  const btnFillAdmin = document.getElementById('btn-fill-admin-demo');

  if (tabLogin && tabReg) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
      formLogin.style.display = 'block';
      formReg.style.display = 'none';
    });

    tabReg.addEventListener('click', () => {
      tabReg.classList.add('active');
      tabLogin.classList.remove('active');
      formLogin.style.display = 'none';
      formReg.style.display = 'block';
    });
  }

  // Quick fill customer demo
  if (btnFillCustomer) {
    btnFillCustomer.addEventListener('click', () => {
      document.getElementById('auth-page-login-email').value = 'sarah@atxlife.com';
      document.getElementById('auth-page-login-pass').value = 'customer123';
      showToast('Filled Customer Sarah Miller');
    });
  }

  // Quick fill admin demo
  if (btnFillAdmin) {
    btnFillAdmin.addEventListener('click', () => {
      document.getElementById('auth-page-login-email').value = 'admin@horizonproperties.com';
      document.getElementById('auth-page-login-pass').value = 'admin123';
      showToast('Filled Horizon Admin');
    });
  }

  // Handle Login Submit
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-page-login-email').value.trim();
      if (!email) return;

      const res = await api.login(email);
      if (res.success) {
        state.currentUser = res.data;
        localStorage.setItem('horizon_user', JSON.stringify(res.data));
        updateAuthUI();
        showToast(`Welcome back, ${res.data.name}!`);

        // If there was a pending booking, resume it
        if (state.pendingBookingPropId) {
          const propId = state.pendingBookingPropId;
          state.pendingBookingPropId = null;
          switchView('catalog');
          openBookingModal(propId);
        } else if (res.data.role === 'admin') {
          switchView('admin');
        } else {
          switchView('catalog');
        }
      } else {
        showToast(res.error || 'Sign in failed', 'error');
      }
    });
  }

  // Handle Register Submit
  if (formReg) {
    formReg.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('auth-page-reg-name').value.trim();
      const email = document.getElementById('auth-page-reg-email').value.trim();
      const phone = document.getElementById('auth-page-reg-phone').value.trim();

      if (!name || !email) {
        showToast('Name and email are required', 'error');
        return;
      }

      const res = await api.register(name, email, phone);
      if (res.success) {
        state.currentUser = res.data;
        localStorage.setItem('horizon_user', JSON.stringify(res.data));
        updateAuthUI();
        showToast(`Account created! Welcome, ${res.data.name}.`);

        if (state.pendingBookingPropId) {
          const propId = state.pendingBookingPropId;
          state.pendingBookingPropId = null;
          switchView('catalog');
          openBookingModal(propId);
        } else {
          switchView('catalog');
        }
      } else {
        showToast(res.error || 'Registration failed', 'error');
      }
    });
  }
}

// ==========================================
// CUSTOMER "MY BOOKINGS" VIEW
// ==========================================

async function loadMyBookings() {
  if (!state.currentUser || !state.currentUser.email) {
    renderMyBookings([]);
    return;
  }

  try {
    const res = await api.getBookings({ customer_email: state.currentUser.email });
    if (res.success) {
      state.myBookings = res.data;
      renderMyBookings(res.data);
      const badge = document.getElementById('my-bookings-count-badge');
      if (badge) {
        badge.textContent = res.data.length;
        badge.style.display = res.data.length > 0 ? 'inline-block' : 'none';
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function renderMyBookings(bookings) {
  const container = document.getElementById('my-bookings-container');
  if (!container) return;

  if (!state.currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <h3>Customer Sign In Required</h3>
        <p>Please sign in with your customer account to view and manage your Austin property visits.</p>
        <button class="btn btn-primary" id="btn-goto-signin">Go to Sign In Page</button>
      </div>
    `;
    const btn = document.getElementById('btn-goto-signin');
    if (btn) btn.addEventListener('click', () => switchView('signin'));
    return;
  }

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No Scheduled Visits Yet</h3>
        <p>You haven't booked any Austin property tours yet. Browse our exclusive listings and schedule a private visit.</p>
        <button class="btn btn-primary" id="btn-goto-catalog">Explore Austin Properties</button>
      </div>
    `;
    const btn = document.getElementById('btn-goto-catalog');
    if (btn) btn.addEventListener('click', () => switchView('catalog'));
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      ${bookings.map(b => `
        <div style="background: var(--white); border-radius: var(--radius-lg); border: 1px solid var(--slate-200); padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.25rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            ${b.property_image ? `<img src="${b.property_image}" alt="${b.property_title}" style="width: 100px; height: 75px; object-fit: cover; border-radius: var(--radius-md);" />` : ''}
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
                <span style="font-family: monospace; font-size: 0.75rem; font-weight: 700; color: var(--navy-900);">${b.id}</span>
                <span class="badge badge-status-${b.status.toLowerCase()}">${b.status}</span>
              </div>
              <h4 style="font-size: 1.1rem; color: var(--navy-900); font-weight: 800; margin-bottom: 0.25rem;">${b.property_title}</h4>
              <div style="font-size: 0.82rem; color: var(--slate-500);">📍 ${b.property_neighborhood || 'Austin, TX'} • ${b.property_address || ''}</div>
              <div style="font-size: 0.85rem; color: var(--navy-800); font-weight: 600; margin-top: 0.35rem;">
                🗓️ Visit Date: <strong>${formatDate(b.booking_date)}</strong> at <strong>${b.booking_time || '14:00'}</strong>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="btn btn-outline btn-sm btn-view-booking-prop" data-prop-id="${b.property_id}">View Property</button>
            ${b.status !== 'Cancelled' ? `
              <button class="btn btn-outline btn-sm btn-cancel-booking" data-id="${b.id}" style="color: #64748b;">Cancel Visit</button>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.btn-view-booking-prop').forEach(btn => {
    btn.addEventListener('click', () => openPropertyDetails(btn.dataset.propId));
  });

  container.querySelectorAll('.btn-cancel-booking').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to cancel this scheduled property tour?')) {
        const res = await api.updateBooking(btn.dataset.id, { status: 'Cancelled' });
        if (res.success) {
          showToast('Visit cancelled');
          loadMyBookings();
        }
      }
    });
  });
}

// ==========================================
// ADMIN DASHBOARD (ADMIN ONLY)
// ==========================================

async function loadAdminDashboard() {
  if (!state.currentUser || state.currentUser.role !== 'admin') {
    showToast('Admin Dashboard is restricted to administrators', 'error');
    switchView('signin');
    return;
  }

  try {
    const statsRes = await api.getStats();
    if (statsRes.success) {
      state.stats = statsRes.data;
      renderAdminStats(statsRes.data);
    }

    if (state.adminSubTab === 'properties') {
      loadAdminProperties();
    } else if (state.adminSubTab === 'bookings') {
      loadAdminBookings();
    }
  } catch (err) {
    console.error(err);
  }
}

function renderAdminStats(stats) {
  const container = document.getElementById('admin-stats-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-title">Total Austin Properties</div>
      <div class="stat-number">${stats.total_properties}</div>
      <div class="stat-sub">${stats.available_properties} Available • ${stats.reserved_properties} Reserved • ${stats.sold_properties} Sold</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Portfolio Total Value</div>
      <div class="stat-number">${formatCurrency(stats.total_portfolio_value)}</div>
      <div class="stat-sub">Austin Metro Exclusives</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Tour Bookings</div>
      <div class="stat-number">${stats.total_bookings}</div>
      <div class="stat-sub">${stats.pending_bookings} Pending • ${stats.confirmed_bookings} Confirmed</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Pending Action</div>
      <div class="stat-number" style="color: var(--navy-900);">${stats.pending_bookings}</div>
      <div class="stat-sub">Visits awaiting confirmation</div>
    </div>
  `;
}

async function loadAdminProperties() {
  const res = await api.getProperties({ sort: 'newest' });
  const container = document.getElementById('admin-properties-table-wrap');
  if (!container) return;

  if (res.success) {
    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Type</th>
            <th>Neighborhood</th>
            <th>Price</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${res.data.map(p => `
            <tr>
              <td><span style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${p.id}</span></td>
              <td>
                <div style="font-weight: 700; color: var(--navy-900);">${p.title}</div>
                <div style="font-size: 0.78rem; color: var(--slate-500);">${p.address}</div>
              </td>
              <td><span class="badge badge-type">${p.type}</span></td>
              <td><strong>${p.neighborhood}</strong></td>
              <td><strong style="color: var(--navy-900);">${formatCurrency(p.price)}</strong></td>
              <td>
                <select class="form-control admin-status-quick-select" data-id="${p.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; width: auto;">
                  <option value="Available" ${p.status === 'Available' ? 'selected' : ''}>Available</option>
                  <option value="Reserved" ${p.status === 'Reserved' ? 'selected' : ''}>Reserved</option>
                  <option value="Sold" ${p.status === 'Sold' ? 'selected' : ''}>Sold</option>
                </select>
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <button class="btn btn-outline btn-sm btn-admin-edit" data-id="${p.id}">Edit</button>
                <button class="btn btn-outline btn-sm btn-admin-delete" data-id="${p.id}" style="color: #64748b;">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.admin-status-quick-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        const upRes = await api.updateProperty(id, { status: newStatus });
        if (upRes.success) {
          showToast(`Property ${id} marked as ${newStatus}`);
          loadAdminDashboard();
        }
      });
    });

    container.querySelectorAll('.btn-admin-edit').forEach(btn => {
      btn.addEventListener('click', () => openEditPropertyModal(btn.dataset.id));
    });

    container.querySelectorAll('.btn-admin-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to permanently delete property ${btn.dataset.id}?`)) {
          const delRes = await api.deleteProperty(btn.dataset.id);
          if (delRes.success) {
            showToast(`Property ${btn.dataset.id} deleted`);
            loadAdminDashboard();
            loadProperties();
          }
        }
      });
    });
  }
}

async function loadAdminBookings() {
  const res = await api.getBookings();
  const container = document.getElementById('admin-bookings-table-wrap');
  if (!container) return;

  if (res.success) {
    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Customer</th>
            <th>Property</th>
            <th>Date & Time</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${res.data.map(b => `
            <tr>
              <td><span style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${b.id}</span></td>
              <td>
                <div style="font-weight: 700; color: var(--navy-900);">${b.customer_name}</div>
                <div style="font-size: 0.78rem; color: var(--slate-500);">${b.customer_email} • ${b.customer_phone}</div>
                ${b.notes ? `<div style="font-size: 0.75rem; color: var(--slate-400); font-style: italic; margin-top: 0.2rem;">"${b.notes}"</div>` : ''}
              </td>
              <td>
                <div style="font-weight: 600;">${b.property_title}</div>
                <div style="font-size: 0.75rem; color: var(--slate-500); font-family: monospace;">${b.property_id}</div>
              </td>
              <td>
                <div style="font-weight: 700; color: var(--navy-900);">${formatDate(b.booking_date)}</div>
                <div style="font-size: 0.78rem; color: var(--slate-500);">${b.booking_time || '14:00'}</div>
              </td>
              <td><span class="badge badge-status-${b.status.toLowerCase()}">${b.status}</span></td>
              <td style="text-align: right; white-space: nowrap;">
                ${b.status === 'Pending' ? `
                  <button class="btn btn-sm btn-primary btn-admin-confirm-booking" data-id="${b.id}">Confirm</button>
                ` : ''}
                ${b.status !== 'Cancelled' ? `
                  <button class="btn btn-outline btn-sm btn-admin-cancel-booking" data-id="${b.id}">Cancel</button>
                ` : ''}
                <button class="btn btn-outline btn-sm btn-admin-del-booking" data-id="${b.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.btn-admin-confirm-booking').forEach(btn => {
      btn.addEventListener('click', async () => {
        const upRes = await api.updateBooking(btn.dataset.id, { status: 'Confirmed' });
        if (upRes.success) {
          showToast(`Booking ${btn.dataset.id} confirmed!`);
          loadAdminBookings();
        }
      });
    });

    container.querySelectorAll('.btn-admin-cancel-booking').forEach(btn => {
      btn.addEventListener('click', async () => {
        const upRes = await api.updateBooking(btn.dataset.id, { status: 'Cancelled' });
        if (upRes.success) {
          showToast(`Booking ${btn.dataset.id} cancelled`);
          loadAdminBookings();
        }
      });
    });

    container.querySelectorAll('.btn-admin-del-booking').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm(`Delete booking ${btn.dataset.id}?`)) {
          const delRes = await api.deleteBooking(btn.dataset.id);
          if (delRes.success) {
            showToast(`Booking ${btn.dataset.id} deleted`);
            loadAdminBookings();
          }
        }
      });
    });
  }
}

// Admin Add / Edit Property Modal
function openAddPropertyModal() {
  state.editingProperty = null;
  document.getElementById('modal-property-form-title').textContent = 'Add New Austin Property';
  document.getElementById('form-prop-id').value = '';
  document.getElementById('form-prop-title').value = '';
  document.getElementById('form-prop-type').value = 'House';
  document.getElementById('form-prop-neighborhood').value = 'Downtown';
  document.getElementById('form-prop-price').value = '';
  document.getElementById('form-prop-address').value = '';
  document.getElementById('form-prop-bedrooms').value = '3';
  document.getElementById('form-prop-bathrooms').value = '2';
  document.getElementById('form-prop-sqft').value = '2000';
  document.getElementById('form-prop-image').value = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';
  document.getElementById('form-prop-status').value = 'Available';
  document.getElementById('form-prop-desc').value = '';

  openModal('modal-edit-property');
}

async function openEditPropertyModal(id) {
  const res = await api.getProperty(id);
  if (!res.success) return;

  const p = res.data;
  state.editingProperty = p;

  document.getElementById('modal-property-form-title').textContent = `Edit Property (${p.id})`;
  document.getElementById('form-prop-id').value = p.id;
  document.getElementById('form-prop-title').value = p.title;
  document.getElementById('form-prop-type').value = p.type;
  document.getElementById('form-prop-neighborhood').value = p.neighborhood;
  document.getElementById('form-prop-price').value = p.price;
  document.getElementById('form-prop-address').value = p.address;
  document.getElementById('form-prop-bedrooms').value = p.bedrooms;
  document.getElementById('form-prop-bathrooms').value = p.bathrooms;
  document.getElementById('form-prop-sqft').value = p.area_sqft;
  document.getElementById('form-prop-image').value = p.image_url;
  document.getElementById('form-prop-status').value = p.status;
  document.getElementById('form-prop-desc').value = p.description;

  openModal('modal-edit-property');
}

async function savePropertyForm(e) {
  e.preventDefault();

  const id = document.getElementById('form-prop-id').value;
  const payload = {
    title: document.getElementById('form-prop-title').value.trim(),
    type: document.getElementById('form-prop-type').value,
    neighborhood: document.getElementById('form-prop-neighborhood').value,
    price: Number(document.getElementById('form-prop-price').value),
    address: document.getElementById('form-prop-address').value.trim(),
    bedrooms: Number(document.getElementById('form-prop-bedrooms').value),
    bathrooms: Number(document.getElementById('form-prop-bathrooms').value),
    area_sqft: Number(document.getElementById('form-prop-sqft').value),
    image_url: document.getElementById('form-prop-image').value.trim(),
    status: document.getElementById('form-prop-status').value,
    description: document.getElementById('form-prop-desc').value.trim()
  };

  if (!payload.title || !payload.price) {
    showToast('Please enter a title and price', 'error');
    return;
  }

  if (id) {
    const res = await api.updateProperty(id, payload);
    if (res.success) {
      showToast(`Property ${id} updated successfully`);
      closeModal('modal-edit-property');
      loadAdminDashboard();
      loadProperties();
    } else {
      showToast(res.error || 'Update failed', 'error');
    }
  } else {
    const res = await api.createProperty(payload);
    if (res.success) {
      showToast(`New property ${res.data.id} created!`);
      closeModal('modal-edit-property');
      loadAdminDashboard();
      loadProperties();
    } else {
      showToast(res.error || 'Creation failed', 'error');
    }
  }
}

// ==========================================
// N8N AUTOMATION TESTERS (ADMIN EXCLUSIVE)
// ==========================================

function setupAdminApiPlayground() {
  const btnTestSearch = document.getElementById('btn-test-api-search');
  const btnTestBooking = document.getElementById('btn-test-api-booking');
  const outSearch = document.getElementById('json-search-output');
  const outBooking = document.getElementById('json-booking-output');

  if (btnTestSearch) {
    btnTestSearch.addEventListener('click', async () => {
      const type = document.getElementById('api-test-type').value;
      const nh = document.getElementById('api-test-neighborhood').value;
      const maxPrice = document.getElementById('api-test-max-price').value;

      const params = {};
      if (type && type !== 'all') params.type = type;
      if (nh && nh !== 'all') params.neighborhood = nh;
      if (maxPrice) params.max_price = maxPrice;

      outSearch.textContent = 'Calling GET /api/properties...';
      try {
        const res = await api.getProperties(params);
        outSearch.textContent = JSON.stringify(res, null, 2);
      } catch (err) {
        outSearch.textContent = 'Error: ' + err.message;
      }
    });
  }

  if (btnTestBooking) {
    btnTestBooking.addEventListener('click', async () => {
      const payloadStr = document.getElementById('api-test-booking-payload').value;
      outBooking.textContent = 'Calling POST /api/bookings...';
      try {
        const payload = JSON.parse(payloadStr);
        const res = await api.createBooking(payload);
        outBooking.textContent = JSON.stringify(res, null, 2);
        showToast('Live test booking created in database!');
      } catch (err) {
        outBooking.textContent = 'Error: ' + err.message;
      }
    });
  }
}

// ==========================================
// MODAL HELPERS
// ==========================================

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function setupModalClosers() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  setupFilterListeners();
  setupModalClosers();
  setupCustomerSignInPage();
  setupAdminApiPlayground();

  // Navigation handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  // Brand click -> Catalog
  const brandEl = document.getElementById('brand-logo');
  if (brandEl) {
    brandEl.addEventListener('click', () => switchView('catalog'));
  }

  // Top Bar Demo Selector
  const demoSelect = document.getElementById('demo-user-select');
  if (demoSelect) {
    demoSelect.addEventListener('change', (e) => {
      switchDemoAccount(e.target.value);
    });
  }

  // Top Nav "Customer Sign In" button
  const showLoginBtn = document.getElementById('btn-show-login');
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', () => switchView('signin'));
  }

  // Header Sign Out button
  const headerSignOut = document.getElementById('btn-header-signout');
  if (headerSignOut) {
    headerSignOut.addEventListener('click', signOut);
  }

  // Booking Form Submission
  const bookingForm = document.getElementById('form-booking');
  if (bookingForm) bookingForm.addEventListener('submit', submitBookingForm);

  // Admin Sub-tabs
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.adminSubTab = btn.dataset.tab;

      document.getElementById('admin-tab-properties').style.display = btn.dataset.tab === 'properties' ? 'block' : 'none';
      document.getElementById('admin-tab-bookings').style.display = btn.dataset.tab === 'bookings' ? 'block' : 'none';
      document.getElementById('admin-tab-n8n').style.display = btn.dataset.tab === 'n8n' ? 'block' : 'none';

      if (btn.dataset.tab === 'properties') loadAdminProperties();
      if (btn.dataset.tab === 'bookings') loadAdminBookings();
    });
  });

  // Admin Add Property Button
  const btnAddProp = document.getElementById('btn-admin-add-prop');
  if (btnAddProp) {
    btnAddProp.addEventListener('click', openAddPropertyModal);
  }

  // Admin Property Save Form
  const propForm = document.getElementById('form-property-edit');
  if (propForm) {
    propForm.addEventListener('submit', savePropertyForm);
  }

  // Initial Load
  loadProperties();
});
