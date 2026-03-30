'use client';

import { useState } from 'react';
import type { Menu, MenuCategory } from '@/lib/menu-schema';

interface MenuSummaryProps {
  menu: Menu;
}

export function MenuSummary({ menu }: MenuSummaryProps) {
  const totalItems = menu.categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <section aria-label="Menu results">
      {/* D-07: Summary header with restaurant name and stats */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          {menu.restaurantName ?? 'Restaurant Menu'}
        </h2>
        {menu.menuType && (
          <p className="text-gray-600 mt-1 capitalize">{menu.menuType} menu</p>
        )}
        <p className="text-gray-500 mt-1">
          {menu.categories.length} {menu.categories.length === 1 ? 'category' : 'categories'}, {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Extraction warnings if any */}
      {menu.warnings.length > 0 && (
        <div role="alert" className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium text-yellow-800">Note:</p>
          <ul className="list-disc list-inside text-yellow-700 text-sm mt-1">
            {menu.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* D-08: Expandable categories */}
      <div className="space-y-2">
        {menu.categories.map((category, i) => (
          <CategorySection key={i} category={category} />
        ))}
      </div>
    </section>
  );
}

function CategorySection({ category }: { category: MenuCategory }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-lg bg-gray-50 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black transition-colors min-h-[48px]"
      >
        <span>
          {category.name}
          <span className="text-gray-500 font-normal ml-2">
            ({category.items.length} {category.items.length === 1 ? 'item' : 'items'})
          </span>
        </span>
        <svg
          aria-hidden="true"
          className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <ul className="divide-y divide-gray-100">
          {category.items.map((item, j) => (
            <li key={j} className="px-4 py-3">
              <div className="flex justify-between items-start gap-2">
                <span className="font-medium">{item.name}</span>
                {item.price && (
                  <span className="text-gray-700 font-medium whitespace-nowrap">
                    {item.price}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-gray-600 text-sm mt-1">{item.description}</p>
              )}
              {item.dietaryFlags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.dietaryFlags.map((flag, k) => (
                    <span
                      key={k}
                      className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
