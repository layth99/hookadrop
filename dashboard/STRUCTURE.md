# Dashboard Visual Structure

## Application Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN PAGE                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    HookaDrop                            │   │
│  │                 Admin Dashboard                         │   │
│  │                                                         │   │
│  │  Email:    [admin@hookadrop.com            ]           │   │
│  │  Password: [••••••••                       ]           │   │
│  │                                                         │   │
│  │           [  Sign In  ]                                │   │
│  │                                                         │   │
│  │  Demo Credentials:                                     │   │
│  │  Email: admin@hookadrop.com                            │   │
│  │  Password: admin123                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
                        ┌────────────────┐
                        │  AUTHENTICATED │
                        └────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN DASHBOARD LAYOUT                       │
│                                                                  │
│  ┌──────────────┬──────────────────────────────────────────┐   │
│  │              │  HEADER                                   │   │
│  │   SIDEBAR    │  [Search...]  [🔔] [Admin Profile]       │   │
│  │              ├──────────────────────────────────────────┤   │
│  │ HookaDrop    │                                           │   │
│  │              │           PAGE CONTENT AREA              │   │
│  │ 📊 Dashboard │                                           │   │
│  │ 📦 Products  │    (Dashboard / Products / Orders /      │   │
│  │ 🛒 Orders    │     Users / Categories)                  │   │
│  │ 👥 Users     │                                           │   │
│  │ 🏷️ Categories│                                           │   │
│  │              │                                           │   │
│  │              │                                           │   │
│  │ 🚪 Logout    │                                           │   │
│  └──────────────┴──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Page Layouts

### 📊 Dashboard Page

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard                                                    │
│  Welcome back! Here's what's happening today.                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐│
│  │💰 Revenue  │  │🛒 Orders   │  │📦 Products │  │👥Users ││
│  │ $12,450.50 │  │    248     │  │    156     │  │  1,234││
│  │ ↗ +12.5%   │  │ ↗ +8.2%    │  │ ↘ -2.4%    │  │↗+15.3%││
│  └────────────┘  └────────────┘  └────────────┘  └────────┘│
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  Sales Overview      │  │  Order Status        │        │
│  │  ╭──────────────────╮│  │                      │        │
│  │  │  Line Chart      ││  │    Pie Chart         │        │
│  │  │  (7 days)        ││  │    (Status Dist.)    │        │
│  │  ╰──────────────────╯│  │                      │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                               │
│  Recent Orders                                    View All → │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Order ID │ Customer │ Date │ Status │ Total          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ #ABC1234 │ John Doe │ ...  │ ✓ Paid │ $150.00       │  │
│  │ #ABC1235 │ Jane S.  │ ...  │ ⏳ Pend│ $89.50        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 📦 Products Page

```
┌──────────────────────────────────────────────────────────────┐
│  Products                               [+ Add Product]       │
│  Manage your product catalog                                 │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐  156 products  │
│  │ 🔍 Search products...                   │                │
│  └─────────────────────────────────────────┘                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Image │ Name       │ Category │ Price │ Stock │ ⚙️   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ [img] │ Product 1  │ Electronics│$99│50 units│✏️ 🗑️ │  │
│  │ [img] │ Product 2  │ Clothing   │$45│120 units│✏️🗑️  │  │
│  │ [img] │ Product 3  │ Home       │$78│5 units │✏️ 🗑️ │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 📝 Product Form (Add/Edit)

```
┌──────────────────────────────────────────────────────────────┐
│  ← Add New Product                                            │
│     Fill in the details below                                │
├──────────────────────────────────────────────────────────────┤
│  Basic Information                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Product Name *                                        │  │
│  │ [                                                     ]│  │
│  │                                                        │  │
│  │ Description *                                          │  │
│  │ [                                                     ]│  │
│  │ [                                                     ]│  │
│  │                                                        │  │
│  │ Brand *          Category *                           │  │
│  │ [            ]   [▼ Select category            ]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  Pricing & Stock                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Price *    Discount (%)    Stock *                    │  │
│  │ [      ]   [           ]   [     ]                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  Product Images                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────┐│
│  │ Image 1 *  │  │ Image 2 *  │  │ Image 3    │  │Image4││
│  │ [URL     ] │  │ [URL     ] │  │ [URL     ] │  │[URL ]││
│  │ [Upload] │  │ [Upload] │  │ [Upload] │  │[Upl] ││
│  │ [Preview]  │  │ [Preview]  │  │ [Preview]  │  │[Prev]││
│  └────────────┘  └────────────┘  └────────────┘  └──────┘│
│                                                               │
│                               [Cancel] [Create Product]      │
└──────────────────────────────────────────────────────────────┘
```

### 🛒 Orders Page

```
┌──────────────────────────────────────────────────────────────┐
│  Orders                                                       │
│  Manage and track all orders                                 │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────┐ [▼All Status] 248 orders  │
│  │ 🔍 Search by order ID...     │                            │
│  └──────────────────────────────┘                            │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │Order│Customer│Date│Items│Total│Status│Payment│⚙️    │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │#123 │John D. │... │ 3   │$150 │✓Deliv│💳Paid│👁 🔄 │  │
│  │#124 │Jane S. │... │ 1   │$89  │⏳Pend│❌Unp│👁 🔄  │  │
│  │#125 │Bob W.  │... │ 5   │$450 │📦Ship│💳Paid│👁 🔄 │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 📄 Order Detail Page

