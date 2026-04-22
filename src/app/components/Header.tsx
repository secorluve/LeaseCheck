import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onReset: () => void;
  showBack: boolean;
}

export function Header({ onReset, showBack }: HeaderProps) {
  return (
    <header className="border-b border-border/50 backdrop-blur-sm">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            onClick={onReset}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            {showBack && (
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">LeaseCheck</span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
