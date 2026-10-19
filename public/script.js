/**
 * ==========================================================================
 * Campus Lost & Found - Client-Side Application Logic
 * Pure Vanilla JavaScript (ES6+)
 * 
 * Architecture:
 * - State Management: Single source of truth for items and filter parameters
 * - API Service: Wrapper around native fetch() for backend HTTP requests
 * - UI Renderers: Pure DOM manipulation functions for cards, badges, and stats
 * - Event Handlers: Search debounce, form submission, status update, deletion
 * ==========================================================================
 */

// Global App State
const state = {
  items: [],              // Currently loaded items from API
  allItemsUnfiltered: [], // Cache used to keep dashboard stats accurate
  activeDeleteId: null,   // Stores ID of item pending deletion in modal
  isLoading: false,
};

// API Endpoints
const API_BASE = 'http://localhost:5000/api/items';

// DOM Elements Cache
const elements = {
  // Stats
  statTotal: document.getElementById('stat-total-count'),
  statLost: document.getElementById('stat-lost-count'),
  statFound: document.getElementById('stat-found-count'),
  itemsCountBadge: document.getElementById('items-count-badge'),

  // Filters & Search
  filterSearch: document.getElementById('filter-search'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  filterType: document.getElementById('filter-type'),
  filterCategory: document.getElementById('filter-category'),
  filterLocation: document.getElementById('filter-location'),
  filterStatus: document.getElementById('filter-status'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),

  // Containers & States
  itemsGrid: document.getElementById('items-grid'),
  loadingIndicator: document.getElementById('loading-indicator'),
  emptyState: document.getElementById('empty-state'),
  emptyTitle: document.getElementById('empty-title'),
  emptyMessage: document.getElementById('empty-message'),
  emptyResetBtn: document.getElementById('empty-reset-btn'),
  connectionError: document.getElementById('connection-error'),
  connectionErrorMsg: document.getElementById('connection-error-msg'),
  retryBtn: document.getElementById('retry-btn'),

  // Report Form
  reportSection: document.getElementById('report-section'),
  toggleFormBtn: document.getElementById('toggle-form-btn'),
  closeFormBtn: document.getElementById('close-form-btn'),
  cancelFormBtn: document.getElementById('cancel-form-btn'),
  reportForm: document.getElementById('report-item-form'),
  submitFormBtn: document.getElementById('submit-form-btn'),

  // Delete Modal
  deleteModal: document.getElementById('delete-modal'),
  deleteItemTitle: document.getElementById('delete-item-title'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),

  // Toast Container
  toastContainer: document.getElementById('toast-container'),
};

/* ==========================================================================
   Utility Helpers
   ========================================================================== */

/**
 * Creates a debounced version of a function to prevent excessive API requests
 * during real-time typing in the search box.
 */
function debounce(fn, delayMs = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  };
}

/**
 * Escape HTML strings to protect against Cross-Site Scripting (XSS)
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Displays modern non-intrusive toast notifications
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  // Icons based on type
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${escapeHTML(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Formats ISO date into human-readable campus format (e.g., "Oct 20, 2026")
 */
