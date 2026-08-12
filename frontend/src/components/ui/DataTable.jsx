import React from 'react';

export default function DataTable({ columns, data, keyField = 'id', emptyMessage = 'No records found.' }) {
  return (
    <div className="overflow-x-auto w-full border border-slate-300 bg-white">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-slate-200 border-b border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={row[keyField] || rowIdx} className="hover:bg-slate-50 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-4 py-3 text-slate-700 ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
