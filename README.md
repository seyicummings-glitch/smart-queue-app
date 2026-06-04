# SmartQueue — Queue Management System

A full-stack Queue Management System built with React Native (Expo) and Django REST Framework.

---

## Project Structure

```
SmartQueueApp/
│
├── 📱 FRONTEND — React Native / Expo
│   ├── app/                  ← All screens
│   │   ├── customer/         ← Customer screens
│   │   ├── staff/            ← Staff screens
│   │   ├── admin/            ← Admin screens
│   │   └── notifications.tsx ← Notifications
│   ├── components/           ← Reusable UI components
│   ├── context/              ← Global state (Auth, App, Notifications)
│   ├── lib/                  ← API client (lib/api.ts)
│   ├── assets/               ← Images and fonts
│   ├── package.json          ← Frontend dependencies
│   └── app.json              ← Expo configuration
│
└── 🔧 BACKEND — Django REST API
    └── backend/
        ├── accounts/         ← User auth, roles, JWT
        ├── appointments/     ← Appointment booking
        ├── branches/         ← Branch management
        ├── businesses/       ← Business & industry
        ├── notifications/    ← Notifications & messaging
        ├── queues/           ← Live queue management
        ├── services/         ← Services per industry
        ├── analytics/        ← Reports & analytics
        └── manage.py         ← Django CLI
```

---

## Tech Stack

| Layer    | Technology                      |
|----------|---------------------------------|
| Frontend | React Native, Expo, TypeScript  |
| Backend  | Django, Django REST Framework   |
| Auth     | JWT (SimpleJWT)                 |
| Database | PostgreSQL (Railway)            |
| Hosting  | Railway                         |

---

## Running the App

### Frontend
```bash
npx expo start
```
Scan the QR code with **Expo Go** on your phone.

### Backend
```bash
cd backend
python manage.py runserver
```

---

## User Roles

| Role        | Access                                               |
|-------------|------------------------------------------------------|
| Customer    | Book appointments, join queue, support tickets       |
| Staff       | Manage counter, assigned queue & appointments        |
| Admin       | Manage branch employees & appointments (own branch)  |
| Super Admin | Full platform access — all businesses & analytics    |