function formatDate(dateString) {
  if (!dateString) return 'Date not specified';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ==========================================================================
   FEATURE 1: Dashboard & Metrics
   ========================================================================== */

/**
 * Updates dashboard metric counters with subtle count-up effect
 */
function updateDashboardMetrics() {
  // If we have an unfiltered list from initial fetch, calculate accurate totals
  const dataset = state.allItemsUnfiltered.length > 0 ? state.allItemsUnfiltered : state.items;

  const total = dataset.length;
  const lostCount = dataset.filter((item) => item.type === 'lost').length;
  const foundCount = dataset.filter((item) => item.type === 'found').length;

  elements.statTotal.textContent = total;
  elements.statLost.textContent = lostCount;
  elements.statFound.textContent = foundCount;
}

/* ==========================================================================
   FEATURE 2: Fetch and Render Items
   ========================================================================== */

/**
 * Reads user inputs from search and filter controls to build query string
 */
function buildQueryString() {
  const params = new URLSearchParams();

  const searchVal = elements.filterSearch.value.trim();
  if (searchVal) params.append('search', searchVal);

  const typeVal = elements.filterType.value;
  if (typeVal) params.append('type', typeVal);

  const categoryVal = elements.filterCategory.value;
  if (categoryVal) params.append('category', categoryVal);

  const locationVal = elements.filterLocation.value.trim();
  if (locationVal) params.append('location', locationVal);

  const statusVal = elements.filterStatus.value;
  if (statusVal) params.append('status', statusVal);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Fetches item reports from backend API GET /api/items
 */
async function fetchItems(isInitialLoad = false) {
  state.isLoading = true;
  elements.loadingIndicator.classList.remove('hidden');
  elements.itemsGrid.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.connectionError.classList.add('hidden');

  try {
    const query = buildQueryString();
    const response = await fetch(`${API_BASE}${query}`);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    state.items = result.data || [];

    // Cache the unfiltered master list when no filters are active
    if (!query || isInitialLoad) {
      state.allItemsUnfiltered = [...state.items];
    }

    updateDashboardMetrics();
    renderItems(state.items);
  } catch (error) {
    console.error('[API Error] Failed to fetch items:', error);
    elements.connectionError.classList.remove('hidden');
    elements.connectionErrorMsg.textContent = `Unable to connect to server: ${error.message}. Is your backend running on port 5000?`;
    renderItems([]);
  } finally {
    state.isLoading = false;
    elements.loadingIndicator.classList.add('hidden');
  }
}

/**
 * Renders the array of item cards to the DOM
 */
function renderItems(items) {
  elements.itemsGrid.innerHTML = '';
  elements.itemsCountBadge.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;

  // Check for empty state
  if (!items || items.length === 0) {
    elements.emptyState.classList.remove('hidden');
    elements.itemsGrid.classList.add('hidden');

    const hasFiltersActive = buildQueryString() !== '';
    if (hasFiltersActive) {
      elements.emptyTitle.textContent = 'No matching items found';
      elements.emptyMessage.textContent = 'Try adjusting your search keywords, category, or location filters.';
      elements.emptyResetBtn.classList.remove('hidden');
    } else {
      elements.emptyTitle.textContent = 'No reports yet';
      elements.emptyMessage.textContent = 'Be the first to report a lost or found item to help the campus community.';
      elements.emptyResetBtn.classList.add('hidden');
    }
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.itemsGrid.classList.remove('hidden');

  // Render each item card
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'item-card';
    card.id = `item-card-${item._id}`;

    // Badges configuration
    const typeBadgeClass = item.type === 'lost' ? 'badge-lost' : 'badge-found';
    const typeLabel = item.type === 'lost' ? 'Lost' : 'Found';

    let statusBadgeClass = 'badge-open';
    if (item.status === 'claimed') statusBadgeClass = 'badge-claimed';
    if (item.status === 'resolved') statusBadgeClass = 'badge-resolved';

    const statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);

    card.innerHTML = `
      <div class="item-card-header">
        <div class="item-badges">
          <span class="badge ${typeBadgeClass}">
            <span class="badge-dot"></span>
            ${typeLabel}
          </span>
          <span class="badge ${statusBadgeClass}" id="status-badge-${item._id}">
            ${statusLabel}
          </span>
        </div>
        <button 
          class="btn-icon btn-icon-danger delete-item-btn" 
          data-id="${item._id}" 
          data-title="${escapeHTML(item.title)}" 
          title="Delete report"
          aria-label="Delete report for ${escapeHTML(item.title)}"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <h3 class="item-title">${escapeHTML(item.title)}</h3>
      <p class="item-description">${escapeHTML(item.description)}</p>

      <div class="item-meta">
        <div class="meta-row">
          <svg class="meta-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <span>Category: <strong class="meta-value">${escapeHTML(item.category)}</strong></span>
        </div>
        <div class="meta-row">
          <svg class="meta-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>Location: <strong class="meta-value">${escapeHTML(item.location)}</strong></span>
        </div>
        <div class="meta-row">
          <svg class="meta-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Reported: <strong class="meta-value">${formatDate(item.date || item.createdAt)}</strong></span>
        </div>
      </div>

      <div class="item-contact-box">
        <div class="contact-label">Reporter Contact</div>
        <div class="contact-details">
          <span><strong>${escapeHTML(item.contactName)}</strong></span>
          &bull;
          <a class="contact-link" href="mailto:${escapeHTML(item.contactEmail)}">${escapeHTML(item.contactEmail)}</a>
          ${item.contactPhone ? `&bull; <span>${escapeHTML(item.contactPhone)}</span>` : ''}
        </div>
      </div>

      <div class="item-card-actions">
        <div class="status-select-wrapper">
          <label for="status-select-${item._id}" class="status-select-label">Status:</label>
          <select 
            id="status-select-${item._id}" 
            class="status-select" 
            data-id="${item._id}"
            aria-label="Change status for ${escapeHTML(item.title)}"
          >
            <option value="open" ${item.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="claimed" ${item.status === 'claimed' ? 'selected' : ''}>Claimed</option>
            <option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </div>
      </div>
    `;

    elements.itemsGrid.appendChild(card);
  });
}

/* ==========================================================================
   FEATURE 3: Search and Filtering Logic
   ========================================================================== */

/**
 * Resets all filter inputs and re-fetches all items
 */
function resetAllFilters() {
  elements.filterSearch.value = '';
  elements.clearSearchBtn.classList.add('hidden');
  elements.filterType.value = '';
  elements.filterCategory.value = '';
  elements.filterLocation.value = '';
  elements.filterStatus.value = '';
  fetchItems();
}

