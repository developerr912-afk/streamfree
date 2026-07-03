// ========== MISSING HELPERS (ADDED WITHOUT CHANGING ORIGINAL CODE) ==========
function showToast(message) {
  // Simple toast using alert; you can replace with a nicer UI if needed.
  alert(message);
}

function openConfirm(callback) {
  // Simple confirmation dialog
  if (confirm('Are you sure you want to delete this item?')) {
    callback();
  }
}
// ========================================================================

// ========== YOUR ORIGINAL CODE (UNCHANGED) ==========
let _editingId = null;
let _adminSeasons = [];

async function initAdmin() {
  const container = document.getElementById('page-admin');
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <h2 style="font-size:1.8rem;font-weight:800;"><i class="fas fa-tachometer-alt" style="color:#E50914;"></i> Admin Dashboard</h2>
      <button class="btn-primary" onclick="showAddContent()"><i class="fas fa-plus"></i> Add Content</button>
    </div>

    <div id="adminStats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;margin-bottom:24px;"></div>

    <div id="adminForm" style="display:none;background:#151515;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #2a2a2a;">
      <h3 id="formTitle" style="font-weight:700;margin-bottom:16px;">Add New Content</h3>
      <form id="contentForm" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div><label class="form-label">Title *</label><input class="form-input" id="fTitle" required /></div>
        <div><label class="form-label">Type *</label>
          <select class="form-input" id="fType">
            <option value="movie">Movie</option>
            <option value="webseries">Web Series</option>
            <option value="anime">Anime</option>
          </select>
        </div>
        <div style="grid-column:1/-1;"><label class="form-label">Description</label><textarea class="form-input" id="fDesc" rows="2"></textarea></div>
        <div><label class="form-label">Poster URL *</label><input class="form-input" id="fPoster" required /></div>
        <div><label class="form-label">Banner URL</label><input class="form-input" id="fBanner" /></div>
        <div><label class="form-label">Genre (comma separated)</label><input class="form-input" id="fGenre" placeholder="Action, Drama" /></div>
        <div><label class="form-label">Release Date</label><input class="form-input" id="fRelease" type="character" /></div>
        <div><label class="form-label">Watch Link (m3u8 for movies)</label><input class="form-input" id="fWatchLink" /></div>
        <div style="display:flex;align-items:center;gap:12px;">
          <label class="form-label" style="margin:0;">Featured</label>
          <input type="checkbox" id="fFeatured" style="width:20px;height:20px;accent-color:#E50914;" />
        </div>
        <div style="grid-column:1/-1;display:flex;gap:12px;">
          <button type="submit" class="btn-primary">Save</button>
          <button type="button" class="btn-secondary" onclick="document.getElementById('adminForm').style.display='none'">Cancel</button>
        </div>
      </form>
      <div id="seriesBuilder" style="display:none;margin-top:20px;border-top:1px solid #2a2a2a;padding-top:20px;">
        <h4 style="font-weight:600;margin-bottom:8px;">Seasons & Episodes</h4>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <input class="form-input" id="fSeasonNum" placeholder="Season #" style="width:120px;" />
          <button class="btn-secondary" onclick="addSeason()">Add Season</button>
        </div>
        <div id="seasonList"></div>
        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
          <input class="form-input" id="fEpSeason" placeholder="Season #" style="width:100px;" />
          <input class="form-input" id="fEpNum" placeholder="Episode #" style="width:100px;" />
          <input class="form-input" id="fEpTitle" placeholder="Episode Title" style="width:180px;" />
          <input class="form-input" id="fEpDesc" placeholder="Description" style="width:180px;" />
          <input class="form-input" id="fEpThumb" placeholder="Thumbnail URL" style="width:180px;" />
          <input class="form-input" id="fEpVideo" placeholder="Video URL (m3u8)" style="width:200px;" />
          <button class="btn-secondary" onclick="addEpisode()">Add Episode</button>
        </div>
        <div id="episodePreview" style="margin-top:12px;max-height:200px;overflow-y:auto;"></div>
      </div>
    </div>

    <div style="background:#151515;border-radius:16px;padding:16px;border:1px solid #2a2a2a;overflow-x:auto;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <input class="form-input" id="adminSearch" placeholder="Search content..." style="max-width:300px;" />
        <select class="form-input" id="adminFilter" style="max-width:150px;">
          <option value="all">All</option>
          <option value="movie">Movies</option>
          <option value="webseries">Web Series</option>
          <option value="anime">Anime</option>
        </select>
      </div>
      <div id="adminTableContainer"></div>
    </div>
  `;

  document.getElementById('contentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveContent();
  });
  document.getElementById('fType').addEventListener('change', (e) => {
    document.getElementById('seriesBuilder').style.display = (e.target.value === 'webseries' || e.target.value === 'anime') ? 'block' : 'none';
  });
  document.getElementById('adminSearch').addEventListener('input', renderAdminTable);
  document.getElementById('adminFilter').addEventListener('change', renderAdminTable);

  loadAdminStats();
  renderAdminTable();
  window._adminSeasons = [];
}

async function loadAdminStats() {
  const container = document.getElementById('adminStats');
  const snap = await db.collection('contents').get();
  const total = snap.size;
  let movies = 0, webseries = 0, anime = 0, views = 0;
  const genres = new Set();
  snap.forEach(d => {
    const data = d.data();
    if (data.type === 'movie') movies++;
    else if (data.type === 'webseries') webseries++;
    else if (data.type === 'anime') anime++;
    views += data.views || 0;
    (data.genre || []).forEach(g => genres.add(g));
  });
  container.innerHTML = `
    <div class="admin-stat"><div class="number">${total}</div><div style="opacity:0.6;">Total Content</div></div>
    <div class="admin-stat"><div class="number">${movies}</div><div style="opacity:0.6;">Movies</div></div>
    <div class="admin-stat"><div class="number">${anime}</div><div style="opacity:0.6;">Anime</div></div>
    <div class="admin-stat"><div class="number">${webseries}</div><div style="opacity:0.6;">Web Series</div></div>
    <div class="admin-stat"><div class="number">${genres.size}</div><div style="opacity:0.6;">Categories</div></div>
    <div class="admin-stat"><div class="number">${views.toLocaleString()}</div><div style="opacity:0.6;">Total Views</div></div>
  `;
}

async function renderAdminTable() {
  const container = document.getElementById('adminTableContainer');
  const search = document.getElementById('adminSearch')?.value?.toLowerCase() || '';
  const filter = document.getElementById('adminFilter')?.value || 'all';

  let q = db.collection('contents').orderBy('createdAt', 'desc');
  if (filter !== 'all') q = q.where('type', '==', filter);
  const snap = await q.get();
  let html = `<table class="admin-table"><thead><tr><th>Poster</th><th>Name</th><th>Category</th><th>Genre</th><th>Views</th><th>Created</th><th>Actions</th></tr></thead><tbody>`;
  let count = 0;
  snap.forEach(doc => {
    const data = doc.data();
    const title = data.title || '';
    if (search && !title.toLowerCase().includes(search)) return;
    count++;
    const year = data.createdAt ? new Date(data.createdAt.seconds * 1000).getFullYear() : '—';
    html += `
      <tr>
        <td><img src="${data.poster || ''}" alt="${title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2256%22%3E%3Crect fill=%22%23151515%22 width=%2240%22 height=%2256%22/%3E%3C/svg%3E'" /></td>
        <td><strong>${title}</strong></td>
        <td><span class="badge-red">${data.type || 'movie'}</span></td>
        <td>${(data.genre||[]).slice(0,2).join(', ')}</td>
        <td>${data.views || 0}</td>
        <td>${year}</td>
        <td>
          <button class="btn-secondary" style="padding:4px 12px;font-size:0.75rem;margin-right:6px;" onclick="editContent('${doc.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-danger" style="padding:4px 12px;font-size:0.75rem;" onclick="deleteContent('${doc.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  if (!count) html = '<p style="padding:20px;text-align:center;opacity:0.5;">No content found.</p>';
  container.innerHTML = html;
}

