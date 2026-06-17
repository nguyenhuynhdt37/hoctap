const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t-2 border-green-100">
      {/* Main Footer Content */}
      <div className="max-w-full mx-auto px-4 lg:px-12 xl:px-16 2xl:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Khóa học phổ biến */}
          <div>
            <h4 className="font-bold text-gray-900 mb-6 text-base border-l-4 border-green-500 pl-3">
              Khóa học phổ biến
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Lập trình Web với React
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  JavaScript từ cơ bản đến nâng cao
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Python cho Data Science
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  UI/UX Design
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Digital Marketing
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-900 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center font-semibold"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Xem tất cả khóa học
                </a>
              </li>
            </ul>
          </div>

          {/* Công nghệ */}
          <div>
            <h4 className="font-bold text-gray-900 mb-6 text-base border-l-4 border-emerald-500 pl-3">
              Công nghệ
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Phát triển Web
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Mobile App Development
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Cloud Computing
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Machine Learning
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Blockchain
                </a>
              </li>
            </ul>
          </div>

          {/* Về StudyNest */}
          <div>
            <h4 className="font-bold text-gray-900 mb-6 text-base border-l-4 border-teal-500 pl-3">
              Về StudyNest
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/help/about"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Giới thiệu
                </a>
              </li>
              <li>
                <a
                  href="/help/instructors"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Giảng viên
                </a>
              </li>
              <li>
                <a
                  href="/help/contact"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Liên hệ
                </a>
              </li>
              <li>
                <a
                  href="/help/support"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Hỗ trợ
                </a>
              </li>
              <li>
                <a
                  href="/help/blog"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h4 className="font-bold text-gray-900 mb-6 text-base border-l-4 border-green-600 pl-3">
              Hỗ trợ
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/help"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Trung tâm trợ giúp
                </a>
              </li>
              <li>
                <a
                  href="/help/terms"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Điều khoản sử dụng
                </a>
              </li>
              <li>
                <a
                  href="/help/privacy-policy"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a
                  href="/help/privacy"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Quyền riêng tư
                </a>
              </li>
              <li>
                <a
                  href="/help/faq"
                  className="text-gray-600 hover:text-green-600 transition-colors duration-200 text-sm leading-relaxed group flex items-center"
                >
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-green-200 bg-white">
        <div className="max-w-full mx-auto px-4 lg:px-12 xl:px-16 2xl:px-24 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent tracking-wide">
                  STUDY
                </span>
                <span className="text-2xl font-black text-green-500">NEST</span>
              </div>
              <span className="text-gray-500 text-sm">
                © 2025 StudyNest, Inc.
              </span>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-green-600 transition-colors duration-200 transform hover:scale-110"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-green-600 transition-colors duration-200 transform hover:scale-110"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-green-600 transition-colors duration-200 transform hover:scale-110"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.749.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378 0 0-.599 2.282-.744 2.840-.282 1.084-1.064 2.456-1.549 3.235C9.584 23.815 10.77 24.001 12.017 24.001c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
                  </svg>
                </a>
              </div>

              <div className="h-6 border-l border-gray-300"></div>

              <button className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors duration-200 text-sm">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Tiếng Việt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
