# 📦 StudyNest Ecosystem Monorepo - Backend, Web Client & Mobile App

![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-Web_Client-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-Mobile_App-000000?style=for-the-badge&logo=expo&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

Monorepo chứa toàn bộ mã nguồn của hệ sinh thái học tập **StudyNest**, bao gồm 3 dự án thành phần hợp nhất trong một kho lưu trữ duy nhất.

---

## 📂 Cấu Trúc Thư Mục Monorepo

```
hoctap/
├── backend/            # FastAPI Python REST API & PostgreSQL Database Scripts
├── frontend/           # Web Client Next.js & Online Code Editor CodeMirror
└── mobile/             # Mobile Application Expo React Native (iOS & Android)
```

---

## 🚀 Khởi Chạy Từng Dự Án

### 1. Khởi chạy Backend API:
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Khởi chạy Web Client:
```bash
cd frontend
npm install
npm run dev
```

### 3. Khởi chạy Mobile App:
```bash
cd mobile
npm install
npx expo start
```

---

## 👨‍💻 Tác Giả

**Nguyễn Xuân Huỳnh** — [GitHub Profile](https://github.com/nguyenhuynhdt37)
