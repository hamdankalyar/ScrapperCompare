const API_BASE = 'http://localhost:3000/api';

let currentResults = {};

function setUrl(url) {
    document.getElementById('urlInput').value = url;
}

async function testAllScrapers() {
    const url = document.getElementById('urlInput').value.trim();
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    if (!isValidUrl(url)) {
        alert('Please enter a valid URL (must start with http:// or https://)');
        return;
    }
    
    showLoadingStates();
    
    try {
        const response = await fetch(`${API_BASE}/scrape-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        currentResults = data.results;
        
        displayResults(data.results);
        showComparison(data.results);
        
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to scrape URL. Make sure the server is running.');
    }
}

async function testSingleScraper(method) {
    const url = document.getElementById('urlInput').value.trim();
    
    if (!url || !isValidUrl(url)) {
        alert('Please enter a valid URL');
        return;
    }
    
    showSingleLoadingState(method);
    
    try {
        const response = await fetch(`${API_BASE}/scrape/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const result = await response.json();
        currentResults[method] = result;
        
        displaySingleResult(method, result);
        
    } catch (error) {
        console.error('Error:', error);
        showError(`Failed to scrape with ${method}`);
    }
}

function showLoadingStates() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        ${createLoadingCard('cheerio', 'Cheerio')}
        ${createLoadingCard('readability', 'Readability')}
        ${createLoadingCard('puppeteer', 'Puppeteer')}
    `;
}

function showSingleLoadingState(method) {
    const container = document.getElementById('resultsContainer');
    const methodName = method.charAt(0).toUpperCase() + method.slice(1);
    container.innerHTML = createLoadingCard(method, methodName);
}

function createLoadingCard(id, name) {
    return `
        <div class="result-card loading" id="${id}-result">
            <div class="result-header">
                <div class="result-title">${name}</div>
                <span class="status-badge status-loading">
                    <span class="loading-spinner"></span> Loading...
                </span>
            </div>
            <p>Scraping in progress...</p>
        </div>
    `;
}

function displayResults(results) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
    
    Object.keys(results).forEach(method => {
        const card = createResultCard(method, results[method]);
        container.innerHTML += card;
    });
    
    // Add event listeners after DOM is updated
    setTimeout(() => {
        Object.keys(results).forEach(method => {
            setupToggleListeners(method);
        });
    }, 100);
}

function displaySingleResult(method, result) {
    const card = createResultCard(method, result);
    document.getElementById('resultsContainer').innerHTML = card;
    
    setTimeout(() => {
        setupToggleListeners(method);
    }, 100);
}

function createResultCard(method, result) {
    const methodName = method.charAt(0).toUpperCase() + method.slice(1);
    const icon = getMethodIcon(method);
    
    if (!result.success) {
        return `
            <div class="result-card" id="${method}-result">
                <div class="result-header">
                    <div class="result-title">${icon} ${methodName}</div>
                    <span class="status-badge status-error">❌ Failed</span>
                </div>
                <div class="error-message">
                    <strong>Error:</strong> ${result.error}
                </div>
            </div>
        `;
    }
    
    const data = result.data;
    const contentId = `content-${method}`;
    const paragraphsId = `paragraphs-${method}`;
    const headingsId = `headings-${method}`;
    
    return `
        <div class="result-card" id="${method}-result">
            <div class="result-header">
                <div class="result-title">${icon} ${methodName}</div>
                <span class="status-badge status-success">✅ Success</span>
            </div>
            
            <div class="stat-row">
                <span class="stat-label">⚡ Execution Time</span>
                <span class="stat-value">${result.executionTime}ms</span>
            </div>
            
            <div class="stat-row">
                <span class="stat-label">📊 Content Length</span>
                <span class="stat-value">${data.contentLength?.toLocaleString() || 0} characters</span>
            </div>
            
            ${data.wordCount ? `
                <div class="stat-row">
                    <span class="stat-label">📝 Word Count</span>
                    <span class="stat-value">${data.wordCount.toLocaleString()} words</span>
                </div>
            ` : ''}
            
            ${data.paragraphCount ? `
                <div class="stat-row">
                    <span class="stat-label">📄 Paragraphs</span>
                    <span class="stat-value">${data.paragraphCount} paragraphs</span>
                </div>
            ` : ''}
            
            <div class="action-buttons">
                <button class="action-btn" onclick="copyContent('${method}')">
                    📋 Copy Text
                </button>
                <button class="action-btn" onclick="downloadContent('${method}')">
                    💾 Download
                </button>
            </div>
            
            ${data.title ? `
                <div class="content-box">
                    <h4 style="color: #667eea; margin-bottom: 10px;">📰 Title</h4>
                    <p style="font-size: 1.1em; font-weight: 600;">${escapeHtml(data.title)}</p>
                </div>
            ` : ''}
            
            ${data.description || data.excerpt ? `
                <div class="content-box">
                    <h4 style="color: #667eea; margin-bottom: 10px;">📝 Description</h4>
                    <p>${escapeHtml(data.description || data.excerpt)}</p>
                </div>
            ` : ''}
            
            ${data.byline ? `
                <div class="content-box">
                    <h4 style="color: #667eea; margin-bottom: 10px;">✍️ Author</h4>
                    <p>${escapeHtml(data.byline)}</p>
                </div>
            ` : ''}
            
            <!-- FULL CONTENT SECTION -->
            <div class="content-section">
                <div class="section-header" onclick="toggleSection('${contentId}')">
                    <h4>📄 Full Extracted Content (${data.contentLength?.toLocaleString()} chars)</h4>
                    <span class="toggle-icon" id="${contentId}-icon">▼</span>
                </div>
                <div class="section-content" id="${contentId}">
                    <div class="content-box">
                        <div class="full-content">${escapeHtml(data.content || '')}</div>
                    </div>
                </div>
            </div>
            
            <!-- PARAGRAPHS SECTION -->
            ${data.paragraphs && data.paragraphs.length > 0 ? `
                <div class="content-section">
                    <div class="section-header" onclick="toggleSection('${paragraphsId}')">
                        <h4>📋 All Paragraphs (${data.paragraphs.length})</h4>
                        <span class="toggle-icon" id="${paragraphsId}-icon">▼</span>
                    </div>
                    <div class="section-content" id="${paragraphsId}">
                        ${data.paragraphs.map((p, i) => `
                            <div class="paragraph-item">
                                <span class="paragraph-number">Paragraph ${i + 1}:</span>
                                ${escapeHtml(p)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- HEADINGS SECTION -->
            ${data.headings && data.headings.length > 0 ? `
                <div class="content-section">
                    <div class="section-header" onclick="toggleSection('${headingsId}')">
                        <h4>🔤 All Headings (${data.headings.length})</h4>
                        <span class="toggle-icon" id="${headingsId}-icon">▼</span>
                    </div>
                    <div class="section-content" id="${headingsId}">
                        ${data.headings.map(h => `
                            <div class="heading-item">
                                <strong>${h.level}:</strong> ${escapeHtml(h.text)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function toggleSection(sectionId) {
    const content = document.getElementById(sectionId);
    const icon = document.getElementById(`${sectionId}-icon`);
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.classList.remove('expanded');
        content.style.maxHeight = '0';
    } else {
        content.classList.add('expanded');
        icon.classList.add('expanded');
        content.style.maxHeight = content.scrollHeight + 'px';
    }
}

function setupToggleListeners(method) {
    // Sections are now toggled via onclick in HTML
}

function copyContent(method) {
    const result = currentResults[method];
    if (!result || !result.success) return;
    
    const content = result.data.content;
    
    navigator.clipboard.writeText(content).then(() => {
        showNotification('✅ Content copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('❌ Failed to copy content', 'error');
    });
}

function downloadContent(method) {
    const result = currentResults[method];
    if (!result || !result.success) return;
    
    const data = result.data;
    const content = `Title: ${data.title || 'No title'}\n\n${data.content}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraped-content-${method}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('💾 Content downloaded!');
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    
    if (type === 'error') {
        notification.style.background = '#dc3545';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

function showComparison(results) {
    const section = document.getElementById('comparisonSection');
    const tbody = document.getElementById('comparisonBody');
    
    tbody.innerHTML = '';
    
    const methods = [
        { key: 'cheerio', name: 'Cheerio', bestFor: 'Static HTML sites, fast scraping' },
        { key: 'readability', name: 'Readability', bestFor: 'News articles, blogs, clean text' },
        { key: 'puppeteer', name: 'Puppeteer', bestFor: 'JavaScript-heavy sites, SPAs' }
    ];
    
    methods.forEach(method => {
        const result = results[method.key];
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${method.name}</strong></td>
                <td>${result.success ? '✅ Success' : '❌ Failed'}</td>
                <td>${result.success ? result.executionTime + 'ms' : 'N/A'}</td>
                <td>${result.success ? (result.data.contentLength?.toLocaleString() || 0) + ' chars' : 'N/A'}</td>
                <td>${method.bestFor}</td>
            </tr>
        `;
    });
    
    section.style.display = 'block';
}

function getMethodIcon(method) {
    const icons = {
        cheerio: '⚡',
        readability: '📰',
        puppeteer: '🎭'
    };
    return icons[method] || '🔍';
}

function isValidUrl(url) {
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="result-card">
            <div class="error-message">
                <strong>⚠️ Error:</strong> ${message}
            </div>
        </div>
    `;
}

// Check server health on load
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('✅ Server is running:', data);
    } catch (error) {
        console.error('❌ Server is not running. Please start it with: node server.js');
        showError('Server is not running. Please start it with: node server.js');
    }
});