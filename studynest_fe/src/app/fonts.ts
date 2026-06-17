// app/fonts.ts
import { Plus_Jakarta_Sans } from 'next/font/google';

export const jakarta = Plus_Jakarta_Sans({
  subsets: ['vietnamese'],
  weight: ['400', '600', '700'],
  variable: '--font-jakarta'
});
