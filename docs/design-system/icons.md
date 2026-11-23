# Icon trong Cloudy Blue

Frontend dùng named import từ `pulsoicon-react`. PulsoIcon có module riêng cho từng icon và đã có trong `experimental.optimizePackageImports`.

- Dùng `currentColor` theo token chữ. Giữ kích thước, lớp CSS và độ dày nét theo ngữ cảnh hiện tại. Dùng `solid` khi cần giữ biến thể đặc, chẳng hạn sao đánh giá hoặc nút phát dạng tròn.
- Icon trang trí được PulsoIcon render với `aria-hidden="true"` mặc định. Đặt `aria-label` trên nút hoặc liên kết chỉ có icon và giữ các nhãn hiện có.
- Giữ hover và focus mặc định cho điều khiển. Dùng `animated={false}` cho icon trang trí lặp lại trong danh sách, vùng cuộn dài hoặc icon đã có hiệu ứng CSS. PulsoIcon đọc `prefers-reduced-motion` khi bắt đầu chuyển động. CSS toàn cục xử lý các animation CSS.
- Từ Server Component, import icon qua `@/components/ui/server-icons`. Module này đánh dấu `use client` vì biểu tượng PulsoIcon dùng React hooks.
- Dùng kiểu `PulsoIcon` cho biến hoặc thuộc tính chứa một component icon. Hình SVG tự vẽ vẫn dùng tại chỗ. Tránh icon và hình trang trí có dạng sparkle.

Chạy `node tests/test-icon-source.cjs` trong `studynest_fe/` để kiểm tra thư viện và các tên import.

## Ánh xạ tên icon

Mọi tên component Lucide đang dùng đều có export cùng tên trong PulsoIcon v6.2.0, kể cả alias. Kiểu `LucideIcon` chuyển thành `PulsoIcon`.

