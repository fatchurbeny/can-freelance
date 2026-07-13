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
    <div className="flex flex-wrap gap-2.5 items-center">
      {/* Semua Brand Tab */}
      <button
        onClick={() => handleBrandClick('Semua Brand')}
        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
          currentBrand === 'Semua Brand'
            ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-sm shadow-indigo-600/10'
            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-[#E8E0D8] dark:border-gray-800 hover:border-[#615FFF] dark:hover:border-[#615FFF] hover:text-[#615FFF] dark:hover:text-[#615FFF] hover:ring-1 hover:ring-[#615FFF] shadow-sm'
        }`}
      >
        {allBrandLabel}
      </button>

      {/* Brand Specific Tabs */}
      {brands.map((brand) => (
        <button
          key={brand}
          onClick={() => handleBrandClick(brand)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
            currentBrand === brand
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-sm shadow-indigo-600/10'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-[#E8E0D8] dark:border-gray-800 hover:border-[#615FFF] dark:hover:border-[#615FFF] hover:text-[#615FFF] dark:hover:text-[#615FFF] hover:ring-1 hover:ring-[#615FFF] shadow-sm'
          }`}
        >
          {brand}
        </button>
      ))}
    </div>
  );
}
