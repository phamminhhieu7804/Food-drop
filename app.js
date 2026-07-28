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
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
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
  // Login
  loginScreen:       $id('login-screen'),
  lsHome:            $id('ls-home'),
  lsQrShow:          $id('ls-qr-show'),
  lsLogin:           $id('ls-login'),
  lsScan:            $id('ls-scan'),

  btnHomeCreate:     $id('btn-home-create'),
  btnHomeLogin:      $id('btn-home-login'),
  btnHomeSkip:       $id('btn-home-skip'),

  qrGenLoading:      $id('qr-gen-loading'),
  qrLoginCanvas:     $id('qr-login-canvas'),
  btnBackQr:         $id('btn-back-qr'),
  btnDownloadQr:     $id('btn-download-qr'),
  btnEnterApp:       $id('btn-enter-app'),

  btnBackLogin:      $id('btn-back-login'),
  btnUploadLoginTrigger: $id('btn-upload-login-trigger'),
  loginUploadStatus: $id('login-upload-status'),
  btnLoginCamera:    $id('btn-login-camera'),
  qrUploadLogin:     $id('qr-upload-login'),

  btnBackScan:       $id('btn-back-scan'),
  loginQrVideo:      $id('login-qr-video'),
  loginQrCanvasScan: $id('login-qr-canvas-scan'),
  lsScanDot:         $id('ls-scan-dot'),
  lsScanStatus:      $id('ls-scan-status'),
  lsScanErr:         $id('ls-scan-err'),

  // Main app
  mainApp:           $id('main-app'),
  reviewCountBadge:  $id('review-count-badge'),
  userInitial:       $id('user-initial'),
  btnMyProfile:      $id('btn-my-profile'),
  btnFriendsHeader:  $id('btn-friends-header'),
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
  btnLogout:         $id('btn-logout'),

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
  inpPlaceName:      $id('inp-place-name'),
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
// §7 · AUTH — Auto-generate account + localStorage session
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function genUID() {
  return (typeof window !== 'undefined' && window.crypto?.randomUUID?.()) ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function genDisplayName() {
  const p = NAME_P[Math.floor(Math.random() * NAME_P.length)];
  const s = NAME_S[Math.floor(Math.random() * NAME_S.length)];
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `${p}${s}#${n}`;
}

function tryAutoLogin() {
  const raw = localStorage.getItem(LS_USER_KEY);
  if (!raw) return false;
  try {
    const u = JSON.parse(raw);
    if (!u?.uid || !u?.name) throw new Error('bad');
    S.user = u;
    loadLocalFriends();
    return true;
  } catch { localStorage.removeItem(LS_USER_KEY); return false; }
}

/** Tạo tài khoản — không cần input, tự gen tên + UID */
async function createAccount() {
  const uid  = genUID();
  const name = genDisplayName();
  const user = { uid, name, createdAt: Date.now() };

  localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  S.user = user;

  // Persist to Firestore (non-blocking)
  if (db) {
    db.collection('users').doc(uid).set({
      uid, name, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  }

  // Switch to QR show screen, generate QR
  showLoginSub('qr-show');
  await genAndShowLoginQR(user);
}

function loginFromQRData(raw) {
  try {
    const d = JSON.parse(raw);
    if (d?.app !== QR_APP_ID || !d?.uid || !d?.name) throw new Error('bad');
    const user = { uid: d.uid, name: d.name, createdAt: d.ts || Date.now() };
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
    S.user = user;
    loadLocalFriends();
    toast(`👋 Chào mừng, ${d.name}!`, 'ok', 2500);
    showMainApp();
  } catch {
    toast('❌ Mã QR không đúng định dạng FOOD DROP!', 'err');
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem(LS_USER_KEY);
  S.user = null; S.friends = []; S.friendReqs = [];
  S.unsubReviews?.(); S.unsubUsers?.(); S.unsubFriendReqs?.();
  if (S.watchId) navigator.geolocation.clearWatch(S.watchId);
  Object.values(S.userMarkers).forEach(m => S.map?.removeLayer(m));
  S.userMarkers = {}; S.reviews = []; S.revMarkers = {};
  S.didInitialFly = false; S.map = null;
  closeMyProfile();
  toast('👋 Đã đăng xuất!', 'info');
  showLoginScreen();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §8 · GRADIENT QR GENERATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Build QR JSON payload */
function qrPayload(user) {
  return JSON.stringify({ app: QR_APP_ID, uid: user.uid, name: user.name, ts: user.createdAt });
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * scale; c.height = img.height * scale;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const imgd = c.getContext('2d').getImageData(0, 0, c.width, c.height);
        const code = jsQR(imgd.data, imgd.width, imgd.height, { inversionAttempts: 'attemptBoth' });
        if (code?.data) resolve(code.data);
        else reject(new Error('No QR'));
      };
      img.onerror = () => reject(new Error('Bad image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Read error'));
    reader.readAsDataURL(file);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §10 · CAMERA QR SCANNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function startScanner(video, scanCanvas, onFound, onError, dotEl, statusEl, errEl) {
  const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
  setStatus(dotEl, statusEl, '🔍 Đang khởi động camera...', 'searching');
  errEl?.classList.add('hidden');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    setStatus(dotEl, statusEl, '📷 Đặt mã QR vào khung', 'ok');

    const tick = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        scanCanvas.width = video.videoWidth; scanCanvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
        const id = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
        const code = jsQR(id.data, id.width, id.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) { setStatus(dotEl, statusEl, '✅ Đọc được mã QR!', 'ok'); onFound(code.data, stream); return; }
      }
      return requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return { stream, raf };
  } catch (err) {
    const isPerm = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
    const msg = isPerm ? '🔒 Bị từ chối quyền camera' : '📵 Không thể mở camera';
    setStatus(dotEl, statusEl, msg, 'err');
    errEl?.classList.remove('hidden');
    onError?.(err);
    return null;
  }
}

function stopScanner(ref) {
  if (!ref) return;
  if (ref.raf) cancelAnimationFrame(ref.raf);
  if (ref.stream) ref.stream.getTracks().forEach(t => t.stop());
}

function setStatus(dot, label, text, type) {
  if (label) label.textContent = text;
  if (dot) {
    const c = { ok:'#22c55e', searching:'#f97316', err:'#ef4444' };
    dot.style.background = c[type] || '#f97316';
    dot.classList.toggle('animate-pulse', type === 'searching');
  }
}

// Login camera scanner
let _loginScanner = null;
async function startLoginScanner() {
  _loginScanner = await startScanner(
    D.loginQrVideo, D.loginQrCanvasScan,
    (data, stream) => {
      stream.getTracks().forEach(t => t.stop());
      loginFromQRData(data);
    },
    null, D.lsScanDot, D.lsScanStatus, D.lsScanErr
  );
}
function stopLoginScanner() { stopScanner(_loginScanner); _loginScanner = null; }

// Friend camera scanner
let _friendScanner = null;
async function startFriendScanner() {
  _friendScanner = await startScanner(
    D.friendQrVideo, D.friendQrCanvasScan,
    (data, stream) => {
      stream.getTracks().forEach(t => t.stop());
      _friendScanner = null;
      handleFriendQR(data);
    },
    null, D.afScanDot, D.afScanStatus, null
  );
}
function stopFriendScanner() { stopScanner(_friendScanner); _friendScanner = null; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §11 · SCREEN MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LOGIN_SUBS = { home: D.lsHome, 'qr-show': D.lsQrShow, login: D.lsLogin, scan: D.lsScan };

function showLoginSub(id) {
  Object.values(LOGIN_SUBS).forEach(el => el?.classList.add('hidden'));
  const el = LOGIN_SUBS[id];
  if (el) { el.classList.remove('hidden'); el.style.animation='none'; void el.offsetWidth; el.style.animation='lsFadeIn .3s ease-out'; }
  if (id !== 'scan') stopLoginScanner();
  if (id === 'scan') startLoginScanner();
}

function showLoginScreen() {
  D.mainApp.style.display = 'none';
  D.loginScreen.style.display = 'flex';
  showLoginSub('home');
}

function showMainApp() {
  stopLoginScanner();
  D.loginScreen.style.display = 'none';
  D.mainApp.style.display = 'flex';

  const initial = (S.user?.name || '?').charAt(0).toUpperCase();
  D.userInitial.textContent = initial;

  if (!S.map) {
    initMap();
    startGPS();
    subscribeToReviews();
    subscribeToOnlineUsers();
    subscribeToFriendRequests();
    renderMyProfileQR(); // pre-render
  }

  if (!IS_FB) {
    setTimeout(() => toast('🎭 LocalMode — Thêm Firebase để sync bạn bè!', 'info', 4000), 600);
    loadLocalReviews();
    loadDemoReviews();
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
  window.addEventListener('resize', () => S.map.invalidateSize());
  setTimeout(() => S.map.invalidateSize(), 200);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §13 · GEOLOCATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function startGPS() {
  if (!navigator.geolocation) { setGPS('err', 'Không hỗ trợ GPS'); return; }
  if (S.watchId) { navigator.geolocation.clearWatch(S.watchId); S.watchId = null; }
  setGPS('searching', 'Đang lấy GPS...');
  S.watchId = navigator.geolocation.watchPosition(
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
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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
  const initial = (user.name || '?').charAt(0).toUpperCase();
  const html = `<div class="user-avatar-marker" style="background:${color};border-color:${color}60;">
    <div class="user-avatar-ring" style="color:${color};border-color:${color};"></div>
    <span>${initial}</span>
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
  
  let advice = '';
  let color = '';
  if (rev.rating === 5) { advice = 'NÊN CHỌN'; color = '#22c55e'; }
  else if (rev.rating === 4) { advice = 'ĐÁNG THỬ'; color = '#eab308'; }
  else if (rev.rating === 3) { advice = 'CÂN NHẮC'; color = '#f59e0b'; }
  else if (rev.rating === 2) { advice = 'CÂN NHẮC'; color = '#ef4444'; }
  else { advice = 'KHÔNG NÊN CHỌN'; color = '#9f1239'; }

  return L.divIcon({
    html: `
      <div style="position:relative; width:0; height:0; z-index:${rev.rating*100};">
        <div style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; width:max-content; filter:drop-shadow(0 6px 12px rgba(0,0,0,0.5)); pointer-events:none;">
          
          <div style="display:flex; flex-direction:column; align-items:center; pointer-events:auto; transition:transform 0.2s;" onmouseenter="this.style.transform='scale(1.08)'" onmouseleave="this.style.transform='scale(1)'">
            <div style="font-size:10px; font-weight:800; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.9); margin-bottom:3px; opacity:0.9;">
              @${esc(rev.userName || 'Khách')}
            </div>
            <div style="background:rgba(15,23,42,0.95); border:1px solid ${color}; padding:6px 10px; border-radius:14px; margin-bottom:8px; display:flex; flex-direction:column; align-items:center;">
              <div style="font-weight:900; font-size:14px; color:#fff;">${esc(name)}</div>
              ${rev.foodType ? `<div style="font-size:10px; color:rgba(255,255,255,0.7); margin-top:1px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${esc(rev.foodType)}</div>` : ''}
              <div style="display:flex; gap:6px; align-items:center; margin-top:4px;">
                <span style="color:${color}; font-weight:900; font-size:12px;">★ ${rev.rating}</span>
                <span style="background:${color}; color:#fff; padding:3px 6px; border-radius:6px; font-size:9px; font-weight:900; letter-spacing:0.5px;">${advice}</span>
              </div>
            </div>
          </div>

          <div style="width:38px; height:38px; background:${color}; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center; border:2px solid #fff; pointer-events:auto; box-shadow:inset 0 2px 6px rgba(0,0,0,0.3);">
            <div style="transform:rotate(45deg); width:28px; height:28px; background:#1e293b; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; color:#fff; font-size:14px; overflow:hidden;">
              ${rev.userAvatar ? `<img src="${esc(rev.userAvatar)}" style="width:100%;height:100%;object-fit:cover;">` : initial}
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
// §16 · FIRESTORE REVIEWS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function subscribeToReviews() {
  if (!db) return;
  const q = db.collection('reviews').orderBy('createdAt','desc').limit(500);
  S.unsubReviews = q.onSnapshot(snap => {
    snap.docChanges().forEach(ch => {
      const d = { id: ch.doc.id, ...ch.doc.data() };
      if (ch.type === 'added')    { S.reviews.push(d); putRevMarker(d); }
      if (ch.type === 'modified') { const i=S.reviews.findIndex(r=>r.id===d.id); if(i>-1) S.reviews[i]=d; putRevMarker(d); }
      if (ch.type === 'removed')  { S.reviews = S.reviews.filter(r=>r.id!==d.id); delRevMarker(d.id); }
    });
    updateRevBadge();
  }, err => { console.error(err); toast('⚠️ Mất kết nối server', 'err'); });
}

async function submitReview() {
  const placeName = D.inpPlaceName.value.trim();
  const foodType  = D.inpFoodType ? D.inpFoodType.value.trim() : '';
  const address   = D.inpAddress ? D.inpAddress.value.trim() : '';
  const rating    = S.selStars;
  const note      = D.inpNote.value.trim();
  const lat       = S.selLat, lng = S.selLng;

  if (!placeName)    { toast('⚠️ Nhập tên quán đi bạn!', 'err'); shake(D.inpPlaceName); D.inpPlaceName.focus(); return; }
  if (!rating)       { toast('⭐ Chọn số sao!', 'err'); shake(D.starPicker); return; }
  if (!lat || !lng)  { toast('📍 Chọn vị trí trên bản đồ!', 'err'); return; }
  if (!S.user)       { toast('🔐 Chưa đăng nhập!', 'err'); return; }

  setRevSubmitLoading(true);
  try {
    const rev = { userId:S.user.uid, userName:S.user.name, placeName, foodType, address, lat, lng, rating, note,
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
// §17 · FRIEND SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function loadLocalFriends() {
  try { S.friends = JSON.parse(localStorage.getItem(LS_FRIENDS_KEY) || '[]'); } catch { S.friends = []; }
}
function saveLocalFriends() { localStorage.setItem(LS_FRIENDS_KEY, JSON.stringify(S.friends)); }
function isFriend(uid) { return S.friends.some(f => f.uid === uid); }

/** Handle QR data that was scanned/uploaded as a friend QR */
function handleFriendQR(raw) {
  closeAddFriendModal();
  try {
    const d = JSON.parse(raw);
    if (d?.app !== QR_APP_ID || !d?.uid || !d?.name) throw new Error('bad');
    if (d.uid === S.user?.uid) { toast('🤦 Đó là mã QR của bạn rồi!', 'info'); return; }
    if (isFriend(d.uid)) { toast('✅ Đã là bạn bè rồi!', 'ok'); return; }
    sendFriendRequest(d.uid, d.name);
  } catch {
    toast('❌ Mã QR không đúng định dạng!', 'err');
  }
}

async function sendFriendRequest(toUid, toName) {
  if (!S.user) return;
  if (db) {
    // Check if request already exists
    try {
      const dup = await db.collection('friendRequests')
        .where('fromUid','==',S.user.uid).where('toUid','==',toUid).where('status','==','pending').get();
      if (!dup.empty) { toast('⏳ Đã gửi yêu cầu rồi!', 'info'); return; }
      await db.collection('friendRequests').add({
        fromUid: S.user.uid, fromName: S.user.name,
        toUid, toName, status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      toast(`✉️ Đã gửi yêu cầu kết bạn tới ${toName}!`, 'ok', 3000);
    } catch (e) { toast('❌ Gửi yêu cầu thất bại', 'err'); }
  } else {
    // Local mode: directly add as friend (no request flow)
    if (!isFriend(toUid)) {
      S.friends.push({ uid: toUid, name: toName });
      saveLocalFriends();
      refreshMyProfileFriendList();
      toast(`🤝 Đã thêm ${toName} (Local Mode)!`, 'ok');
    }
  }
}

async function acceptFriendRequest(reqId, fromUid, fromName) {
  if (!db) return;
  try {
    const batch = db.batch();
    batch.update(db.collection('friendRequests').doc(reqId), { status: 'accepted' });
    batch.update(db.collection('users').doc(S.user.uid), {
      friends: firebase.firestore.FieldValue.arrayUnion(fromUid),
    });
    batch.update(db.collection('users').doc(fromUid), {
      friends: firebase.firestore.FieldValue.arrayUnion(S.user.uid),
    });
    await batch.commit();
    if (!isFriend(fromUid)) { S.friends.push({ uid: fromUid, name: fromName }); saveLocalFriends(); }
    toast(`🤝 Đã kết bạn với ${fromName}!`, 'ok');
    refreshMyProfileFriendList();
  } catch (e) { toast('❌ Thất bại', 'err'); }
}

async function rejectFriendRequest(reqId) {
  if (!db) return;
  try {
    await db.collection('friendRequests').doc(reqId).update({ status: 'rejected' });
    S.friendReqs = S.friendReqs.filter(r => r.id !== reqId);
    refreshMyProfileFriendList();
  } catch { toast('❌ Thất bại', 'err'); }
}

function subscribeToFriendRequests() {
  if (!db || !S.user) return;
  S.unsubFriendReqs = db.collection('friendRequests')
    .where('toUid','==',S.user.uid).where('status','==','pending')
    .onSnapshot(snap => {
      S.friendReqs = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      updateFriendBadge();
      refreshMyProfileFriendList();
    });

  // Also listen to accepted requests to sync friends
  db.collection('friendRequests').where('fromUid','==',S.user.uid).where('status','==','accepted')
    .onSnapshot(snap => {
      snap.docs.forEach(d => {
        const data = d.data();
        if (!isFriend(data.toUid)) {
          S.friends.push({ uid:data.toUid, name:data.toName });
          saveLocalFriends();
          toast(`🎉 ${data.toName} chấp nhận kết bạn!`, 'ok', 3000);
        }
      });
      refreshMyProfileFriendList();
    });
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
  const sc    = {5:'#22c55e',4:'#eab308',3:'#f59e0b',2:'#ef4444',1:'#ef4444'}[rev.rating]||'#eab308';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${rev.lat},${rev.lng}`;

  D.reviewDetailContent.innerHTML = `
    <div class="flex gap-3 mb-5">
      <div class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0" style="background:${sc}18;border:1.5px solid ${sc}44;">
        <span class="text-2xl font-black" style="color:${sc};">${rev.rating}</span>
        <span class="text-[10px] font-bold" style="color:${sc};">SAO</span>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-xl font-black text-white leading-tight">${esc(rev.placeName)}</h3>
        ${rev.foodType ? `<p class="text-xs text-slate-300 mt-1 font-semibold uppercase tracking-wider">🏷️ ${esc(rev.foodType)}</p>` : ''}
        <p class="text-sm mt-0.5" style="color:${sc};">${STAR_LABELS[rev.rating]||''}</p>
      </div>
    </div>
    <div class="text-2xl mb-4 tracking-widest" style="color:${sc};">
      ${'★'.repeat(rev.rating)}<span class="text-slate-700">${'★'.repeat(5-rev.rating)}</span>
    </div>
    ${rev.address?`<div class="flex items-start gap-2 mb-4 text-slate-300 text-sm">
      <span class="text-slate-500 mt-0.5">📍</span><span>${esc(rev.address)}</span>
    </div>`:''}
    ${rev.note?`<div class="rounded-2xl p-4 mb-4" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
      <p class="text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">📝 Ghi chú</p>
      <p class="text-slate-200 text-sm leading-relaxed">${esc(rev.note)}</p></div>`:''}
    <div class="flex items-center gap-3 mb-5 rounded-2xl p-3" style="background:rgba(255,255,255,.04);">
      <div class="avatar-circle" style="background:linear-gradient(135deg,#f97316,#fb923c);">${(rev.userName||'?').charAt(0).toUpperCase()}</div>
      <div><p class="text-sm font-semibold text-white">@${esc(rev.userName||'Foodie')}</p><p class="text-xs text-slate-400">${date}</p></div>
    </div>
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

  // Friend requests
  if (S.friendReqs.length > 0) {
    D.friendReqsSection.classList.remove('hidden');
    D.friendReqList.innerHTML = S.friendReqs.map(req => `
      <div class="friend-req-item">
        <div class="avatar-circle" style="background:${getUserColor(req.fromUid)};">${req.fromName.charAt(0).toUpperCase()}</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-white truncate">@${esc(req.fromName)}</p>
          <p class="text-xs text-slate-400">muốn kết bạn với bạn</p>
        </div>
        <div class="flex gap-2">
          <button onclick="acceptFriendRequest('${req.id}','${req.fromUid}','${req.fromName}')"
            class="px-3 py-1.5 rounded-xl text-xs font-bold text-white" style="background:#22c55e;">✓</button>
          <button onclick="rejectFriendRequest('${req.id}')"
            class="px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10">✗</button>
        </div>
      </div>`).join('');
  } else {
    D.friendReqsSection.classList.add('hidden');
    D.friendReqList.innerHTML = '';
  }

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

window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;

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
window.sendFriendRequest = sendFriendRequest;
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §24 · DEMO DATA (LocalMode only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEMO = [
  {id:'d1',userId:'demo',userName:'NgonFoodie#2847',placeName:'Phở Bò Thìn',       lat:21.0295,lng:105.8530,rating:5,note:'Phải order phở đặc biệt! Ngon nhất Hà Nội 🔥',      createdAt:{toDate:()=>new Date(Date.now()-3600e3)}},
  {id:'d2',userId:'demo',userName:'MlemEater#9123', placeName:'Bún Chả Obama',      lat:21.0275,lng:105.8555,rating:5,note:'Nơi Obama từng ăn! Bún chả + nem rán chuẩn vị 🇺🇸', createdAt:{toDate:()=>new Date(Date.now()-7200e3)}},
  {id:'d3',userId:'demo',userName:'ChillChef#4401', placeName:'Bánh Mì 25',         lat:21.0310,lng:105.8510,rating:4,note:'Bánh mì pate ngon + giá rất hợp lý',               createdAt:{toDate:()=>new Date(Date.now()-86400e3)}},
  {id:'d4',userId:'demo',userName:'HotKing#7772',   placeName:'Cơm Tấm Sài Gòn',    lat:21.0260,lng:105.8580,rating:4,note:'Sườn dày, cơm tấm authentic, ngon thật sự 😋',      createdAt:{toDate:()=>new Date(Date.now()-172800e3)}},
  {id:'d5',userId:'demo',userName:'NgonFoodie#2847',placeName:'Quán Mắm Kinh Hoàng',lat:21.0320,lng:105.8500,rating:2,note:'Mùi quá nồng, không phải khẩu vị mình 😅',         createdAt:{toDate:()=>new Date(Date.now()-259200e3)}},
  {id:'d6',userId:'demo',userName:'MlemEater#9123', placeName:'Bún Bò Huế Ngọc',    lat:21.0240,lng:105.8565,rating:5,note:'Bún bò đậm vị nhất HN! Phải thêm huyết nha 🔥',    createdAt:{toDate:()=>new Date(Date.now()-18000e3)}},
  {id:'d7',userId:'demo',userName:'YummyStar#3390', placeName:'Trà Sữa Gong Cha',   lat:21.0285,lng:105.8545,rating:3,note:'Ổn nhưng hơi ngọt, nhớ order ít đường thôi',       createdAt:{toDate:()=>new Date(Date.now()-43200e3)}},
];

function loadDemoReviews() {
  if (S.reviews.some(r=>r.id==='d1')) return; // already loaded
  DEMO.forEach(r=>{ 
    if (!S.reviews.some(x=>x.id===r.id)) { S.reviews.push(r); putRevMarker(r); } 
  });
  updateRevBadge();
}

function saveLocalReviews() {
  const rs = S.reviews.filter(r => String(r.id).startsWith('loc-')).map(r => ({
    ...r, createdAt: r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : new Date().toISOString()
  }));
  localStorage.setItem('localReviews', JSON.stringify(rs));
}

function loadLocalReviews() {
  try {
    const rs = JSON.parse(localStorage.getItem('localReviews') || '[]');
    rs.forEach(r => {
      r.createdAt = { toDate: () => new Date(r.createdAt) };
      if (!S.reviews.some(x=>x.id===r.id)) { S.reviews.push(r); putRevMarker(r); }
    });
    updateRevBadge();
  } catch(e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// §25 · EVENT LISTENERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function loginAsGuest() {
  const uid  = 'guest-' + Date.now();
  const name = 'Khách viếng thăm';
  const user = { uid, name, createdAt: Date.now() };
  S.user = user;
  toast('👋 Đang xem với tư cách Khách!', 'ok', 2500);
  showMainApp();
}

function setupEvents() {

  // ── LOGIN: Home ──
  D.btnHomeCreate.addEventListener('click', createAccount);
  D.btnHomeLogin .addEventListener('click', () => showLoginSub('login'));
  D.btnHomeSkip?.addEventListener('click', loginAsGuest);

  // ── LOGIN: QR Show ──
  D.btnBackQr.addEventListener('click', () => showLoginSub('home'));
  D.btnDownloadQr.addEventListener('click', () => {
    if (!S.user) return;
    downloadQRCard(D.qrLoginCanvas, S.user.name, 'login');
  });
  D.btnEnterApp.addEventListener('click', () => showMainApp());
  addRipple(D.btnEnterApp);

  // ── LOGIN: Upload ──
  D.btnBackLogin.addEventListener('click', () => showLoginSub('home'));
  D.btnUploadLoginTrigger.addEventListener('click', () => D.qrUploadLogin.click());
  D.qrUploadLogin.addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    D.loginUploadStatus.classList.remove('hidden');
    try {
      const data = await parseQRFromFile(file);
      loginFromQRData(data);
    } catch {
      toast('❌ Không tìm thấy mã QR trong ảnh!', 'err');
    } finally {
      D.loginUploadStatus.classList.add('hidden');
      e.target.value = '';
    }
  });

  // ── LOGIN: Camera ──
  D.btnLoginCamera.addEventListener('click', () => showLoginSub('scan'));
  D.btnBackScan  .addEventListener('click', () => showLoginSub('login'));

  // ── MAIN: Header ──
  D.btnMyProfile    .addEventListener('click', () => { openMyProfile(); refreshMyProfileFriendList(); });
  D.btnFriendsHeader.addEventListener('click', () => { openMyProfile(); refreshMyProfileFriendList(); });

  // ── MY PROFILE SHEET ──
  D.btnCloseMyProfile.addEventListener('click', closeMyProfile);
  D.ovMyProfile.addEventListener('click', e => { if(e.target===D.ovMyProfile) closeMyProfile(); });
  D.btnDownloadMyQr .addEventListener('click', () => downloadQRCard(D.myProfileQrCanvas, S.user?.name||'user', 'friend'));
  D.btnOpenAddFriend.addEventListener('click', openAddFriendModal);
  D.btnLogout       .addEventListener('click', () => { if(confirm('Đăng xuất khỏi FOOD DROP?')) logout(); });

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
  console.log('🚀 FOOD DROP v3.0 booting...');
  registerSW();
  initFirebase();
  setupEvents();

  if (tryAutoLogin()) {
    console.log('✅ Auto-login:', S.user.name);
    showMainApp();
  } else {
    showLoginScreen();
  }
  console.log('✅ FOOD DROP ready!');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
