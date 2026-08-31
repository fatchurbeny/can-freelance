'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface BrandTabsProps {
  brands: string[];
  currentBrand: string;
}

export default function BrandTabs({ brands, currentBrand }: BrandTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBrandClick = (brandName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (brandName === 'Semua Brand') {
      params.delete('brand');
    } else {
      params.set('brand', brandName);
    }
    router.push(`/?${params.toString()}`);
  };

  const allBrandLabel = `Semua Brand (${brands.length})`;

  return (
    <div className="sticky top-[56px] z-30 flex items-stretch overflow-x-auto rounded-t-xl border-b border-[#f0f0f0] dark:border-[#272a34] bg-[#f8f9fa] dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Semua Brand Tab */}
      <button
        onClick={() => handleBrandClick('Semua Brand')}
        className={`relative flex items-center gap-2 px-5 py-3 text-sm transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
          currentBrand === 'Semua Brand'
            ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
            : 'bg-[#f8f9fa] dark:bg-[#0d0e12] text-gray-600 dark:text-gray-400 font-medium hover:bg-[#f0f1f3] dark:hover:bg-[#16181d]/50 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <span>Semua Brand</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
          currentBrand === 'Semua Brand'
            ? 'bg-[#ff5e1f]/10 text-[#ff5e1f]'
            : 'bg-gray-200/60 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}>
          {brands.length}
        </span>
        {currentBrand === 'Semua Brand' && (
          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
        )}
      </button>

      {/* Brand Specific Tabs */}
      {brands.map((brand) => {
        const isActive = currentBrand === brand;
        return (
          <button
            key={brand}
            onClick={() => handleBrandClick(brand)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
              isActive
                ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                : 'bg-[#f8f9fa] dark:bg-[#0d0e12] text-gray-600 dark:text-gray-400 font-medium hover:bg-[#f0f1f3] dark:hover:bg-[#16181d]/50 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span>{brand}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
