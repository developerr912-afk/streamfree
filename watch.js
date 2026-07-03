// Load and render watch detail
async function loadWatchDetail(contentId) {
  const container = document.getElementById('watchDetail');
  container.innerHTML = '<div style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
  const doc = await db.collection('contents').doc(contentId).get();
  if (!doc.exists) {
    container.innerHTML = '<p style="padding:40px;text-align:center;opacity:0.5;">Content not found.</p>';
    return;
  }
  const data = doc.data();
  state.currentContent = { id: doc.id, ...data };
  renderWatchDetail(data);
}

function renderWatchDetail(data) {
  const container = document.getElementById('watchDetail');
  const isSeries = data.type === 'webseries' || data.type === 'anime';

  // ----- Only poster, no banner, no description, badge fixed -----
  let html = `
    <div class="watch-banner" style="position:relative; width:100%; min-height:350px; background:#0d0d0d; overflow:hidden;">
      <img 
        src="${data.poster || ''}" 
        alt="${data.title}" 
        style="width:100%; height:100%; min-height:350px; object-fit:cover; display:block;"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <!-- Fallback if image fails -->
      <div style="display:none; position:absolute; inset:0; align-items:center; justify-content:center; background:#1a1a1a; color:#666; font-size:1.2rem;">
        <i class="fas fa-image fa-3x" style="opacity:0.3;"></i>
      </div>
      <!-- Overlay with title, genre, type only (no description) -->
      <div style="position:absolute; inset:0; background:linear-gradient(to top, #0d0d0d 10%, transparent 60%); display:flex; align-items:flex-end; padding:20px 24px;">
        <div style="width:100%;">
          <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:4px;margin-left:10px;">${data.title}</h1>
          <!-- Genres + Badge - now inline properly -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 4px 0px;">
            ${(data.genre||[]).map(g => `<span class="tag">${g}</span>`).join('')}
            <span class="badge-red">${data.type}</span>
          </div>
        </div>
      </div>
    </div>
    <div style="padding:20px 24px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
        <button class="btn-primary" onclick="playContent('${data.id}')"><i class="fas fa-play"></i> Watch</button>
        <button class="btn-secondary" onclick="toggleWatchlist('${data.id}')"><i class="fas fa-bookmark"></i> Watchlist</button>
        <button class="btn-secondary" onclick="shareContent()"><i class="fas fa-share-alt"></i> Share</button>
        <div style="margin-top:12px;display:flex;gap:16px;font-size:0.85rem;opacity:0.6;">
        <span><i class="far fa-calendar-alt"></i> ${data.releaseDate || 'TBA'}</span>
      </div>
      </div>
      
    </div>
  `;

  if (isSeries && data.seasons && data.seasons.length) {
    html += `<div style="padding:0 24px 24px;">`;
    html += `<h3 style="font-weight:700;margin-bottom:12px;">Seasons & Episodes</h3>`;
    html += `<select id="seasonSelect" style="background:#1a1a1a;color:#fff;border:1px solid #2a2a2a;border-radius:10px;padding:10px 16px;font-size:0.95rem;margin-bottom:16px;width:100%;max-width:300px;">`;
    data.seasons.forEach((s, i) => {
      html += `<option value="${i}">Season ${s.seasonNumber || i+1}</option>`;
    });
    html += `</select>`;
    html += `<div id="episodeList"></div>`;
    html += `</div>`;
    container.innerHTML = html;
    renderEpisodes(0);
    document.getElementById('seasonSelect').addEventListener('change', (e) => {
      renderEpisodes(parseInt(e.target.value));
    });
  } else {
    container.innerHTML = html;
  }
}

function renderEpisodes(seasonIdx) {
  const data = state.currentContent;
  if (!data || !data.seasons || !data.seasons[seasonIdx]) return;
  const episodes = data.seasons[seasonIdx].episodes || [];
  const container = document.getElementById('episodeList');
  if (!container) return;
  container.innerHTML = '';
  episodes.forEach((ep, i) => {
    const div = document.createElement('div');
    div.className = 'episode-card';
    div.innerHTML = `
      <img src="${ep.thumbnail || ''}" alt="${ep.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22120%22%3E%3Crect fill=%22%23151515%22 width=%22200%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22 font-family=%22sans-serif%22%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E'" />
      <div class="ep-info">
        <h4>E${ep.episodeNumber || i+1}: ${ep.title}</h4>
        <p>${ep.description || ''}</p>
      </div>
    `;
    div.addEventListener('click', () => {
      state.currentEpisode = ep;
      state.playerContentId = data.id;
      state.playerSeason = seasonIdx;
      state.playerEpisode = i;
      state.isPlayerSeries = true;
      const params = new URLSearchParams();
      params.set('contentId', data.id);
      params.set('season', seasonIdx);
      params.set('episode', i);
      window.location.href = `player.html?${params.toString()}`;
    });
    container.appendChild(div);
  });
  if (!episodes.length) container.innerHTML = '<p style="opacity:0.5;">No episodes in this season.</p>';
}

function playContent(contentId) {
  const data = state.currentContent;
  if (!data) return;
  if (data.type === 'movie') {
    const params = new URLSearchParams();
    params.set('contentId', contentId);
    window.location.href = `player.html?${params.toString()}`;
  } else {
    if (data.seasons && data.seasons.length && data.seasons[0].episodes && data.seasons[0].episodes.length) {
      const params = new URLSearchParams();
      params.set('contentId', contentId);
      params.set('season', 0);
      params.set('episode', 0);
      window.location.href = `player.html?${params.toString()}`;
    } else {
      showToast('No episodes available.');
    }
  }
}

// Expose
window.loadWatchDetail = loadWatchDetail;
window.playContent = playContent;
window.renderEpisodes = renderEpisodes;

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
