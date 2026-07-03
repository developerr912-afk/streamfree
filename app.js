// ============================================================
// ===== GLOBAL STATE =====
// ============================================================
const state = {
  currentUser: null,
  watchlist: [],
  continueWatching: JSON.parse(localStorage.getItem('continueWatching') || '{}'),
  allContent: [],
  currentContent: null,
  currentEpisode: null,
  isPlayerSeries: false,
  playerContentId: null,
  playerSeason: null,
  playerEpisode: null,
  _playerContent: null,
};

// ============================================================
// ===== TOAST =====
// ============================================================
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 3000);
}

// ============================================================
// ===== CONFIRM =====
// ============================================================
let _confirmCb = null;
function openConfirm(cb) {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.add('open');
  _confirmCb = cb;
}
function closeConfirm() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.remove('open');
  _confirmCb = null;
}
window._confirmCb = _confirmCb;
window.openConfirm = openConfirm;
window.closeConfirm = closeConfirm;

// ============================================================
// ===== UNIFIED NAVIGATION (works on ALL pages) =====
// ============================================================
function showPage(pageId) {
  document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none');
  const el = document.getElementById(pageId);
  if (el) el.style.display = 'block';
  updateActiveNav();
  closeSearch();
  closeMenu();
}

function goToHome() {
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    showPage('page-home');
    renderHome();
  } else {
    window.location.href = 'index.html';
  }
}
function goToWatchlist() {
  if (document.getElementById('page-watchlist')) {
    showPage('page-watchlist');
    renderWatchlist();
  } else {
    window.location.href = 'index.html#watchlist';
  }
}
function goToProfile() {
  if (document.getElementById('page-profile')) {
    showPage('page-profile');
    renderProfile();
  } else {
    window.location.href = 'index.html#profile';
  }
}
function goBackFromPlayer() {
  if (state.currentContent) {
    window.location.href = `watch.html?id=${state.currentContent.id}`;
  } else {
    goToHome();
  }
}

function navigateTo(page) {
  const currentPath = window.location.pathname;
  switch(page) {
    case 'home':
      if (!currentPath.endsWith('index.html') && currentPath !== '/') {
        window.location.href = 'index.html';
      } else {
        showPage('page-home');
        renderHome();
      }
      break;
    case 'watchlist':
      if (!currentPath.endsWith('index.html') && currentPath !== '/') {
        window.location.href = 'index.html#watchlist';
      } else {
        showPage('page-watchlist');
        renderWatchlist();
      }
      break;
    case 'profile':
      if (!currentPath.endsWith('index.html') && currentPath !== '/') {
        window.location.href = 'index.html#profile';
      } else {
        showPage('page-profile');
        renderProfile();
      }
      break;
    case 'menu':
      openMenu();
      break;
    default:
      break;
  }
}

function updateActiveNav() {
  const currentPath = window.location.pathname;
  const hash = window.location.hash;
  let activePage = 'home';
  if (currentPath.includes('watch.html') || currentPath.includes('player.html') || currentPath.includes('admin.html')) {
    activePage = 'home';
  } else {
    if (hash === '#watchlist') activePage = 'watchlist';
    else if (hash === '#profile') activePage = 'profile';
    else activePage = 'home';
  }
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === activePage);
  });
}

// ============================================================
// ===== SEARCH =====
// ============================================================
function openSearch() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) {
    overlay.classList.add('open');
    document.getElementById('searchInput')?.focus();
  }
}
function closeSearch() {
  document.getElementById('searchOverlay')?.classList.remove('open');
}
async function handleSearch(e) {
  const q = e.target.value.trim().toLowerCase();
  const container = document.getElementById('searchResults');
  if (!q) { container.innerHTML = ''; return; }
  try {
    const snap = await db.collection('contents')
      .orderBy('title')
      .startAt(q)
      .endAt(q + '\uf8ff')
      .limit(20)
      .get();
    container.innerHTML = '';
    snap.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `
        <img src="${data.poster || ''}" alt="${data.title}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23151515%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22 font-family=%22sans-serif%22%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E'" />
        <div class="info">
          <h4>${data.title}</h4>
          <span>${data.type || 'movie'}</span>
        </div>
      `;
      div.addEventListener('click', () => { closeSearch();
        window.location.href = `watch.html?id=${doc.id}`; });
      container.appendChild(div);
    });
    if (snap.empty) container.innerHTML = '<p style="grid-column:1/-1;text-align:center;opacity:0.5;padding:40px 0;">No results found.</p>';
  } catch (error) {
    console.error('Search error:', error);
    container.innerHTML = '<p style="grid-column:1/-1;text-align:center;opacity:0.5;padding:40px 0;">Search error. Please try again.</p>';
  }
}

