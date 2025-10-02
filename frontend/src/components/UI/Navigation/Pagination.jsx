import React, { useMemo } from 'react';

function getPages(current, total) {
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const showLeftDots = current > 3;
  const showRightDots = current < total - 2;
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  pages.push(1);
  if (showLeftDots) pages.push('...l');
  for (let i = start; i <= end; i++) pages.push(i);
  if (showRightDots) pages.push('...r');
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onChange, pageSize, onPageSizeChange, totalItems, startIndex, endIndex, noun = 'elementos' }) {
  const pages = useMemo(() => getPages(page, totalPages), [page, totalPages]);
  return (
    <div className="departamentos-pagination bg-gray-50 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="text-sm text-gray-600">Mostrando {totalItems === 0 ? 0 : startIndex + 1} a {endIndex} de {totalItems} {noun}</div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Por página</label>
          <select className="rounded-lg border border-gray-300 px-4.5 py-1 text-sm" value={pageSize} onChange={(e)=>onPageSizeChange(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button className="page-btn" disabled={page===1} onClick={()=>onChange(1)}>Primero</button>
          <button className="page-btn" disabled={page===1} onClick={()=>onChange(Math.max(1, page-1))}>Anterior</button>
          {pages.map(pg => (
            typeof pg === 'number' ? (
              <button key={pg} className={`page-btn ${pg===page?'is-active':''}`} onClick={()=>onChange(pg)}>{pg}</button>
            ) : (
              <span key={pg} className="page-ellipsis">…</span>
            )
          ))}
          <button className="page-btn" disabled={page===totalPages} onClick={()=>onChange(Math.min(totalPages, page+1))}>Siguiente</button>
          <button className="page-btn" disabled={page===totalPages} onClick={()=>onChange(totalPages)}>Último</button>
        </div>
      </div>
    </div>
  );
}
