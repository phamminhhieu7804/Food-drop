// ============================================================
// FOOD DROP - app.js
// Full-stack PWA Logic: Firebase + Leaflet + Geolocation
// Author: FOOD DROP Dev Team | Version: 1.0.0
// ============================================================

'use strict';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 1: FIREBASE CONFIGURATION
// ⚠️  HƯỚNG DẪN: Thay thế các giá trị dưới đây bằng cấu hình
//    Firebase của bạn (lấy từ Firebase Console → Project Settings
//    → Your apps → Firebase SDK snippet)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 const firebaseConfig = {
    apiKey: "AIzaSyDVbVWzkbX_9fLe7GT1X5HDYYnWg9LhD24",
    authDomain: "food-drop-d63a4.firebaseapp.com",
    projectId: "food-drop-d63a4",
    storageBucket: "food-drop-d63a4.firebasestorage.app",
    messagingSenderId: "307361054549",
    appId: "1:307361054549:web:b86fd2c2d493dd1a3439dc",
    measurementId: "G-MV3R6LMW4C"
  };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 2: CONSTANTS & APP STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEFAULTS = {
  MAP_CENTER:  [21.0285, 105.8542], // Hà Nội (fallback nếu GPS thất bại)
  MAP_ZOOM:    15,
  PICKER_RADIUS_KM: 5,              // Bán kính tìm quán cho vòng quay (km)
  MIN_STARS_FOR_PICKER: 4,          // Chỉ quay các quán từ 4 sao trở lên
};

const STAR_LABELS = {
  1: '😫 Tệ - Đừng bao giờ quay lại!',
  2: '😕 Ổn ổn - Chỉ khi đói lắm',
  3: '😊 Được - Có thể quay lại',
  4: '😋 Ngon - Recommend cho bạn bè!',
  5: '🤩 Tuyệt vời - Must try!!!',
};

// App State
const state = {
  currentUser:     null,
  userLat:         null,
  userLng:         null,
  selectedLat:     null,
  selectedLng:     null,
  selectedStars:   0,
  reviews:         [],       // In-memory cache của tất cả reviews
  mapMarkers:      {},       // { reviewId: leafletMarkerObject }
  myLocationMarker: null,
  map:             null,
  watchId:         null,
  isAddingMarker:  false,    // Khi bấm bản đồ để thêm marker
  unsubscribeReviews: null,  // Firestore realtime listener cleanup
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 3: DOM REFERENCES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const $ = id => document.getElementById(id);
const DOM = {
  // Screens
  loginScreen:        $('login-screen'),
  mainApp:            $('main-app'),
  // Header
  reviewCountBadge:   $('review-count-badge'),
  userAvatarImg:      $('user-avatar-img'),
  userAvatarFallback: $('user-avatar-fallback'),
  btnUserAvatar:      $('btn-user-avatar'),
  // Control bar
  btnLocate:          $('btn-locate'),
  btnAddReview:       $('btn-add-review'),
  btnFoodPicker:      $('btn-food-picker'),
  gpsDot:             $('gps-dot'),
  gpsStatusText:      $('gps-status-text'),
  // Modal: Add Review
  modalAddReview:     $('modal-add-review'),
  modalCardAdd:       $('modal-card-add'),
  modalCoordsLabel:   $('modal-coords-label'),
  btnCloseAddModal:   $('btn-close-add-modal'),
  inputPlaceName:     $('input-place-name'),
  starPicker:         $('star-picker'),
  starLabelText:      $('star-label-text'),
  inputNote:          $('input-note'),
  btnSubmitReview:    $('btn-submit-review'),
  btnSubmitText:      $('btn-submit-text'),
  btnSubmitSpinner:   $('btn-submit-spinner'),
  // Bottom sheet: Review Detail
  overlayReviewDetail: $('overlay-review-detail'),
  sheetReviewDetail:   $('sheet-review-detail'),
  reviewDetailContent: $('review-detail-content'),
  // Spin Overlay
  spinOverlay:         $('spin-overlay'),
  btnCloseSpin:        $('btn-close-spin'),
  spinWheel:           $('spin-wheel'),
  spinIcon:            $('spin-icon'),
  spinStatus:          $('spin-status'),
  spinLoadingText:     $('spin-loading-text'),
  spinCandidatesCount: $('spin-candidates-count'),
  spinCountNum:        $('spin-count-num'),
  spinWinner:          $('spin-winner'),
  spinWinnerEmoji:     $('spin-winner-emoji'),
  spinWinnerName:      $('spin-winner-name'),
  spinWinnerStars:     $('spin-winner-stars'),
  spinWinnerNote:      $('spin-winner-note'),
  btnGoToWinner:       $('btn-go-to-winner'),
  btnSpinGo:           $('btn-spin-go'),
  spinEmpty:           $('spin-empty'),
  // Toast
  toastContainer:      $('toast-container'),
  // Login
  btnGoogleLogin:      $('btn-google-login'),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 4: FIREBASE INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let db, auth, googleProvider;

function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db   = firebase.firestore();
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    console.log('✅ Firebase initialized');
    return true;
  } catch (err) {
    console.error('❌ Firebase init failed:', err);
    showToast('⚠️ Không thể kết nối Firebase. Kiểm tra cấu hình!', 'error', 5000);
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 5: SERVICE WORKER REGISTRATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('✅ Service Worker registered:', reg.scope);
      // Lắng nghe update
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('🔄 App được cập nhật! Tải lại để dùng phiên mới.', 'info', 5000);
          }
        });
      });
    } catch (err) {
      console.warn('⚠️ Service Worker registration failed:', err);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 6: AUTHENTICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function setupAuthListener() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      state.currentUser = user;
      console.log('✅ Logged in as:', user.displayName);
      // Cập nhật UI
      updateUserAvatarUI(user);
      // Lưu/cập nhật thông tin user lên Firestore
      await upsertUserProfile(user);
      // Chuyển sang màn hình chính
      showMainApp();
    } else {
      state.currentUser = null;
      showLoginScreen();
    }
  });
}

