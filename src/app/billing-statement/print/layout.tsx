export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white text-black min-h-screen">
      {/* We add a print-specific class to hide anything not in this container if needed, 
          but since it's a dedicated route, we just need it to look good on paper */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 1cm; }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
      <div className="max-w-[21cm] mx-auto p-8">
        {children}
      </div>
    </div>
  );
}