// ============================================================
// ===== MENU (with FIXED filter) =====
// ============================================================
function openMenu() {
  const overlay = document.getElementById('menuOverlay');
  if (!overlay) {
    window.location.href = 'index.html#menu';
    return;
  }
  overlay.classList.add('open');
  renderMenuContent('all');
}
function closeMenu() {
  document.getElementById('menuOverlay')?.classList.remove('open');
}

async function renderMenuContent(filter) {
  const grid = document.getElementById('menuContentGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    let q = db.collection('contents');
    if (filter !== 'all') {
      q = q.where('type', '==', filter);
    } else {
      q = q.orderBy('createdAt', 'desc');
    }
    q = q.limit(50);
    const snap = await q.get();
    grid.innerHTML = '';
    if (snap.empty) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;opacity:0.5;padding:40px 0;">No content found.</p>';
      return;
    }
    snap.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.style.cssText = 'background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;transition:all0.2s;';
      div.innerHTML = `
        <img src="${data.poster || ''}" alt="${data.title}" style="width:100%;height:160px;object-fit:cover;" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23151515%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22 font-family=%22sans-serif%22%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E'" />
        <div style="padding:8px 10px;">
          <h4 style="font-size:0.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${data.title}</h4>
        </div>
      `;
      div.addEventListener('click', () => { closeMenu();
        window.location.href = `watch.html?id=${doc.id}`; });
      grid.appendChild(div);
    });
  } catch (error) {
    console.error('Menu filter error:', error);
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;opacity:0.5;padding:40px 0;">Error: ${error.message}</p>`;
  }
}

// ============================================================
// ===== POSTER CARD CREATOR =====
// ============================================================
function createPosterCard(id, data) {
  const div = document.createElement('div');
  div.className = 'poster-card';
  const isBookmarked = state.watchlist.includes(id);
  div.innerHTML = `
    <img src="${data.poster || ''}" alt="${data.title}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23151515%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22 font-family=%22sans-serif%22%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E'" />
    <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-id="${id}">
      <i class="fas ${isBookmarked ? 'fa-bookmark' : 'fa-bookmark'}"></i>
    </button>
    <div class="poster-info">
      <h4>${data.title}</h4>
      <span class="badge">${data.type || 'movie'}</span>
    </div>
  `;
  const btn = div.querySelector('.bookmark-btn');
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await toggleWatchlist(id, btn);
  });
  div.addEventListener('click', () => {
    window.location.href = `watch.html?id=${id}`;
  });
  return div;
}

// ============================================================
// ===== WATCHLIST TOGGLE =====
// ============================================================
async function toggleWatchlist(contentId, btnEl) {
  if (!state.currentUser) {
    showToast('Please login to use watchlist.');
    return;
  }
  const isActive = state.watchlist.includes(contentId);
  const ref = db.collection('users').doc(state.currentUser.uid).collection('watchlist').doc(contentId);
  if (isActive) {
    await ref.delete();
    state.watchlist = state.watchlist.filter(id => id !== contentId);
    showToast('Removed from watchlist');
  } else {
    const doc = await db.collection('contents').doc(contentId).get();
    if (doc.exists) {
      await ref.set({ contentId, addedAt: firebase.firestore.FieldValue.serverTimestamp() });
      state.watchlist.push(contentId);
      showToast('Added to watchlist');
    }
  }
  if (btnEl) btnEl.classList.toggle('active');
  if (document.getElementById('page-watchlist')?.style.display !== 'none') renderWatchlist();
}