async function signInWithGoogle() {
  DOM.btnGoogleLogin.disabled = true;
  DOM.btnGoogleLogin.innerHTML = `<div class="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto"></div>`;
  try {
    await auth.signInWithPopup(googleProvider);
    // onAuthStateChanged sẽ handle tiếp
  } catch (err) {
    console.error('❌ Sign in error:', err);
    DOM.btnGoogleLogin.disabled = false;
    DOM.btnGoogleLogin.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
      </svg>
      <span>Đăng nhập với Google</span>`;
    if (err.code !== 'auth/popup-closed-by-user') {
      showToast('❌ Đăng nhập thất bại: ' + (err.message || 'Vui lòng thử lại'), 'error');
    }
  }
}

async function signOut() {
  try {
    // Dừng geo tracking
    if (state.watchId) navigator.geolocation.clearWatch(state.watchId);
    // Hủy listener Firestore
    if (state.unsubscribeReviews) state.unsubscribeReviews();
    await auth.signOut();
    showToast('👋 Đã đăng xuất. Hẹn gặp lại!', 'info');
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

async function upsertUserProfile(user) {
  if (!db) return;
  try {
    await db.collection('users').doc(user.uid).set({
      uid:       user.uid,
      name:      user.displayName || 'Foodie',
      email:     user.email || '',
      photoURL:  user.photoURL || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not update user profile:', err);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 7: SCREEN MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function showMainApp() {
  DOM.loginScreen.classList.add('hidden');
  DOM.mainApp.classList.remove('hidden');
  // Khởi tạo map & geo tracking nếu chưa làm
  if (!state.map) {
    initMap();
    startGeoTracking();
    subscribeToReviews();
  }
}

function showLoginScreen() {
  DOM.mainApp.classList.add('hidden');
  DOM.loginScreen.classList.remove('hidden');
  // Reset button state
  DOM.btnGoogleLogin.disabled = false;
  DOM.btnGoogleLogin.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
    <span>Đăng nhập với Google</span>`;
}

function updateUserAvatarUI(user) {
  if (user.photoURL) {
    DOM.userAvatarImg.src = user.photoURL;
    DOM.userAvatarImg.classList.remove('hidden');
    DOM.userAvatarFallback.classList.add('hidden');
  } else {
    DOM.userAvatarFallback.textContent = (user.displayName || 'U').charAt(0).toUpperCase();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 8: LEAFLET MAP INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function initMap() {
  const initialCenter = (state.userLat && state.userLng)
    ? [state.userLat, state.userLng]
    : DEFAULTS.MAP_CENTER;

  state.map = L.map('map', {
    center:          initialCenter,
    zoom:            DEFAULTS.MAP_ZOOM,
    zoomControl:     false,
    attributionControl: false,
    tapTolerance:    15,
    // Better performance on mobile
    preferCanvas:    true,
    renderer:        L.canvas(),
  });

  // OpenStreetMap tiles (free, no API key)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom:     19,
    crossOrigin: true,
  }).addTo(state.map);

  // ── Map interaction: Long Press để thêm review ──
  let pressTimer = null;
  let pressStartPos = null;

  function startLongPress(e) {
    pressStartPos = e.latlng || e.touches?.[0];
    pressTimer = setTimeout(() => {
      if (!e.latlng) return;
      openAddReviewModal(e.latlng.lat, e.latlng.lng);
      showToast('📍 Giữ chọn vị trí quán!', 'info', 1500);
    }, 600);
  }

  function cancelLongPress() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  }

  state.map.on('mousedown', startLongPress);
  state.map.on('touchstart', (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      startLongPress({ latlng: state.map.containerPointToLatLng(L.point(touch.clientX, touch.clientY)) });
    }
  });
  state.map.on('mouseup mousemove touchend touchmove', cancelLongPress);

  // Single click: nếu đang ở chế độ "thêm marker"
  state.map.on('click', (e) => {
    if (state.isAddingMarker) {
      openAddReviewModal(e.latlng.lat, e.latlng.lng);
      state.isAddingMarker = false;
      DOM.btnAddReview.style.background = '';
    }
  });

  // Xử lý resize
  window.addEventListener('resize', () => state.map.invalidateSize());
  setTimeout(() => state.map.invalidateSize(), 200);

  console.log('✅ Map initialized');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 9: GEOLOCATION TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function startGeoTracking() {
  if (!navigator.geolocation) {
    setGpsStatus('error', 'Thiết bị không hỗ trợ GPS');
    return;
  }

  setGpsStatus('searching', 'Đang lấy GPS...');

  const options = {
    enableHighAccuracy: true,
    timeout:            10000,
    maximumAge:         3000,
  };

  state.watchId = navigator.geolocation.watchPosition(
    onGeoSuccess,
    onGeoError,
    options
  );
}

