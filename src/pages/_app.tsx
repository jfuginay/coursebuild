import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { Analytics } from '@vercel/analytics/react';
import '../styles/globals.css';
import '../styles/tour.css';
import { ThemeProvider } from '../components/ThemeProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { Toaster } from 'sonner';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Only initialize PostHog if the key exists
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: '/ingest',
        ui_host: 'https://us.posthog.com',
        defaults: '2025-05-24',
        capture_exceptions: true, // This enables capturing exceptions using Error Tracking
        debug: process.env.NODE_ENV === 'development',
      });
    }
  }, []);

  return (
    <AuthProvider>
      <PostHogProvider client={posthog}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="min-h-screen">
            <Component {...pageProps} />
            <Toaster />
            <Analytics />
          </div>
        </ThemeProvider>
      </PostHogProvider>
    </AuthProvider>
  );
}