// ============================================================
// ===== WATCHLIST PAGE =====
// ============================================================
async function renderWatchlist() {
  const grid = document.getElementById('watchlistGrid');
  const empty = document.getElementById('watchlistEmpty');
  if (!state.currentUser) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    empty.innerHTML = '<p style="opacity:0.6;">Please login to view your watchlist.</p>';
    return;
  }
  const snap = await db.collection('users').doc(state.currentUser.uid).collection('watchlist').get();
  grid.innerHTML = '';
  if (snap.empty) {
    empty.style.display = 'block';
    empty.innerHTML = '<i class="fas fa-bookmark" style="font-size:3rem;display:block;margin-bottom:12px;"></i><p>No items in your watchlist yet.</p>';
    return;
  }
  empty.style.display = 'none';
  for (const doc of snap.docs) {
    const contentId = doc.data().contentId;
    const cSnap = await db.collection('contents').doc(contentId).get();
    if (!cSnap.exists) continue;
    const data = cSnap.data();
    grid.appendChild(createPosterCard(contentId, data));
  }
}

// ============================================================
// ===== PROFILE PAGE (UPDATED with Settings, Terms, Help) =====
// ============================================================
async function renderProfile() {
  const container = document.getElementById('profileContent');
  if (!container) return;
  const user = state.currentUser;

  if (user) {
    const wlSnap = await db.collection('users').doc(user.uid).collection('watchlist').get();
    const wlCount = wlSnap.size;

    container.innerHTML = `
      <div style="text-align:center;padding:20px 0;">
        <div class="profile-avatar" style="margin:0 auto;">
          ${user.displayName ? user.displayName[0].toUpperCase() : 'U'}
        </div>
        <h2 style="font-size:1.5rem;font-weight:700;margin-top:12px;">
          ${user.displayName || 'User'}
        </h2>
        <p style="opacity:0.6;font-size:0.9rem;">${user.email}</p>
        <div style="display:flex;gap:20px;justify-content:center;margin:16px 0;">
          <div><strong>${wlCount}</strong> <span style="opacity:0.5;">Watchlist</span></div>
          <div><strong>${Object.keys(state.continueWatching).length}</strong> <span style="opacity:0.5;">Continue</span></div>
        </div>

        <!-- Action Buttons – Left Aligned -->
        <div style="display:flex;flex-direction:column;gap:12px;max-width:300px;margin:20px auto;">
          <button class="profile-action-btn" onclick="window.location.href='settings.html'">
            <i class="fas fa-cog"></i> Settings
          </button>
          <button class="profile-action-btn" onclick="window.location.href='termsandpolicy.html'">
            <i class="fas fa-file-alt"></i> Terms & Policy
          </button>
          <button class="profile-action-btn" onclick="window.location.href='help.html'">
            <i class="fas fa-question-circle"></i> Help
          </button>
        </div>

        <button class="btn-danger" onclick="logoutUser()" style="padding:10px 32px;margin-top:8px;">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    `;
  } else {
    // Guest user – Login / Signup with MODALS
    container.innerHTML = `
      <div style="text-align:center;padding:40px 0;">
        <div class="profile-avatar" style="margin:0 auto;font-size:3rem;color:#666;border-color:#444;">
          <i class="fas fa-user"></i>
        </div>
        <h2 style="font-size:1.5rem;font-weight:700;margin-top:12px;">Guest User</h2>
        <p style="opacity:0.6;margin-bottom:24px;">Login to access your watchlist and history.</p>
        <div style="display:flex;flex-direction:column;gap:12px;max-width:280px;margin:0 auto;">
          <button class="btn-primary" onclick="openLoginModal()" style="width:100%;">
            <i class="fas fa-sign-in-alt"></i> Login
          </button>
          <button class="btn-secondary" onclick="openSignupModal()" style="width:100%;">
            <i class="fas fa-user-plus"></i> Create Account
          </button>
        </div>
        <div style="margin-top:30px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap;font-size:0.85rem;">
          <a href="termsandpolicy.html" style="color:#aaa;text-decoration:none;">Terms & Policy</a>
          <a href="help.html" style="color:#aaa;text-decoration:none;">Help</a>
        </div>
      </div>
    `;
  }
}

