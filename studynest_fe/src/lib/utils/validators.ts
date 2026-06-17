export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!email) {
    return { isValid: false, message: "Email là bắt buộc" };
  }

  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Email không đúng định dạng" };
  }

  return { isValid: true, message: "" };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, message: "Mật khẩu là bắt buộc" };
  }

  if (password.length < 8) {
    return { isValid: false, message: "Mật khẩu phải có ít nhất 8 ký tự" };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Mật khẩu phải có ít nhất 1 chữ cái viết hoa",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Mật khẩu phải có ít nhất 1 chữ cái viết thường",
    };
  }

  if (!/\d/.test(password)) {
    return { isValid: false, message: "Mật khẩu phải có ít nhất 1 chữ số" };
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return {
      isValid: false,
      message: "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)",
    };
  }

  return { isValid: true, message: "Mật khẩu hợp lệ" };
};

export const validateFullName = (fullName: string): ValidationResult => {
  if (!fullName || fullName.trim().length === 0) {
    return { isValid: false, message: "Họ và tên là bắt buộc" };
  }

  if (fullName.trim().length < 2) {
    return { isValid: false, message: "Họ và tên phải có ít nhất 2 ký tự" };
  }

  const nameRegex =
    /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;
  if (!nameRegex.test(fullName)) {
    return {
      isValid: false,
      message: "Họ và tên chỉ được chứa chữ cái và khoảng trắng",
    };
  }

  return { isValid: true, message: "" };
};

export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string,
): ValidationResult => {
  if (!confirmPassword) {
    return {
      isValid: false,
      message: "Xác nhận mật khẩu là bắt buộc",
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      message: "Mật khẩu xác nhận không khớp",
    };
  }

  return { isValid: true, message: "" };
};

export const validateOTP = (otp: string): ValidationResult => {
  if (!otp) {
    return { isValid: false, message: "Mã xác thực là bắt buộc" };
  }

  if (otp.length !== 6) {
    return { isValid: false, message: "Mã xác thực phải có đúng 6 chữ số" };
  }

  if (!/^\d{6}$/.test(otp)) {
    return { isValid: false, message: "Mã xác thực chỉ được chứa số" };
  }

  return { isValid: true, message: "" };
};

export const getPasswordStrength = (
  password: string,
): {
  level: "weak" | "medium" | "strong" | "very-strong";
  score: number;
  color: string;
} => {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1;

  if (score <= 2) {
    return { level: "weak", score, color: "text-red-500" };
  }
  if (score <= 4) {
    return { level: "medium", score, color: "text-yellow-500" };
  }
  if (score <= 5) {
    return { level: "strong", score, color: "text-green-500" };
  }
  return { level: "very-strong", score, color: "text-green-600" };
};


