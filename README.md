# 🍜 FOOD DROP - PWA Bản đồ Quán Ăn Hội Bạn Thân

> **Bản đồ đánh giá & săn quán ăn realtime dành cho hội bạn thân** — Powered by Firebase + Leaflet.js + OpenStreetMap

---

## 📁 Cấu trúc dự án

```
food-drop/
├── index.html          ← Toàn bộ UI (HTML + Tailwind CSS)
├── app.js              ← Toàn bộ Logic (Firebase, Leaflet, Geo, PWA)
├── manifest.json       ← PWA Manifest (installable app)
├── sw.js               ← Service Worker (offline cache)
├── generate_icons.py   ← Script tạo PWA icons
├── icons/              ← Thư mục chứa icon PNG các size
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
└── README.md
```

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY

### Bước 1: Tạo Firebase Project

1. Vào **[Firebase Console](https://console.firebase.google.com/)** → Tạo project mới
2. **Authentication** → Sign-in method → Bật **Google**
3. **Firestore Database** → Tạo database → Chọn mode **Test** (hoặc xem Rules bên dưới)
4. **Project Settings** → **Your apps** → Thêm Web App → Copy **Firebase SDK config**

### Bước 2: Cấu hình Firebase trong `app.js`

Mở file `app.js`, tìm phần `FIREBASE_CONFIG` và thay thế:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",           // ← Thay bằng key thật
  authDomain:        "my-project.firebaseapp.com",
  projectId:         "my-project",
  storageBucket:     "my-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

### Bước 3: Thêm Firestore Security Rules

> ℹ️ App v2.0 không dùng Firebase Auth nữa, dùng rules mở cho nhóm bạn:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Mở hoàn toàn cho hội bạn thân (không cần đăng nhập Firebase)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ **LƯU Ý BẢO MẬT**: Rules này mở hoàn toàn, chỉ phù hợp cho nhóm bạn tin cậy.
> Nếu cần bảo vệ hơn, thêm check theo `userId` (UID tự generate của app).

### Bước 4: Deploy và chạy

**Cách A - Chạy local bằng Live Server (VS Code):**
```bash
# Cài extension "Live Server" trên VS Code
# Click chuột phải vào index.html → "Open with Live Server"
```

**Cách B - Deploy lên Firebase Hosting (Miễn phí):**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # Chọn thư mục public = ./
firebase deploy
```

**Cách C - Deploy nhanh bằng Vercel:**
```bash
npm i -g vercel
vercel --yes
```

> ⚠️ **LƯU Ý QUAN TRỌNG**: PWA (Service Worker) **CHỈ hoạt động trên HTTPS** hoặc `localhost`.  
> Không mở file `index.html` trực tiếp bằng `file://` protocol sẽ bị lỗi SW.

---

## 🎮 DEMO MODE (Không cần Firebase)

Khi `apiKey = "YOUR_API_KEY"` (chưa đổi), app tự động chạy **Demo Mode**:
- Hiển thị 7 quán ăn mẫu ở Hà Nội trên bản đồ
- Có thể thêm quán mới (lưu tạm trong RAM, không có backend)
- Thử tính năng "Vòng quay chốt quán" với dữ liệu mẫu
- **KHÔNG** cần đăng nhập Google

---

## ✨ CÁC TÍNH NĂNG

| Tính năng | Mô tả |
|-----------|-------|
| 🗺️ **Bản đồ Realtime** | Leaflet + OpenStreetMap, tự canh về vị trí GPS |
| 📍 **Thêm quán** | Long-press trên bản đồ hoặc nút + |
| ⭐ **Đánh giá 1-5★** | Màu marker thay đổi theo sao (🟢🟡🔴) |
| 🔴🟡🟢 **Màu marker** | 5★=Xanh lá, 3-4★=Vàng, 1-2★=Đỏ |
| 🎰 **Vòng quay chốt quán** | Random quán 4-5★ trong bán kính 5km |
| 👥 **Realtime sync** | Nhiều người dùng thấy review ngay lập tức |
| 🔐 **Google Auth** | Đăng nhập bằng tài khoản Google |
| 📱 **PWA** | Cài lên màn hình điện thoại như app native |
| 🔌 **Offline** | Cache tài nguyên tĩnh bằng Service Worker |

---

## 🎨 THIẾT KẾ UI

- **Dark Mode**: Nền `#0f172a` (slate-900), card `#1e293b`
- **Font**: Be Vietnam Pro (Google Fonts)
- **Brand color**: `#f97316` (cam - Orange-500)
- **Mobile-first**: Tối ưu cho màn hình 390px (iPhone)
- **Bản đồ full-screen** với các nút FAB dạng floating overlay

---

## 📊 SCHEMA FIRESTORE

```
Collection: users
├── uid: string
├── name: string
├── email: string
├── photoURL: string
├── currentLat: number
├── currentLng: number
└── updatedAt: timestamp

Collection: reviews
├── id: string (auto)
├── userId: string
├── userName: string
├── userAvatar: string
├── placeName: string
├── lat: number
├── lng: number
├── rating: number (1-5)
├── note: string
└── createdAt: timestamp
```

---

## 🔧 TÙY CHỈNH

Trong `app.js`, tìm `DEFAULTS` để thay đổi:

```javascript
const DEFAULTS = {
  MAP_CENTER:  [21.0285, 105.8542], // Tâm bản đồ mặc định (Hà Nội)
  MAP_ZOOM:    15,                   // Zoom level
  PICKER_RADIUS_KM: 5,              // Bán kính vòng quay (km)
  MIN_STARS_FOR_PICKER: 4,          // Số sao tối thiểu để vào vòng quay
};
```

---

## 📱 CÀI LÊN ĐIỆN THOẠI (PWA)

**Android Chrome:**
1. Mở app trên Chrome
2. Menu (⋮) → "Add to Home screen"
3. Nhấn "Install"

**iPhone Safari:**
1. Mở app trên Safari
2. Share button (□↑) → "Add to Home Screen"
3. Nhấn "Add"

---

## 🛠️ TECH STACK

- **Frontend**: HTML5 + Vanilla JavaScript ES6+
- **Styling**: Tailwind CSS (CDN) + Custom CSS
- **Map**: Leaflet.js v1.9.4 + OpenStreetMap (FREE, không cần API key)
- **Auth**: Firebase Authentication (Google)
- **Database**: Firebase Cloud Firestore (Realtime)
- **PWA**: Service Worker + Web App Manifest
- **GPS**: Geolocation API (`watchPosition`)

---

*Made with ❤️ by FOOD DROP Dev Team*
# Food-drop
