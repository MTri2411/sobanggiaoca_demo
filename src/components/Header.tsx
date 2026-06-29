import Image from 'next/image';
import logoBinhMy from '@/img/logo-binh-my-moi-2025-1.png';

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  return (
    <header className={className ? `web-header ${className}` : 'web-header'}>
      <div className="header-logo-wrap">
        <Image
          src={logoBinhMy}
          alt="Hệ thống Dưỡng lão Bình Mỹ"
          className="header-logo"
          priority
        />
      </div>
    </header>
  );
}
