import './globals.css';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { SyncQueueProvider } from '@/context/SyncQueueContext';
import AppSidebar from '@/components/AppSidebar';
import { Toaster } from 'react-hot-toast';
import { getAccess } from '@/lib/access';
import { AccessProvider } from '@/context/AccessContext';
import PreviewBanner from '@/components/PreviewBanner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'CAN-Freelance Dashboard',
  description: 'Comprehensive report and payroll dashboard for CAN-Freelance.',
  icons: {
    icon: [
      { url: '/can-freelance/icon.svg', type: 'image/svg+xml' },
      { url: '/can-freelance/favicon.ico', sizes: 'any' },
    ],
    apple: '/can-freelance/apple-icon.png',
  },
};


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAccess();
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  if (!stored) {
                    var hour = new Date().getHours();
                    if (hour >= 19 || hour < 7) {
                      document.documentElement.classList.add('dark');
                    }
                  } else if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased text-[#262626] dark:text-[#f4f4f5] min-h-screen bg-white dark:bg-[#0d0e12]">
        <AccessProvider value={access.info}>
        <SyncQueueProvider>
          <AppSidebar access={access.info} />
          <PreviewBanner />
          {children}
          <Toaster
            position="top-right"
            containerStyle={{ top: 64, right: 24 }}
            toastOptions={{
              duration: 3500,
              className: 'w-[420px] sm:w-[480px] max-w-[90vw] !bg-white dark:!bg-[#16181d] !text-gray-900 dark:!text-gray-100 !border !border-[#f0f0f0] dark:!border-[#272a34] !shadow-2xl !rounded-none font-sans text-xs p-4 flex items-center justify-between gap-3',
              style: {
                width: '480px',
                maxWidth: '90vw',
                borderRadius: '0px',
                border: '1px solid var(--toast-border, #272a34)',
                fontSize: '12px',
              },
              success: {
                iconTheme: {
                  primary: '#ff5e1f',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </SyncQueueProvider>
        </AccessProvider>
      </body>
    </html>
  );
}
