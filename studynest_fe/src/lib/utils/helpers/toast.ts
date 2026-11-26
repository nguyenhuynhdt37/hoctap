import toast from "react-hot-toast";

interface ToastOptions {
  id?: string;
  duration?: number;
  onClick?: () => void;
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      id: options?.id,
      duration: options?.duration ?? 4200,
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      id: options?.id,
      duration: options?.duration ?? 5000,
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast(message, {
      id: options?.id,
      duration: options?.duration ?? 4500,
      className: "cloudy-toast-warning",
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return toast(message, {
      id: options?.id,
      duration: options?.duration ?? 4200,
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      id: options?.id,
      duration: options?.duration ?? Infinity,
    });
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
};
