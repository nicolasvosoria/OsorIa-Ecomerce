# Osoria E-commerce

E-commerce platform built with Next.js 16, React 19, Supabase, and Shopify integration.

## 🚀 Deployment

**Live URL:** [https://osor-ia-ecomerce.vercel.app](https://osor-ia-ecomerce.vercel.app)

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account
- (Optional) Shopify store

## 🛠️ Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Optional Variables:**
- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` - Your Shopify store domain
- `NEXT_PUBLIC_SITE_URL` - Your production URL (auto-detected in Vercel)

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Deploy to Vercel

### Automatic Deployment

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` (if using Shopify)
   - `NEXT_PUBLIC_SITE_URL` (optional, defaults to VERCEL_URL)

### Supabase Configuration

After deploying, configure Supabase redirect URLs:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to **Site URL**: `https://osor-ia-ecomerce.vercel.app`
3. Add to **Redirect URLs**:
   - `https://osor-ia-ecomerce.vercel.app/auth/callback`
   - `https://osor-ia-ecomerce.vercel.app/auth/reset-password`

## 🏗️ Build

```bash
pnpm build
pnpm start
```

## 📚 Tech Stack

- **Framework:** Next.js 16
- **React:** 19.2.1
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **E-commerce:** Shopify (optional)
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI

## 🔧 Features

- ✅ User authentication (sign up, sign in, password recovery)
- ✅ Product catalog with categories
- ✅ Shopping cart
- ✅ Responsive design
- ✅ Theme customization
- ✅ Chatbot support
- ✅ Admin panel

## 📝 License

Private project - All rights reserved
