# HookaDrop Dashboard Setup Guide

## Quick Start

Follow these steps to get the dashboard up and running:

### Step 1: Install Dependencies

```bash
cd dashboard
npm install
```

### Step 2: Configure Environment (Optional)

Copy the example environment file:
```bash
cp .env.example .env
```

The default configuration works with the backend on `localhost:8000`.

### Step 3: Start Development Server

```bash
npm run dev
```

The dashboard will open at `http://localhost:3000`

### Step 4: Login

Use these credentials to access the dashboard:
- **Email**: admin@hookadrop.com
- **Password**: admin123

(Note: Make sure you have an admin user in your backend database)

## Backend Setup Required

The dashboard requires the backend API to be running. Make sure:

1. The backend server is running on port 8000
2. MongoDB is connected
3. You have at least one admin user in the database

### Create Admin User

If you don't have an admin user, you can create one by running this in your backend:

```javascript
// In your backend, create a script or use MongoDB directly
{
  "name": "Admin",
  "email": "admin@hookadrop.com",
  "password": "admin123", // Will be hashed automatically
  "isAdmin": true
}
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, you can change it in `vite.config.js`:

```javascript
server: {
  port: 3001, // Change to any available port
}
```

### API Connection Issues

If the dashboard can't connect to the backend:

1. Check that the backend is running on port 8000
2. Verify CORS is enabled in your backend
3. Check the proxy configuration in `vite.config.js`

### Authentication Issues

If you can't log in:

1. Verify the user exists in the database
2. Check that `isAdmin: true` for the user
3. Check browser console for error messages
4. Verify the backend `/api/login` endpoint is working

## Production Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### Environment Variables for Production

Create a `.env.production` file:

```env
VITE_API_URL=https://your-api-domain.com/api
```

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Drag and drop the `dist/` folder to Netlify

3. Configure the API URL in environment variables

### Deploy with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://backend:8000;
    }
}
```

Build and run:
```bash
docker build -t hookadrop-dashboard .
docker run -p 80:80 hookadrop-dashboard
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Features Checklist

After setup, you should have access to:

- ✅ Login page with authentication
- ✅ Dashboard with analytics and charts
- ✅ Products management (CRUD)
- ✅ Orders management with status updates
- ✅ Order detail view
- ✅ Users management
- ✅ Categories management
- ✅ Responsive design (mobile, tablet, desktop)

## Next Steps

1. Customize the branding (colors, logo)
2. Add your own product categories
3. Configure Cloudinary for image uploads
4. Set up email notifications
5. Add more analytics features
6. Implement additional filtering options

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Check the network tab for API call failures
3. Verify the backend logs
4. Check that all dependencies are installed correctly

For additional help, refer to the main README.md file.
