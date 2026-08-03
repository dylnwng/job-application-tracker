let pendingData = null;
let isSaved = false;

function showStatus(message, isError = false) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
}

function showSuccessState() {
  isSaved = true;
  const modal = document.getElementById('confirm-modal');
  modal.classList.add('success-state');
  modal.innerHTML = `
    <div class="success-card">
      <div class="success-checkmark">✓</div>
      <h2>Job tracked successfully!</h2>
      <p>Your application has been saved locally.</p>
      <div class="actions">
        <button id="dashboard-return" class="primary-button" type="button">Open dashboard</button>
      </div>
    </div>
  `;

  document.getElementById('dashboard-return').addEventListener('click', openDashboard);

  setTimeout(openDashboard, 1000);
}

function setBadge(text, tone = 'neutral') {
  const badge = document.getElementById('capture-badge');
  badge.textContent = text;
  badge.className = `capture-badge ${tone}`;
}

function normalizeValue(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function getStoredApplications() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['applications'], (result) => {
      resolve(Array.isArray(result.applications) ? result.applications : []);
    });
  });
}

function saveStoredApplications(applications) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ applications }, () => resolve());
  });
}

async function captureCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab found');
  }

  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    throw new Error('Open a regular job posting page such as LinkedIn, Greenhouse, or Lever and try again.');
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'capture-job' });
    return response?.data || null;
  } catch (error) {
    try {
      await chrome.tabs.reload(tab.id);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const retried = await chrome.tabs.sendMessage(tab.id, { type: 'capture-job' });
      return retried?.data || null;
    } catch (retryError) {
      throw new Error('The page did not connect to the extension yet. Please refresh the tab and try again.');
    }
  }
}

async function loadCapturedData() {
  try {
    setBadge('Scanning page', 'neutral');
    const data = await captureCurrentTab();
    if (!data) {
      setBadge('No match', 'warning');
      showStatus('No job data was detected on this page.', true);
      return;
    }

    pendingData = {
      ...data,
      company_name: normalizeValue(data.company_name),
      job_title: normalizeValue(data.job_title),
      location: normalizeValue(data.location),
      job_desc: normalizeValue(data.job_desc),
      post_url: normalizeValue(data.post_url),
      status: 'Applied',
      salary_range: '',
      notes: '',
      date_applied: new Date().toISOString().slice(0, 10)
    };

    const form = document.getElementById('capture-form');
    Object.entries(pendingData).forEach(([key, value]) => {
      const field = form.elements[key];
      if (field) {
        field.value = value || '';
      }
    });

    setBadge('Ready to save', 'success');
    document.getElementById('confirm-modal').classList.add('visible');
    showStatus('Captured data is ready for review.');
  } catch (error) {
    setBadge('Needs attention', 'warning');
    showStatus(error.message || 'Unable to capture page data.', true);
  }
}

async function saveApplication() {
  const form = document.getElementById('capture-form');
  const payload = Object.fromEntries(new FormData(form).entries());
  const record = {
    ...pendingData,
    ...payload,
    id: (pendingData?.id || crypto.randomUUID?.() || `app-${Date.now()}`),
    company_name: normalizeValue(payload.company_name),
    job_title: normalizeValue(payload.job_title),
    location: normalizeValue(payload.location),
    job_desc: normalizeValue(payload.job_desc),
    post_url: normalizeValue(payload.post_url),
    updated_at: new Date().toISOString()
  };

  const applications = await getStoredApplications();
  const nextApplications = [record, ...applications.filter((item) => item.id !== record.id)];
  await saveStoredApplications(nextApplications);

  setBadge('Saved', 'success');
  showStatus('Application saved locally.');
  showSuccessState();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('save-btn').addEventListener('click', saveApplication);
  document.getElementById('cancel-btn').addEventListener('click', () => {
    if (isSaved) {
      return;
    }
    document.getElementById('confirm-modal').classList.remove('visible');
  });
  document.getElementById('open-dashboard').addEventListener('click', openDashboard);

  loadCapturedData();
});