function onGeoSuccess(position) {
  const { latitude, longitude, accuracy } = position.coords;
  state.userLat = latitude;
  state.userLng = longitude;

  // Update GPS status
  const accuracyStr = accuracy < 20 ? '± ' + Math.round(accuracy) + 'm' : '± ' + Math.round(accuracy) + 'm';
  setGpsStatus('ok', `GPS ${accuracyStr}`);

  // Update user marker trên map
  updateMyLocationMarker(latitude, longitude);

  // Re-center map lần đầu tiên lấy được vị trí
  if (!state.hasInitialFly && state.map) {
    state.map.flyTo([latitude, longitude], DEFAULTS.MAP_ZOOM, { animate: true, duration: 1.5 });
    state.hasInitialFly = true;
  }

  // Lưu vị trí lên Firestore (debounced, mỗi 30s)
  scheduleUserLocationUpdate(latitude, longitude);
}

function onGeoError(err) {
  console.warn('Geo error:', err);
  const messages = {
    1: 'Bạn đã từ chối quyền truy cập GPS 😢',
    2: 'Không lấy được tín hiệu GPS',
    3: 'Hết thời gian chờ GPS',
  };
  setGpsStatus('error', messages[err.code] || 'Lỗi GPS');
}

function setGpsStatus(type, text) {
  DOM.gpsStatusText.textContent = text;
  const colors = { ok: '#22c55e', searching: '#eab308', error: '#ef4444' };
  DOM.gpsDot.style.background = colors[type] || '#eab308';
  DOM.gpsDot.className = `w-2 h-2 rounded-full ${type === 'searching' ? 'animate-pulse' : ''}`;
}

let _geoUpdateTimeout = null;
function scheduleUserLocationUpdate(lat, lng) {
  clearTimeout(_geoUpdateTimeout);
  _geoUpdateTimeout = setTimeout(() => {
    updateUserLocationInFirestore(lat, lng);
  }, 30000); // debounce 30 giây
}

