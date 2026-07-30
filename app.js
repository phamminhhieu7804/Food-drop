// ================================================================
// FOOD DROP — app.js v3.0
// Auth   : Auto-generate username + QR (no Firebase Auth)
// DB     : Firebase Firestore (optional; LocalMode fallback)
// Friends: QR scan / image upload / avatar-marker tap
// ================================================================

'use strict';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §1 · FIREBASE CONFIG
//   ⚠️  Thay YOUR_... bằng giá trị từ Firebase Console
//       Để nguyên → chạy LocalMode (không sync với bạn bè)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDVbVWzkbX_9fLe7GT1X5HDYYnWg9LhD24",
  authDomain: "food-drop-d63a4.firebaseapp.com",
  projectId: "food-drop-d63a4",
  storageBucket: "food-drop-d63a4.firebasestorage.app",
  messagingSenderId: "307361054549",
  appId: "1:307361054549:web:b86fd2c2d493dd1a3439dc",
  measurementId: "G-MV3R6LMW4C"
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §2 · CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const QR_APP_ID        = 'FOODDROP_v3';
const LS_USER_KEY      = 'fd_user_v3';
const LS_FRIENDS_KEY   = 'fd_friends';

const MAP_CENTER_DEFAULT = [21.0285, 105.8542];
const MAP_ZOOM_DEFAULT   = 15;
const PICKER_RADIUS_KM   = 5;
const PICKER_MIN_STARS   = 4;
const USER_ONLINE_MS     = 8 * 60 * 1000; // 8 min = "online"

// Auto-generated name parts
const NAME_P = ['Ngon','Mlem','Chill','Hot','Yummy','Vibe','Xịn','Chất','Cool','Spicy'];
const NAME_S = ['Foodie','Eater','Chef','Boss','King','Star','Hunter','Lover','Gang','Squad'];

// Palette for user avatar colors (deterministic from UID)
const AVATAR_COLORS = [
  '#f97316','#a855f7','#06b6d4','#22c55e',
  '#f43f5e','#8b5cf6','#14b8a6','#f59e0b',
  '#ec4899','#3b82f6',
];

