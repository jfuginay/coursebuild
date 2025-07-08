import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { ThemeProvider } from '../components/ThemeProvider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen">
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}