/* ==========================================================================
   FEATURE 4: Report an Item (Form Handling)
   ========================================================================== */

/**
 * Validates report form on client side and displays inline error messages
 */
function validateReportForm(formData) {
  let isValid = true;

  // Clear previous errors
  document.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  document.querySelectorAll('.form-control').forEach((el) => el.classList.remove('is-invalid'));

  // Title validation
  if (!formData.title || formData.title.trim().length < 2) {
    document.getElementById('error-title').textContent = 'Title must be at least 2 characters.';
    document.getElementById('item-title').classList.add('is-invalid');
    isValid = false;
  }

  // Category validation
  if (!formData.category) {
    document.getElementById('error-category').textContent = 'Please select a category.';
    document.getElementById('item-category').classList.add('is-invalid');
    isValid = false;
  }

  // Location validation
  if (!formData.location || formData.location.trim().length === 0) {
    document.getElementById('error-location').textContent = 'Please specify the campus location.';
    document.getElementById('item-location').classList.add('is-invalid');
    isValid = false;
  }

  // Description validation
  if (!formData.description || formData.description.trim().length === 0) {
    document.getElementById('error-description').textContent = 'Please provide a detailed description.';
    document.getElementById('item-desc').classList.add('is-invalid');
    isValid = false;
  }

  // Contact Name validation
  if (!formData.contactName || formData.contactName.trim().length === 0) {
    document.getElementById('error-contactName').textContent = 'Contact name is required.';
    document.getElementById('contact-name').classList.add('is-invalid');
    isValid = false;
  }

  // Email validation regex matching backend
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!formData.contactEmail || !emailRegex.test(formData.contactEmail.trim())) {
    document.getElementById('error-contactEmail').textContent = 'Please provide a valid email (e.g. name@campus.edu).';
    document.getElementById('contact-email').classList.add('is-invalid');
    isValid = false;
  }

  return isValid;
}

/**
 * Handles Form Submission -> POST /api/items
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const form = elements.reportForm;
  const formData = {
    type: form.elements.type.value,
    title: form.elements.title.value.trim(),
    category: form.elements.category.value,
    location: form.elements.location.value.trim(),
    date: form.elements.date.value || undefined,
    description: form.elements.description.value.trim(),
    contactName: form.elements.contactName.value.trim(),
    contactEmail: form.elements.contactEmail.value.trim(),
    contactPhone: form.elements.contactPhone.value.trim(),
  };

  if (!validateReportForm(formData)) {
    showToast('Please fix the highlighted fields in the form.', 'error');
    return;
  }

  // Set submitting state
  const submitBtn = elements.submitFormBtn;
  const btnText = submitBtn.querySelector('.btn-text');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');

  submitBtn.disabled = true;
  btnText.textContent = 'Submitting...';
  btnSpinner.classList.remove('hidden');

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit report');
    }

    // Success!
    showToast(`Successfully reported "${formData.title}"!`, 'success');
    form.reset();

    // Reset date picker to today
    document.getElementById('item-date').valueAsDate = new Date();

    // Collapse form on success
    elements.reportSection.classList.add('hidden');

    // Refresh items and update dashboard
    await fetchItems(true);

  } catch (error) {
    console.error('[API Error] POST /api/items failed:', error);
    showToast(`Submission error: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Submit Report';
    btnSpinner.classList.add('hidden');
  }
}

/* ==========================================================================
   FEATURE 5: Update Item Status (PUT /api/items/:id)
   ========================================================================== */

/**
 * Handles status change dropdown on item cards
 */
async function handleStatusChange(itemId, newStatus) {
  const selectElement = document.getElementById(`status-select-${itemId}`);
  const badgeElement = document.getElementById(`status-badge-${itemId}`);
  const originalStatus = selectElement.getAttribute('data-original-status') || newStatus;

  selectElement.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Status update failed');
    }

    // Update state object in memory
    const item = state.items.find((i) => i._id === itemId);
    if (item) item.status = newStatus;

    const unfilteredItem = state.allItemsUnfiltered.find((i) => i._id === itemId);
    if (unfilteredItem) unfilteredItem.status = newStatus;

    // Update badge visual in real time
    if (badgeElement) {
      badgeElement.className = `badge badge-${newStatus}`;
      badgeElement.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    }

    selectElement.setAttribute('data-original-status', newStatus);
    showToast(`Item status updated to "${newStatus.toUpperCase()}"`, 'success');

  } catch (error) {
    console.error('[API Error] PUT /api/items/:id failed:', error);
    showToast(`Could not update status: ${error.message}`, 'error');
    // Revert select dropdown
    selectElement.value = originalStatus;
  } finally {
    selectElement.disabled = false;
  }
}