// ============================================================
// ===== AUTH (PROMPT-BASED – kept for backward compatibility) =====
// ============================================================
function loginUser() {
  openLoginModal(); // redirect to modal
}
function signupUser() {
  openSignupModal(); // redirect to modal
}
function logoutUser() {
  auth.signOut().then(() => {
    showToast('Logged out');
    state.watchlist = [];
    renderProfile();
  });
}

async function loadUserData() {
  const user = state.currentUser;
  if (!user) { state.watchlist = []; return; }
  const snap = await db.collection('users').doc(user.uid).collection('watchlist').get();
  state.watchlist = snap.docs.map(d => d.data().contentId);
}

// ============================================================
// ===== LOGIN MODAL FUNCTIONS =====
// ============================================================
function openLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('loginEmail')?.focus();
  }
}
function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.remove('open');
    document.getElementById('loginForm')?.reset();
  }
}
function openSignupModal() {
  const modal = document.getElementById('signupModal');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('signupName')?.focus();
  }
}
function closeSignupModal() {
  const modal = document.getElementById('signupModal');
  if (modal) {
    modal.classList.remove('open');
    document.getElementById('signupForm')?.reset();
  }
}

// ============================================================
// ===== CLOSE MODALS ON ESC KEY =====
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLoginModal();
    closeSignupModal();
  }
});

// ============================================================
// ===== CLOSE MODALS ON OUTSIDE CLICK =====
// ============================================================
document.addEventListener('click', (e) => {
  const loginModal = document.getElementById('loginModal');
  const signupModal = document.getElementById('signupModal');
  if (e.target === loginModal) closeLoginModal();
  if (e.target === signupModal) closeSignupModal();
});

// ============================================================
// ===== SWITCH BETWEEN LOGIN & SIGNUP =====
// ============================================================
function switchAuth(mode) {
  if (mode === 'login') {
    closeSignupModal();
    setTimeout(openLoginModal, 250);
  } else {
    closeLoginModal();
    setTimeout(openSignupModal, 250);
  }
}

