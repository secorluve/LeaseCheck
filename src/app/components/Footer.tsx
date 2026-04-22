import { Github, Twitter, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 py-12">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              © {currentYear} LeaseCheck. Все права защищены.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              AI-powered rental verification platform
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 cursor-pointer"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 cursor-pointer"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="mailto:support@leasecheck.com"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 cursor-pointer"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link
            to="/about"
            className="transition-colors hover:text-foreground hover:underline cursor-pointer"
          >
            О проекте
          </Link>
          <Link
            to="/privacy"
            className="transition-colors hover:text-foreground hover:underline cursor-pointer"
          >
            Конфиденциальность
          </Link>
          <Link
            to="/terms"
            className="transition-colors hover:text-foreground hover:underline cursor-pointer"
          >
            Условия использования
          </Link>
          <Link
            to="/support"
            className="transition-colors hover:text-foreground hover:underline cursor-pointer"
          >
            Поддержка
          </Link>
        </div>
      </div>
    </footer>
  );
}
