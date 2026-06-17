"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  CreateResourceLinkData,
  CreateResourceResponse,
  LessonResource,
} from "@/types/lecturer/resource";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  HiChevronLeft,
  HiDocument,
  HiLink,
  HiPaperClip,
  HiPlus,
  HiTrash,
  HiUpload,
  HiX,
} from "react-icons/hi";
import useSWR from "swr";

const Resources = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lesson_id");
  console.log("lessonId", lessonId);
  const [activeTab, setActiveTab] = useState<"file" | "link" | "archive">(
    "file"
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<CreateResourceLinkData[]>([
    { title: "", url: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);

  // Fetch resources
  const {
    data: resources,
    error,
    isLoading,
    mutate,
  } = useSWR<LessonResource[]>(
    lessonId ? `/lecturer/lessons/${lessonId}/resources` : null,
    async (url: string) => {
      const response = await api.get<LessonResource[]>(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      keepPreviousData: true,
      revalidateIfStale: false,
    }
  );

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle link input
  const handleLinkChange = (
    index: number,
    field: "title" | "url",
    value: string
  ) => {
    setLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  };

  const addLinkRow = () => {
    setLinks((prev) => [...prev, { title: "", url: "" }]);
  };

  const removeLinkRow = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle submit file
  const handleSubmitFile = async () => {
    if (selectedFiles.length === 0) {
      showToast.error("Vui lòng chọn ít nhất một file!");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await api.post<CreateResourceResponse>(
        `/lecturer/lessons/${lessonId}/resources`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      showToast.success(
        response.data.message || "Đã thêm tài nguyên thành công!"
      );
      setSelectedFiles([]);
      mutate();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi tải lên file!";
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle submit links
  const handleSubmitLinks = async () => {
    const validLinks = links.filter(
      (link) => link.title.trim() && link.url.trim()
    );
    if (validLinks.length === 0) {
      showToast.error("Vui lòng nhập ít nhất một link hợp lệ!");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<CreateResourceResponse>(
        `/lecturer/lessons/${lessonId}/resources/links`,
        validLinks
      );

      showToast.success(response.data.message || "Đã thêm link thành công!");
      setLinks([{ title: "", url: "" }]);
      mutate();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi thêm link!";
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle submit archive
  const handleSubmitArchive = async () => {
    if (selectedFiles.length === 0) {
      showToast.error("Vui lòng chọn ít nhất một file ZIP/RAR!");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await api.post<CreateResourceResponse>(
        `/lecturer/lessons/${lessonId}/resources/zip_rar`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      showToast.success(
        response.data.message || "Đã thêm file nén thành công!"
      );
      setSelectedFiles([]);
      mutate();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi tải lên file nén!";
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete resource
  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;

    setIsSubmitting(true);
    try {
      await api.delete(`/lecturer/lessons/resources/${resourceToDelete}`);
      showToast.success("Đã xóa tài nguyên thành công!");
      setResourceToDelete(null);
      mutate();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi xóa tài nguyên!";
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Get resource icon
  const getResourceIcon = (resource: LessonResource) => {
    switch (resource.resource_type) {
      case "file":
        return <HiDocument className="h-5 w-5 text-green-600" />;
      case "link":
        return <HiLink className="h-5 w-5 text-emerald-600" />;
      case "archive":
        return <HiPaperClip className="h-5 w-5 text-teal-600" />;
      default:
        return <HiPaperClip className="h-5 w-5 text-gray-600" />;
    }
  };

  // Get resource type label
  const getResourceTypeLabel = (resource: LessonResource): string => {
    switch (resource.resource_type) {
      case "file":
        return "File";
      case "link":
        return "Link";
      case "archive":
        return "Archive";
      default:
        return resource.resource_type;
    }
  };

  // Filter resources by type
  const fileResources =
    resources?.filter((r) => r.resource_type === "file") || [];
  const linkResources =
    resources?.filter((r) => r.resource_type === "link") || [];
  const archiveResources =
    resources?.filter((r) => r.resource_type === "archive") || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <HiChevronLeft className="h-5 w-5" />
            Quay lại
          </button>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Quản lý tài liệu
          </h1>
          <p className="text-gray-600">
            Thêm và quản lý tài liệu, link và file nén cho bài học
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("file")}
              className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeTab === "file"
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <HiDocument className="h-5 w-5" />
                <span>File (PDF/Word)</span>
                {fileResources.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    {fileResources.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("link")}
              className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeTab === "link"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <HiLink className="h-5 w-5" />
                <span>Link</span>
                {linkResources.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                    {linkResources.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("archive")}
              className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeTab === "archive"
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <HiPaperClip className="h-5 w-5" />
                <span>Archive (ZIP/RAR)</span>
                {archiveResources.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
                    {archiveResources.length}
                  </span>
                )}
              </div>
            </button>
          </div>

          <div className="p-6">
            {/* File Tab */}
            {activeTab === "file" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chọn file PDF hoặc Word
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <label
                      htmlFor="file-input"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <HiUpload className="h-12 w-12 text-gray-400" />
                      <span className="text-gray-600 font-medium">
                        Click để chọn file hoặc kéo thả vào đây
                      </span>
                      <span className="text-sm text-gray-500">
                        Hỗ trợ: PDF, DOC, DOCX
                      </span>
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <HiDocument className="h-5 w-5 text-green-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <HiX className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleSubmitFile}
                    disabled={selectedFiles.length === 0 || isSubmitting}
                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    <HiUpload className="h-5 w-5" />
                    {isSubmitting ? "Đang tải lên..." : "Tải lên file"}
                  </button>
                </div>

                {/* File List */}
                {fileResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Danh sách file
                    </h3>
                    <div className="space-y-3">
                      {fileResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {getResourceIcon(resource)}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {resource.title}
                              </h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-gray-500">
                                  {formatFileSize(resource.file_size)}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                  {getResourceTypeLabel(resource)}
                                </span>
                                {resource.embed_status !== "skipped" && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    {resource.embed_status}
                                  </span>
                                )}
                              </div>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:text-emerald-700 mt-1 inline-block truncate max-w-md"
                              >
                                {resource.url}
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => setResourceToDelete(resource.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <HiTrash className="h-5 w-5 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Link Tab */}
            {activeTab === "link" && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-semibold text-gray-700">
                      Thêm link
                    </label>
                    <button
                      onClick={addLinkRow}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <HiPlus className="h-4 w-4" />
                      Thêm link
                    </button>
                  </div>

                  <div className="space-y-3">
                    {links.map((link, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) =>
                              handleLinkChange(index, "title", e.target.value)
                            }
                            placeholder="Tiêu đề link"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) =>
                              handleLinkChange(index, "url", e.target.value)
                            }
                            placeholder="URL"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        {links.length > 1 && (
                          <button
                            onClick={() => removeLinkRow(index)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <HiX className="h-5 w-5 text-red-600" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSubmitLinks}
                    disabled={isSubmitting}
                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    <HiPlus className="h-5 w-5" />
                    {isSubmitting ? "Đang thêm..." : "Thêm link"}
                  </button>
                </div>

                {/* Link List */}
                {linkResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Danh sách link
                    </h3>
                    <div className="space-y-3">
                      {linkResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {getResourceIcon(resource)}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900">
                                {resource.title}
                              </h4>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:text-emerald-700 mt-1 inline-block truncate max-w-md"
                              >
                                {resource.url}
                              </a>
                              <span className="ml-2 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                                {getResourceTypeLabel(resource)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setResourceToDelete(resource.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <HiTrash className="h-5 w-5 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Archive Tab */}
            {activeTab === "archive" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chọn file ZIP hoặc RAR
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
                    <input
                      type="file"
                      accept=".zip,.rar,.7z"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="archive-input"
                    />
                    <label
                      htmlFor="archive-input"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <HiUpload className="h-12 w-12 text-gray-400" />
                      <span className="text-gray-600 font-medium">
                        Click để chọn file hoặc kéo thả vào đây
                      </span>
                      <span className="text-sm text-gray-500">
                        Hỗ trợ: ZIP, RAR, 7Z
                      </span>
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <HiPaperClip className="h-5 w-5 text-teal-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <HiX className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleSubmitArchive}
                    disabled={selectedFiles.length === 0 || isSubmitting}
                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    <HiUpload className="h-5 w-5" />
                    {isSubmitting ? "Đang tải lên..." : "Tải lên file nén"}
                  </button>
                </div>

                {/* Archive List */}
                {archiveResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Danh sách file nén
                    </h3>
                    <div className="space-y-3">
                      {archiveResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {getResourceIcon(resource)}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {resource.title}
                              </h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-gray-500">
                                  {formatFileSize(resource.file_size)}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded">
                                  {getResourceTypeLabel(resource)}
                                </span>
                              </div>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:text-emerald-700 mt-1 inline-block truncate max-w-md"
                              >
                                {resource.url}
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => setResourceToDelete(resource.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <HiTrash className="h-5 w-5 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Đang tải danh sách tài liệu...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">
              Không thể tải danh sách tài liệu
            </p>
            <button
              onClick={() => mutate()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {resourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Xác nhận xóa tài nguyên
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa tài nguyên này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteResource}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Đang xóa..." : "Xóa"}
              </button>
              <button
                onClick={() => setResourceToDelete(null)}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
