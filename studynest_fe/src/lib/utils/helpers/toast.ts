import toast from "react-hot-toast";

interface ToastOptions {
  duration?: number;
  onClick?: () => void;
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      style: {
        borderLeft: "4px solid #276749",
      },
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration || 4000,
      style: {
        borderLeft: "4px solid #A23C46",
      },
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      duration: options?.duration || 4000,
      style: {
        borderLeft: "4px solid #356FA7",
      },
    });
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
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
