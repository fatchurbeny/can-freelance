'use client';

interface ProfileOnlyItem {
  doctype: string;
  license: string;
  language: string;
  account: string;
  qty: number;
}

interface ApprovedProfileOnlyWidgetProps {
  data: ProfileOnlyItem[];
  brandName: string;
}

export default function ApprovedProfileOnlyWidget({ data, brandName }: ApprovedProfileOnlyWidgetProps) {
  const totalQty = data.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="glass dark:bg-[#111827] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full max-h-[268px]">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">
            Aproved-Profile Only
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Jenis Doctype Approved-Profile Only - {brandName}
          </p>
        </div>
        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#F0A848] text-gray-900 uppercase shadow-sm">
          {totalQty} TEMPLATE
        </span>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto pr-3">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-white dark:bg-[#111827] shadow-[0_1px_0_0_#E8E0D8] dark:shadow-[0_1px_0_0_#1F2937]">
            <tr className="text-gray-400 dark:text-gray-500 font-bold">
              <th className="py-2.5 font-semibold">Doctype</th>
              <th className="py-2.5 font-semibold text-center">License</th>
              <th className="py-2.5 font-semibold text-center">Language</th>
              <th className="py-2.5 font-semibold">Account</th>
              <th className="py-2.5 font-semibold text-right">QTY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E0D8]/60 dark:divide-gray-800 font-medium text-gray-700 dark:text-gray-300">
            {data.length > 0 ? (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#F5F0EB]/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 font-semibold text-gray-900 dark:text-white truncate max-w-[130px]" title={item.doctype}>
                    {item.doctype}
                  </td>
                  <td className="py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold ${
                      item.license?.toLowerCase() === 'pro'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                    }`}>
                      {item.license}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold ${
                      item.language?.toUpperCase() === 'ENG'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    }`}>
                      {item.language}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={item.account}>
                    {item.account}
                  </td>
                  <td className="py-3 text-right font-bold text-gray-900 dark:text-white">
                    {item.qty}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500 font-semibold">
                  Tidak ada data Approved-Profile Only
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