| React Icons | PulsoIcon |
| --- | --- |
| `HiAcademicCap` | `GraduationCap` |
| `HiAdjustments` | `SlidersHorizontal` |
| `HiArrowDown` | `ArrowDown` |
| `HiArrowLeft` | `ArrowLeft` |
| `HiArrowRight` | `ArrowRight` |
| `HiArrowUp` | `ArrowUp` |
| `HiArrowsExpand` | `Maximize` |
| `HiBadgeCheck` | `BadgeCheck` |
| `HiBan` | `Ban` |
| `HiBell` | `Bell` |
| `HiBookOpen` | `BookOpen` |
| `HiCalendar` | `Calendar` |
| `HiCash` | `Banknote` |
| `HiChartBar` | `ChartNoAxesColumn` |
| `HiChat` | `MessageCircle` |
| `HiChatAlt2` | `MessageSquareText` |
| `HiCheck` | `Check` |
| `HiCheckCircle` | `CircleCheck` |
| `HiChevronDown` | `ChevronDown` |
| `HiChevronLeft` | `ChevronLeft` |
| `HiChevronRight` | `ChevronRight` |
| `HiChevronUp` | `ChevronUp` |
| `HiClipboardCheck` | `ClipboardCheck` |
| `HiClipboardList` | `ClipboardList` |
| `HiClock` | `Clock` |
| `HiCloud` | `Cloud` |
| `HiCloudDownload` | `CloudDownload` |
| `HiCode` | `Code` |
| `HiCog` | `Settings` |
| `HiCreditCard` | `CreditCard` |
| `HiCurrencyDollar` | `CircleDollarSign` |
| `HiDocumentDownload` | `FileDown` |
| `HiDocumentText` | `FileText` |
| `HiDownload` | `Download` |
| `HiExclamation` | `TriangleAlert` |
| `HiExclamationCircle` | `CircleAlert` |
| `HiExternalLink` | `ExternalLink` |
| `HiEye` | `Eye` |
| `HiFolder` | `Folder` |
| `HiGlobe` | `Earth` |
| `HiHeart` | `Heart` |
| `HiHome` | `House` |
| `HiIdentification` | `IdCard` |
| `HiInformationCircle` | `Info` |
| `HiKey` | `Key` |
| `HiLightBulb` | `Lightbulb` |
| `HiLink` | `Link` |
| `HiLocationMarker` | `MapPin` |
| `HiLockClosed` | `Lock` |
| `HiLogin` | `LogIn` |
| `HiLogout` | `LogOut` |
| `HiMail` | `Mail` |
| `HiMenu` | `Menu` |
| `HiMenuAlt2` | `AlignLeft` |
| `HiMenuAlt3` | `AlignRight` |
| `HiMicrophone` | `Mic` |
| `HiMinus` | `Minus` |
| `HiOutlineAdjustments` | `SlidersHorizontal` |
| `HiOutlineHeart` | `Heart` |
| `HiOutlineLightningBolt` | `Zap` |
| `HiOutlineRefresh` | `RefreshCw` |
| `HiOutlineSearch` | `Search` |
| `HiOutlineStar` | `Star` |
| `HiOutlineSwitchVertical` | `ArrowUpDown` |
| `HiOutlineTag` | `Tag` |
| `HiPaperAirplane` | `Send` |
| `HiPencil` | `Pencil` |
| `HiPhoneMissedCall` | `PhoneMissed` |
| `HiPhotograph` | `Image` |
| `HiPlay` | `CirclePlay` |
| `HiPlus` | `Plus` |
| `HiQuestionMarkCircle` | `CircleHelp` |
| `HiRefresh` | `RefreshCw` |
| `HiSave` | `Save` |
| `HiSearch` | `Search` |
| `HiShare` | `Share2` |
| `HiShieldCheck` | `ShieldCheck` |
| `HiShoppingCart` | `ShoppingCart` |
| `HiSortAscending` | `ArrowDownWideNarrow` |
| `HiStar` | `Star` |
| `HiStop` | `CircleStop` |
| `HiTag` | `Tag` |
| `HiTrash` | `Trash2` |
| `HiTrendingDown` | `TrendingDown` |
| `HiTrendingUp` | `TrendingUp` |
| `HiUser` | `User` |
| `HiUserAdd` | `UserPlus` |
| `HiUserGroup` | `UsersRound` |
| `HiUserRemove` | `UserMinus` |
| `HiUsers` | `Users` |
| `HiVideoCamera` | `Video` |
| `HiViewGrid` | `LayoutGrid` |
| `HiVolumeOff` | `VolumeX` |
| `HiVolumeUp` | `Volume2` |
| `HiX` | `X` |
| `HiXCircle` | `CircleX` |
| `FaAlignCenter` | `AlignCenter` |
| `FaAlignJustify` | `AlignJustify` |
| `FaAlignLeft` | `AlignLeft` |
| `FaAlignRight` | `AlignRight` |
| `FaBold` | `Bold` |
| `FaCode` | `CodeXml` |
| `FaGithub` | `BrandGithub` |
| `FaImage` | `Image` |
| `FaItalic` | `Italic` |
| `FaLink` | `Link` |
| `FaListOl` | `ListOrdered` |
| `FaListUl` | `List` |
| `FaQuoteLeft` | `Quote` |
| `FaRedo` | `Redo2` |
| `FaSpinner` | `SpinnerGap` |
| `FaStrikethrough` | `Strikethrough` |
| `FaTable` | `Table` |
| `FaTasks` | `ListTodo` |
| `FaUnderline` | `Underline` |
| `FaUndo` | `Undo2` |
| `MdFormatAlignCenter` | `AlignCenter` |
| `MdFormatAlignJustify` | `AlignJustify` |
| `MdFormatAlignLeft` | `AlignLeft` |
| `MdFormatAlignRight` | `AlignRight` |
| `BsPaypal` | `BrandPaypal` |

[Tài liệu React](https://pulsoicon.com/docs/react) · [Mã nguồn React của PulsoIcon v6.2.0](https://github.com/CityPulso/PulsoIcon/tree/03d9b2e44b75f32ca36772e984423fc8a0a9e628/packages/react)
