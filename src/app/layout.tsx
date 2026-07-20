import './globals.css';
import { Inter, Outfit } from 'next/font/google';

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
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const hour = new Date().getHours();
                  const isNight = hour < 6 || hour >= 18;
                  if (stored === 'dark' || (!stored && isNight)) {
                    document.documentElement.classList.add('dark');
                  } else if (stored === 'light' || (!stored && !isNight)) {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased text-gray-900 dark:text-gray-100 min-h-screen bg-[#F5F0EB] dark:bg-[#0b0f19]">
        {children}
      </body>
    </html>
  );
}