function showAddContent() {
  document.getElementById('adminForm').style.display = 'block';
  document.getElementById('formTitle').textContent = 'Add New Content';
  document.getElementById('contentForm').reset();
  _editingId = null;
  window._adminSeasons = [];
  document.getElementById('seasonList').innerHTML = '';
  document.getElementById('episodePreview').innerHTML = '';
  document.getElementById('seriesBuilder').style.display = 'none';
  document.getElementById('fType').value = 'movie';
  document.getElementById('fFeatured').checked = false;
  document.getElementById('adminForm').scrollIntoView({ behavior: 'smooth' });
}

async function saveContent() {
  const title = document.getElementById('fTitle').value.trim();
  const type = document.getElementById('fType').value;
  const desc = document.getElementById('fDesc').value.trim();
  const poster = document.getElementById('fPoster').value.trim();
  const banner = document.getElementById('fBanner').value.trim();
  const genre = document.getElementById('fGenre').value.split(',').map(s => s.trim()).filter(Boolean);
  const release = document.getElementById('fRelease').value;
  const watchLink = document.getElementById('fWatchLink').value.trim();
  const featured = document.getElementById('fFeatured').checked;

  if (!title || !poster) { showToast('Title and Poster are required.'); return; }

  const data = {
    title,
    type,
    description: desc,
    poster,
    banner: banner || poster,
    genre,
    releaseDate: release || '',
    featured,
    views: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (type === 'movie') {
    data.watchLink = watchLink || '';
  }

  if (type === 'webseries' || type === 'anime') {
    if (window._adminSeasons && window._adminSeasons.length) {
      data.seasons = window._adminSeasons;
    } else {
      data.seasons = [{ seasonNumber: 1, episodes: [] }];
    }
  }

  try {
    if (_editingId) {
      await db.collection('contents').doc(_editingId).update(data);
      showToast('Content updated!');
    } else {
      await db.collection('contents').add(data);
      showToast('Content added!');
    }
    document.getElementById('adminForm').style.display = 'none';
    loadAdminStats();
    renderAdminTable();
    _editingId = null;
    window._adminSeasons = [];
  } catch (err) {
    showToast('Error: ' + err.message);
  }
}

async function editContent(id) {
  const doc = await db.collection('contents').doc(id).get();
  if (!doc.exists) return;
  const data = doc.data();
  _editingId = id;
  document.getElementById('adminForm').style.display = 'block';
  document.getElementById('formTitle').textContent = 'Edit Content';
  document.getElementById('fTitle').value = data.title || '';
  document.getElementById('fType').value = data.type || 'movie';
  document.getElementById('fDesc').value = data.description || '';
  document.getElementById('fPoster').value = data.poster || '';
  document.getElementById('fBanner').value = data.banner || '';
  document.getElementById('fGenre').value = (data.genre || []).join(', ');
  document.getElementById('fRelease').value = data.releaseDate || '';
  document.getElementById('fWatchLink').value = data.watchLink || '';
  document.getElementById('fFeatured').checked = data.featured || false;

  window._adminSeasons = data.seasons || [];
  if (data.type === 'webseries' || data.type === 'anime') {
    document.getElementById('seriesBuilder').style.display = 'block';
    renderSeasonList();
  } else {
    document.getElementById('seriesBuilder').style.display = 'none';
  }
  document.getElementById('adminForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteContent(id) {
  openConfirm(async () => {
    await db.collection('contents').doc(id).delete();
    showToast('Content deleted.');
    loadAdminStats();
    renderAdminTable();
  });
}

// ---------- FIXED SEASON & EPISODE FUNCTIONS ----------
function addSeason() {
  const num = parseInt(document.getElementById('fSeasonNum').value);
  if (!num || num < 1) {
    showToast('Please enter a valid season number (≥ 1).');
    return;
  }
  // Check for duplicate season numbers
  if (window._adminSeasons.some(s => s.seasonNumber === num)) {
    showToast(`Season ${num} already exists.`);
    return;
  }
  window._adminSeasons.push({ seasonNumber: num, episodes: [] });
  document.getElementById('fSeasonNum').value = '';
  renderSeasonList();
  showToast(`Season ${num} added.`);
}

function renderSeasonList() {
  const container = document.getElementById('seasonList');
  container.innerHTML = window._adminSeasons.map((s, i) =>
    `<div style="display:flex;gap:8px;align-items:center;background:#1a1a1a;padding:6px 12px;border-radius:8px;margin-bottom:4px;">
      <span>Season ${s.seasonNumber} (${s.episodes.length} eps)</span>
      <button class="btn-danger" style="padding:2px 10px;font-size:0.7rem;" onclick="removeSeason(${i})">×</button>
    </div>`
  ).join('');
  renderEpisodePreview();
}

function removeSeason(idx) {
  window._adminSeasons.splice(idx, 1);
  renderSeasonList();
}

function addEpisode() {
  const seasonNum = parseInt(document.getElementById('fEpSeason').value);
  const epNum = parseInt(document.getElementById('fEpNum').value);
  const title = document.getElementById('fEpTitle').value.trim();
  const desc = document.getElementById('fEpDesc').value.trim();
  const thumb = document.getElementById('fEpThumb').value.trim();
  const video = document.getElementById('fEpVideo').value.trim();

  if (!seasonNum || !epNum || !title || !video) {
    showToast('Season #, Episode #, Title, and Video URL are required.');
    return;
  }

  // Find or auto‑create the season
  let season = window._adminSeasons.find(s => s.seasonNumber === seasonNum);
  if (!season) {
    // Auto‑create the season (with a message)
    season = { seasonNumber: seasonNum, episodes: [] };
    window._adminSeasons.push(season);
    // Sort seasons by number for consistency
    window._adminSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
    showToast(`Season ${seasonNum} was automatically created.`);
  }

  // Optional: prevent duplicate episode numbers within the same season
  if (season.episodes.some(ep => ep.episodeNumber === epNum)) {
    showToast(`Episode ${epNum} already exists in Season ${seasonNum}.`);
    return;
  }

  season.episodes.push({
    episodeNumber: epNum,
    title,
    description: desc || '',
    thumbnail: thumb || '',
    videoUrl: video,
  });

  // Clear episode input fields
  document.getElementById('fEpSeason').value = '';
  document.getElementById('fEpNum').value = '';
  document.getElementById('fEpTitle').value = '';
  document.getElementById('fEpDesc').value = '';
  document.getElementById('fEpThumb').value = '';
  document.getElementById('fEpVideo').value = '';

  renderSeasonList();
  showToast(`Episode ${epNum} added to Season ${seasonNum}.`);
}

function renderEpisodePreview() {
  const container = document.getElementById('episodePreview');
  let html = '';
  window._adminSeasons.forEach(s => {
    s.episodes.forEach((ep) => {
      html += `<div style="font-size:0.8rem;opacity:0.7;padding:2px 0;">S${s.seasonNumber} E${ep.episodeNumber}: ${ep.title}</div>`;
    });
  });
  container.innerHTML = html || '<p style="opacity:0.4;font-size:0.85rem;">No episodes added yet.</p>';
}

// Expose everything (kept unchanged)
window.initAdmin = initAdmin;
window.showAddContent = showAddContent;
window.editContent = editContent;
window.deleteContent = deleteContent;
window.addSeason = addSeason;
window.addEpisode = addEpisode;
window.removeSeason = removeSeason;
window.saveContent = saveContent;
window.loadAdminStats = loadAdminStats;
window.renderAdminTable = renderAdminTable;

// Block right-click completely
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });

        // Block F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+U, Ctrl+S, Ctrl+Shift+J, Cmd+Option+I (Mac)
        document.addEventListener('keydown', function(e) {
            const key = e.keyCode || e.which;
            // F12
            if (key === 123) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I (73), Ctrl+Shift+J (74), Ctrl+Shift+C (67)
            if (e.ctrlKey && e.shiftKey && (key === 73 || key === 74 || key === 67)) {
                e.preventDefault();
                return false;
            }
            // Ctrl+U (85), Ctrl+S (83)
            if (e.ctrlKey && (key === 85 || key === 83)) {
                e.preventDefault();
                return false;
            }
            // Cmd+Option+I on Mac (key 73)
            if (e.metaKey && e.altKey && key === 73) {
                e.preventDefault();
                return false;
            }
            // Disable PrintScreen (optional)
            if (key === 44) {
                e.preventDefault();
                return false;
            }
            return true;
        });

        // Optional: disable text selection (helps against copying)
        document.addEventListener('selectstart', function(e) {
            e.preventDefault();
            return false;
        });
        // Disable drag and drop of images (optional)
        document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });
