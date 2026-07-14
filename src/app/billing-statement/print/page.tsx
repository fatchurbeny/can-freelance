import prisma from '@/lib/prisma';
import AutoPrint from '@/components/AutoPrint';
import React from 'react';

function formatCurrency(amount: number) {
  return `IDR ${amount.toLocaleString('id-ID')}`;
}

export default async function PrintStatementPage(props: {
  searchParams: Promise<{ designerId?: string; paymentMonth?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { designerId, paymentMonth } = searchParams;

  if (!designerId || !paymentMonth) {
    return <div className="p-8 text-red-500">Missing designerId or paymentMonth</div>;
  }

  const designer = await prisma.designer.findUnique({
    where: { id: designerId },
    include: {
      tasks: {
        where: {
          payrollMonth: paymentMonth,
          designStatus: { countsAsApproved: true }
        },
        include: {
          doctype: true
        }
      }
    }
  });

  if (!designer) {
    return <div className="p-8 text-red-500">Designer not found</div>;
  }

  let totalPayroll = 0;
  const totalTasks = designer.tasks.length;
  let totalTemplates = 0;
  let totalPages = 0;

  const processedTasks = designer.tasks.map(t => {
    const qty = Number(t.qtySubmit || 0);
    const pages = Number(t.pages || 0);
    const poolRate = Number(t.doctype?.poolRate || 0);
    const payment = qty * pages * poolRate * 15000;

    totalTemplates += qty;
    totalPages += qty * pages;
    totalPayroll += payment;

    return {
      ...t,
      calculatedPayment: payment,
      poolRate: poolRate
    };
  });

  return (
    <div>
      <title>{`Billing Statement-${designer.displayName}-${paymentMonth}`}</title>
      <AutoPrint />
      
      {/* Print Header */}
      <div className="flex justify-between items-end border-b-2 border-gray-200 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Billing Statement</h1>
          <p className="text-gray-500">Itemized Task Calculations</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Statement Period</p>
          <p className="text-xl font-semibold text-gray-900">{paymentMonth}</p>
        </div>
      </div>

      {/* Designer Info */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8 flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Designer</p>
          <p className="text-2xl font-bold text-gray-900">{designer.displayName}</p>
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tasks</p>
            <p className="text-xl font-bold text-gray-900">{totalTasks}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Templates</p>
            <p className="text-xl font-bold text-gray-900">{totalTemplates}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Pages</p>
            <p className="text-xl font-bold text-gray-900">{totalPages}</p>
          </div>
          <div className="text-center border-l-2 border-gray-200 pl-8 ml-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Payout</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalPayroll)}</p>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="py-3 px-2 text-xs font-bold text-gray-700 uppercase tracking-wider w-[35%]">Task Title</th>
            <th className="py-3 px-2 text-xs font-bold text-gray-700 uppercase tracking-wider w-[15%]">Doctype</th>
            <th className="py-3 px-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-[10%]">QTY Submit</th>
            <th className="py-3 px-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-[8%]">Pages</th>
            <th className="py-3 px-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-[10%]">Poll Score</th>
            <th className="py-3 px-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-right w-[10%]">Rate/Poll</th>
            <th className="py-3 pr-0 pl-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-right w-[12%]">Total Payment</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-gray-200">
          {processedTasks.length > 0 ? (
            processedTasks.map((task) => (
              <tr key={task.id} className="text-sm">
                <td className="py-3 px-2 text-gray-900 font-medium">
                  <div className="line-clamp-2 leading-snug" title={task.name || 'Untitled'}>
                    {task.name || 'Untitled'}
                  </div>
                </td>
                <td className="py-3 px-2 text-gray-600">{task.doctype?.displayName || '-'}</td>
                <td className="py-3 px-2 text-gray-900 font-medium text-center">{Number(task.qtySubmit || 0)}</td>
                <td className="py-3 px-2 text-gray-600 text-center">{Number(task.pages || 0)}</td>
                <td className="py-3 px-2 text-indigo-600 font-semibold text-center">{task.poolRate}</td>
                <td className="py-3 px-2 text-gray-600 text-right">{formatCurrency(15000)}</td>
                <td className="py-3 pr-0 pl-2 text-green-600 font-medium text-right">{formatCurrency(task.calculatedPayment)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-500">
                No approved tasks found for this period.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200">
            <td colSpan={7} className="py-4 pr-0 pl-2 text-right">
              <span className="font-bold text-gray-900 mr-3">Total Calculation:</span>
              <span className="font-bold text-green-600 text-lg">{formatCurrency(totalPayroll)}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
