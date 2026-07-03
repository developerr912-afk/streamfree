let hlsInstance = null;
let playerContent = null;
let playerSeasonIdx = 0;
let playerEpisodeIdx = 0;

async function initPlayer(contentId, seasonIdx, episodeIdx) {
  playerSeasonIdx = seasonIdx || 0;
  playerEpisodeIdx = episodeIdx || 0;

  const doc = await db.collection('contents').doc(contentId).get();
  if (!doc.exists) {
    document.getElementById('playerInfo').innerHTML = '<p style="opacity:0.5;">Content not found.</p>';
    return;
  }
  playerContent = { id: doc.id, ...doc.data() };
  state.currentContent = playerContent;
  state._playerContent = playerContent;

  let videoUrl = null;
  let episode = null;
  if (playerContent.type === 'movie') {
    videoUrl = playerContent.watchLink;
  } else {
    const seasons = playerContent.seasons || [];
    if (seasons.length > playerSeasonIdx) {
      const episodes = seasons[playerSeasonIdx].episodes || [];
      if (episodes.length > playerEpisodeIdx) {
        episode = episodes[playerEpisodeIdx];
        videoUrl = episode.videoUrl;
        state.currentEpisode = episode;
        state.isPlayerSeries = true;
        state.playerSeason = playerSeasonIdx;
        state.playerEpisode = playerEpisodeIdx;
      }
    }
  }

  if (!videoUrl) {
    showToast('No video available.');
    return;
  }

  // Populate info
  document.getElementById('playerPoster').src = playerContent.poster || '';
  const title = playerContent.title + (episode ? ` - ${episode.title}` : '');
  document.getElementById('playerTitle').textContent = title;
  document.getElementById('playerDesc').textContent = playerContent.description || '';
  document.getElementById('playerGenres').innerHTML = (playerContent.genre || []).map(g =>
    `<span class="tag">${g}</span>`).join('');

  // Setup HLS
  const video = document.getElementById('playerVideo');
  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });
    hlsInstance.loadSource(videoUrl);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoUrl;
    video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
  } else {
    showToast('HLS not supported in this browser.');
  }

  // Render suggestions
  renderPlayerSuggestions(playerContent);

  // Episode nav for series
  if (playerContent.type !== 'movie' && playerContent.seasons) {
    renderEpisodeNav(playerContent);
  } else {
    document.getElementById('playerEpisodeNav').innerHTML = '';
  }

  // Track continue watching
  saveContinueWatching(playerContent.id, playerContent.title, playerContent.poster, 0);

  // Auto-play next episode
  video.addEventListener('ended', () => {
    if (playerContent.type !== 'movie') {
      autoPlayNext();
    }
  });

  // Update progress
  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const progress = (video.currentTime / video.duration) * 100;
      saveContinueWatching(playerContent.id, playerContent.title, playerContent.poster, progress);
    }
  });
}

async function renderPlayerSuggestions(content) {
  const container = document.getElementById('playerSuggestions');
  container.innerHTML = '';
  if (!content) return;
  const genres = content.genre || [];
  if (genres.length) {
    const snap = await db.collection('contents').where('genre', 'array-contains', genres[0]).where('id', '!=', content.id).limit(10).get();
    snap.forEach(doc => {
      const data = doc.data();
      container.appendChild(createPosterCard(doc.id, data));
    });
    if (snap.empty) container.innerHTML = '<p style="opacity:0.4;padding:10px 0;">No suggestions.</p>';
  } else {
    const snap = await db.collection('contents').orderBy('createdAt', 'desc').limit(6).get();
    snap.forEach(doc => {
      const data = doc.data();
      if (doc.id !== content.id) container.appendChild(createPosterCard(doc.id, data));
    });
  }
}

function renderEpisodeNav(content) {
  const container = document.getElementById('playerEpisodeNav');
  if (!content.seasons || !content.seasons.length) { container.innerHTML = ''; return; }
  const season = content.seasons[playerSeasonIdx || 0];
  if (!season) { container.innerHTML = ''; return; }
  const episodes = season.episodes || [];
  let html = `<h3 style="font-weight:700;margin:12px 0 8px;">Season ${season.seasonNumber || playerSeasonIdx+1}</h3>`;
  html += `<div style="display:flex;gap:8px;flex-wrap:wrap;">`;
  episodes.forEach((ep, i) => {
    const isActive = i === playerEpisodeIdx;
    html += `<button class="${isActive ? 'btn-primary' : 'btn-secondary'}" style="padding:6px 14px;font-size:0.75rem;" onclick="playEpisode(${playerSeasonIdx},${i})">E${ep.episodeNumber || i+1}</button>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function playEpisode(seasonIdx, epIdx) {
  const content = playerContent;
  if (!content || !content.seasons || !content.seasons[seasonIdx]) return;
  const ep = content.seasons[seasonIdx].episodes[epIdx];
  if (!ep) return;
  playerSeasonIdx = seasonIdx;
  playerEpisodeIdx = epIdx;
  // Reload player with new episode
  const params = new URLSearchParams();
  params.set('contentId', content.id);
  params.set('season', seasonIdx);
  params.set('episode', epIdx);
  window.location.href = `player.html?${params.toString()}`;
}

function autoPlayNext() {
  if (playerContent.type === 'movie') return;
  const seasons = playerContent.seasons || [];
  if (!seasons.length) return;
  let season = seasons[playerSeasonIdx];
  if (!season) return;
  let episodes = season.episodes || [];
  let nextEpIdx = playerEpisodeIdx + 1;
  if (nextEpIdx < episodes.length) {
    // Play next episode in same season
    playEpisode(playerSeasonIdx, nextEpIdx);
  } else {
    // Move to next season
    let nextSeasonIdx = playerSeasonIdx + 1;
    if (nextSeasonIdx < seasons.length) {
      const nextSeason = seasons[nextSeasonIdx];
      if (nextSeason.episodes && nextSeason.episodes.length) {
        playEpisode(nextSeasonIdx, 0);
      } else {
        showToast('No more episodes.');
      }
    } else {
      showToast('Series completed!');
    }
  }
}

function toggleWatchlistPlayer() {
  if (!playerContent) return;
  toggleWatchlist(playerContent.id);
}

// Expose
window.initPlayer = initPlayer;
window.playEpisode = playEpisode;
window.toggleWatchlistPlayer = toggleWatchlistPlayer;
window.autoPlayNext = autoPlayNext;

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
