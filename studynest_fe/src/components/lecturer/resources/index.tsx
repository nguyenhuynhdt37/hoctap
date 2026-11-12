"use client";

import { prepareImageUpload } from "@/lib/prepare-image-upload";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  CreateResourceLinkData,
  CreateResourceResponse,
  LessonResource,
} from "@/types/lecturer/resource";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  ArrowLeft,
  FileText,
  Link as LinkIcon,
  Paperclip,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/states";

const Resources = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string }>();
  const lessonId = params?.id || searchParams.get("lesson_id");
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
      for (const file of selectedFiles) {
        formData.append("files", await prepareImageUpload(file, "resource"));
      }

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
        return <FileText className="h-5 w-5 text-primary" />;
      case "link":
        return <LinkIcon className="h-5 w-5 text-info-foreground" />;
      case "archive":
        return <Archive className="h-5 w-5 text-accent-foreground" />;
      default:
        return <Paperclip className="h-5 w-5 text-muted-foreground" />;
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            Quay lại
          </Button>
          <h1 className="text-3xl font-bold font-display text-foreground mb-2">
            Quản lý tài liệu
          </h1>
          <p className="text-sm text-muted-foreground">
            Thêm và quản lý tài liệu, link và file nén cho bài học
          </p>
        </div>

        {/* Tabs */}
        <Card className="bg-surface rounded-2xl border border-border shadow-xs mb-6 overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            <button
              onClick={() => setActiveTab("file")}
              className={`px-6 py-4 font-semibold text-sm transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === "file"
                  ? "border-primary text-primary bg-primary-light/20"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>File (PDF/Word)</span>
                {fileResources.length > 0 && (
                  <Badge variant="default" size="sm" className="ml-1">
                    {fileResources.length}
                  </Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("link")}
              className={`px-6 py-4 font-semibold text-sm transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === "link"
                  ? "border-primary text-primary bg-primary-light/20"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                <span>Link</span>
                {linkResources.length > 0 && (
                  <Badge variant="info" size="sm" className="ml-1">
                    {linkResources.length}
                  </Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("archive")}
              className={`px-6 py-4 font-semibold text-sm transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === "archive"
                  ? "border-primary text-primary bg-primary-light/20"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                <span>Archive (ZIP/RAR)</span>
                {archiveResources.length > 0 && (
                  <Badge variant="lavender" size="sm" className="ml-1">
                    {archiveResources.length}
                  </Badge>
                )}
              </div>
            </button>
          </div>

          <div className="p-6">
            {/* File Tab */}
            {activeTab === "file" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Chọn file PDF hoặc Word
                  </label>
                  <div className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-8 text-center bg-surface-muted/30 transition-colors">
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
                      <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-1">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <span className="text-foreground font-medium text-sm">
                        Click để chọn file hoặc kéo thả vào đây
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Hỗ trợ: PDF, DOC, DOCX
                      </span>
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-surface-muted/60 rounded-xl border border-border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors"
                            aria-label="Xóa file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={handleSubmitFile}
                    disabled={selectedFiles.length === 0 || isSubmitting}
                    isLoading={isSubmitting}
                    loadingText="Đang tải lên..."
                    leftIcon={<UploadCloud className="h-4 w-4" />}
                    className="mt-4 w-full"
                  >
                    Tải lên file
                  </Button>
                </div>

                {/* File List */}
                {fileResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold font-display text-foreground mb-4">
                      Danh sách file
                    </h3>
                    <div className="space-y-3">
                      {fileResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between p-4 bg-surface-muted/40 rounded-xl border border-border hover:border-primary-pastel transition-all"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                              {getResourceIcon(resource)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-foreground truncate">
                                {resource.title}
                              </h4>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(resource.file_size)}
                                </span>
                                <Badge variant="default" size="sm">
                                  {getResourceTypeLabel(resource)}
                                </Badge>
                                {resource.embed_status !== "skipped" && (
                                  <Badge variant="neutral" size="sm">
                                    {resource.embed_status}
                                  </Badge>
                                )}
                              </div>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline mt-1 inline-block truncate max-w-md"
                              >
                                {resource.url}
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => setResourceToDelete(resource.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors flex-shrink-0"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
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
                    <label className="block text-sm font-semibold text-foreground">
                      Thêm link
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addLinkRow}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Thêm link
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {links.map((link, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 bg-surface-muted/50 rounded-xl border border-border"
                      >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) =>
                              handleLinkChange(index, "title", e.target.value)
                            }
                            placeholder="Tiêu đề link"
                            className="px-3 py-2 border border-border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) =>
                              handleLinkChange(index, "url", e.target.value)
                            }
                            placeholder="URL"
                            className="px-3 py-2 border border-border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                        {links.length > 1 && (
                          <button
                            onClick={() => removeLinkRow(index)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors"
                            aria-label="Xóa dòng link"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleSubmitLinks}
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    loadingText="Đang thêm..."
                    leftIcon={<Plus className="h-4 w-4" />}
                    className="mt-4 w-full"
                  >
                    Thêm link
                  </Button>
                </div>

                {/* Link List */}
                {linkResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold font-display text-foreground mb-4">
                      Danh sách link
                    </h3>
                    <div className="space-y-3">
                      {linkResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between p-4 bg-surface-muted/40 rounded-xl border border-border hover:border-primary-pastel transition-all"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-info-bg flex items-center justify-center flex-shrink-0">
                              {getResourceIcon(resource)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-foreground">
                                {resource.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline truncate max-w-md"
                                >
                                  {resource.url}
                                </a>
                                <Badge variant="info" size="sm">
                                  {getResourceTypeLabel(resource)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setResourceToDelete(resource.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors flex-shrink-0"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Chọn file ZIP hoặc RAR
                  </label>
                  <div className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-8 text-center bg-surface-muted/30 transition-colors">
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
                      <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center mb-1">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <span className="text-foreground font-medium text-sm">
                        Click để chọn file hoặc kéo thả vào đây
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Hỗ trợ: ZIP, RAR, 7Z
                      </span>
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-surface-muted/60 rounded-xl border border-border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Archive className="h-5 w-5 text-accent-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors"
                            aria-label="Xóa file nén"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={handleSubmitArchive}
                    disabled={selectedFiles.length === 0 || isSubmitting}
                    isLoading={isSubmitting}
                    loadingText="Đang tải lên..."
                    leftIcon={<UploadCloud className="h-4 w-4" />}
                    className="mt-4 w-full"
                  >
                    Tải lên file nén
                  </Button>
                </div>

                {/* Archive List */}
                {archiveResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold font-display text-foreground mb-4">
                      Danh sách file nén
                    </h3>
                    <div className="space-y-3">
                      {archiveResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between p-4 bg-surface-muted/40 rounded-xl border border-border hover:border-primary-pastel transition-all"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                              {getResourceIcon(resource)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-foreground truncate">
                                {resource.title}
                              </h4>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(resource.file_size)}
                                </span>
                                <Badge variant="lavender" size="sm">
                                  {getResourceTypeLabel(resource)}
                                </Badge>
                              </div>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline mt-1 inline-block truncate max-w-md"
                              >
                                {resource.url}
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => setResourceToDelete(resource.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors flex-shrink-0"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="bg-surface rounded-2xl p-12 text-center border border-border">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Đang tải danh sách tài liệu...
            </p>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="text-center">
            <p className="font-medium mb-3">Không thể tải danh sách tài liệu</p>
            <Button variant="destructive" size="sm" onClick={() => mutate()}>
              Thử lại
            </Button>
          </Alert>
        )}
      </div>

      {/* Delete Modal */}
      {resourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-xs">
          <Card className="bg-surface rounded-2xl p-6 max-w-md w-full border border-border shadow-xl">
            <h3 className="text-xl font-bold font-display text-foreground mb-2">
              Xác nhận xóa tài nguyên
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Bạn có chắc chắn muốn xóa tài nguyên này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteResource}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingText="Đang xóa..."
                className="flex-1"
              >
                Xóa
              </Button>
              <Button
                variant="outline"
                onClick={() => setResourceToDelete(null)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Resources;
