// FinSentinel - Module 3: Suspicious Transaction & Anomaly Analyser
class TransactionDetectorController {
  constructor() {
    this.transactions = [];
    this.filteredTransactions = [];
    this.init();
  }

  init() {
    // Dropzone drag & drop
    const dropzone = document.getElementById('tx-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent-primary)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-color)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files.length) {
          this.uploadFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Load Demo Statement button
    const btnDemo = document.getElementById('btn-load-demo-statement');
    if (btnDemo) {
      btnDemo.addEventListener('click', () => this.loadDemoStatement());
    }

    // Manual Transaction modal button
    const btnManualModal = document.getElementById('btn-manual-tx-modal');
    if (btnManualModal) {
      btnManualModal.addEventListener('click', () => window.app.openModal('modal-manual-tx'));
    }

    // Manual form submit
    const manualForm = document.getElementById('form-manual-tx');
    if (manualForm) {
      manualForm.addEventListener('submit', (e) => this.handleManualSubmit(e));
    }

    // Search & Filter
    const searchInput = document.getElementById('tx-search-input');
    const riskFilter = document.getElementById('tx-risk-filter');
    if (searchInput) searchInput.addEventListener('input', () => this.applyFilters());
    if (riskFilter) riskFilter.addEventListener('change', () => this.applyFilters());
  }

  async handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file) this.uploadFile(file);
  }

  async uploadFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      window.app.showToast('Please upload a valid .csv file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.app.showToast('CSV files must be 5MB or smaller.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      window.app.showToast('Uploading & analyzing transaction statement...', 'info');
      const res = await window.app.apiRequest('/upload/transactions', {
        method: 'POST',
        body: formData
      });

      this.processResults(res);
      window.app.showToast(`Processed ${res.summary.total_transactions} records; ${res.summary.anomalies_detected} anomalies found. Transaction details were not saved.`, res.summary.anomalies_detected > 0 ? 'error' : 'success');
    } catch (e) {
      // Handled in apiRequest
    } finally {
      const input = document.getElementById('csv-file-input');
      if (input) input.value = '';
    }
  }

  async loadDemoStatement() {
    try {
      window.app.showToast('Loading pre-configured realistic demo statement...', 'info');
      // Fetch the sample CSV file from frontend assets
      const response = await fetch('/frontend/assets/samples/sample_transactions.csv');
      const blob = await response.blob();
      const file = new File([blob], 'sample_transactions.csv', { type: 'text/csv' });
      await this.uploadFile(file);
    } catch (e) {
      window.app.showToast('Failed to load demo CSV file: ' + e.message, 'error');
    }
  }

  async handleManualSubmit(e) {
    e.preventDefault();

    const singleTx = {
      transaction_id: document.getElementById('manual-tx-id').value.trim(),
      timestamp: document.getElementById('manual-tx-time').value.trim(),
      amount: parseFloat(document.getElementById('manual-tx-amount').value),
      transaction_type: document.getElementById('manual-tx-type').value,
      recipient_vpa: document.getElementById('manual-tx-vpa').value.trim(),
      description: document.getElementById('manual-tx-desc').value.trim(),
      status: "SUCCESS"
    };

    try {
      const res = await window.app.apiRequest('/fraud/analyze-transactions', {
        method: 'POST',
        body: JSON.stringify({ transactions: [singleTx] })
      });

      window.app.closeModal('modal-manual-tx');
      this.processResults(res);
      window.app.showToast('Transaction analyzed. Details were not saved.', 'success');
    } catch (e) {
      // Handled in apiRequest
    }
  }

  processResults(batchResponse) {
    this.transactions = batchResponse.results || [];
    this.filteredTransactions = [...this.transactions];

    // Summary banner
    const banner = document.getElementById('tx-summary-banner');
    if (banner) banner.style.display = 'block';

    const s = batchResponse.summary;
    document.getElementById('tx-stat-total').textContent = s.total_transactions;
    document.getElementById('tx-stat-anomalies').textContent = s.anomalies_detected;
    document.getElementById('tx-stat-high').textContent = s.high_risk_count;
    document.getElementById('tx-stat-avg').textContent = `₹${s.average_amount ? s.average_amount.toLocaleString() : '0'}`;

    this.renderTable();
  }

  applyFilters() {
    const query = (document.getElementById('tx-search-input').value || '').toLowerCase().trim();
    const risk = document.getElementById('tx-risk-filter').value;

    this.filteredTransactions = this.transactions.filter(t => {
      const matchSearch = !query || 
        t.transaction_id.toLowerCase().includes(query) ||
        (t.recipient_vpa && t.recipient_vpa.toLowerCase().includes(query)) ||
        (t.description && t.description.toLowerCase().includes(query));

      const matchRisk = risk === 'ALL' || t.risk_category === risk;

      return matchSearch && matchRisk;
    });

    this.renderTable();
  }

  clearResults() {
    this.transactions = [];
    this.filteredTransactions = [];
    const banner = document.getElementById('tx-summary-banner');
    if (banner) banner.style.display = 'none';
    const tbody = document.getElementById('transactions-table-body');
    if (tbody) tbody.textContent = '';
    const search = document.getElementById('tx-search-input');
    if (search) search.value = '';
    const risk = document.getElementById('tx-risk-filter');
    if (risk) risk.value = 'ALL';
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
    })[char]);
  }

  renderTable() {
    const tbody = document.getElementById('transactions-table-body');
    if (!tbody) return;

    if (!this.filteredTransactions || this.filteredTransactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 24px;">No transaction records matching criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.filteredTransactions.map(t => {
      const flags = t.anomaly_flags || [];
      const flagsHtml = flags.length > 0
        ? flags.map(f => `<span class="badge" style="background: rgba(240, 93, 101, 0.2); color: var(--danger); border: 1px solid rgba(240, 93, 101, 0.4); margin-right: 4px; font-size: 0.72rem; padding: 2px 6px;">${this.escapeHtml(f)}</span>`).join('')
        : `<span style="color: var(--text-muted); font-size: 0.8rem;">None (Standard)</span>`;

      return `
        <tr style="${t.risk_category === 'HIGH' ? 'background: rgba(240, 93, 101, 0.04);' : ''}">
          <td style="font-weight: 600;">${this.escapeHtml(t.transaction_id)}</td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${this.escapeHtml(t.timestamp)}</td>
          <td style="font-weight: 700; ${t.transaction_type === 'DEBIT' ? 'color: var(--text-primary);' : 'color: var(--accent-primary);'}">
            ${t.transaction_type === 'DEBIT' ? '-' : '+'}₹${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </td>
          <td><span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">${this.escapeHtml(t.transaction_type)}</span></td>
          <td style="font-family: monospace; font-size: 0.82rem; color: var(--accent-secondary);">${this.escapeHtml(t.recipient_vpa || 'N/A')}</td>
          <td>${this.escapeHtml(t.description || '-')}</td>
          <td><span class="risk-badge ${t.risk_category}" style="font-size: 0.72rem; padding: 2px 8px;">${t.risk_category}</span></td>
          <td>${flagsHtml}</td>
        </tr>
      `;
    }).join('');
  }
}

window.txDetector = new TransactionDetectorController();