```
┌──────────────────────────────────────────────────────────────┐
│  ← Order #ABC1234                    [📄 Download Invoice]   │
│     Feb 15, 2024, 10:30 AM                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────┐  ┌──────────────────────┐ │
│  │ 📦 Order Items              │  │ Order Status         │ │
│  │                             │  │                      │ │
│  │ [img] Product Name          │  │ Status: ✓ Delivered  │ │
│  │       Brand                 │  │ Payment: 💳 Paid     │ │
│  │       Qty: 2    $99.00      │  │ Paid At: Feb 15      │ │
│  │ ─────────────────────────── │  │ Delivery: ✓ Yes      │ │
│  │ [img] Product Name 2        │  │ Delivered: Feb 20    │ │
│  │       Brand                 │  └──────────────────────┘ │
│  │       Qty: 1    $50.00      │                           │
│  │                             │  ┌──────────────────────┐ │
│  │ ─────────────────────────── │  │ 💳 Payment Method    │ │
│  │ Subtotal         $149.00    │  │                      │ │
│  │ Tax              $1.00      │  │ Credit Card          │ │
│  │ Shipping         $7.00      │  └──────────────────────┘ │
│  │ ─────────────────────────── │                           │
│  │ Total            $150.00    │  ┌──────────────────────┐ │
│  └─────────────────────────────┘  │ 👤 Customer          │ │
│                                    │                      │ │
│  ┌─────────────────────────────┐  │ John Doe             │ │
│  │ 📍 Shipping Address         │  │ john@example.com     │ │
│  │                             │  └──────────────────────┘ │
│  │ John Doe                    │                           │
│  │ 123 Main St                 │                           │
│  │ +1 234-567-8900             │                           │
│  │ john@example.com            │                           │
│  └─────────────────────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

### 👥 Users Page

```
┌──────────────────────────────────────────────────────────────┐
│  Users                                                        │
│  Manage user accounts and permissions                        │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐  1,234 users       │
│  │ 🔍 Search users...                  │                    │
│  └─────────────────────────────────────┘                    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ User       │ Role   │ Phone │ Location │ Joined│⚙️   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ [A] Admin  │ Admin  │ +123  │ NY, USA  │ Jan 1 │🛡️  │  │
│  │ [J] John D.│ Cust.  │ +456  │ LA, USA  │ Feb 5 │🛡️  │  │
│  │ [J] Jane S.│ Cust.  │ +789  │ TX, USA  │ Mar 2 │🛡️  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 🏷️ Categories Page

```
┌──────────────────────────────────────────────────────────────┐
│  Categories                              [+ Add Category]     │
│  Organize your products into categories                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Name        │ Description          │ Created │ ⚙️     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Electronics │ Electronic devices   │ Jan 1   │ ✏️ 🗑️ │  │
│  │ Clothing    │ Apparel and fashion  │ Jan 5   │ ✏️ 🗑️ │  │
│  │ Home        │ Home & kitchen items │ Jan 10  │ ✏️ 🗑️ │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App
├── Login
└── Layout
    ├── Sidebar
    │   ├── Logo
    │   ├── Navigation Links
    │   └── Logout Button
    ├── Header
    │   ├── Search Bar
    │   ├── Notifications
    │   └── User Profile
    └── Main Content (Outlet)
        ├── Dashboard
        │   ├── StatCard (x4)
        │   ├── LineChart (Sales)
        │   ├── PieChart (Status)
        │   └── Table (Recent Orders)
        ├── Products
        │   ├── Search & Filter
        │   ├── Table
        │   └── Modal (Delete Confirm)
        ├── ProductForm
        │   └── Form Fields
        ├── Orders
        │   ├── Search & Filter
        │   ├── Table
        │   └── Modal (Update Status)
        ├── OrderDetail
        │   ├── Order Items
        │   ├── Shipping Info
        │   └── Status Cards
        ├── Users
        │   ├── Search
        │   └── Table
        └── Categories
            ├── Table
            ├── Modal (Add/Edit)
            └── Modal (Delete Confirm)
```

## State Management

```
Zustand Store (authStore)
├── user (object)
├── token (string)
├── isAuthenticated (boolean)
├── login(userData, token)
├── logout()
├── updateUser(userData)
└── init() - Load from localStorage
```

## API Flow

```
Component → api.js (Axios) → Backend API
              ↓
       Add JWT Token
              ↓
       Handle Response
              ↓
    Update Component State
              ↓
     Show Toast Notification
```

## Color Scheme

```
Primary Colors:
- primary-50   : #f0f9ff (very light blue)
- primary-100  : #e0f2fe
- primary-500  : #0ea5e9 (main blue)
- primary-600  : #0284c7 (darker blue)

Status Colors:
- Success : Green (#10b981)
- Warning : Yellow (#f59e0b)
- Danger  : Red (#ef4444)
- Info    : Blue (#0ea5e9)
- Gray    : Gray (#6b7280)
```

## Responsive Breakpoints

```
Mobile      : 320px - 767px
Tablet      : 768px - 1023px
Desktop     : 1024px - 1279px
Large       : 1280px+
```
