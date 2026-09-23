# HookaDrop Dashboard

A modern, responsive admin dashboard for managing your HookaDrop e-commerce platform.

## Features

### 📊 Dashboard Overview
- Real-time sales statistics
- Revenue tracking
- Order and product metrics
- Customer analytics
- Interactive charts and graphs

### 📦 Product Management
- Add, edit, and delete products
- Product image upload
- Category management
- Stock tracking
- Discount management

### 🛒 Order Management
- View all orders
- Order status updates
- Order details view
- Customer information
- Payment tracking
- Invoice generation

### 👥 User Management
- View all users
- Admin role management
- User activity tracking

### 🏷️ Category Management
- Create and manage product categories
- Category descriptions

## Tech Stack

- **React 18** - UI library
- **React Router** - Navigation
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Zustand** - State management
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API running on port 8000

### Installation

1. Navigate to the dashboard directory:
```bash
cd dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Production Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
dashboard/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Layout.jsx
│   │   ├── Modal.jsx
│   │   ├── Table.jsx
│   │   ├── StatCard.jsx
│   │   └── Loader.jsx
│   ├── pages/          # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Products.jsx
│   │   ├── ProductForm.jsx
│   │   ├── Orders.jsx
│   │   ├── OrderDetail.jsx
│   │   ├── Users.jsx
│   │   └── Categories.jsx
│   ├── store/          # State management
│   │   └── authStore.js
│   ├── utils/          # Utilities
│   │   ├── api.js
│   │   └── formatters.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## API Integration

The dashboard communicates with the backend API through `/api` endpoints:

- `POST /api/login` - Authentication
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order status
- `GET /api/users` - Get all users
- `PUT /api/users/:id` - Update user
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## Authentication

The dashboard uses JWT authentication. Admin users must have `isAdmin: true` to access the dashboard.

**Demo Credentials:**
- Email: `admin@hookadrop.com`
- Password: `admin123`

## Features in Detail

### Dashboard Analytics
- Total revenue with trend indicators
- Order count and growth metrics
- Product inventory status
- Customer base growth
- 7-day sales chart
- Order status distribution pie chart
- Recent orders list

### Product Management
- Multi-image upload support
- Cloudinary integration
- Search and filter products
- Category-based organization
- Stock level indicators
- Discount pricing

### Order Management
- Advanced order filtering
- Status update workflow
- Customer information display
- Order item details
- Payment status tracking
- Delivery tracking
- Invoice generation

### User Management
- Role-based access control
- Admin privilege management
- User activity overview

## Customization

### Colors
Edit `tailwind.config.js` to change the primary color:
```js
colors: {
  primary: {
    // Your color palette
  }
}
```

### API Endpoint
Change the API endpoint in `vite.config.js`:
```js
proxy: {
  '/api': {
    target: 'http://your-backend-url',
  }
}
```

## Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload the dist/ folder
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