/* ==========================================================================
   FEATURE 6: Delete Item Report (DELETE /api/items/:id)
   ========================================================================== */

/**
 * Opens delete confirmation modal
 */
function openDeleteModal(itemId, itemTitle) {
  state.activeDeleteId = itemId;
  elements.deleteItemTitle.textContent = itemTitle || 'this item';
  elements.deleteModal.classList.remove('hidden');
}

/**
 * Closes delete confirmation modal
 */
function closeDeleteModal() {
  state.activeDeleteId = null;
  elements.deleteModal.classList.add('hidden');
}

/**
 * Confirms deletion and makes DELETE /api/items/:id request
 */
async function confirmDeleteItem() {
  const itemId = state.activeDeleteId;
  if (!itemId) return;

  const btn = elements.confirmDeleteBtn;
  const btnText = btn.querySelector('.btn-text');
  const btnSpinner = btn.querySelector('.btn-spinner');

  btn.disabled = true;
  btnText.textContent = 'Deleting...';
  btnSpinner.classList.remove('hidden');

  try {
    const response = await fetch(`${API_BASE}/${itemId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete item');
    }

    showToast('Item report deleted successfully.', 'info');
    closeDeleteModal();

    // Remove from in-memory state
    state.items = state.items.filter((i) => i._id !== itemId);
    state.allItemsUnfiltered = state.allItemsUnfiltered.filter((i) => i._id !== itemId);

    // Update metrics and re-render
    updateDashboardMetrics();
    renderItems(state.items);

  } catch (error) {
    console.error('[API Error] DELETE /api/items/:id failed:', error);
    showToast(`Deletion failed: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Delete Report';
    btnSpinner.classList.add('hidden');
  }
}

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */

function initializeEventListeners() {
  // 1. Search with debounce (prevents spamming backend on each keystroke)
  const debouncedSearch = debounce(() => {
    fetchItems();
  }, 300);

  elements.filterSearch.addEventListener('input', (e) => {
    if (e.target.value.trim().length > 0) {
      elements.clearSearchBtn.classList.remove('hidden');
    } else {
      elements.clearSearchBtn.classList.add('hidden');
    }
    debouncedSearch();
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.filterSearch.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    fetchItems();
  });

  // 2. Filter dropdowns & inputs
  elements.filterType.addEventListener('change', () => fetchItems());
  elements.filterCategory.addEventListener('change', () => fetchItems());
  elements.filterStatus.addEventListener('change', () => fetchItems());
  
  const debouncedLocation = debounce(() => fetchItems(), 350);
  elements.filterLocation.addEventListener('input', debouncedLocation);

  // Reset filters
  elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
  elements.emptyResetBtn.addEventListener('click', resetAllFilters);

  // Retry connection button
  elements.retryBtn.addEventListener('click', () => fetchItems(true));

  // 3. Form Toggle and Actions
  elements.toggleFormBtn.addEventListener('click', () => {
    const isHidden = elements.reportSection.classList.contains('hidden');
    if (isHidden) {
      elements.reportSection.classList.remove('hidden');
      elements.reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('item-title').focus();
    } else {
      elements.reportSection.classList.add('hidden');
    }
  });

  elements.closeFormBtn.addEventListener('click', () => {
    elements.reportSection.classList.add('hidden');
  });

  elements.cancelFormBtn.addEventListener('click', () => {
    elements.reportSection.classList.add('hidden');
  });

  elements.reportForm.addEventListener('submit', handleFormSubmit);

  // 4. Card Delegation for Status Change and Delete Button
  elements.itemsGrid.addEventListener('change', (e) => {
    if (e.target.classList.contains('status-select')) {
      const itemId = e.target.getAttribute('data-id');
      const newStatus = e.target.value;
      handleStatusChange(itemId, newStatus);
    }
  });

  elements.itemsGrid.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-item-btn');
    if (deleteBtn) {
      const itemId = deleteBtn.getAttribute('data-id');
      const itemTitle = deleteBtn.getAttribute('data-title');
      openDeleteModal(itemId, itemTitle);
    }
  });

  // 5. Delete Modal Handlers
  elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  elements.confirmDeleteBtn.addEventListener('click', confirmDeleteItem);

  // Close modal when clicking on overlay background
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) {
      closeDeleteModal();
    }
  });

  // Close modal with ESC key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.deleteModal.classList.contains('hidden')) {
      closeDeleteModal();
    }
  });
}

/* ==========================================================================
   Application Initialization
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Campus Lost & Found] Frontend initialized.');

  // Set default date input to today's date
  const dateInput = document.getElementById('item-date');
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  // Start with report section hidden by default for cleaner dashboard view
  elements.reportSection.classList.add('hidden');

  // Attach event listeners
  initializeEventListeners();

  // Load initial data from backend
  fetchItems(true);
});
