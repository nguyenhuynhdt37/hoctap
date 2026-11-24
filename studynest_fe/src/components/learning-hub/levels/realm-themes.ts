export interface RealmTheme {
  name: string;
  code: string;
  altitude: string;
  subtitle: string;
  pill: string;
  headerBg: string;
  sanctuaryBg: string;
  sanctuaryBorder: string;
  sanctuaryAccent: string;
  stampClass: string;
  progressFill: string;
  blobClass: string;
}

export const REALMS: readonly RealmTheme[] = [
  {
    name: "Chân Trời Bình Minh",
    code: "SKY-01",
    altitude: "1.200m · Tầng khởi hành",
    subtitle: "Những sải cánh đầu tiên chạm vào bầu trời xanh trong Mây Mây",
    pill: "border-primary-pastel bg-primary-light text-primary",
    headerBg: "from-primary-light/85 via-surface to-background border-primary-pastel/80",
    sanctuaryBg: "from-primary-light/95 via-surface to-surface-muted/85",
    sanctuaryBorder: "border-primary-pastel",
    sanctuaryAccent: "text-primary",
    stampClass: "border-primary/35 text-primary/70",
    progressFill: "bg-primary",
    blobClass: "bg-primary-pastel/45",
  },
  {
    name: "Vườn Mây Hoa Đào",
    code: "SKY-02",
    altitude: "2.400m · Tầng mây hồng",
    subtitle: "Vượt tầng mây sớm, mở khóa những danh hiệu và khung viền đầu tiên",
    pill: "border-secondary-pastel bg-secondary-light text-secondary-foreground",
    headerBg: "from-secondary-light/80 via-surface to-surface-muted/70 border-secondary-pastel/80",
    sanctuaryBg: "from-secondary-light/90 via-surface to-primary-light/40",
    sanctuaryBorder: "border-secondary-pastel",
    sanctuaryAccent: "text-secondary-foreground",
    stampClass: "border-secondary-foreground/35 text-secondary-foreground/70",
    progressFill: "bg-secondary-foreground",
    blobClass: "bg-secondary-pastel/45",
  },
  {
    name: "Hành Lang Cực Quang",
    code: "SKY-03",
    altitude: "3.800m · Tầng mây tím",
    subtitle: "Sắc tím oải hương dịu nhẹ nâng bước những chặng học bền bỉ",
    pill: "border-accent-border bg-accent text-accent-foreground",
    headerBg: "from-accent/75 via-surface to-primary-light/50 border-accent-border/80",
    sanctuaryBg: "from-accent/85 via-surface to-primary-light/50",
    sanctuaryBorder: "border-accent-border",
    sanctuaryAccent: "text-accent-foreground",
    stampClass: "border-accent-foreground/35 text-accent-foreground/70",
    progressFill: "bg-accent-foreground",
    blobClass: "bg-accent/60",
  },
  {
    name: "Thảo Nguyên Nắng Sớm",
    code: "SKY-04",
    altitude: "5.200m · Tầng nắng kem",
    subtitle: "Ánh nắng vanilla ấm áp chiếu rọi bộ sưu tập phần thưởng hiếm",
    pill: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    headerBg: "from-accent-vanilla/75 via-surface to-surface-muted/70 border-accent-vanilla-border/80",
    sanctuaryBg: "from-accent-vanilla/85 via-surface to-secondary-light/40",
    sanctuaryBorder: "border-accent-vanilla-border",
    sanctuaryAccent: "text-accent-vanilla-foreground",
    stampClass: "border-accent-vanilla-foreground/35 text-accent-vanilla-foreground/70",
    progressFill: "bg-accent-vanilla-foreground",
    blobClass: "bg-accent-vanilla/65",
  },
  {
    name: "Ốc Đảo Gió Lành",
    code: "SKY-05",
    altitude: "6.800m · Tầng gió xanh",
    subtitle: "Khoảng trời tĩnh tại nơi kỷ luật học tập hóa thành bản lĩnh",
    pill: "border-success-border bg-success-bg text-success-foreground",
    headerBg: "from-success-bg/80 via-surface to-primary-light/45 border-success-border/80",
    sanctuaryBg: "from-success-bg/85 via-surface to-primary-light/45",
    sanctuaryBorder: "border-success-border",
    sanctuaryAccent: "text-success-foreground",
    stampClass: "border-success-foreground/35 text-success-foreground/70",
    progressFill: "bg-success-foreground",
    blobClass: "bg-success-border/45",
  },
  {
    name: "Đỉnh Trời Mây Bạc",
    code: "SKY-06",
    altitude: "9.000m · Tầng tinh anh",
    subtitle: "Nơi giao hòa của mây xanh, nắng sớm và dấu ấn nhà chinh phục",
    pill: "border-primary-pastel bg-primary-light text-primary",
    headerBg: "from-primary-light/85 via-accent/45 to-secondary-light/55 border-primary-pastel",
    sanctuaryBg: "from-primary-light/90 via-surface to-accent/65",
    sanctuaryBorder: "border-primary-pastel",
    sanctuaryAccent: "text-primary",
    stampClass: "border-primary/40 text-primary/75",
    progressFill: "bg-primary",
    blobClass: "bg-accent/55",
  },
];

export function getRealmTheme(chapterIndex: number): RealmTheme {
  const safeIndex = Math.max(0, Math.min(chapterIndex, REALMS.length - 1));
  return REALMS[safeIndex] ?? REALMS[0];
}