async function updateUserLocationInFirestore(lat, lng) {
  if (!state.currentUser || !db) return;
  try {
    await db.collection('users').doc(state.currentUser.uid).update({
      currentLat: lat,
      currentLng: lng,
      updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Silently fail - location update is non-critical
    console.warn('Could not update location:', err);
  }
}

function updateMyLocationMarker(lat, lng) {
  if (!state.map) return;

  const myIcon = L.divIcon({
    html: `<div class="my-location-marker"><div class="my-location-pulse"></div></div>`,
    className: '',
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
  });

  if (state.myLocationMarker) {
    state.myLocationMarker.setLatLng([lat, lng]);
  } else {
    state.myLocationMarker = L.marker([lat, lng], {
      icon:        myIcon,
      zIndexOffset: 1000,
      interactive: false,
    }).addTo(state.map);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 10: CUSTOM STAR MARKERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getStarClass(rating) {
  if (rating === 5) return 'star-5';
  if (rating === 4) return 'star-4';
  if (rating === 3) return 'star-3';
  if (rating === 2) return 'star-2';
  return 'star-1';
}

function createFoodMarkerIcon(review) {
  const starClass = getStarClass(review.rating);
  const starsText = '★'.repeat(review.rating);
  // Truncate name if too long
  const shortName = review.placeName.length > 14
    ? review.placeName.substring(0, 12) + '…'
    : review.placeName;

  const html = `
    <div class="food-marker ${starClass}">
      <span class="star-icon">★</span>
      ${review.rating}&nbsp;·&nbsp;<span style="max-width:90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${shortName}</span>
    </div>`;

  return L.divIcon({
    html,
    className:  '',
    iconSize:   [null, 32],
    iconAnchor: [0, 32],
    popupAnchor:[60, -32],
  });
}

function addReviewMarkerToMap(review) {
  if (!state.map) return;

  // Xóa marker cũ nếu có (khi update)
  if (state.mapMarkers[review.id]) {
    state.map.removeLayer(state.mapMarkers[review.id]);
  }

  const marker = L.marker([review.lat, review.lng], {
    icon:   createFoodMarkerIcon(review),
    riseOnHover: true,
  }).addTo(state.map);

  // Click marker → mở bottom sheet chi tiết
  marker.on('click', () => openReviewDetailSheet(review));

  state.mapMarkers[review.id] = marker;
}

function removeReviewMarkerFromMap(reviewId) {
  if (state.mapMarkers[reviewId]) {
    state.map.removeLayer(state.mapMarkers[reviewId]);
    delete state.mapMarkers[reviewId];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 11: FIRESTORE REVIEWS (CRUD + REALTIME)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function subscribeToReviews() {
  if (!db) return;

  const query = db.collection('reviews').orderBy('createdAt', 'desc').limit(200);

  state.unsubscribeReviews = query.onSnapshot(
    (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = { id: change.doc.id, ...change.doc.data() };

        if (change.type === 'added') {
          // Thêm vào state cache
          state.reviews.push(data);
          addReviewMarkerToMap(data);
        }
        else if (change.type === 'modified') {
          const idx = state.reviews.findIndex(r => r.id === data.id);
          if (idx > -1) state.reviews[idx] = data;
          addReviewMarkerToMap(data); // re-render marker
        }
        else if (change.type === 'removed') {
          state.reviews = state.reviews.filter(r => r.id !== data.id);
          removeReviewMarkerFromMap(data.id);
        }
      });

      updateReviewCountBadge();
    },
    (err) => {
      console.error('Firestore listen error:', err);
      showToast('⚠️ Mất kết nối realtime với server', 'error');
    }
  );
}

async function submitReview() {
  const placeName = DOM.inputPlaceName.value.trim();
  const rating    = state.selectedStars;
  const note      = DOM.inputNote.value.trim();
  const lat       = state.selectedLat;
  const lng       = state.selectedLng;

  // Validation
  if (!placeName) {
    showToast('⚠️ Nhập tên quán đi bạn ơi!', 'error');
    DOM.inputPlaceName.focus();
    shakeElement(DOM.inputPlaceName);
    return;
  }
  if (!rating || rating < 1 || rating > 5) {
    showToast('⭐ Chọn số sao đánh giá nào!', 'error');
    shakeElement(DOM.starPicker);
    return;
  }
  if (!lat || !lng) {
    showToast('📍 Chọn vị trí quán trên bản đồ!', 'error');
    return;
  }
  if (!state.currentUser) {
    showToast('🔐 Bạn chưa đăng nhập!', 'error');
    return;
  }

  // Show loading state
  setSubmitLoading(true);

  try {
    const reviewData = {
      userId:     state.currentUser.uid,
      userName:   state.currentUser.displayName || 'Foodie',
      userAvatar: state.currentUser.photoURL || '',
      placeName,
      lat,
      lng,
      rating,
      note,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('reviews').add(reviewData);

    showToast(`🎉 Đã ghim "${placeName}" lên bản đồ!`, 'success');
    closeAddReviewModal();
    // Pan to the new marker
    if (state.map) {
      state.map.flyTo([lat, lng], Math.max(state.map.getZoom(), 16), { animate: true, duration: 1 });
    }
  } catch (err) {
    console.error('Submit review error:', err);
    showToast('❌ Lưu thất bại: ' + (err.message || 'Thử lại nhé!'), 'error');
  } finally {
    setSubmitLoading(false);
  }
}

async function deleteReview(reviewId) {
  if (!state.currentUser || !db) return;
  const review = state.reviews.find(r => r.id === reviewId);
  if (!review) return;
  if (review.userId !== state.currentUser.uid) {
    showToast('🚫 Bạn chỉ có thể xóa review của mình!', 'error');
    return;
  }
  try {
    await db.collection('reviews').doc(reviewId).delete();
    closeReviewDetailSheet();
    showToast('🗑️ Đã xóa đánh giá', 'info');
  } catch (err) {
    console.error('Delete review error:', err);
    showToast('❌ Xóa thất bại', 'error');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 12: UI - ADD REVIEW MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openAddReviewModal(lat, lng) {
  state.selectedLat = lat;
  state.selectedLng = lng;
  // Reset form
  DOM.inputPlaceName.value  = '';
  DOM.inputNote.value       = '';
  state.selectedStars       = 0;
  resetStarPicker();
  // Update location label
  DOM.modalCoordsLabel.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  // Open modal
  DOM.modalAddReview.classList.add('active');
  DOM.modalCardAdd.classList.add('active');
  setTimeout(() => DOM.inputPlaceName.focus(), 400);
}

function closeAddReviewModal() {
  DOM.modalAddReview.classList.remove('active');
  DOM.modalCardAdd.classList.remove('active');
}

function resetStarPicker() {
  document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('active'));
  DOM.starLabelText.textContent = 'Chưa chọn sao';
  DOM.starLabelText.style.color = '#64748b';
}

function handleStarPick(stars) {
  state.selectedStars = stars;
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.star) <= stars);
  });
  DOM.starLabelText.textContent = STAR_LABELS[stars] || '';
  // Color feedback
  const colors = { 1: '#ef4444', 2: '#ef4444', 3: '#f59e0b', 4: '#eab308', 5: '#22c55e' };
  DOM.starLabelText.style.color = colors[stars];
}

function setSubmitLoading(loading) {
  DOM.btnSubmitReview.disabled = loading;
  if (loading) {
    DOM.btnSubmitText.classList.add('hidden');
    DOM.btnSubmitSpinner.classList.remove('hidden');
  } else {
    DOM.btnSubmitText.classList.remove('hidden');
    DOM.btnSubmitSpinner.classList.add('hidden');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 13: UI - REVIEW DETAIL BOTTOM SHEET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openReviewDetailSheet(review) {
  const isOwner = state.currentUser && state.currentUser.uid === review.userId;
  const starsHtml = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const ratingLabel = STAR_LABELS[review.rating] || '';
  const dateStr = review.createdAt?.toDate
    ? formatDate(review.createdAt.toDate())
    : 'Vừa xong';

  const starColorMap = {
    5: '#22c55e', 4: '#eab308', 3: '#f59e0b', 2: '#ef4444', 1: '#ef4444'
  };
  const starColor = starColorMap[review.rating] || '#eab308';

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${review.lat},${review.lng}`;

  DOM.reviewDetailContent.innerHTML = `
    <!-- Rating Badge -->
    <div class="flex items-center gap-3 mb-5">
      <div class="flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg"
           style="background: linear-gradient(135deg, ${starColor}22, ${starColor}44); border: 1.5px solid ${starColor}55;">
        <span class="text-2xl font-black" style="color:${starColor};">${review.rating}</span>
        <span class="text-xs" style="color:${starColor};">SAO</span>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-xl font-black text-white leading-tight truncate">${escapeHtml(review.placeName)}</h3>
        <p class="text-sm mt-0.5" style="color:${starColor};">${ratingLabel}</p>
      </div>
    </div>

    <!-- Stars display -->
    <div class="text-2xl mb-4 tracking-wider" style="color:${starColor};">
      ${'★'.repeat(review.rating)}<span class="text-slate-600">${'★'.repeat(5 - review.rating)}</span>
    </div>

    <!-- Note -->
    ${review.note ? `
    <div class="rounded-2xl p-4 mb-4" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);">
      <p class="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">📝 Ghi chú</p>
      <p class="text-slate-200 text-sm leading-relaxed">${escapeHtml(review.note)}</p>
    </div>` : ''}

    <!-- Reviewer info -->
    <div class="flex items-center gap-3 mb-5 rounded-2xl p-3" style="background:rgba(255,255,255,0.04);">
      ${review.userAvatar
        ? `<img src="${review.userAvatar}" class="w-10 h-10 rounded-full border-2 border-slate-600" alt="${escapeHtml(review.userName)}" />`
        : `<div class="w-10 h-10 rounded-full border-2 border-slate-600 bg-slate-700 flex items-center justify-center text-brand font-bold">${(review.userName || 'U').charAt(0)}</div>`
      }
      <div>
        <p class="text-sm font-semibold text-white">${escapeHtml(review.userName || 'Foodie')}</p>
        <p class="text-xs text-slate-400">${dateStr}</p>
      </div>
    </div>

    <!-- Location coordinates chip -->
    <div class="flex items-center gap-2 mb-5 text-slate-400">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span class="text-xs">${review.lat.toFixed(4)}, ${review.lng.toFixed(4)}</span>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3">
      <a href="${googleMapsUrl}" target="_blank" rel="noopener"
         class="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-center text-white flex items-center justify-center gap-2"
         style="background: linear-gradient(135deg, #3b82f6, #6366f1);">
        🧭 Chỉ đường
      </a>
      <button onclick="locateMarkerOnMap('${review.id}')"
        class="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 bg-slate-600">
        📍 Trên bản đồ
      </button>
      ${isOwner ? `
      <button onclick="deleteReview('${review.id}')"
        class="w-14 py-3.5 rounded-2xl font-semibold text-sm text-red-400 flex items-center justify-center bg-red-500/10 border border-red-500/20">
        🗑️
      </button>` : ''}
    </div>
  `;

  DOM.overlayReviewDetail.classList.add('active');
  DOM.sheetReviewDetail.classList.add('active');
}

function closeReviewDetailSheet() {
  DOM.overlayReviewDetail.classList.remove('active');
  DOM.sheetReviewDetail.classList.remove('active');
}

// Called from inline onclick in review detail HTML
window.locateMarkerOnMap = function(reviewId) {
  const review = state.reviews.find(r => r.id === reviewId);
  if (!review || !state.map) return;
  closeReviewDetailSheet();
  state.map.flyTo([review.lat, review.lng], 17, { animate: true, duration: 1.2 });
  // Trigger marker bounce
  setTimeout(() => {
    const marker = state.mapMarkers[reviewId];
    if (marker) {
      const el = marker.getElement();
      if (el) {
        el.style.transform += ' scale(1.4)';
        setTimeout(() => { el.style.transform = el.style.transform.replace(' scale(1.4)', ''); }, 400);
      }
    }
  }, 1200);
};

window.deleteReview = deleteReview;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 14: FOOD PICKER (RANDOM SPIN WHEEL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openFoodPicker() {
  // Reset UI
  DOM.spinWinner.classList.add('hidden');
  DOM.spinEmpty.classList.add('hidden');
  DOM.btnSpinGo.classList.add('hidden');
  DOM.spinCandidatesCount.classList.add('hidden');
  DOM.spinLoadingText.textContent = 'Đang tìm quán 4-5⭐ gần bạn...';
  DOM.spinLoadingText.classList.remove('hidden');
  DOM.spinWheel.style.animation = '';

  DOM.spinOverlay.classList.add('active');

  // Find candidates
  setTimeout(() => {
    const candidates = findNearbyTopReviews();
    showSpinCandidates(candidates);
  }, 800);
}

function closeFoodPicker() {
  DOM.spinOverlay.classList.remove('active');
  // Stop wheel animation
  DOM.spinWheel.style.animation = '';
}

function findNearbyTopReviews() {
  const userLat = state.userLat;
  const userLng = state.userLng;

  return state.reviews.filter(review => {
    if (review.rating < DEFAULTS.MIN_STARS_FOR_PICKER) return false;
    // Nếu không có vị trí GPS, include tất cả 4-5 sao
    if (!userLat || !userLng) return true;
    const dist = getDistanceKm(userLat, userLng, review.lat, review.lng);
    return dist <= DEFAULTS.PICKER_RADIUS_KM;
  });
}

function showSpinCandidates(candidates) {
  DOM.spinLoadingText.classList.add('hidden');

  if (candidates.length === 0) {
    DOM.spinEmpty.classList.remove('hidden');
    return;
  }

  DOM.spinCandidatesCount.classList.remove('hidden');
  DOM.spinCountNum.textContent = candidates.length;
  DOM.btnSpinGo.classList.remove('hidden');

  // Attach spin action
  DOM.btnSpinGo.onclick = () => spinTheWheel(candidates);
}

function spinTheWheel(candidates) {
  DOM.btnSpinGo.disabled = true;
  DOM.btnSpinGo.textContent = '🎡 Đang quay...';

  // Animate wheel spin
  let rotations = 0;
  const totalRotation = 1080 + Math.random() * 720; // 3-5 vòng
  DOM.spinWheel.style.transition = `transform ${2.5}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
  DOM.spinWheel.style.transform  = `rotate(${totalRotation}deg)`;

  // Animate emoji
  const foodEmojis = ['🍜', '🍱', '🍔', '🌮', '🍣', '🍕', '🍗', '🥘', '🍛', '🍲'];
  let emojiIdx = 0;
  const emojiInterval = setInterval(() => {
    DOM.spinIcon.textContent = foodEmojis[emojiIdx % foodEmojis.length];
    emojiIdx++;
  }, 150);

  // Reveal winner after spin
  setTimeout(() => {
    clearInterval(emojiInterval);
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    revealWinner(winner);
    DOM.btnSpinGo.disabled = false;
    DOM.btnSpinGo.textContent = '🎲 Quay lại';
    DOM.btnSpinGo.onclick = () => spinTheWheel(candidates);
  }, 2700);
}

function revealWinner(review) {
  const starColor = review.rating >= 4 ? '#22c55e' : '#eab308';

  DOM.spinWinner.classList.remove('hidden');
  DOM.spinWinnerName.textContent  = review.placeName;
  DOM.spinWinnerStars.textContent = '★'.repeat(review.rating);
  DOM.spinWinnerStars.style.color = starColor;
  DOM.spinWinnerNote.textContent  = review.note || 'Không có ghi chú';
  DOM.spinWinnerEmoji.textContent = review.rating === 5 ? '🎉' : '😋';

  // Animate winner card
  DOM.spinWinner.style.animation = 'fadeIn 0.5s ease-out';

  // Go to marker button
  DOM.btnGoToWinner.onclick = () => {
    closeFoodPicker();
    if (state.map) {
      state.map.flyTo([review.lat, review.lng], 17, { animate: true, duration: 1.5 });
    }
    setTimeout(() => openReviewDetailSheet(review), 1600);
  };

  showToast(`🎯 Chốt đi! "${review.placeName}" ${review.rating}⭐`, 'success', 3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 15: UTILITY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Haversine formula: tính khoảng cách km giữa 2 toạ độ */
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R   = 6371; // Bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a   = Math.sin(dLat / 2) ** 2
              + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
              * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

function updateReviewCountBadge() {
  const count = state.reviews.length;
  DOM.reviewCountBadge.textContent = `${count} quán`;
}

function formatDate(date) {
  const now  = new Date();
  const diff = (now - date) / 1000; // seconds
  if (diff < 60)   return 'Vừa xong';
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/** Hiển thị toast notification */
let _toastTimers = [];
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);

  const timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
  _toastTimers.push(timer);

  // Remove oldest toasts if too many
  const toasts = DOM.toastContainer.querySelectorAll('.toast');
  if (toasts.length > 3) toasts[0].remove();
}

/** Shake animation for validation errors */
function shakeElement(el) {
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => { el.style.animation = ''; }, 400);
}

// Add shake keyframe dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-6px); }
    40%       { transform: translateX(6px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

/** Ripple effect on FAB */
function addRippleEffect(btn) {
  btn.addEventListener('click', function(e) {
    const rect    = this.getBoundingClientRect();
    const ripple  = document.createElement('span');
    const size    = Math.max(rect.width, rect.height);
    ripple.classList.add('ripple');
    ripple.style.width  = ripple.style.height = `${size}px`;
    ripple.style.left   = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top    = `${e.clientY - rect.top - size / 2}px`;
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 16: EVENT LISTENERS SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function setupEventListeners() {
  // ── Login ──
  DOM.btnGoogleLogin.addEventListener('click', signInWithGoogle);

  // ── Map Controls ──
  DOM.btnLocate.addEventListener('click', () => {
    if (state.userLat && state.userLng && state.map) {
      state.map.flyTo([state.userLat, state.userLng], DEFAULTS.MAP_ZOOM, { animate: true, duration: 1 });
      showToast('📍 Đã về vị trí của bạn!', 'info', 1500);
    } else {
      showToast('⏳ Đang chờ tín hiệu GPS...', 'info', 2000);
    }
  });

  // ── Add Review Button ──
  DOM.btnAddReview.addEventListener('click', () => {
    if (state.isAddingMarker) {
      // Toggle off
      state.isAddingMarker = false;
      DOM.btnAddReview.style.background = '';
      showToast('✖️ Đã hủy chế độ thêm quán', 'info', 1500);
      return;
    }

    if (state.userLat && state.userLng) {
      // Mở modal tại vị trí GPS hiện tại
      openAddReviewModal(state.userLat, state.userLng);
    } else {
      // Chuyển sang chế độ click-to-add
      state.isAddingMarker = true;
      DOM.btnAddReview.style.background = 'linear-gradient(135deg, #3b82f6, #6366f1)';
      showToast('👆 Bấm vào bản đồ để chọn vị trí quán!', 'info', 3000);
    }
  });

  addRippleEffect(DOM.btnAddReview);

  // ── Food Picker Button ──
  DOM.btnFoodPicker.addEventListener('click', openFoodPicker);
  DOM.btnCloseSpin.addEventListener('click', closeFoodPicker);

  // ── Star Picker ──
  DOM.starPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.star-btn');
    if (btn) handleStarPick(parseInt(btn.dataset.star));
  });

  // ── Modal: Add Review ──
  DOM.btnCloseAddModal.addEventListener('click', closeAddReviewModal);
  DOM.modalAddReview.addEventListener('click', (e) => {
    if (e.target === DOM.modalAddReview) closeAddReviewModal();
  });
  DOM.btnSubmitReview.addEventListener('click', submitReview);

  // Submit on Enter (Tên quán field)
  DOM.inputPlaceName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') DOM.inputNote.focus();
  });

  // ── Review Detail Bottom Sheet ──
  DOM.overlayReviewDetail.addEventListener('click', (e) => {
    if (e.target === DOM.overlayReviewDetail) closeReviewDetailSheet();
  });

  // Swipe down to close bottom sheet
  let touchStartY = 0;
  DOM.sheetReviewDetail.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  DOM.sheetReviewDetail.addEventListener('touchmove', (e) => {
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 80) closeReviewDetailSheet();
  }, { passive: true });

  // ── User Avatar - Show options ──
  DOM.btnUserAvatar.addEventListener('click', () => {
    if (!state.currentUser) return;
    const name = state.currentUser.displayName || 'Bạn';
    // Simple confirm dialog (có thể nâng cấp thành bottom sheet)
    if (confirm(`👋 Xin chào, ${name}!\n\nBấm OK để đăng xuất.`)) {
      signOut();
    }
  });

  // ── Swipe down spin overlay ──
  let spinTouchY = 0;
  DOM.spinOverlay.addEventListener('touchstart', (e) => {
    spinTouchY = e.touches[0].clientY;
  }, { passive: true });
  DOM.spinOverlay.addEventListener('touchmove', (e) => {
    if (e.touches[0].clientY - spinTouchY > 100) closeFoodPicker();
  }, { passive: true });

  // ── Keyboard ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAddReviewModal();
      closeReviewDetailSheet();
      closeFoodPicker();
    }
  });

  console.log('✅ Event listeners set up');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 17: DEMO MODE (Khi chưa có Firebase thực)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * DEMO MODE: Nếu Firebase chưa được cấu hình (còn "YOUR_API_KEY"),
 * app sẽ chạy ở chế độ demo với dữ liệu mẫu để xem giao diện.
 * XÓA PHẦN NÀY khi deploy thực tế với Firebase thật.
 */
const IS_DEMO_MODE = FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY';

const DEMO_REVIEWS = [
  { id: 'demo1', userId: 'demo', userName: 'Minh Foodie', userAvatar: '', placeName: 'Phở Bò Thìn', lat: 21.0295, lng: 105.8530, rating: 5, note: 'Phải order phở đặc biệt! Queue sáng sớm thôi 🔥', createdAt: { toDate: () => new Date(Date.now() - 3600000) } },
  { id: 'demo2', userId: 'demo', userName: 'Lan Ăn Vặt', userAvatar: '', placeName: 'Bún Chả Obama', lat: 21.0275, lng: 105.8555, rating: 5, note: 'Nơi Obama từng ăn! Bún chả + nem rán ngon vãi 🎉', createdAt: { toDate: () => new Date(Date.now() - 7200000) } },
  { id: 'demo3', userId: 'demo', userName: 'Tuấn Bụng To', userAvatar: '', placeName: 'Bánh Mì 25', lat: 21.0310, lng: 105.8510, rating: 4, note: 'Bánh mì pate ngon, giá siêu hợp lý', createdAt: { toDate: () => new Date(Date.now() - 86400000) } },
  { id: 'demo4', userId: 'demo', userName: 'Hà Sài Gòn', userAvatar: '', placeName: 'Cơm Tấm Sài Gòn', lat: 21.0260, lng: 105.8580, rating: 4, note: 'Cơm tấm authentic, sườn dày ngon 😋', createdAt: { toDate: () => new Date(Date.now() - 172800000) } },
  { id: 'demo5', userId: 'demo', userName: 'Nam Review', userAvatar: '', placeName: 'Quán Mắm Kinh Hoàng', lat: 21.0320, lng: 105.8500, rating: 2, note: 'Mùi quá nồng, không phải khẩu vị của mình 😅', createdAt: { toDate: () => new Date(Date.now() - 259200000) } },
  { id: 'demo6', userId: 'demo', userName: 'Bình Foodie', userAvatar: '', placeName: 'Bún Bò Huế Ngọc', lat: 21.0240, lng: 105.8565, rating: 5, note: 'Bún bò đậm vị nhất Hà Nội! Phải thêm huyết nha', createdAt: { toDate: () => new Date(Date.now() - 3600000 * 5) } },
  { id: 'demo7', userId: 'demo', userName: 'Linh CF', userAvatar: '', placeName: 'Trà Sữa Gong Cha', lat: 21.0285, lng: 105.8545, rating: 3, note: 'Ổn nhưng hơi ngọt, nhớ order ít đường', createdAt: { toDate: () => new Date(Date.now() - 3600000 * 12) } },
];

function runDemoMode() {
  console.log('🎭 Running in DEMO MODE - No Firebase configured');
  showToast('🎭 Demo Mode: Cấu hình Firebase để dùng thật!', 'info', 5000);

  // Fake user
  state.currentUser = {
    uid: 'demo-user-123',
    displayName: 'Demo User',
    email: 'demo@fooddrop.app',
    photoURL: null,
  };
  updateUserAvatarUI(state.currentUser);
  DOM.userAvatarFallback.textContent = 'D';

  // Show main app
  DOM.loginScreen.classList.add('hidden');
  DOM.mainApp.classList.remove('hidden');

  // Initialize map
  initMap();
  startGeoTracking();

  // Load demo reviews
  DEMO_REVIEWS.forEach(review => {
    state.reviews.push(review);
    addReviewMarkerToMap(review);
  });
  updateReviewCountBadge();

  // Override submit to use local state only
  DOM.btnSubmitReview.addEventListener('click', async () => {
    const placeName = DOM.inputPlaceName.value.trim();
    const rating    = state.selectedStars;
    const note      = DOM.inputNote.value.trim();
    const lat       = state.selectedLat;
    const lng       = state.selectedLng;

    if (!placeName) { showToast('⚠️ Nhập tên quán đi!', 'error'); return; }
    if (!rating)    { showToast('⭐ Chọn số sao!', 'error'); return; }
    if (!lat || !lng) { showToast('📍 Chọn vị trí!', 'error'); return; }

    const newReview = {
      id: 'demo-' + Date.now(),
      userId: 'demo-user-123',
      userName: 'Demo User',
      userAvatar: '',
      placeName, lat, lng, rating, note,
      createdAt: { toDate: () => new Date() },
    };
    state.reviews.unshift(newReview);
    addReviewMarkerToMap(newReview);
    updateReviewCountBadge();
    showToast(`🎉 Demo: Đã thêm "${placeName}"!`, 'success');
    closeAddReviewModal();
    if (state.map) state.map.flyTo([lat, lng], 16, { animate: true, duration: 1 });
  }, { once: false });

  // Override delete in demo
  window.deleteReview = (id) => {
    state.reviews = state.reviews.filter(r => r.id !== id);
    removeReviewMarkerFromMap(id);
    updateReviewCountBadge();
    closeReviewDetailSheet();
    showToast('🗑️ Demo: Đã xóa!', 'info');
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SECTION 18: APP INITIALIZATION (ENTRY POINT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function initApp() {
  console.log('🚀 FOOD DROP initializing...');

  // 1. Register Service Worker
  registerServiceWorker();

  // 2. Setup all UI event listeners
  setupEventListeners();

  if (IS_DEMO_MODE) {
    // Chạy Demo Mode ngay nếu chưa có Firebase config
    runDemoMode();
    return;
  }

  // 3. Initialize Firebase
  const firebaseOk = initFirebase();
  if (!firebaseOk) {
    showToast('❌ Firebase lỗi. Kiểm tra console!', 'error', 8000);
    return;
  }

  // 4. Listen for auth state changes (sẽ tự điều hướng login/main screen)
  setupAuthListener();

  console.log('✅ FOOD DROP ready!');
}

// ── Start the app when DOM is ready ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
