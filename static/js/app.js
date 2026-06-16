// Application State
let state = {
    releases: [],
    filteredReleases: [],
    selectedRelease: null,
    categories: new Set()
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refreshBtn'),
    refreshIcon: document.getElementById('refreshIcon'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    cacheStatus: document.getElementById('cacheStatus'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    typeFilter: document.getElementById('typeFilter'),
    releaseFeed: document.getElementById('releaseFeed'),
    loadingState: document.getElementById('loadingState'),
    emptyState: document.getElementById('emptyState'),
    
    // Stats
    statTotal: document.getElementById('statTotal'),
    statFeatures: document.getElementById('statFeatures'),
    statIssues: document.getElementById('statIssues'),
    statDeprecations: document.getElementById('statDeprecations'),
    
    // Modal
    tweetModal: document.getElementById('tweetModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelTweetBtn: document.getElementById('cancelTweetBtn'),
    postTweetBtn: document.getElementById('postTweetBtn'),
    tweetTextArea: document.getElementById('tweetTextArea'),
    charCount: document.getElementById('charCount'),
    progressRingCircle: document.getElementById('progressRingCircle'),
    
    // Modal Options
    optIncludeLink: document.getElementById('optIncludeLink'),
    optIncludeDate: document.getElementById('optIncludeDate'),
    optIncludeHashtags: document.getElementById('optIncludeHashtags'),
    optHashtags: document.getElementById('optHashtags'), // note: in html, checkbox is optHashtags
    tweetHashtags: document.getElementById('tweetHashtags')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleases();
    setupProgressRing();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh Button
    elements.refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Export CSV Button
    elements.exportCsvBtn.addEventListener('click', exportToCSV);

    // Search Input
    elements.searchInput.addEventListener('input', () => {
        const query = elements.searchInput.value.trim();
        elements.clearSearch.style.display = query ? 'block' : 'none';
        filterAndRender();
    });

    // Clear Search Button
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.clearSearch.style.display = 'none';
        filterAndRender();
        elements.searchInput.focus();
    });

    // Type Filter Select
    elements.typeFilter.addEventListener('change', filterAndRender);

    // Modal Close
    elements.closeModalBtn.addEventListener('click', closeComposerModal);
    elements.cancelTweetBtn.addEventListener('click', closeComposerModal);
    
    // Modal backdrop click to close
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeComposerModal();
        }
    });

    // Tweet Input Counter
    elements.tweetTextArea.addEventListener('input', updateTweetCounter);

    // Modal Draft Customizer Toggles
    elements.optIncludeLink.addEventListener('change', regenerateTweetDraft);
    elements.optIncludeDate.addEventListener('change', regenerateTweetDraft);
    // Note: in HTML, the checkbox ID for hashtags is optHashtags
    elements.optHashtags.addEventListener('change', (e) => {
        elements.tweetHashtags.disabled = !e.target.checked;
        regenerateTweetDraft();
    });
    elements.tweetHashtags.addEventListener('input', regenerateTweetDraft);

    // Post to Twitter Button
    elements.postTweetBtn.addEventListener('click', postToTwitter);
}

// Fetch releases from backend API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    
    // Spin refresh button icon
    elements.refreshBtn.disabled = true;
    elements.refreshIcon.classList.add('fa-spin');
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        state.releases = data.releases || [];
        state.filteredReleases = [...state.releases];
        
        // Update last fetched timestamp
        if (data.last_fetched) {
            elements.cacheStatus.innerText = `Last updated: ${data.last_fetched}`;
        } else {
            elements.cacheStatus.innerText = 'Updated successfully';
        }
        
        // Extract unique categories for filter
        state.categories.clear();
        state.releases.forEach(r => {
            if (r.type) state.categories.add(r.type);
        });
        
        populateTypeFilter();
        updateStats();
        filterAndRender();
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        alert(`Failed to load release notes. ${error.message}`);
    } finally {
        showLoading(false);
        elements.refreshBtn.disabled = false;
        elements.refreshIcon.classList.remove('fa-spin');
    }
}

// Populate the category filter select
function populateTypeFilter() {
    // Store current value to re-select if possible
    const currentVal = elements.typeFilter.value;
    
    // Clear options except "All"
    elements.typeFilter.innerHTML = '<option value="all">All Updates</option>';
    
    // Sort and add new options
    const sortedCategories = Array.from(state.categories).sort();
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.innerText = category;
        elements.typeFilter.appendChild(option);
    });
    
    // Restore value
    if (Array.from(state.categories).includes(currentVal)) {
        elements.typeFilter.value = currentVal;
    }
}

