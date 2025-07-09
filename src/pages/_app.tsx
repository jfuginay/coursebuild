import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { ThemeProvider } from '../components/ThemeProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { Toaster } from 'sonner';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <div className="min-h-screen">
          <Component {...pageProps} />
          <Toaster />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}