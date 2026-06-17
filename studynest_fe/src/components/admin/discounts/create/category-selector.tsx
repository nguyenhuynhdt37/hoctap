"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { Category } from "@/types/admin/category";
import { useEffect, useRef, useState } from "react";
import { HiSearch, HiX } from "react-icons/hi";

interface CategorySelectorProps {
  selectedCategories: Category[];
  onSelect: (category: Category) => void;
  onRemove: (categoryId: string) => void;
}

export function CategorySelector({
  selectedCategories,
  onSelect,
  onRemove,
}: CategorySelectorProps) {
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch categories once on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(
          "/admin/categories?page=1&page_size=100&sort_by=name&sort_order=asc"
        );
        setCategories(res.data.items || []);
      } catch {
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(
    (c) =>
      !selectedCategories.some((s) => s.id === c.id) &&
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        Chọn danh mục <span className="text-red-500">*</span>
      </label>

      {/* Search Input */}
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Tìm kiếm danh mục..."
        />

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Đang tải...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Không tìm thấy danh mục
              </div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onSelect(category);
                    setSearch("");
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-green-50 transition-colors text-left"
                >
                  <span className="font-medium text-gray-900">
                    {category.name}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Categories */}
      {selectedCategories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Đã chọn {selectedCategories.length} danh mục:
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm"
              >
                <span className="text-green-700">{category.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(category.id)}
                  className="text-green-600 hover:text-red-500 transition-colors"
                >
                  <HiX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