// Update the Statistics cards
function updateStats() {
    const total = state.releases.length;
    
    const features = state.releases.filter(r => 
        r.type.toLowerCase().includes('feature') || 
        r.type.toLowerCase().includes('new')
    ).length;
    
    const issues = state.releases.filter(r => 
        r.type.toLowerCase().includes('issue') || 
        r.type.toLowerCase().includes('fix') ||
        r.type.toLowerCase().includes('resolved')
    ).length;
    
    const deprecations = state.releases.filter(r => 
        r.type.toLowerCase().includes('deprecation') || 
        r.type.toLowerCase().includes('removed')
    ).length;
    
    // Update labels with counts
    elements.statTotal.innerText = total;
    elements.statFeatures.innerText = features;
    elements.statIssues.innerText = issues;
    elements.statDeprecations.innerText = deprecations;
}

// Filters releases based on search query and selected category
function filterAndRender() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();
    const selectedType = elements.typeFilter.value;
    
    state.filteredReleases = state.releases.filter(release => {
        // Apply category filter
        const matchesCategory = (selectedType === 'all' || release.type === selectedType);
        
        // Apply search query filter
        const textContent = stripHtml(release.content).toLowerCase();
        const matchesSearch = !searchQuery || 
            release.date.toLowerCase().includes(searchQuery) ||
            release.type.toLowerCase().includes(searchQuery) ||
            textContent.includes(searchQuery);
            
        return matchesCategory && matchesSearch;
    });
    
    renderFeed();
}

