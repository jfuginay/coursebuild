import { useRouter } from 'next/router';
import { Info, LogOut, User, BarChart3, Film, CreditCard } from 'lucide-react';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Header = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="w-full relative z-50">
      <div className="flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
        <div className="cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push("/pricing")}
            className="h-9 w-9 relative z-10 border-[#fdd686]/30 hover:border-[#fdd686]/60 hover:bg-[#fdd686]/10"
          >
            <CreditCard className="h-[1.2rem] w-[1.2rem] text-[#fdd686]" />
            <span className="sr-only">Pricing</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push("/about")}
            className="h-9 w-9 relative z-10 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5"
          >
            <Info className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">About</span>
          </Button>
          <ThemeToggle />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 relative z-10 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5">
                  <User className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => router.push("/login")}
              className="h-9 relative z-10 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;