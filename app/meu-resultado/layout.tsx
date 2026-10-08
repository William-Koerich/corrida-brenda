import { Inter } from "next/font/google";

// fonte forte dos números da imagem de compartilhar (lida pelo canvas via --font-card)
const cardFont = Inter({ variable: "--font-card", subsets: ["latin"] });

export default function RunnerAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-card-font className={cardFont.variable}>
      {children}
    </div>
  );
}