// Render the list of release cards
function renderFeed() {
    elements.releaseFeed.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    
    state.filteredReleases.forEach(release => {
        const card = document.createElement('article');
        
        // Setup CSS classes
        card.classList.add('release-card');
        const typeLower = release.type.toLowerCase();
        let categoryClass = 'category-general';
        let badgeClass = 'badge-general';
        
        if (typeLower.includes('feature')) {
            categoryClass = 'category-feature';
            badgeClass = 'badge-feature';
        } else if (typeLower.includes('issue') || typeLower.includes('fix') || typeLower.includes('resolved')) {
            categoryClass = 'category-issue';
            badgeClass = 'badge-issue';
        } else if (typeLower.includes('deprecation')) {
            categoryClass = 'category-deprecation';
            badgeClass = 'badge-deprecation';
        }
        
        card.classList.add(categoryClass);
        card.id = `card_${release.id}`;
        
        // Build card HTML
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="release-badge ${badgeClass}">${release.type}</span>
                    <span class="release-date">
                        <i class="fa-regular fa-calendar-days"></i>
                        <span>${release.date}</span>
                    </span>
                </div>
                <div class="card-actions-wrapper">
                    <button class="action-icon-btn copy-card-btn" title="Copy to Clipboard" aria-label="Copy update to clipboard">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <a href="${release.link}" target="_blank" class="action-icon-btn" title="View Official Release Notes" aria-label="Open GCP release notes link">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
            </div>
            <div class="card-body">
                ${release.content}
            </div>
            <div class="card-footer">
                <button class="btn-tweet-now" data-id="${release.id}">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Draft Tweet</span>
                </button>
            </div>
        `;
        
        // Add event listener to the Copy button
        const copyBtn = card.querySelector('.copy-card-btn');
        copyBtn.addEventListener('click', () => {
            const rawContent = stripHtml(release.content).trim();
            const copyText = `BigQuery Release Note [${release.type}] (${release.date}):\n\n${rawContent}\n\nLink: ${release.link}`;
            navigator.clipboard.writeText(copyText).then(() => {
                const icon = copyBtn.querySelector('i');
                icon.className = 'fa-solid fa-check';
                icon.style.color = 'var(--accent-feature)';
                setTimeout(() => {
                    icon.className = 'fa-regular fa-copy';
                    icon.style.color = '';
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });

        // Add event listener to the Draft Tweet button
        const tweetBtn = card.querySelector('.btn-tweet-now');
        tweetBtn.addEventListener('click', () => {
            openComposerModal(release);
        });
        
        elements.releaseFeed.appendChild(card);
    });
}

// Show/Hide loader spinner
function showLoading(isLoading) {
    if (isLoading) {
        elements.loadingState.style.display = 'flex';
        elements.releaseFeed.style.display = 'none';
        elements.emptyState.style.display = 'none';
    } else {
        elements.loadingState.style.display = 'none';
        elements.releaseFeed.style.display = 'flex';
    }
}

// Helper to strip HTML tags
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// --- Tweet Composer Modal Logic ---

function openComposerModal(release) {
    state.selectedRelease = release;
    
    // Highlight the selected card visually
    document.querySelectorAll('.release-card').forEach(c => c.style.borderColor = 'rgba(255, 255, 255, 0.08)');
    const card = document.getElementById(`card_${release.id}`);
    if (card) {
        card.style.borderColor = 'var(--accent-primary)';
    }
    
    // Reset options
    elements.optIncludeLink.checked = true;
    elements.optIncludeDate.checked = true;
    elements.optHashtags.checked = true;
    elements.tweetHashtags.disabled = false;
    
    regenerateTweetDraft();
    
    // Show Modal
    elements.tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Disable page scrolling
    elements.tweetTextArea.focus();
}

function closeComposerModal() {
    elements.tweetModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Enable page scrolling
    state.selectedRelease = null;
    
    // Clear highlights
    document.querySelectorAll('.release-card').forEach(c => c.removeAttribute('style'));
}

// Dynamic Tweet generation based on toggles
function regenerateTweetDraft() {
    if (!state.selectedRelease) return;
    
    const release = state.selectedRelease;
    const plainText = stripHtml(release.content).replace(/\s+/g, ' ').trim();
    
    // Base Header
    let tweet = `BigQuery Update [${release.type}]`;
    
    // Date
    if (elements.optIncludeDate.checked) {
        tweet += ` (${release.date})`;
    }
    tweet += `:\n`;
    
    // Calculate remaining characters for description
    // Twitter handles URLs as exactly 23 characters
    const urlLength = elements.optIncludeLink.checked ? 23 : 0;
    const hashtags = elements.optHashtags.checked ? `\n\n${elements.tweetHashtags.value.trim()}` : '';
    const hashtagsLength = hashtags.length;
    
    // Base length without the description
    // We add 4 for spacing and ellipses: "... \n\n"
    const staticLength = tweet.length + urlLength + hashtagsLength + 6;
    const maxDescLength = 280 - staticLength;
    
    let description = plainText;
    if (description.length > maxDescLength) {
        description = description.substring(0, maxDescLength - 3) + "...";
    }
    
    tweet += `${description}`;
    
    if (elements.optIncludeLink.checked) {
        tweet += `\n\n${release.link}`;
    }
    
    if (elements.optHashtags.checked && elements.tweetHashtags.value.trim()) {
        tweet += hashtags;
    }
    
    elements.tweetTextArea.value = tweet;
    updateTweetCounter();
}

// Update character counter and progress ring
let ringCircumference = 0;
function setupProgressRing() {
    const radius = elements.progressRingCircle.r.baseVal.value;
    ringCircumference = radius * 2 * Math.PI;
    
    elements.progressRingCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    elements.progressRingCircle.style.strokeDashoffset = ringCircumference;
}

function updateTweetCounter() {
    const text = elements.tweetTextArea.value;
    
    // Calculate Twitter length (URLs count as 23 characters)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    let twitterLength = text.length;
    
    // Subtract actual URL lengths and add 23 for each
    urls.forEach(url => {
        twitterLength = twitterLength - url.length + 23;
    });
    
    elements.charCount.innerText = twitterLength;
    
    // Circular Progress Ring Update
    const pct = Math.min(twitterLength / 280, 1);
    const offset = ringCircumference - (pct * ringCircumference);
    elements.progressRingCircle.style.strokeDashoffset = offset;
    
    // Style colors based on length
    if (twitterLength > 280) {
        elements.charCount.style.color = 'var(--accent-deprecation)';
        elements.progressRingCircle.style.stroke = 'var(--accent-deprecation)';
        elements.postTweetBtn.disabled = true;
        elements.postTweetBtn.style.opacity = '0.5';
        elements.postTweetBtn.style.cursor = 'not-allowed';
    } else {
        elements.charCount.style.color = twitterLength >= 260 ? 'var(--accent-issue)' : 'var(--text-secondary)';
        elements.progressRingCircle.style.stroke = twitterLength >= 260 ? 'var(--accent-issue)' : 'var(--accent-primary)';
        elements.postTweetBtn.disabled = false;
        elements.postTweetBtn.style.opacity = '1';
        elements.postTweetBtn.style.cursor = 'pointer';
    }
}

// Trigger X (Twitter) Web Intent URL in a new tab
function postToTwitter() {
    const text = elements.tweetTextArea.value;
    
    // Double check character count
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    let twitterLength = text.length;
    urls.forEach(url => {
        twitterLength = twitterLength - url.length + 23;
    });
    
    if (twitterLength > 280) {
        alert('Your tweet is too long! Please shorten it before posting.');
        return;
    }
    
    const encodedText = encodeURIComponent(text);
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    closeComposerModal();
}

// Export filtered releases to CSV
function exportToCSV() {
    if (state.filteredReleases.length === 0) {
        alert('No release notes available to export.');
        return;
    }
    
    const headers = ['Date', 'Type', 'Description', 'Link'];
    const rows = state.filteredReleases.map(release => [
        release.date,
        release.type,
        stripHtml(release.content).replace(/\s+/g, ' ').trim(),
        release.link
    ]);
    
    // Helper to escape values for CSV
    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '';
        const val = String(str);
        if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    };
    
    const csvContent = [
        headers.map(escapeCsv).join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');
    
    // Create Blob and trigger download
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_releases_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error('Failed to export CSV: ', err);
        alert('Could not export to CSV. Please check browser permissions.');
    }
}