// ============================================================
// ===== HANDLE LOGIN (from form) =====
// ============================================================
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showToast('Please fill in all fields.');
    return;
  }

  const btn = document.getElementById('loginSubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('Welcome back! 🎉');
    closeLoginModal();
    renderProfile();
    loadUserData();
  } catch (err) {
    let msg = 'Login failed: ';
    if (err.code === 'auth/user-not-found') msg += 'User not found.';
    else if (err.code === 'auth/wrong-password') msg += 'Incorrect password.';
    else if (err.code === 'auth/invalid-email') msg += 'Invalid email address.';
    else msg += err.message;
    showToast(msg);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ============================================================
// ===== HANDLE SIGNUP (from form) =====
// ============================================================
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!name || !email || !password) {
    showToast('Please fill in all fields.');
    return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters.');
    return;
  }

  const btn = document.getElementById('signupSubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    showToast('Account created! Welcome ' + name + ' 🎉');
    closeSignupModal();
    renderProfile();
    loadUserData();
  } catch (err) {
    let msg = 'Signup failed: ';
    if (err.code === 'auth/email-already-in-use') msg += 'Email already in use.';
    else if (err.code === 'auth/invalid-email') msg += 'Invalid email address.';
    else if (err.code === 'auth/weak-password') msg += 'Password too weak (min 6 chars).';
    else msg += err.message;
    showToast(msg);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ============================================================
// ===== CONTINUE WATCHING SAVE =====
// ============================================================
function saveContinueWatching(contentId, title, poster, progress) {
  const cw = state.continueWatching;
  cw[contentId] = {
    contentId,
    title,
    poster,
    progress: Math.min(progress, 100),
    updatedAt: Date.now()
  };
  const keys = Object.keys(cw);
  if (keys.length > 20) {
    const sorted = keys.sort((a, b) => cw[b].updatedAt - cw[a].updatedAt);
    sorted.slice(20).forEach(k => delete cw[k]);
  }
  localStorage.setItem('continueWatching', JSON.stringify(cw));
  state.continueWatching = cw;
}

// ============================================================
// ===== SHARE =====
// ============================================================
function shareContent() {
  const data = state.currentContent || state._playerContent;
  if (!data) return;
  if (navigator.share) {
    navigator.share({
      title: data.title,
      text: `Watch ${data.title} on StreamVerse!`,
      url: window.location.href,
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast('Link copied to clipboard!'))
      .catch(() => showToast('Share: ' + window.location.href));
  }
}

// ============================================================
// ===== HOME RENDERING (with smooth slider & watch button) =====
// ============================================================
let heroInterval = null;
let currentSlide = 0;
let heroSlides = [];

async function renderHome() {
  const hero = document.getElementById('heroBanner');
  if (!hero) return;

  try {
    const featuredSnap = await db.collection('contents')
      .where('featured', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    heroSlides = [];
    featuredSnap.forEach(d => heroSlides.push({ id: d.id, ...d.data() }));

    if (heroSlides.length === 0) {
      hero.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;flex-direction:column;gap:12px;">
          <i class="fas fa-film fa-3x"></i>
          <p>No featured content available</p>
        </div>
      `;
    } else {
      // Build slider
      let slidesHTML = '';
      heroSlides.forEach((item, index) => {
        slidesHTML += `
          <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${item.banner || item.poster}" alt="${item.title}" loading="lazy" />
            <div class="hero-overlay">
              <div class="hero-content">
                <h1>${item.title}</h1>
                <button class="btn-primary hero-watch-btn" onclick="window.location.href='watch.html?id=${item.id}'">
                  <i class="fas fa-play"></i> Watch Now
                </button>
              </div>
            </div>
          </div>
        `;
      });

      let dotsHTML = '';
      heroSlides.forEach((_, index) => {
        dotsHTML += `<span class="${index === 0 ? 'active' : ''}" data-index="${index}"></span>`;
      });

      hero.innerHTML = `
        <div class="hero-slider">
          ${slidesHTML}
          <div class="slider-dots">${dotsHTML}</div>
        </div>
      `;

      initHeroSlider();
    }
  } catch (error) {
    console.error('Hero error:', error);
    hero.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;flex-direction:column;gap:12px;">
        <i class="fas fa-exclamation-triangle fa-3x"></i>
        <p>Error loading featured content</p>
      </div>
    `;
  }

  // Continue Watching
  renderContinueWatching();

  // New Content
  try {
    const newSnap = await db.collection('contents')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    const newRow = document.getElementById('newContentRow');
    if (newRow) {
      newRow.innerHTML = '';
      newSnap.forEach(doc => {
        const data = doc.data();
        newRow.appendChild(createPosterCard(doc.id, data));
      });
      if (newSnap.empty) newRow.innerHTML = '<p style="opacity:0.4;padding:10px 0;">No content available.</p>';
    }
  } catch (error) {
    console.error('New content error:', error);
  }

  // Genre Rows
  await renderGenreRows();
}

// ===== HERO SLIDER CONTROLS (smooth auto-play) =====
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.slider-dots span');

  if (slides.length === 0) return;

  if (heroInterval) {
    clearInterval(heroInterval);
    heroInterval = null;
  }

  function goToSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    currentSlide = index;
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      goToSlide(index);
      resetAutoPlay();
    });
  });

  // Touch support
  let touchStartX = 0;
  const slider = document.querySelector('.hero-slider');
  if (slider) {
    slider.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    slider.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextSlide();
        else goToSlide(currentSlide - 1);
        resetAutoPlay();
      }
    }, { passive: true });

    // Pause on hover
    slider.addEventListener('mouseenter', () => {
      if (heroInterval) { clearInterval(heroInterval);
        heroInterval = null; }
    });
    slider.addEventListener('mouseleave', () => {
      if (!heroInterval) startAutoPlay();
    });
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { nextSlide();
      resetAutoPlay(); }
    if (e.key === 'ArrowLeft') { goToSlide(currentSlide - 1);
      resetAutoPlay(); }
  });

  function startAutoPlay() {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(nextSlide, 5000);
  }
  function resetAutoPlay() {
    if (heroInterval) { clearInterval(heroInterval);
      heroInterval = null; }
    startAutoPlay();
  }

  startAutoPlay();

  // Cleanup
  const hero = document.getElementById('heroBanner');
  if (hero) {
    hero._cleanup = () => {
      if (heroInterval) { clearInterval(heroInterval);
        heroInterval = null; }
    };
  }
}

