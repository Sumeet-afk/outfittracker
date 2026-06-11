# 👗 OutfitTracker

A privacy-first, cross-platform application for wardrobe digitization, wear-tracking, laundry management, and AI outfit generation. Built with **React Native (Expo)**, **Supabase**, and local **WASM AI models**.

---

## ✨ Features

- **Wardrobe Digitization**: Add clothing items via camera or gallery.
- **On-Device AI Background Removal**: Instantly cut out clothing backgrounds locally in your browser using `@imgly/background-removal`. No photos are sent to the cloud!
- **AI Clothing Generation**: Describe an item (e.g., "red leather jacket") and generate it instantly using the Hugging Face Stable Diffusion API.
- **Smart Laundry Engine**: Automatically tracks wear counts and alerts you when items hit their "wash threshold."
- **Visual Calendar Log**: Drag and drop items onto a calendar to log what you wore each day.
- **Cross-Platform**: Runs flawlessly on Web, iOS, and Android from a single codebase.

---

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 55
- **Routing**: Expo Router (File-based routing)
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **State Management**: Zustand + TanStack Query
- **Local AI**: `@imgly/background-removal` (WASM)
- **Cloud AI**: Hugging Face Inference API

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Supabase Project ([supabase.com](https://supabase.com))
- A free Hugging Face API Token (for AI Generation)

### 2. Environment Setup
Create a `.env.local` file in the root directory and add your keys:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_anon_key
EXPO_PUBLIC_HUGGINGFACE_TOKEN=your_hugging_face_token
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
Run the SQL migration located in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor to set up the tables and Row Level Security (RLS) policies.

### 5. Run the App
To start the web version locally:
```bash
npm run web
```
To run on iOS/Android (requires Expo Go or Dev Build):
```bash
npm start
```

---

## 🔒 Privacy & Security First
- Uses strict **Row Level Security (RLS)** in Supabase to ensure users can only ever access their own wardrobe data and images.
- Background removal is performed **on-device** using WASM models, ensuring your bedroom/personal photos are never uploaded to any cloud server for processing.