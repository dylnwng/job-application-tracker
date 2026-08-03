// Normalize visible text so the parser can work with inconsistent page markup.
function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getMetaContent(doc, attrNames) {
  for (const attr of attrNames) {
    const element = doc.querySelector(`meta[${attr}]`);
    if (element && element.content) {
      return cleanText(element.content);
    }
  }
  return '';
}

function getTextFromSelectors(doc, selectors) {
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element && element.textContent) {
      const text = cleanText(element.textContent);
      if (text) {
        return text;
      }
    }
  }
  return '';
}

function getPrimaryTitle(doc) {
  const candidates = [
    'h1',
    '[data-test-id="job-title"]',
    '[data-testid="job-title"]',
    'header h1',
    '.job-title',
    '.posting-headline',
    '.top-card-layout__title',
    '.job-details-jobs-unified-top-card__job-title',
    '.job-title-container'
  ];
  return getTextFromSelectors(doc, candidates);
}

function getPrimaryCompany(doc) {
  const candidates = [
    '[data-test-id="company-name"]',
    '[data-testid="company-name"]',
    '.company-name',
    '.org-name',
    '.topcard__org-name',
    '.jobs-unified-top-card__company-name',
    '.company-details',
    '.job-details-jobs-unified-top-card__company-name',
    'meta[property="og:site_name"]',
    'meta[name="application-name"]'
  ];

  const direct = getTextFromSelectors(doc, candidates);
  if (direct) {
    return direct;
  }

  const possible = [
    getMetaContent(doc, ['property="og:site_name"', 'name="application-name"']),
    doc.title ? cleanText(doc.title) : ''
  ];

  return possible.find(Boolean) || '';
}

function getPrimaryLocation(doc) {
  const candidates = [
    '[data-test-id="job-location"]',
    '[data-testid="job-location"]',
    '.job-location',
    '.location',
    '.address',
    '.topcard__flavor',
    '.job-details-jobs-unified-top-card__bullet'
  ];
  return getTextFromSelectors(doc, candidates);
}

function getDescription(doc) {
  const byRole = [
    'main',
    'article',
    '.description',
    '.job-description',
    '.posting-description',
    '.content',
    '.application-main'
  ];

  for (const selector of byRole) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = cleanText(element.innerText || element.textContent || '');
      if (text && text.length > 80) {
        return text.slice(0, 2600);
      }
    }
  }

  return cleanText(doc.body.innerText || doc.body.textContent || '').slice(0, 2600);
}

function detectPageType(url) {
  if (/linkedin\.com/i.test(url)) return 'linkedin';
  if (/greenhouse\.io/i.test(url)) return 'greenhouse';
  if (/lever\.co/i.test(url)) return 'lever';
  return 'generic';
}

// Try common job board selectors first, then fall back to heuristics when the page is less structured.
function extractJobData() {
  const url = window.location.href;
  const pageType = detectPageType(url);
  const title = getPrimaryTitle(document);
  const company = getPrimaryCompany(document);
  const location = getPrimaryLocation(document);
  const description = getDescription(document);

  if (pageType === 'linkedin') {
    return {
      company_name: company || title.split(' at ')[1] || '',
      job_title: title || 'Unknown role',
      location: location || '',
      job_desc: description,
      post_url: url
    };
  }

  if (pageType === 'greenhouse' || pageType === 'lever') {
    return {
      company_name: company || document.title.split(' - ')[0] || '',
      job_title: title || 'Unknown role',
      location: location || '',
      job_desc: description,
      post_url: url
    };
  }

  return {
    company_name: company || document.title.split(' - ')[0] || '',
    job_title: title || document.querySelector('h2')?.textContent || 'Unknown role',
    location: location || '',
    job_desc: description,
    post_url: url
  };
}

// Keep a copy of the latest scrape on the page for quick fallback access from the popup.
window.__jobTrackerData = extractJobData();

console.log('Job Tracker content script loaded on', window.location.href);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'capture-job') {
    const data = extractJobData();
    window.__jobTrackerData = data;
    sendResponse({ success: true, data });
    return true;
  }

  return false;
});
