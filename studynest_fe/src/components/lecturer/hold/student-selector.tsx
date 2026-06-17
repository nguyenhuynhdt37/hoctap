"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HoldStudent } from "@/types/lecturer/hold";
import Image from "next/image";
import { useEffect, useState } from "react";
import { HiSearch, HiX } from "react-icons/hi";
import useSWR from "swr";

interface StudentItemProps {
  student: HoldStudent;
  isSelected: boolean;
  onSelect: () => void;
}

function StudentItem({ student, isSelected, onSelect }: StudentItemProps) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarSrc = student.avatar
    ? getGoogleDriveImageUrl(student.avatar)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors text-left ${
        isSelected ? "bg-green-50" : ""
      }`}
    >
      {avatarSrc && !avatarError ? (
        <Image
          src={avatarSrc}
          alt={student.fullname}
          width={32}
          height={32}
          className="rounded-full object-cover object-center aspect-square border border-green-200 shrink-0"
          onError={() => setAvatarError(true)}
          unoptimized
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center border border-green-200 shrink-0">
          {student.fullname
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 line-clamp-1">
          {student.fullname}
        </div>
        <div className="text-xs text-gray-500 font-mono mt-0.5">
          {student.id.slice(0, 8)}...
        </div>
      </div>
      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0">
          <HiX className="h-3 w-3 text-white rotate-45" />
        </div>
      )}
    </button>
  );
}

interface StudentSelectorProps {
  value: string;
  onChange: (studentId: string) => void;
}

export function StudentSelector({ value, onChange }: StudentSelectorProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<HoldStudent | null>(
    null
  );

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Fetch students for dropdown
  const { data: studentsData, isLoading } = useSWR<HoldStudent[]>(
    showDropdown
      ? `/lecturer/transactions/students?limit=20${
          debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""
        }`
      : null,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Fetch selected student when value changes and we don't have it in state
  // Try to search by ID prefix first, if not found, fetch all
  const { data: allStudentsData } = useSWR<HoldStudent[]>(
    value && !selectedStudent
      ? `/lecturer/transactions/students?limit=100&search=${value.slice(0, 8)}`
      : null,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Update selected student when value changes
  useEffect(() => {
    if (value) {
      // First check if we have it in dropdown data
      const found = studentsData?.find((s) => s.id === value);
      if (found) {
        setSelectedStudent(found);
        return;
      }
      // Then check if we have it in all students data
      const foundInAll = allStudentsData?.find((s) => s.id === value);
      if (foundInAll) {
        setSelectedStudent(foundInAll);
        return;
      }
      // If not found and we have data, keep current selection
      if (!studentsData && !allStudentsData) {
        // Data is loading, keep current
        return;
      }
    } else {
      setSelectedStudent(null);
    }
  }, [value, studentsData, allStudentsData]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200 text-left flex items-center justify-between"
      >
        <span className={selectedStudent ? "text-gray-900" : "text-gray-500"}>
          {selectedStudent ? selectedStudent.fullname : "Chọn học viên..."}
        </span>
        <HiSearch className="h-5 w-5 text-gray-400" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <HiSearch className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm học viên..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-80">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Đang tải...
                </div>
              ) : !studentsData || studentsData.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {debouncedSearch
                    ? "Không tìm thấy học viên"
                    : "Nhập tên để tìm kiếm"}
                </div>
              ) : (
                <div className="p-2">
                  {studentsData.map((student) => (
                    <StudentItem
                      key={student.id}
                      student={student}
                      isSelected={value === student.id}
                      onSelect={() => {
                        setSelectedStudent(student);
                        onChange(student.id);
                        setShowDropdown(false);
                        setSearch("");
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {value && (
              <div className="p-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    onChange("");
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Xóa lựa chọn
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

