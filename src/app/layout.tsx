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
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
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
      <body className="font-sans antialiased text-gray-900 dark:text-gray-100 min-h-screen bg-[#F5F0EB] dark:bg-[#0b0f19]">
        {children}
      </body>
    </html>
  );
}
