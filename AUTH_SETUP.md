# Authentication Setup Guide

## Overview
This project now includes a complete authentication system using Supabase Auth. Users can sign up and sign in with email and password.

## Environment Variables Required

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration (Required for authentication and database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Gemini API Configuration (Required for AI processing)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Development Configuration
NODE_ENV=development
```

## Getting Your Supabase Keys

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project or select your existing project
3. Go to Settings → API
4. Copy the following:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## Features Implemented

### 1. Authentication Context (`src/contexts/AuthContext.tsx`)
- Manages user state globally
- Provides sign in, sign up, and sign out functions
- Handles authentication state changes

### 2. Login/Signup Page (`src/pages/login.tsx`)
- Combined login and signup forms
- Email and password authentication
- Form validation with Zod
- Beautiful UI with Shadcn components
- Password visibility toggle
- Error handling and loading states
- Redirect to return URL after successful login

### 3. Protected Routes
- Updated `/course/[id]/index.tsx` to require authentication
- Added `useRequireAuth` hook for easy route protection
- Automatic redirect to login with return URL

### 4. Header Authentication
- Sign in button for unauthenticated users
- User dropdown with email and sign out option
- Seamless integration with existing header

## Usage

### Protecting a Route
```typescript
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function ProtectedPage() {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <div>Protected content for {user.email}</div>;
}
```

### Using Auth in Components
```typescript
import { useAuth } from '../contexts/AuthContext';

export default function MyComponent() {
  const { user, signOut } = useAuth();

  if (user) {
    return (
      <div>
        Welcome, {user.email}!
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  return <div>Please sign in</div>;
}
```

## Supabase Configuration

Make sure your Supabase project has:
1. **Email authentication enabled** (should be enabled by default)
2. **Email confirmation enabled** (optional, can be disabled for development)
3. **Site URL set** to your domain (e.g., `http://localhost:3000` for development)

## Email Confirmation

By default, Supabase requires email confirmation for new users. For development, you can:
1. Check your email for confirmation links
2. Or disable email confirmation in your Supabase project settings

## Next Steps

1. Set up your environment variables
2. Test the authentication flow
3. Customize the login page styling if needed
4. Add additional OAuth providers if desired
5. Implement user profiles and additional user data

## Troubleshooting

- **"Invalid JWT"**: Check that your environment variables are correct
- **"Email not confirmed"**: Check your email for confirmation link or disable email confirmation
- **Redirect loops**: Ensure your site URL is set correctly in Supabase settings 