// Star labels
const STAR_LABELS = {
  1: '😫 Tệ quá — Đừng bao giờ quay lại!',
  2: '😕 Ổn ổn — Chỉ khi đói lắm',
  3: '😊 Được mà — Có thể quay lại',
  4: '😋 Ngon! — Recommend cho bạn bè',
  5: '🤩 Tuyệt vời — Must try!!!',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §3 · APP STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const S = {
  user:            null,   // { uid, name, createdAt }
  lat: null, lng:  null,   // GPS
  selLat: null, selLng: null, selStars: 0,
  reviews:         [],
  friends:         [],     // [{ uid, name }]
  friendReqs:      [],     // [{ id, fromUid, fromName, createdAt }]
  onlineUsers:     {},     // { uid: userData }
  revMarkers:      {},     // Leaflet markers for reviews
  userMarkers:     {},     // Leaflet markers for online users
  myLocMarker:     null,
  tempMarker:      null,
  map:             null,
  watchId:         null,
  didInitialFly:   false,
  addingMarker:    false,
  unsubReviews:    null,
  unsubUsers:      null,
  unsubFriendReqs: null,
  // Scanner streams
  loginStream:     null, loginRAF:  null,
  friendStream:    null, friendRAF: null,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §4 · DOM REFERENCES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const $id = id => document.getElementById(id);

const D = {
  // Main app
  mainApp:           $id('main-app'),
  reviewCountBadge:  $id('review-count-badge'),
  userInitial:       $id('user-initial'),
  btnMyProfile:      $id('btn-my-profile'),
  btnInfoHeader:     $id('btn-info-header'),
  friendReqBadge:    $id('friend-req-badge'),
  btnLocate:         $id('btn-locate'),
  btnAddReview:      $id('btn-add-review'),
  btnFoodPicker:     $id('btn-food-picker'),
  gpsDot:            $id('gps-dot'),
  gpsStatus:         $id('gps-status'),

  // My profile sheet
  ovMyProfile:       $id('ov-my-profile'),
  shMyProfile:       $id('sh-my-profile'),
  btnCloseMyProfile: $id('btn-close-my-profile'),
  myProfileQrCanvas: $id('my-profile-qr-canvas'),
  statFriendsCount:  $id('stat-friends-count'),
  statReqCount:      $id('stat-req-count'),
  btnDownloadMyQr:   $id('btn-download-my-qr'),
  btnOpenAddFriend:  $id('btn-open-add-friend'),
  friendReqsSection: $id('friend-reqs-section'),
  friendReqList:     $id('friend-req-list'),
  friendsSection:    $id('friends-section'),
  friendsList:       $id('friends-list'),
  // Add Friend modal
  modalAddFriend:    $id('modal-add-friend'),
  btnCloseAddFriend: $id('btn-close-add-friend'),
  friendQrVideo:     $id('friend-qr-video'),
  friendQrCanvasScan:$id('friend-qr-canvas-scan'),
  afScanDot:         $id('af-scan-dot'),
  afScanStatus:      $id('af-scan-status'),
  btnUploadFriendTrigger: $id('btn-upload-friend-trigger'),
  qrUploadFriend:    $id('qr-upload-friend'),

  // User profile sheet
  ovUserProfile:     $id('ov-user-profile'),
  shUserProfile:     $id('sh-user-profile'),
  userProfileContent:$id('user-profile-content'),

  // Add review modal
  modalAddReview:    $id('modal-add-review'),
  modalAddRevPanel:  $id('modal-add-review-panel'),
  modalCoords:       $id('modal-coords'),
  btnCloseAddReview: $id('btn-close-add-review'),
  inpReviewerName:   $id('inp-reviewer-name'),
  inpPlaceName:      $id('inp-place-name'),
  placeSuggestions:  $id('place-suggestions'),
  inpFoodType:       $id('inp-food-type'),
  inpAddress:        $id('inp-address'),
  starPicker:        $id('star-picker'),
  starLabel:         $id('star-label'),
  inpNote:           $id('inp-note'),
  btnSubmitReview:   $id('btn-submit-review'),
  submitRevText:     $id('submit-rev-text'),
  submitRevSpin:     $id('submit-rev-spin'),

  // Review detail
  ovReviewDetail:    $id('ov-review-detail'),
  shReviewDetail:    $id('sh-review-detail'),
  reviewDetailContent: $id('review-detail-content'),

  // Sub-review modal
  ovAddSubReview:    $id('ov-add-sub-review'),
  shAddSubReview:    $id('sh-add-sub-review'),
  btnCloseSubReview: $id('btn-close-sub-review'),
  chkAnonSubReview:  $id('chk-anon-sub-review'),
  inpSubReviewerName:$id('inp-sub-reviewer-name'),
  inpSubReviewNote:  $id('inp-sub-review-note'),
  
  // Edit review modal
  ovEditReview:      $id('ov-edit-review'),
  shEditReview:      $id('sh-edit-review'),
  btnCloseEditReview:$id('btn-close-edit-review'),
  inpEditReviewNote: $id('inp-edit-review-note'),
  starPickerEdit:    $id('star-picker-edit'),
  starLabelEdit:     $id('star-label-edit'),
  btnSubmitEditReview:$id('btn-submit-edit-review'),
  editCountLabel:    $id('edit-count-label'),
  btnSubmitSubReview:$id('btn-submit-sub-review'),

  // Info modal
  ovInfoModal:       $id('ov-info-modal'),
  shInfoModal:       $id('sh-info-modal'),
  btnCloseInfoModal: $id('btn-close-info-modal'),

  // Spin
  spinOverlay:       $id('spin-overlay'),
  btnCloseSpin:      $id('btn-close-spin'),
  spinWheel:         $id('spin-wheel'),
  spinIcon:          $id('spin-icon'),
  spinLoadingTxt:    $id('spin-loading-txt'),
  spinCountWrap:     $id('spin-count-wrap'),
  spinCount:         $id('spin-count'),
  spinWinner:        $id('spin-winner'),
  spinWinnerEmoji:   $id('spin-winner-emoji'),
  spinWinnerName:    $id('spin-winner-name'),
  spinWinnerStars:   $id('spin-winner-stars'),
  spinWinnerNote:    $id('spin-winner-note'),
  btnGotoWinner:     $id('btn-goto-winner'),
  btnSpinGo:         $id('btn-spin-go'),
  spinEmpty:         $id('spin-empty'),

  toastWrap:         $id('toast-wrap'),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §5 · FIREBASE INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let db = null;
const IS_FB = FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';

function initFirebase() {
  if (!IS_FB) { console.log('ℹ️  LocalMode — Firebase not configured'); return; }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    console.log('✅ Firestore ready');
  } catch (e) { console.error('Firebase init error:', e); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §6 · SERVICE WORKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const r = await navigator.serviceWorker.register('./sw.js');
    console.log('✅ SW:', r.scope);
    r.addEventListener('updatefound', () => {
      r.installing?.addEventListener('statechange', () => {
        if (r.installing?.state === 'installed' && navigator.serviceWorker.controller)
          toast('🔄 Có bản cập nhật! Tải lại trang.', 'info', 5000);
      });
    });
  } catch (e) { console.warn('SW:', e); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §7 · ANONYMOUS USER — Không cần đăng nhập
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §8 · GRADIENT QR GENERATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Build QR URL payload */
function qrPayload(user) {
  return `${window.location.origin}/?add_friend=${user.uid}`;
}

/**
 * Render a beautiful gradient-colored QR onto targetCanvas.
 * Technique: generate standard B&W QR → make white transparent → apply gradient → compose.
 * gradStops = [[pos, color], ...]
 */
async function renderGradientQR(targetCanvas, data, gradStops) {
  if (typeof QRCode === 'undefined') {
    throw new Error('Thư viện QRCode chưa được tải (có thể do lỗi mạng hoặc CDN bị chặn).');
  }

  const SZ = 250;

  // 1. Raw QR (black dots, white bg)
  const rawC = document.createElement('canvas');
  await QRCode.toCanvas(rawC, data, {
    errorCorrectionLevel: 'H',
    color: { dark: '#0f172a', light: '#ffffff' },
    width: SZ, margin: 2,
  });

  // 2. Make white pixels transparent → dot mask
  const dotC = document.createElement('canvas');
  dotC.width = SZ; dotC.height = SZ;
  const dc = dotC.getContext('2d');
  dc.drawImage(rawC, 0, 0);
  const id = dc.getImageData(0, 0, SZ, SZ);
  for (let i = 0; i < id.data.length; i += 4) {
    if (id.data[i] > 128 && id.data[i+1] > 128 && id.data[i+2] > 128) id.data[i+3] = 0;
  }
  dc.putImageData(id, 0, 0); // dotC: opaque only where dots are

  // 3. Gradient fill, masked to dots only
  const gradC = document.createElement('canvas');
  gradC.width = SZ; gradC.height = SZ;
  const gc = gradC.getContext('2d');
  const grad = gc.createLinearGradient(0, 0, SZ, SZ);
  gradStops.forEach(([p, c]) => grad.addColorStop(p, c));
  gc.fillStyle = grad; gc.fillRect(0, 0, SZ, SZ);
  gc.globalCompositeOperation = 'destination-in';
  gc.drawImage(dotC, 0, 0);
  // gradC: gradient-colored dots, transparent bg

  // 4. Compose: white bg + gradient dots
  targetCanvas.width = SZ; targetCanvas.height = SZ;
  const ctx = targetCanvas.getContext('2d');
  ctx.clearRect(0, 0, SZ, SZ);

  ctx.fillStyle = '#f8fafc';
  _rrect(ctx, 0, 0, SZ, SZ, 18); ctx.fill();

  ctx.drawImage(gradC, 0, 0);

  // 5. Center logo
  const cx = SZ/2, cy = SZ/2, r = SZ * 0.095;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath(); ctx.arc(cx, cy, r*1.45, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = gradStops[0][1]; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, r*1.45, 0, Math.PI*2); ctx.stroke();
  ctx.font = `${Math.round(r*2.1)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🍜', cx, cy);
}

function _rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// Login QR gradient: orange → fuchsia → indigo
const LOGIN_GRAD = [[0,'#ea580c'],[0.4,'#c026d3'],[1,'#2563eb']];
// Friend QR gradient: emerald → cyan → violet
const FRIEND_GRAD = [[0,'#059669'],[0.4,'#0891b2'],[1,'#7c3aed']];

async function genAndShowLoginQR(user) {
  D.qrGenLoading.classList.remove('hidden');
  D.qrLoginCanvas.classList.add('hidden');
  try {
    await renderGradientQR(D.qrLoginCanvas, qrPayload(user), LOGIN_GRAD);
    D.qrGenLoading.classList.add('hidden');
    D.qrLoginCanvas.classList.remove('hidden');
    D.qrLoginCanvas.style.animation = 'lsFadeIn .4s ease-out';
  } catch (e) {
    console.error('QR gen error:', e);
    toast('❌ Lỗi tạo QR', 'err');
  }
}

/** Download branded QR card */
async function downloadQRCard(srcCanvas, userName, suffix = '') {
  const PAD=28, FOOT=68;
  const W = srcCanvas.width + PAD*2;
  const H = srcCanvas.height + PAD*2 + FOOT;
  const dl = document.createElement('canvas');
  dl.width = W; dl.height = H;
  const ctx = dl.getContext('2d');

  // BG
  const bg = ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#0f172a'); bg.addColorStop(1,'#1e293b');
  ctx.fillStyle = bg;
  _rrect(ctx,0,0,W,H,26); ctx.fill();

  // Glow border
  ctx.save();
  ctx.shadowColor='rgba(249,115,22,.7)'; ctx.shadowBlur=28;
  ctx.strokeStyle='#f97316'; ctx.lineWidth=2.5;
  _rrect(ctx,4,4,W-8,H-8,23); ctx.stroke();
  ctx.restore();

  // White QR card
  ctx.fillStyle='#f8fafc';
  _rrect(ctx,PAD-8,PAD-8,srcCanvas.width+16,srcCanvas.height+16,14); ctx.fill();
  ctx.drawImage(srcCanvas, PAD, PAD);

  // App name
  ctx.fillStyle='#f97316'; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.font=`900 ${Math.round(W*.055)}px "Be Vietnam Pro",sans-serif`;
  ctx.fillText('🍜 FOOD DROP', W/2, H-FOOT*.52);
  ctx.fillStyle='#94a3b8';
  ctx.font=`500 ${Math.round(W*.038)}px "Be Vietnam Pro",sans-serif`;
  ctx.fillText('@'+userName + (suffix?` · ${suffix}`:''), W/2, H-FOOT*.16);

  const a = document.createElement('a');
  a.download = `fooddrop-qr-${userName}${suffix?'-'+suffix:''}.png`;
  a.href = dl.toDataURL('image/png');
  a.click();
  toast('💾 Đã lưu ảnh QR!', 'ok');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §9 · QR PARSING — from uploaded image
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function parseQRFromFile(file) {
  if (typeof Html5Qrcode === 'undefined') {
    throw new Error('Thư viện QR chưa được tải');
  }
  const html5QrCode = new Html5Qrcode("friend-qr-reader"); // Use any existing div or create a hidden one
  try {
    const decodedText = await html5QrCode.scanFile(file, true);
    return decodedText;
  } catch (err) {
    throw new Error('No QR');
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §10 · CAMERA QR SCANNER (Html5Qrcode)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _html5QrCode = null;

async function startFriendScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    toast('Thư viện QR chưa được tải!', 'err');
    return;
  }
  
  if (_html5QrCode) { stopFriendScanner(); }
  
  _html5QrCode = new Html5Qrcode("friend-qr-reader");
  const config = { fps: 10, qrbox: { width: 220, height: 220 } };
  
  try {
    const $status = $id('af-scan-status');
    if ($status) $status.textContent = '📷 Đặt mã QR vào khung...';
    
    await _html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        // Success
        stopFriendScanner();
        handleFriendQR(decodedText);
      },
      (errorMessage) => {
        // parse error, ignore
      }
    );
  } catch (err) {
    console.error(err);
    toast('📵 Không thể mở camera. Kiểm tra quyền truy cập!', 'err');
    const $status = $id('af-scan-status');
    if ($status) $status.textContent = '📵 Lỗi mở camera';
  }
}

function stopFriendScanner() {
  if (_html5QrCode && _html5QrCode.isScanning) {
    _html5QrCode.stop().then(() => {
      _html5QrCode.clear();
      _html5QrCode = null;
    }).catch(console.error);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §11 · SCREEN MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


function showMainApp() {
  // #main-app is always visible via CSS; no display toggling needed

  const initial = (S.user?.name || '?').charAt(0).toUpperCase();
  if (D.userInitial) D.userInitial.textContent = initial;

  // Update profile sheet user info
  const nameEl = document.getElementById('user-name-sheet');
  const userEl = document.getElementById('user-username-sheet');
  const initEl = document.getElementById('user-initial-sheet');
  if (nameEl) nameEl.textContent = S.user?.name || 'Ẩn danh';
  if (userEl) userEl.textContent = S.user?.username || '@user';
  if (initEl) initEl.textContent = initial;

  if (!S.map) {
    initMap();
    setInterval(() => {
      document.querySelectorAll('.rev-name-label').forEach(el => {
        const namesAttr = el.getAttribute('data-names');
        if (!namesAttr) return;
        const names = namesAttr.split('|');
        if (names.length > 1) {
          el.style.opacity = '0';
          setTimeout(() => {
            let idx = (parseInt(el.getAttribute('data-idx') || '0') + 1) % names.length;
            el.setAttribute('data-idx', idx);
            el.textContent = '@' + names[idx];
            el.style.opacity = '0.9';
          }, 300);
        }
      });
    }, 5000);
    startGPS();
  }
  
  fetchReviewsInBounds();
  subscribeToOnlineUsers();
  renderMyProfileQR();

  if (!IS_FB) {
    setTimeout(() => toast('🎭 LocalMode — Thêm Firebase để sync bạn bè!', 'info', 4000), 600);
    loadLocalReviews();
  }
}

// Bottom sheet helpers
function openBS(ov, sh) { ov.classList.add('open'); ov.setAttribute('aria-hidden','false'); sh.classList.add('open'); }
function closeBS(ov, sh) { ov.classList.remove('open'); ov.setAttribute('aria-hidden','true'); sh.classList.remove('open'); }

function openMyProfile()  { openBS(D.ovMyProfile, D.shMyProfile); }
function closeMyProfile() { closeBS(D.ovMyProfile, D.shMyProfile); }
function openUserProfile() { openBS(D.ovUserProfile, D.shUserProfile); }
function closeUserProfile(){ closeBS(D.ovUserProfile, D.shUserProfile); }

function openAddFriendModal() {
  closeMyProfile();
  D.modalAddFriend.classList.add('open');
  setTimeout(startFriendScanner, 300);
}
function closeAddFriendModal() {
  stopFriendScanner();
  D.modalAddFriend.classList.remove('open');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §12 · LEAFLET MAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function initMap() {
  // Ensure #map has an explicit pixel height before Leaflet init
  const mapEl = document.getElementById('map');
  mapEl.style.width  = '100%';
  mapEl.style.height = window.innerHeight + 'px';
  window.addEventListener('resize', () => {
    mapEl.style.height = window.innerHeight + 'px';
    S.map?.invalidateSize(true);
  });

  const center = S.lat ? [S.lat, S.lng] : MAP_CENTER_DEFAULT;
  S.map = L.map('map', {
    center, zoom: MAP_ZOOM_DEFAULT, zoomControl: false,
    attributionControl: false, tapTolerance: 15,
    preferCanvas: true, renderer: L.canvas(),
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19, crossOrigin: true,
  }).addTo(S.map);

  // Long-press / tap to add review
  let pt = null;
  S.map.on('mousedown touchstart', e => {
    const latlng = e.latlng || S.map.containerPointToLatLng(L.point(e.touches?.[0]?.clientX, e.touches?.[0]?.clientY));
    if (!latlng) return;
    pt = setTimeout(() => openAddReview(latlng.lat, latlng.lng), 600);
  });
  S.map.on('mouseup mousemove touchend touchmove', () => { if (pt) { clearTimeout(pt); pt = null; } });
  S.map.on('click', e => {
    if (S.addingMarker) { openAddReview(e.latlng.lat, e.latlng.lng); S.addingMarker = false; D.btnAddReview.style.background = ''; }
  });
  
  S.map.on('moveend', () => {
    fetchReviewsInBounds();
  });
  
  window.addEventListener('resize', () => S.map.invalidateSize());
  // Force map to recalculate dimensions at multiple intervals
  [100, 300, 600, 1500].forEach(ms => setTimeout(() => S.map?.invalidateSize(true), ms));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §13 · GEOLOCATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function startGPS() {
  if (!navigator.geolocation) { setGPS('err', 'Không hỗ trợ GPS'); return; }
  if (S.gpsIntervalId) { navigator.geolocation.clearWatch(S.gpsIntervalId); S.gpsIntervalId = null; }
  setGPS('searching', 'Đang lấy GPS...');
  
  S.gpsIntervalId = navigator.geolocation.watchPosition(
    ({ coords: { latitude: lat, longitude: lng, accuracy: acc } }) => {
      S.lat = lat; S.lng = lng;
      setGPS('ok', `GPS ± ${Math.round(acc)}m`);
      updateMyLocMarker(lat, lng);
      if (!S.didInitialFly && S.map) {
        S.map.flyTo([lat, lng], MAP_ZOOM_DEFAULT, { animate: true, duration: 1.5 });
        S.didInitialFly = true;
      }
      scheduleGeoUpdate(lat, lng);
    },
    err => {
      const m = {1:'Từ chối quyền GPS 😢', 2:'Mất tín hiệu GPS', 3:'Hết giờ GPS'};
      setGPS('err', m[err.code] || 'Lỗi GPS');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function setGPS(type, text) {
  D.gpsStatus.textContent = text;
  const c = { ok:'#22c55e', searching:'#eab308', err:'#ef4444' };
  D.gpsDot.style.background = c[type] || '#eab308';
  D.gpsDot.classList.toggle('animate-pulse', type === 'searching');
}

let _geoTimer = null;
function scheduleGeoUpdate(lat, lng) {
  clearTimeout(_geoTimer);
  _geoTimer = setTimeout(() => {
    if (!db || !S.user) return;
    db.collection('users').doc(S.user.uid).update({
      currentLat: lat, currentLng: lng,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  }, 1000);
}

function updateMyLocMarker(lat, lng) {
  if (!S.map) return;
  const icon = L.divIcon({
    html:'<div class="my-location-dot"><div class="my-location-pulse"></div></div>',
    className:'', iconSize:[16,16], iconAnchor:[8,8], interactive:false,
  });
  if (S.myLocMarker) S.myLocMarker.setLatLng([lat, lng]);
  else S.myLocMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000, interactive: false }).addTo(S.map);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §14 · ONLINE USER MARKERS (avatar circles on map)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getUserColor(uid) {
  let h = 0; for (const c of uid) h = ((h<<5)-h)+c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function renderUserMarker(user) {
  if (!S.map || !user.currentLat || !user.currentLng) return;
  if (user.uid === S.user?.uid) return; // skip self

  // Check online (updated recently)
  const upd = user.updatedAt?.toDate?.()?.getTime?.() || 0;
  if (Date.now() - upd > USER_ONLINE_MS) { removeUserMarker(user.uid); return; }

  const color = getUserColor(user.uid);
  const userIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:24px;height:24px;color:#fff;"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>`;
  const html = `<div class="user-avatar-marker" style="background:${color};border-color:${color}60;">
    <div class="user-avatar-ring" style="color:${color};border-color:${color};"></div>
    ${userIcon}
  </div>`;

  const icon = L.divIcon({ html, className:'', iconSize:[46,46], iconAnchor:[23,23] });

  if (S.userMarkers[user.uid]) {
    S.userMarkers[user.uid].setLatLng([user.currentLat, user.currentLng]);
  } else {
    const marker = L.marker([user.currentLat, user.currentLng], { icon, zIndexOffset: 500 }).addTo(S.map);
    marker.on('click', () => openUserProfileSheet(user));
    S.userMarkers[user.uid] = marker;
    // cache user data for sheet
    S.onlineUsers[user.uid] = user;
  }
  S.onlineUsers[user.uid] = user;
}

function removeUserMarker(uid) {
  if (S.userMarkers[uid]) { S.map?.removeLayer(S.userMarkers[uid]); delete S.userMarkers[uid]; }
  delete S.onlineUsers[uid];
}

function subscribeToOnlineUsers() {
  if (!db) return;
  S.unsubUsers = db.collection('users').onSnapshot(snap => {
    snap.docChanges().forEach(ch => {
      const u = { ...ch.doc.data() };
      if (ch.type === 'removed') removeUserMarker(u.uid);
      else renderUserMarker(u);
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §15 · REVIEW MAP MARKERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STAR_CLASS = ['','star-1','star-2','star-3','star-4','star-5'];

function createRevIcon(rev) {
  const name = rev.placeName.length > 20 ? rev.placeName.slice(0,18)+'…' : rev.placeName;
  const initial = (rev.userName || '?').charAt(0).toUpperCase();
  
  const subReviews = rev.subReviews || [];
  const reviewCount = 1 + subReviews.length;
  let totalRating = rev.rating;
  subReviews.forEach(sr => totalRating += (sr.rating || rev.rating));
  const avgRating = Math.round(totalRating / reviewCount);

  let advice = '';
  let color = '';
  if (avgRating === 5) { advice = 'NÊN CHỌN'; color = '#22c55e'; }
  else if (avgRating === 4) { advice = 'ĐÁNG THỬ'; color = '#eab308'; }
  else if (avgRating === 3) { advice = 'CÂN NHẮC'; color = '#f59e0b'; }
  else if (avgRating === 2) { advice = 'CÂN NHẮC'; color = '#ef4444'; }
  else { advice = 'KHÔNG NÊN CHỌN'; color = '#9f1239'; }

  const reviewers = [rev.userName || 'Khách', ...subReviews.map(sr => sr.userName || 'Khách')];
  const reviewersEscaped = reviewers.map(n => esc(n)).join('|');

  return L.divIcon({
    html: `
      <div style="position:relative; width:0; height:0; z-index:${rev.rating*100};">
        <div style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; width:max-content; filter:drop-shadow(0 6px 12px rgba(0,0,0,0.5)); pointer-events:none;">
          
          <div style="display:flex; flex-direction:column; align-items:center; pointer-events:auto; transition:transform 0.2s;" onmouseenter="this.style.transform='scale(1.08)'" onmouseleave="this.style.transform='scale(1)'">
            <div class="rev-name-label" data-names="${esc(reviewersEscaped)}" data-idx="0" style="font-size:10px; font-weight:800; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.9); margin-bottom:3px; opacity:0.9; transition: opacity 0.3s;">
              @${esc(reviewers[0])}
            </div>
            <div style="background:rgba(15,23,42,0.95); border:1px solid ${color}; padding:6px 10px; border-radius:14px; margin-bottom:8px; display:flex; flex-direction:column; align-items:center;">
              <div style="font-weight:900; font-size:14px; color:#fff;">${esc(name)}</div>
              ${rev.foodType ? `<div style="font-size:10px; color:rgba(255,255,255,0.7); margin-top:1px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${esc(rev.foodType)}</div>` : ''}
              <div style="display:flex; gap:6px; align-items:center; margin-top:4px;">
                <span style="color:${color}; font-weight:900; font-size:12px;">★ ${avgRating}</span>
                <span style="background:${color}; color:#fff; padding:3px 6px; border-radius:6px; font-size:9px; font-weight:900; letter-spacing:0.5px;">${advice}</span>
                ${reviewCount > 1 ? `<span style="background:rgba(255,255,255,0.2); color:#fff; padding:3px 6px; border-radius:6px; font-size:9px; font-weight:900;">👤 ${reviewCount}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="width:38px; height:38px; background:${color}; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center; border:2px solid #fff; pointer-events:auto; box-shadow:inset 0 2px 6px rgba(0,0,0,0.3);">
            <div style="transform:rotate(45deg); width:28px; height:28px; background:#1e293b; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; color:#fff; font-size:14px; overflow:hidden;">
              ${rev.userAvatar ? `<img src="${esc(rev.userAvatar)}" style="width:100%;height:100%;object-fit:cover;">` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;color:#94a3b8;"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>`}
            </div>
          </div>

        </div>
      </div>
    `,
    className: '', 
    iconSize: [0,0], 
    iconAnchor: [0,0]
  });
}

function putRevMarker(rev) {
  if (!S.map) return;
  if (S.revMarkers[rev.id]) S.map.removeLayer(S.revMarkers[rev.id]);
  const m = L.marker([rev.lat, rev.lng], { icon: createRevIcon(rev), riseOnHover: true }).addTo(S.map);
  m.on('click', () => openRevDetailSheet(rev));
  S.revMarkers[rev.id] = m;
}
function delRevMarker(id) { if (S.revMarkers[id]) { S.map?.removeLayer(S.revMarkers[id]); delete S.revMarkers[id]; } }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §16 · FIRESTORE REVIEWS (BOUNDING BOX & FILTER)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _reviewFetchTimeout = null;

function fetchReviewsInBounds() {
  if (!db || !S.map) return;
  
  if (_reviewFetchTimeout) clearTimeout(_reviewFetchTimeout);
  
  _reviewFetchTimeout = setTimeout(() => {
    const bounds = S.map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    if (S.unsubReviews) {
      S.unsubReviews();
      S.unsubReviews = null;
    }
    
    const q = db.collection('reviews')
      .where('lat', '>=', sw.lat)
      .where('lat', '<=', ne.lat);
      
    S.unsubReviews = q.onSnapshot(snap => {
      // 1. Convert snapshot to array
      const fetchedDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 2. Client-side filter: Longitude bounding only — mọi người đều thấy tất cả reviews
      const validReviews = fetchedDocs.filter(rev => {
        // Filter out of bounds longitude
        if (rev.lng < sw.lng || rev.lng > ne.lng) return false;
        return true;
      });
      
      // 3. Diff with current S.reviews to add/update/remove markers
      const newIds = new Set(validReviews.map(r => r.id));
      
      // Remove markers not in validReviews
      S.reviews = S.reviews.filter(existingRev => {
        if (!newIds.has(existingRev.id)) {
          delRevMarker(existingRev.id);
          return false;
        }
        return true;
      });
      
      // Add or update markers
      validReviews.forEach(newRev => {
        const existingIdx = S.reviews.findIndex(r => r.id === newRev.id);
        if (existingIdx > -1) {
          // Update
          S.reviews[existingIdx] = newRev;
          putRevMarker(newRev); // putRevMarker removes old and adds new
        } else {
          // Add
          S.reviews.push(newRev);
          putRevMarker(newRev);
        }
      });
      
      updateRevBadge();
    }, err => {
      console.error(err);
      // toast('⚠️ Lỗi tải bản đồ', 'err');
    });
    
  }, 300); // 300ms debounce
}


async function submitReview() {
  const customName = D.inpReviewerName ? D.inpReviewerName.value.trim() : '';
  const placeName = D.inpPlaceName.value.trim();
  const foodType  = D.inpFoodType ? D.inpFoodType.value.trim() : '';
  const address   = D.inpAddress ? D.inpAddress.value.trim() : '';
  const rating    = S.selStars;
  const note      = D.inpNote.value.trim();
  const lat       = S.selLat, lng = S.selLng;
  const userName  = customName || S.user?.name || 'Ẩn danh';

  if (!placeName)    { toast('⚠️ Nhập tên quán đi bạn!', 'err'); shake(D.inpPlaceName); D.inpPlaceName.focus(); return; }
  if (!rating)       { toast('⭐ Chọn số sao!', 'err'); shake(D.starPicker); return; }
  if (!lat || !lng)  { toast('📍 Chọn vị trí trên bản đồ!', 'err'); return; }

  setRevSubmitLoading(true);
  try {
    const rev = { userId:S.user.uid, userName, placeName, foodType, address, lat, lng, rating, note, editCount: 0,
      createdAt: db ? firebase.firestore.FieldValue.serverTimestamp() : { toDate:()=>new Date() },
    };
    if (db) {
      await db.collection('reviews').add(rev);
    } else {
      const lr = { id:'loc-'+Date.now(), ...rev, createdAt:{toDate:()=>new Date()} };
      S.reviews.unshift(lr); putRevMarker(lr); updateRevBadge();
      saveLocalReviews();
    }
    toast(`🎉 Đã ghim "${placeName}"!`, 'ok');
    closeAddReview();
    S.map?.flyTo([lat,lng], Math.max(S.map.getZoom(),16), { animate:true, duration:1 });
  } catch (e) {
    toast('❌ Lưu thất bại: '+(e.message||'Thử lại!'), 'err');
  } finally { setRevSubmitLoading(false); }
}

async function deleteReview(id) {
  const rev = S.reviews.find(r=>r.id===id);
  if (!rev) return;
  if (rev.userId !== S.user?.uid) { toast('🚫 Chỉ xóa review của mình!', 'err'); return; }
  try {
    if (db) await db.collection('reviews').doc(id).delete();
    else { S.reviews = S.reviews.filter(r=>r.id!==id); delRevMarker(id); updateRevBadge(); saveLocalReviews(); }
    closeRevDetailSheet(); toast('🗑️ Đã xóa', 'info');
  } catch { toast('❌ Xóa thất bại', 'err'); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §17 · FRIEND CONNECTION LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Handle QR data that was scanned/uploaded as a friend QR */
function handleFriendQR(rawText) {
  closeAddFriendModal();
  try {
    const url = new URL(rawText);
    const uid = url.searchParams.get('add_friend');
    if (uid) {
      processAddFriend(uid);
    } else {
      throw new Error('Not a friend URL');
    }
  } catch {
    toast('❌ Mã QR không hợp lệ!', 'err');
  }
}


async function processAddFriend(targetUid) {
  if (!db || !S.user) return;
  if (targetUid === S.user.uid) { toast('❌ Không thể tự kết bạn với chính mình!', 'err'); return; }
  
  if (S.friends.includes(targetUid)) { toast('✅ Hai bạn đã là bạn bè!', 'info'); return; }

  try {
    toast('⏳ Đang xử lý kết bạn...', 'info');
    
    // Add targetUid to my friends
    await db.collection('users').doc(S.user.uid).update({
      friends: firebase.firestore.FieldValue.arrayUnion(targetUid)
    });

    // Add myUid to target's friends (Requires Security Rules to allow)
    await db.collection('users').doc(targetUid).update({
      friends: firebase.firestore.FieldValue.arrayUnion(S.user.uid)
    });
    
    toast('🎉 Kết bạn thành công!', 'ok');
    
    // Clean up URL if needed
    const url = new URL(window.location);
    url.searchParams.delete('add_friend');
    window.history.replaceState({}, document.title, url.pathname + url.search);
    
    // Force reload map logic (will be handled by the bounds logic in Phase 4)
    if (S.map) S.map.fire('moveend');

  } catch (e) {
    console.error(e);
    toast('❌ Lỗi kết bạn! Kiểm tra quyền truy cập.', 'err');
  }
}

function updateFriendBadge() {
  const count = S.friendReqs.length;
  D.friendReqBadge.textContent = count;
  D.friendReqBadge.classList.toggle('hidden', count === 0);
  D.friendReqBadge.classList.toggle('flex', count > 0);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §18 · UI — ADD REVIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openAddReview(lat, lng) {
  S.selLat = lat; S.selLng = lng; S.selStars = 0;
  D.inpPlaceName.value = ''; 
  if (D.inpFoodType) D.inpFoodType.value = ''; 
  if (D.inpAddress) D.inpAddress.value = ''; 
  D.inpNote.value = '';
  D.modalCoords.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  resetStars();

  if (S.tempMarker) S.tempMarker.remove();
  S.tempMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'bg-transparent',
      html: `<div style="width:24px;height:24px;background:#ef4444;border:4px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(239,68,68,0.3), 0 8px 16px rgba(0,0,0,0.4);animation:rippleA 1s infinite alternate;"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }).addTo(S.map);
  S.map.panTo([lat, lng], { animate: true, duration: 0.4 });

  D.modalAddReview.classList.add('open');
  D.modalAddRevPanel.classList.add('open');
  setTimeout(() => D.inpPlaceName.focus(), 420);
}
function closeAddReview() {
  D.modalAddReview.classList.remove('open');
  D.modalAddRevPanel.classList.remove('open');
  if (S.tempMarker) { S.tempMarker.remove(); S.tempMarker = null; }
}
function resetStars() {
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
  D.starLabel.textContent = 'Chưa chọn sao'; D.starLabel.style.color = '#64748b';
}
function pickStar(n) {
  S.selStars = n;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.star) <= n));
  D.starLabel.textContent = STAR_LABELS[n] || '';
  const c = {1:'#ef4444',2:'#ef4444',3:'#f59e0b',4:'#eab308',5:'#22c55e'};
  D.starLabel.style.color = c[n];
}
function setRevSubmitLoading(on) {
  D.btnSubmitReview.disabled = on;
  D.submitRevText.classList.toggle('hidden',on);
  D.submitRevSpin.classList.toggle('hidden',!on);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §19 · UI — REVIEW DETAIL SHEET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openRevDetailSheet(rev) {
  const isOwn = S.user?.uid === rev.userId;
  const date  = rev.createdAt?.toDate ? fmtDate(rev.createdAt.toDate()) : 'Vừa xong';
  
  const subReviews = rev.subReviews || [];
  const reviewCount = 1 + subReviews.length;
  let totalRating = rev.rating;
  subReviews.forEach(sr => totalRating += (sr.rating || rev.rating));
  const avgRating = Math.round(totalRating / reviewCount);
  
  const sc    = {5:'#22c55e',4:'#eab308',3:'#f59e0b',2:'#ef4444',1:'#ef4444'}[avgRating]||'#eab308';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${rev.lat},${rev.lng}`;

  let subHTML = '';
  if (subReviews.length > 0) {
    subHTML = `<div class="mt-4 pt-4 border-t border-slate-700/50">
      <div class="flex justify-between items-center mb-3">
        <h4 class="text-sm font-bold text-slate-300">Đánh giá khác (${subReviews.length})</h4>
      </div>
      <div class="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
        ${subReviews.map(sr => {
          const srDate = sr.createdAt?.toDate ? fmtDate(sr.createdAt.toDate()) : 'Vừa xong';
          const isOwnSr = (S.user && sr.userId === S.user.uid);
          const srEditBtn = (isOwnSr && (sr.editCount || 0) < 3) ? 
            `<button onclick="openEditModal(true, '${rev.id}', '${sr.id}', ${sr.rating||rev.rating}, \`${esc(sr.note).replace(/`/g,'\\\\`')}\`, ${sr.editCount||0})" class="text-[10px] bg-slate-700/80 hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded transition-colors ml-auto flex items-center gap-1">✏️ Sửa</button>` : '';
          
          return `<div class="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 relative">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-slate-600">
                ${(sr.userName||'?').charAt(0).toUpperCase()}
              </div>
              <span class="text-xs font-semibold text-slate-300">${esc(sr.userName)}</span>
              <span class="text-[10px] font-bold ml-2" style="color:${sc}">★ ${sr.rating || rev.rating}</span>
              <span class="text-[10px] text-slate-500 ml-auto">${srDate}</span>
            </div>
            <p class="text-sm text-slate-200">${esc(sr.note)}</p>
            ${srEditBtn ? `<div class="mt-2 flex justify-end">${srEditBtn}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  D.reviewDetailContent.innerHTML = `
    <div class="absolute top-0 right-5 text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-1 rounded-b-lg border-b border-l border-r border-slate-700/50 shadow-md">
      Người đánh giá đầu tiên: <span class="text-white">@${esc(rev.userName || 'Foodie')}</span>
    </div>
    <div class="flex gap-3 mb-5 mt-2">
      <div class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0" style="background:${sc}18;border:1.5px solid ${sc}44;">
        <span class="text-2xl font-black" style="color:${sc};">${avgRating}</span>
        <span class="text-[10px] font-bold" style="color:${sc};">SAO</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="text-xl font-black text-white leading-tight">${esc(rev.placeName)}</h3>
          ${reviewCount > 1 ? `<span class="bg-slate-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">👤 ${reviewCount}</span>` : ''}
        </div>
        ${rev.foodType ? `<p class="text-xs text-slate-300 mt-1 font-semibold uppercase tracking-wider">🏷️ ${esc(rev.foodType)}</p>` : ''}
        <p class="text-sm mt-0.5" style="color:${sc};">${STAR_LABELS[avgRating]||''}</p>
      </div>
    </div>
    <div class="text-2xl mb-4 tracking-widest" style="color:${sc};">
      ${'★'.repeat(avgRating)}<span class="text-slate-700">${'★'.repeat(5-avgRating)}</span>
    </div>
    ${rev.address?`<div class="flex items-start gap-2 mb-4 text-slate-300 text-sm">
      <span class="text-slate-500 mt-0.5">📍</span><span>${esc(rev.address)}</span>
    </div>`:''}
    ${rev.note?`<div class="rounded-2xl p-4 mb-4 relative" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
      <p class="text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">📝 Ghi chú</p>
      <p class="text-slate-200 text-sm leading-relaxed">${esc(rev.note)}</p>
      ${(S.user && rev.userId === S.user.uid && (rev.editCount || 0) < 3) ? 
        `<div class="mt-3 flex justify-end"><button onclick="openEditModal(false, '${rev.id}', null, ${rev.rating}, \`${esc(rev.note).replace(/`/g,'\\\\`')}\`, ${rev.editCount||0})" class="text-[10px] bg-slate-700/80 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors flex items-center gap-1">✏️ Sửa</button></div>` : ''}
    </div>`:''}
    <div class="flex items-center gap-3 mb-1 rounded-2xl p-3" style="background:rgba(255,255,255,.04);">
      <div class="avatar-circle" style="background:linear-gradient(135deg,#f97316,#fb923c);">${(rev.userName||'?').charAt(0).toUpperCase()}</div>
      <div><p class="text-sm font-semibold text-white">@${esc(rev.userName||'Foodie')}</p><p class="text-xs text-slate-400">${date}</p></div>
    </div>
    ${subHTML}
    <button onclick="openSubReviewModal('${rev.id}')" class="w-full mt-3 mb-4 py-3.5 rounded-2xl font-bold text-sm text-orange-400 border border-orange-500/30 bg-orange-500/10 flex items-center justify-center gap-2">✍️ Thêm đánh giá</button>
    <div class="flex gap-2 mt-1">
      <a href="${mapsUrl}" target="_blank" rel="noopener"
        class="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white text-center flex items-center justify-center gap-1.5"
        style="background:linear-gradient(135deg,#3b82f6,#6366f1);">🧭 Chỉ đường</a>
      <button onclick="locateRevOnMap('${rev.id}')"
        class="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-1.5 bg-slate-600">📍 Xem bản đồ</button>
      ${isOwn?`<button onclick="deleteReview('${rev.id}')"
        class="w-14 py-3.5 rounded-2xl text-sm text-red-400 flex items-center justify-center bg-red-500/10 border border-red-500/20">🗑️</button>`:''}
    </div>`;

  openBS(D.ovReviewDetail, D.shReviewDetail);
}
function closeRevDetailSheet() { closeBS(D.ovReviewDetail, D.shReviewDetail); }

window.locateRevOnMap = function(id) {
  const r = S.reviews.find(x=>x.id===id);
  if (!r||!S.map) return;
  closeRevDetailSheet();
  S.map.flyTo([r.lat,r.lng], 17, { animate:true, duration:1.2 });
};
window.deleteReview = deleteReview;

// Sub-review functions
let currentTargetRevId = null;
let currentSubStars = 0;

function updateSubStarUI() {
  document.querySelectorAll('.star-btn-sub').forEach(b => {
    const s = parseInt(b.dataset.star);
    b.style.transform = s <= currentSubStars ? 'scale(1.15)' : 'scale(1)';
    b.style.filter = s <= currentSubStars ? 'drop-shadow(0 0 8px rgba(250,204,21,0.6))' : 'grayscale(1) opacity(0.3)';
  });
  const label = document.getElementById('star-label-sub');
  if (label) {
    label.textContent = STAR_LABELS[currentSubStars] || 'Chưa chọn sao';
    label.style.color = currentSubStars ? '#eab308' : '#64748b';
  }
}

document.querySelectorAll('.star-btn-sub').forEach(btn => {
  btn.addEventListener('click', (e) => {
    currentSubStars = parseInt(e.currentTarget.dataset.star);
    updateSubStarUI();
  });
});

window.openSubReviewModal = function(id) {
  currentTargetRevId = id;
  currentSubStars = 0;
  updateSubStarUI();
  
  D.inpSubReviewerName.value = S.user?.name || '';
  D.chkAnonSubReview.checked = false;
  D.inpSubReviewNote.value = '';
  openBS(D.ovAddSubReview, D.shAddSubReview);
};

D.chkAnonSubReview.addEventListener('change', (e) => {
  if (e.target.checked) {
    D.inpSubReviewerName.value = 'Ẩn danh';
    D.inpSubReviewerName.disabled = true;
  } else {
    D.inpSubReviewerName.value = S.user?.name || '';
    D.inpSubReviewerName.disabled = false;
  }
});

D.btnCloseSubReview.onclick = () => closeBS(D.ovAddSubReview, D.shAddSubReview);

D.btnSubmitSubReview.onclick = async () => {
  if (!currentTargetRevId) return;
  if (!currentSubStars) { toast('⚠️ Bạn chưa chọn số sao!', 'err'); shake(document.getElementById('star-picker-sub')); return; }
  const note = D.inpSubReviewNote.value.trim();
  if (!note) { toast('⚠️ Vui lòng nhập nội dung đánh giá!', 'err'); shake(D.inpSubReviewNote); return; }
  
  let userName = D.inpSubReviewerName.value.trim();
  if (!userName) userName = 'Ẩn danh';
  
  const subReview = {
    id: `sr-${Date.now()}`,
    userId: S.user.uid,
    editCount: 0,
    userName: userName,
    rating: currentSubStars,
    note: note,
    createdAt: db ? firebase.firestore.FieldValue.serverTimestamp() : { toDate: () => new Date() }
  };

  const btn = D.btnSubmitSubReview;
  const origHtml = btn.innerHTML;
  btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
  btn.disabled = true;

  try {
    if (db) {
      await db.collection('reviews').doc(currentTargetRevId).update({
        subReviews: firebase.firestore.FieldValue.arrayUnion(subReview)
      });
    }

    // Always update local state for instant feedback
    const rev = S.reviews.find(r => r.id === currentTargetRevId);
    if (rev) {
      if (!rev.subReviews) rev.subReviews = [];
      const localSubReview = { ...subReview, createdAt: { toDate: () => new Date() } };
      rev.subReviews.push(localSubReview);
      if (!db) saveLocalReviews();
      
      // Update UI
      putRevMarker(rev);
      openRevDetailSheet(rev);
    }
    
    toast('🎉 Gửi đánh giá thành công!', 'ok');
    closeBS(D.ovAddSubReview, D.shAddSubReview);
    
  } catch (err) {
    console.error(err);
    toast('⚠️ Lỗi gửi đánh giá', 'err');
  } finally {
    btn.innerHTML = origHtml;
    btn.disabled = false;
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §20 · UI — MY PROFILE SHEET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function renderMyProfileQR() {
  if (!S.user) return;
  try {
    await renderGradientQR(D.myProfileQrCanvas, qrPayload(S.user), FRIEND_GRAD);
  } catch (e) { console.warn('Profile QR error:', e); }
}

function refreshMyProfileFriendList() {
  // Update stats
  D.statFriendsCount.textContent = S.friends.length;
  D.statReqCount.textContent = S.friendReqs.length;
  updateFriendBadge();

  // Friend requests (Removed as we now auto-accept via arrayUnion)
  D.friendReqsSection.classList.add('hidden');
  D.friendReqList.innerHTML = '';

  // Friends list
  if (S.friends.length > 0) {
    D.friendsSection.classList.remove('hidden');
    D.friendsList.innerHTML = S.friends.map(f => `
      <div class="friend-item">
        <div class="avatar-circle" style="background:${getUserColor(f.uid)};">${f.name.charAt(0).toUpperCase()}</div>
        <span class="text-sm text-white font-semibold">@${esc(f.name)}</span>
      </div>`).join('');
  } else {
    D.friendsSection.classList.add('hidden');
    D.friendsList.innerHTML = '';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §21 · UI — USER PROFILE SHEET (avatar marker tap)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function openUserProfileSheet(user) {
  const color     = getUserColor(user.uid);
  const initial   = (user.name || '?').charAt(0).toUpperCase();
  const alrFriend = isFriend(user.uid);
  const isPending = db && S.friendReqs.some(r => r.fromUid === user.uid);
  const revCount  = S.reviews.filter(r => r.userId === user.uid).length;

  let friendBtnHtml;
  if (alrFriend) {
    friendBtnHtml = `<div class="w-full py-3.5 rounded-2xl text-sm font-bold text-green-400 text-center" style="background:rgba(34,197,94,.1);border:1.5px solid rgba(34,197,94,.3);">✅ Đã là bạn bè</div>`;
  } else if (isPending) {
    friendBtnHtml = `<div class="w-full py-3.5 rounded-2xl text-sm font-bold text-yellow-400 text-center" style="background:rgba(234,179,8,.1);border:1.5px solid rgba(234,179,8,.3);">⏳ Đang chờ xác nhận</div>`;
  } else {
    friendBtnHtml = `<button onclick="sendFriendRequest('${user.uid}','${esc(user.name)}')" class="w-full py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 transition-all" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 15px rgba(99,102,241,.35);">➕ Kết bạn</button>`;
  }

  // Temp canvas for user's friend QR
  const tmpCanvas = document.createElement('canvas');
  D.userProfileContent.innerHTML = `
    <div class="text-center mb-5">
      <div class="w-24 h-24 mx-auto rounded-full flex items-center justify-center font-black text-4xl text-white border-4 mb-3" style="background:${color};border-color:${color}60;box-shadow:0 0 30px ${color}44;">
        ${initial}
      </div>
      <h3 class="text-xl font-black text-white">@${esc(user.name)}</h3>
      <p class="text-slate-400 text-sm mt-0.5">📍 ${revCount} đánh giá · Đang online</p>
    </div>
    <!-- QR -->
    <p class="text-center text-xs text-slate-400 font-semibold uppercase tracking-widest mb-3">Quét QR để kết bạn</p>
    <div class="flex justify-center mb-4">
      <div class="qr-glow-wrap">
        <div class="qr-glow-inner" id="upsh-qr-wrap">
          <div class="qr-gen-spinner" style="width:40px;height:40px;border-width:3px;"></div>
        </div>
      </div>
    </div>
    <!-- Add friend btn -->
    <div class="mb-3">${friendBtnHtml}</div>
    <button onclick="closeUserProfile()" class="w-full py-3 rounded-2xl text-sm text-slate-400 text-center">Đóng</button>`;

  openUserProfile();

  // Render their QR (async)
  try {
    await renderGradientQR(tmpCanvas, qrPayload(user), FRIEND_GRAD);
    const wrap = $id('upsh-qr-wrap');
    if (wrap) { wrap.innerHTML = ''; wrap.appendChild(tmpCanvas); }
  } catch {}
}
// sendFriendRequest is now handled via processAddFriend (QR/URL flow)
window.sendFriendRequest = function(targetUid) { processAddFriend(targetUid); };
window.closeUserProfile = closeUserProfile;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §22 · FOOD PICKER (Spin Wheel)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openSpinOverlay() {
  D.spinWinner.classList.add('hidden'); D.spinEmpty.classList.add('hidden');
  D.btnSpinGo.classList.add('hidden'); D.spinCountWrap.classList.add('hidden');
  D.spinLoadingTxt.textContent = 'Đang tìm quán 4-5⭐ gần bạn...';
  D.spinLoadingTxt.classList.remove('hidden');
  D.spinWheel.style.transition = ''; D.spinWheel.style.transform = '';
  D.spinOverlay.classList.add('open');

  setTimeout(() => {
    const cands = S.reviews.filter(r => {
      if (r.rating < PICKER_MIN_STARS) return false;
      if (!S.lat||!S.lng) return true;
      return distKm(S.lat,S.lng,r.lat,r.lng) <= PICKER_RADIUS_KM;
    });
    D.spinLoadingTxt.classList.add('hidden');
    if (!cands.length) { D.spinEmpty.classList.remove('hidden'); return; }
    D.spinCountWrap.classList.remove('hidden');
    D.spinCount.textContent = cands.length;
    D.btnSpinGo.classList.remove('hidden');
    D.btnSpinGo.onclick = () => doSpin(cands);
  }, 700);
}
function closeSpinOverlay() { D.spinOverlay.classList.remove('open'); }

function doSpin(cands) {
  D.btnSpinGo.disabled = true; D.btnSpinGo.textContent = '🎡 Đang quay...';
  const deg = 1080 + Math.random()*720;
  D.spinWheel.style.transition = 'transform 2.6s cubic-bezier(.17,.67,.12,.99)';
  D.spinWheel.style.transform  = `rotate(${deg}deg)`;
  const emojis = ['🍜','🍱','🍔','🌮','🍣','🍕','🍗','🥘','🍛','🍲'];
  let ei = 0, t = setInterval(() => { D.spinIcon.textContent = emojis[ei++%emojis.length]; }, 140);
  setTimeout(() => {
    clearInterval(t);
    const winner = cands[Math.floor(Math.random()*cands.length)];
    showSpinWinner(winner);
    D.btnSpinGo.disabled = false; D.btnSpinGo.textContent = '🎲 Quay lại!';
    D.btnSpinGo.onclick = () => doSpin(cands);
  }, 2800);
}

function showSpinWinner(rev) {
  const sc = rev.rating>=4?'#22c55e':'#eab308';
  D.spinWinner.classList.remove('hidden');
  D.spinWinnerEmoji.textContent = rev.rating===5?'🎉':'😋';
  D.spinWinnerName.textContent  = rev.placeName;
  D.spinWinnerStars.textContent = '★'.repeat(rev.rating);
  D.spinWinnerStars.style.color = sc;
  D.spinWinnerNote.textContent  = rev.note||'Không có ghi chú';
  D.spinWinner.style.animation  = 'lsFadeIn .5s ease-out';
  D.btnGotoWinner.onclick = () => {
    closeSpinOverlay();
    S.map?.flyTo([rev.lat,rev.lng], 17, { animate:true, duration:1.5 });
    setTimeout(() => openRevDetailSheet(rev), 1600);
  };
  toast(`🎯 Hôm nay ăn "${rev.placeName}" ${rev.rating}⭐!`, 'ok', 3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §23 · UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function distKm(a,b,c,d){const R=6371,dLat=(c-a)*Math.PI/180,dLng=(d-b)*Math.PI/180,aa=Math.sin(dLat/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(aa),Math.sqrt(1-aa));}
function updateRevBadge(){ D.reviewCountBadge.textContent=`${S.reviews.length} quán`; }
function fmtDate(d){ const s=(Date.now()-d)/1e3; if(s<60) return 'Vừa xong'; if(s<3600) return `${Math.floor(s/60)} phút trước`; if(s<86400) return `${Math.floor(s/3600)} giờ trước`; if(s<604800) return `${Math.floor(s/86400)} ngày trước`; return d.toLocaleDateString('vi-VN'); }
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function toast(msg, type='info', dur=3000) {
  const t = document.createElement('div');
  t.className = `toast ${type==='ok'?'ok':type==='err'?'err':'info'}`;
  t.textContent = msg;
  D.toastWrap.appendChild(t);
  setTimeout(()=>{ t.style.cssText='opacity:0;transform:translateY(-8px);transition:.3s;'; setTimeout(()=>t.remove(),300); }, dur);
  const all = D.toastWrap.querySelectorAll('.toast');
  if(all.length>3) all[0].remove();
}

function shake(el) {
  el.style.animation='none'; void el.offsetWidth;
  el.style.animation='shk .4s ease';
  setTimeout(()=>el.style.animation='',400);
}

document.head.appendChild(Object.assign(document.createElement('style'),{
  textContent:`@keyframes shk{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}} .ripple{position:absolute;border-radius:50%;transform:scale(0);animation:ripA .6s linear;background:rgba(255,255,255,.22);pointer-events:none;} @keyframes ripA{to{transform:scale(4);opacity:0}}`
}));

function addRipple(el) {
  el.classList.add('ripple-wrap');
  el.addEventListener('click', function(e){
    const r=this.getBoundingClientRect(), rp=document.createElement('span');
    const sz=Math.max(r.width,r.height);
    rp.className='ripple'; rp.style.cssText=`width:${sz}px;height:${sz}px;left:${e.clientX-r.left-sz/2}px;top:${e.clientY-r.top-sz/2}px;`;
    this.appendChild(rp); setTimeout(()=>rp.remove(),700);
  });
}

// DEMO DATA REMOVED

function saveLocalReviews() {
  const safeIso = (t) => {
    try {
      if (t && t.toDate) {
        const d = t.toDate();
        if (!isNaN(d)) return d.toISOString();
      }
    } catch(e){}
    return new Date().toISOString();
  };

  const rs = S.reviews.filter(r => String(r.id).startsWith('loc-')).map(r => {
    const cloned = { ...r };
    cloned.createdAt = safeIso(r.createdAt);
    if (cloned.subReviews) {
      cloned.subReviews = cloned.subReviews.map(sr => ({
        ...sr,
        createdAt: safeIso(sr.createdAt)
      }));
    }
    return cloned;
  });
  localStorage.setItem('localReviews', JSON.stringify(rs));
}

function loadLocalReviews() {
  try {
    const rs = JSON.parse(localStorage.getItem('localReviews') || '[]');
    rs.forEach(r => {
      const dtStr = r.createdAt;
      r.createdAt = { toDate: () => new Date(dtStr) };
      if (r.subReviews) {
        r.subReviews.forEach(sr => {
          const sdtStr = sr.createdAt;
          sr.createdAt = { toDate: () => new Date(sdtStr) };
        });
      }
      if (!S.reviews.some(x=>x.id===r.id)) { S.reviews.push(r); putRevMarker(r); }
    });
    updateRevBadge();
  } catch(e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §25 · EVENT LISTENERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Khởi tạo user ẩn danh — tạo 1 lần, lưu localStorage mãi.
 * Ai vào trang cũng được vào thẳng bản đồ không cần đăng nhập.
 */
function loginAsGuest() {
  const saved = localStorage.getItem(LS_USER_KEY);
  if (saved) {
    try {
      S.user = JSON.parse(saved);
    } catch(e) { localStorage.removeItem(LS_USER_KEY); }
  }
  
  if (!S.user) {
    // Tạo user mới với nickname ngẫu nhiên
    const n = NAME_P[Math.floor(Math.random()*NAME_P.length)];
    const s = NAME_S[Math.floor(Math.random()*NAME_S.length)];
    const tag = Math.floor(1000 + Math.random()*9000);
    const uid = 'anon-' + Math.random().toString(36).slice(2,10);
    S.user = {
      uid,
      name: `${n} ${s}`,
      username: `@${n}${s}#${tag}`,
      createdAt: Date.now()
    };
    localStorage.setItem(LS_USER_KEY, JSON.stringify(S.user));
  }
  
  showMainApp();
}

function setupEvents() {
  // ── MAIN: Header ──
  D.btnMyProfile    .addEventListener('click', () => { openMyProfile(); refreshMyProfileFriendList(); });
  D.btnInfoHeader.addEventListener('click', () => openBS(D.ovInfoModal, D.shInfoModal));
  if (D.btnCloseInfoModal) {
    D.btnCloseInfoModal.addEventListener('click', () => closeBS(D.ovInfoModal, D.shInfoModal));
    D.ovInfoModal.addEventListener('click', e => { if (e.target === D.ovInfoModal) closeBS(D.ovInfoModal, D.shInfoModal); });
  }

  // ── MY PROFILE SHEET ──
  D.btnCloseMyProfile.addEventListener('click', closeMyProfile);
  D.ovMyProfile.addEventListener('click', e => { if(e.target===D.ovMyProfile) closeMyProfile(); });
  D.btnDownloadMyQr .addEventListener('click', () => downloadQRCard(D.myProfileQrCanvas, S.user?.name||'user', 'friend'));
  D.btnOpenAddFriend?.addEventListener('click', openAddFriendModal);

  // Swipe down close
  let _mySY=0;
  D.shMyProfile.addEventListener('touchstart', e=>{_mySY=e.touches[0].clientY;},{passive:true});
  D.shMyProfile.addEventListener('touchmove',  e=>{if(e.touches[0].clientY-_mySY>80) closeMyProfile();},{passive:true});

  // ── ADD FRIEND MODAL ──
  D.btnCloseAddFriend.addEventListener('click', closeAddFriendModal);
  D.qrUploadFriend.addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    stopFriendScanner();
    try {
      const data = await parseQRFromFile(file);
      handleFriendQR(data);
    } catch {
      toast('❌ Không tìm thấy QR bạn bè trong ảnh!', 'err');
      // Restart scanner
      setTimeout(startFriendScanner, 800);
    } finally { e.target.value=''; }
  });
  D.btnUploadFriendTrigger.addEventListener('click', () => D.qrUploadFriend.click());

  // ── USER PROFILE SHEET ──
  D.ovUserProfile.addEventListener('click', e => { if(e.target===D.ovUserProfile) closeUserProfile(); });

  // ── MAP CONTROLS ──
  D.btnLocate.addEventListener('click', () => {
    if (S.lat && S.lng && S.map) { S.map.flyTo([S.lat,S.lng], MAP_ZOOM_DEFAULT, {animate:true,duration:1}); toast('📍 Về vị trí của bạn!','info',1500); }
    else toast('⏳ Đang chờ tín hiệu GPS...','info',2000);
  });

  D.btnAddReview.addEventListener('click', () => {
    if (S.addingMarker) { S.addingMarker=false; D.btnAddReview.style.background=''; toast('✖️ Hủy thêm quán','info',1500); return; }
    if (S.lat&&S.lng) openAddReview(S.lat, S.lng);
    else { S.addingMarker=true; D.btnAddReview.style.background='linear-gradient(135deg,#3b82f6,#6366f1)'; toast('👆 Bấm vào bản đồ để chọn vị trí quán!','info',3000); }
  });
  D.btnFoodPicker.addEventListener('click', openSpinOverlay);
  D.btnCloseSpin .addEventListener('click', closeSpinOverlay);
  addRipple(D.btnAddReview);

  // ── ADD REVIEW MODAL ──
  D.btnCloseAddReview.addEventListener('click', closeAddReview);
  D.modalAddReview.addEventListener('click', e => { if(e.target===D.modalAddReview) closeAddReview(); });
  D.starPicker.addEventListener('click', e => { const b=e.target.closest('.star-btn'); if(b) pickStar(+b.dataset.star); });
  D.btnSubmitReview.addEventListener('click', submitReview);
  D.inpPlaceName.addEventListener('keydown', e => { if(e.key==='Enter') D.inpNote.focus(); });
  D.inpPlaceName.addEventListener('input', () => {
    const v = D.inpPlaceName.value.trim().toLowerCase();
    if (!v) {
      D.placeSuggestions.innerHTML = '';
      D.placeSuggestions.classList.add('hidden');
      return;
    }
    const matches = S.reviews.filter(r => 
      (r.placeName||'').toLowerCase().includes(v) || (r.address||'').toLowerCase().includes(v)
    ).slice(0, 5);
    if (matches.length === 0) {
      D.placeSuggestions.innerHTML = '';
      D.placeSuggestions.classList.add('hidden');
      return;
    }
    D.placeSuggestions.innerHTML = matches.map(r => `
      <div class="p-3 border-b border-slate-700/50 hover:bg-slate-700 cursor-pointer flex items-center justify-between" onclick="selectSuggestion('${r.id}')">
        <div>
          <div class="text-sm font-bold text-white">${esc(r.placeName)}</div>
          <div class="text-xs text-slate-400 mt-0.5">📍 ${esc(r.address || 'Không rõ địa chỉ')}</div>
        </div>
        <div class="text-[10px] bg-slate-600 px-2 py-1 rounded text-white font-semibold">Đã có</div>
      </div>
    `).join('');
    D.placeSuggestions.classList.remove('hidden');
  });

  window.selectSuggestion = (id) => {
    const rev = S.reviews.find(r => r.id === id);
    if (!rev) return;
    D.placeSuggestions.classList.add('hidden');
    closeAddReview();
    S.map.flyTo([rev.lat, rev.lng], 17, {animate: true});
    setTimeout(() => openRevDetailSheet(rev), 400);
  };
  
  // EDIT REVIEW LOGIC
  window.openEditModal = function(isSubReview, revId, subRevId, currentRating, currentNote, currentEditCount) {
    S.editTarget = { isSubReview, revId, subRevId };
    S.editStars = currentRating;
    S.editMaxCount = 3;
    S.editCount = currentEditCount || 0;
    
    if (S.editCount >= S.editMaxCount) {
      toast('Bạn đã hết lượt sửa!', 'err');
      return;
    }
    
    D.editCountLabel.textContent = `Bạn còn ${S.editMaxCount - S.editCount} lần sửa`;
    D.inpEditReviewNote.value = currentNote;
    
    document.querySelectorAll('.star-btn-edit').forEach(b => {
      const s = parseInt(b.dataset.star);
      if (s <= S.editStars) {
        b.style.color = '#eab308';
        b.style.transform = 'scale(1.15)';
        b.style.filter = 'drop-shadow(0 0 8px rgba(250,204,21,0.6))';
      } else {
        b.style.color = '';
        b.style.transform = 'scale(1)';
        b.style.filter = 'grayscale(1) opacity(0.3)';
      }
    });
    D.starLabelEdit.textContent = STAR_LABELS[S.editStars] || 'Chưa chọn sao';
    D.starLabelEdit.style.color = S.editStars ? '#eab308' : '#64748b';
    
    openBS(D.ovEditReview, D.shEditReview);
  };

  if (D.btnCloseEditReview) {
    D.btnCloseEditReview.addEventListener('click', () => closeBS(D.ovEditReview, D.shEditReview));
    D.ovEditReview.addEventListener('click', e => { if (e.target === D.ovEditReview) closeBS(D.ovEditReview, D.shEditReview); });
    
    document.querySelectorAll('.star-btn-edit').forEach(b => {
      b.addEventListener('click', e => {
        S.editStars = parseInt(e.currentTarget.dataset.star);
        document.querySelectorAll('.star-btn-edit').forEach(btn => {
          const s = parseInt(btn.dataset.star);
          if (s <= S.editStars) {
            btn.style.color = '#eab308';
            btn.style.transform = 'scale(1.15)';
            btn.style.filter = 'drop-shadow(0 0 8px rgba(250,204,21,0.6))';
          } else {
            btn.style.color = '';
            btn.style.transform = 'scale(1)';
            btn.style.filter = 'grayscale(1) opacity(0.3)';
          }
        });
        D.starLabelEdit.textContent = STAR_LABELS[S.editStars] || 'Chưa chọn sao';
        D.starLabelEdit.style.color = S.editStars ? '#eab308' : '#64748b';
      });
    });

    D.btnSubmitEditReview.addEventListener('click', async () => {
      console.log('--- Submit Edit Review Clicked ---');
      const note = D.inpEditReviewNote.value.trim();
      console.log('Stars:', S.editStars, 'Note:', note);
      if (!S.editStars) { toast('Vui lòng chọn số sao!', 'err'); return; }
      if (!note) { toast('Vui lòng nhập nội dung!', 'err'); return; }
      
      console.log('Target:', S.editTarget);
      const rev = S.reviews.find(r => String(r.id) === String(S.editTarget.revId));
      console.log('Found Review:', rev);
      if (!rev) {
        toast('Lỗi: Không tìm thấy đánh giá gốc!', 'err');
        return;
      }
      
      D.btnSubmitEditReview.disabled = true;
      try {
        if (S.editTarget.isSubReview) {
          const srIndex = rev.subReviews.findIndex(s => String(s.id) === String(S.editTarget.subRevId));
          if (srIndex === -1) { 
            toast('Lỗi: Không tìm thấy đánh giá phụ!', 'err');
            D.btnSubmitEditReview.disabled = false; 
            return; 
          }
          const sr = rev.subReviews[srIndex];
          sr.rating = S.editStars;
          sr.note = note;
          sr.editCount = (sr.editCount || 0) + 1;
          
          if (db) {
            await db.collection('reviews').doc(rev.id).update({ subReviews: rev.subReviews });
          } else saveLocalReviews();
        } else {
          rev.rating = S.editStars;
          rev.note = note;
          rev.editCount = (rev.editCount || 0) + 1;
          if (db) {
            await db.collection('reviews').doc(rev.id).update({
              rating: S.editStars,
              note: note,
              editCount: (rev.editCount || 0)
            });
          } else saveLocalReviews();
        }
        
        closeBS(D.ovEditReview, D.shEditReview);
        toast('Đã sửa thành công!', 'ok');
        putRevMarker(rev);
        openRevDetailSheet(rev);
      } catch (err) {
        console.error('Lỗi khi submit sửa:', err);
        toast('Lỗi khi lưu! Vui lòng thử lại.', 'err');
      }
      D.btnSubmitEditReview.disabled = false;
    });
  }

  let _revSY=0;
  D.modalAddRevPanel.addEventListener('touchstart', e=>{_revSY=e.touches[0].clientY;},{passive:true});
  D.modalAddRevPanel.addEventListener('touchmove',  e=>{if(e.touches[0].clientY-_revSY>90) closeAddReview();},{passive:true});

  // ── REVIEW DETAIL ──
  D.ovReviewDetail.addEventListener('click', e => { if(e.target===D.ovReviewDetail) closeRevDetailSheet(); });
  let _rdSY=0;
  D.shReviewDetail.addEventListener('touchstart', e=>{_rdSY=e.touches[0].clientY;},{passive:true});
  D.shReviewDetail.addEventListener('touchmove',  e=>{if(e.touches[0].clientY-_rdSY>80) closeRevDetailSheet();},{passive:true});

  // ── SPIN ──
  let _spY=0;
  D.spinOverlay.addEventListener('touchstart', e=>{_spY=e.touches[0].clientY;},{passive:true});
  D.spinOverlay.addEventListener('touchmove',  e=>{if(e.touches[0].clientY-_spY>100) closeSpinOverlay();},{passive:true});

  // ── KEYBOARD ──
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') { closeAddReview(); closeRevDetailSheet(); closeSpinOverlay(); closeMyProfile(); closeAddFriendModal(); closeUserProfile(); }
  });

  console.log('✅ Events ready');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §26 · BOOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function boot() {
  console.log('🚀 FOOD DROP v5.0 booting...');
  registerSW();
  initFirebase();
  setupEvents();

  loginAsGuest();

  // Force Leaflet to recalculate map size after CSS layout settles
  setTimeout(() => { if (S.map) S.map.invalidateSize(true); }, 100);
  setTimeout(() => { if (S.map) S.map.invalidateSize(true); }, 500);
  setTimeout(() => { if (S.map) S.map.invalidateSize(true); }, 1200);

  console.log('✅ FOOD DROP ready!');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
