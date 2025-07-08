import { useRouter } from 'next/router';
import { Info } from 'lucide-react';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

const Header = () => {
  const router = useRouter();

  return (
    <div className="w-full">
      <div className="flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
        <div className="cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push("/about")}
            className="h-9 w-9"
          >
            <Info className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">About</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default Header;