// ===== CONTINUE WATCHING ROW =====
function renderContinueWatching() {
  const row = document.getElementById('continueWatchingRow');
  if (!row) return;
  const cw = state.continueWatching;
  const keys = Object.keys(cw);
  row.innerHTML = '';
  if (!keys.length) {
    row.innerHTML = '<p style="opacity:0.4;padding:10px 0;">No continue watching history.</p>';
    return;
  }
  const items = keys.slice(-10).reverse();
  items.forEach(key => {
    const entry = cw[key];
    const div = document.createElement('div');
    div.className = 'poster-card';
    div.style.width = '140px';
    div.innerHTML = `
      <img src="${entry.poster || ''}" alt="${entry.title}" loading="lazy" style="height:190px;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23151515%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22 font-family=%22sans-serif%22%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E'" />
      <div class="poster-info">
        <h4>${entry.title}</h4>
        
      </div>
      <div style="position:absolute;bottom:0;left:0;height:3px;background:#E50914;width:${entry.progress || 0}%;"></div>
    `;
    div.addEventListener('click', () => {
      if (entry.contentId) {
        window.location.href = `watch.html?id=${entry.contentId}`;
      }
    });
    row.appendChild(div);
  });
}

// ===== GENRE ROWS =====
async function renderGenreRows() {
  const container = document.getElementById('genreRows');
  if (!container) return;
  const genres = ['Action', 'Comedy', 'Adventure', 'Drama', 'Romance', 'Fantasy', 'Sci-Fi', 'Horror', 'Thriller'];
  container.innerHTML = '';
  for (const genre of genres) {
    try {
      const snap = await db.collection('contents')
        .where('genre', 'array-contains', genre)
        .limit(10)
        .get();
      if (snap.empty) continue;
      const section = document.createElement('section');
      section.style.cssText = 'padding-top:20px;';
      section.innerHTML = `<div class="section-header"><h2>${genre}</h2></div><div class="scroll-row" id="genre-${genre}"></div>`;
      container.appendChild(section);
      const row = section.querySelector('.scroll-row');
      snap.forEach(doc => {
        const data = doc.data();
        row.appendChild(createPosterCard(doc.id, data));
      });
    } catch (error) {
      console.error(`Genre row error (${genre}):`, error);
    }
  }
}

// ============================================================
// ===== AUTH STATE =====
// ============================================================
auth.onAuthStateChanged(async (user) => {
  state.currentUser = user;
  if (user) {
    await loadUserData();
    if (document.getElementById('page-profile')?.style.display !== 'none') renderProfile();
    if (document.getElementById('page-watchlist')?.style.display !== 'none') renderWatchlist();
  } else {
    state.watchlist = [];
    if (document.getElementById('page-profile')?.style.display !== 'none') renderProfile();
    if (document.getElementById('page-watchlist')?.style.display !== 'none') renderWatchlist();
  }
});

// ============================================================
// ===== EXPOSE GLOBALS =====
// ============================================================
window.state = state;
window.showToast = showToast;
window.openConfirm = openConfirm;
window.closeConfirm = closeConfirm;
window.goToHome = goToHome;
window.goToWatchlist = goToWatchlist;
window.goToProfile = goToProfile;
window.goBackFromPlayer = goBackFromPlayer;
window.navigateTo = navigateTo;
window.updateActiveNav = updateActiveNav;
window.openSearch = openSearch;
window.closeSearch = closeSearch;
window.openMenu = openMenu;
window.closeMenu = closeMenu;
window.loginUser = loginUser;
window.signupUser = signupUser;
window.logoutUser = logoutUser;
window.toggleWatchlist = toggleWatchlist;
window.shareContent = shareContent;
window.saveContinueWatching = saveContinueWatching;
window.renderHome = renderHome;
window.renderProfile = renderProfile;
window.renderWatchlist = renderWatchlist;
window.handleSearch = handleSearch;
window.renderMenuContent = renderMenuContent;
window.createPosterCard = createPosterCard;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openSignupModal = openSignupModal;
window.closeSignupModal = closeSignupModal;
window.switchAuth = switchAuth;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;

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
