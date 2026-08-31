import './globals.css';
import { Inter, Outfit } from 'next/font/google';
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'CAN-Freelance Dashboard',
  description: 'Comprehensive report and payroll dashboard for CAN-Freelance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable}`}
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
        {children}
      </body>
    </html>
  );
}
