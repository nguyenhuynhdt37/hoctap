"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { HoldStudent } from "@/types/lecturer/hold";
import { Check, Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import useSWR from "swr";

interface StudentItemProps {
  student: HoldStudent;
  isSelected: boolean;
  onSelect: () => void;
}

function StudentItem({ student, isSelected, onSelect }: StudentItemProps) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarSrc = student.avatar
    ? getImageUrl(student.avatar)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-light/60 transition-colors text-left ${
        isSelected ? "bg-primary-light/80" : ""
      }`}
    >
      {avatarSrc && !avatarError ? (
        <Image
          src={avatarSrc}
          alt={student.fullname}
          width={32}
          height={32}
          className="rounded-full object-cover object-center aspect-square border border-border shrink-0"
          onError={() => setAvatarError(true)}
          unoptimized
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary-light text-primary text-xs font-bold flex items-center justify-center border border-primary-pastel shrink-0">
          {student.fullname
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground line-clamp-1">
          {student.fullname}
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">
          {student.id.slice(0, 8)}...
        </div>
      </div>
      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Check className="h-3 w-3 text-primary-foreground" />
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
        className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-left flex items-center justify-between"
      >
        <span
          className={
            selectedStudent ? "text-foreground" : "text-muted-foreground"
          }
        >
          {selectedStudent ? selectedStudent.fullname : "Chọn học viên..."}
        </span>
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute z-20 w-full mt-2 bg-surface border border-border rounded-2xl shadow-soft-md max-h-96 overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm học viên..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-80">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Đang tải...
                </div>
              ) : !studentsData || studentsData.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
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
              <div className="p-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    onChange("");
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive-bg rounded-xl transition-colors"
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

