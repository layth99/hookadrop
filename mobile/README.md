# HookaDrop Mobile App

A React Native (Expo) mobile app for the HookaDrop hookah e-commerce platform.

## Design
- **Theme**: Dark background `#0A0A0A` with neon gold `#FFD700` and neon blue `#00D9FF`
- **Style**: Premium luxury hookah brand aesthetic

## Screens

| Screen | Description |
|--------|-------------|
| Splash | Animated logo with glow effect |
| Onboarding | 3-slide carousel with hookah illustrations |
| Login | Email/password + social auth (Apple, Google, Facebook) |
| Register | Name/email/password sign-up |
| Forgot Password | Email entry |
| Verify Code | 4-digit OTP boxes with countdown resend |
| New Password | Password reset form |
| Home | Banner carousel, categories, sale + new arrivals, product grid |
| Products | Full catalog with sort/filter modal |
| Product Detail | Image gallery, quantity picker, add to cart |
| Cart | Items list, qty control, order summary |
| Checkout | 3-step: Delivery → Payment → Confirm |
| Order Success | Animated success screen |
| Orders | My orders list with status badges |
| Order Detail | Tracking timeline, delivery info, price summary |
| Wishlist | Saved products grid |
| Profile | Avatar, edit form, menu, logout |

## Project Structure

```
mobile/
├── App.jsx                    # Entry point
├── app.json                   # Expo config
├── babel.config.js
├── package.json
└── src/
    ├── theme/                 # colors, typography, spacing
    ├── components/ui/         # Button, Input, Card, Badge, Header, ProductCard…
    ├── screens/
    │   ├── auth/              # Splash, Onboarding, Login, Register, ForgotPassword, VerifyCode, NewPassword
    │   └── main/              # Home, Products, ProductDetail, Cart, Checkout, Orders, OrderDetail, Wishlist, Profile
    ├── navigation/            # AppNavigator (stack + bottom tabs)
    ├── store/                 # Zustand stores (auth, product, cart, wishlist, order)
    └── services/              # api.js, authService, productService, orderService
```

## Setup

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Configure backend URL
```bash
cp .env.example .env
```
Edit `.env` and set `EXPO_PUBLIC_API_URL` to your backend server IP:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api
```
> To find your IP on Windows: run `ipconfig` and use the IPv4 address.

### 3. Start the app
```bash
npm start
```
Then scan the QR code with **Expo Go** on your phone (must be on the same Wi-Fi network).

Or run on emulator:
```bash
npm run android   # Android emulator
npm run ios       # iOS simulator (macOS only)
```

## Backend
The backend lives in the parent directory (`e-commerce-backend-main`).  
Start it with:
```bash
cd ../
npm start
```
Make sure MongoDB is running and the `.env` is configured.

## Dependencies
| Package | Purpose |
|---------|---------|
| `expo` | React Native toolchain |
| `expo-linear-gradient` | Gold/blue gradient effects |
| `@react-navigation/native` + `native-stack` + `bottom-tabs` | Navigation |
| `@expo/vector-icons` | Ionicons throughout the UI |
| `zustand` | Lightweight state management |
| `@react-native-async-storage/async-storage` | Persist cart, wishlist, auth token |
| `react-native-safe-area-context` | Notch/island safe areas |
| `react-native-reanimated` | Smooth animations |
