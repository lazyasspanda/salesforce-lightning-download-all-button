// ==UserScript==
// @name         Salesforce Lightning – Download all button
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adds a "Download All" button on Salesforce Files page. Includes auto-expand, button animation, and toast notifications.
// @match        https://*.lightning.force.com/*
// @grant        none
// @author       Pratik
// ==/UserScript==

(function () {
  'use strict';

  let panel, btnStart, btnRecheck, btnCancel;
  let mainBtn, fileIds = [];

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function detectFileIds() {
    const anchors = Array.from(document.querySelectorAll('a[href*="/lightning/r/ContentDocument/"]'));
    return [...new Set(
      anchors.map(a => {
        const m = a.getAttribute('href').match(/ContentDocument\/([0-9A-Za-z]{15,18})\//);
        return m && m[1];
      }).filter(Boolean)
    )];
  }

  function downloadUrlFor(id) {
    const host = window.location.host.split('.')[0] + '.file.force.com';
    return `${window.location.protocol}//${host}/sfc/servlet.shepherd/document/download/${id}`;
  }

  async function fireAllDownloadsInBatches() {
    const batchSize = 5;
    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);
      batch.forEach(id => window.open(downloadUrlFor(id), '_blank'));
      btnStart.textContent = `Downloading ${Math.min(i + batchSize, fileIds.length)}/${fileIds.length}`;
      await delay(2000);
    }
    panel.remove();
    showToast(`All ${fileIds.length} downloads started.`);
  }

  function showConfirmPanel(count) {
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.style.cssText = `
      position:fixed; bottom:45px; right:20px;
      background:#fff; border:1px solid #ccc; border-radius:4px;
      padding:12px; z-index:10001; font-family:"Salesforce Sans",Arial,sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,0.2);
    `;

    const info = document.createElement('div');
    info.textContent = `Found ${count} file${count === 1 ? '' : 's'}`;
    info.style.marginBottom = '8px';
    panel.appendChild(info);

    // Start Download
    btnStart = document.createElement('button');
    btnStart.textContent = 'Start Download';
    styleBtn(btnStart, '#0070d2', '#fff');
    btnStart.onclick = fireAllDownloadsInBatches;
    panel.appendChild(btnStart);

    // Recheck
    btnRecheck = document.createElement('button');
    btnRecheck.textContent = 'Recheck';
    styleBtn(btnRecheck, '#ecebea', '#333', '#d8dde6');
    btnRecheck.onclick = () => {
      fileIds = detectFileIds();
      info.textContent = `Found ${fileIds.length} file${fileIds.length === 1 ? '' : 's'}`;
    };
    panel.appendChild(btnRecheck);

    // Cancel
    btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancel';
    styleBtn(btnCancel, '#e60000', '#fff');
    btnCancel.onclick = () => panel.remove();
    panel.appendChild(btnCancel);

    document.body.appendChild(panel);
  }

  function styleBtn(btn, bg, color, border = 'none') {
    btn.style.cssText = `
      background:${bg}; color:${color}; border:${border}; border-radius:3px;
      padding:6px 12px; margin-right:6px; cursor:pointer;
      transition: transform 0.1s ease;
    `;
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
      background: #0070d2; color: #fff; padding: 12px 24px; border-radius: 5px;
      font-family: "Salesforce Sans", Arial, sans-serif; z-index: 10002;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); opacity: 0; transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.style.opacity = 1);
    setTimeout(() => {
      toast.style.opacity = 0;
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function onMainClick() {
    fileIds = detectFileIds();
    showConfirmPanel(fileIds.length);
  }

  function injectMainButton() {
    if (mainBtn) return;

    const actionList = document.querySelector('ul.branding-actions.slds-button-group');
    if (!actionList) return;

    const downloadLi = document.createElement('li');
    downloadLi.className = 'slds-button slds-button--neutral slds-button_neutral';

    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'tm-download-all-main';
    downloadBtn.type = 'button';
    downloadBtn.title = 'Download All';
    downloadBtn.textContent = 'Download All';
    styleBtn(downloadBtn, '#0070d2', '#fff');
    downloadBtn.addEventListener('click', onMainClick);

    downloadLi.appendChild(downloadBtn);
    const addFilesLi = actionList.querySelector('li');
    if (addFilesLi) {
      actionList.insertBefore(downloadLi, addFilesLi);
      mainBtn = downloadBtn;
    }
  }

  function expandFilesSectionIfCollapsed() {
    const section = document.querySelector('[data-label="Files"]');
    if (section && section.getAttribute('aria-expanded') === 'false') {
      section.querySelector('button[aria-controls]')?.click();
    }
  }

  // Watch for route/content changes
  const observer = new MutationObserver(() => {
    if (location.href.includes('/AttachedContentDocuments/')) {
      expandFilesSectionIfCollapsed();
      injectMainButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
