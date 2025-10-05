import { User, LogOut, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const UserMenu = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.success('Déconnexion réussie');
    navigate('/login');
  };

  const handleAccount = () => {
    navigate('/account');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Avatar className="w-10 h-10 ring-2 ring-primary/20 hover:ring-primary/50 transition-all duration-300 cursor-pointer">
          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=ExoDetect" alt="User" />
          <AvatarFallback className="bg-primary/10 text-primary">
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 glass-card border-primary/20" align="end">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={handleAccount}
          >
            <UserCircle className="w-5 h-5" />
            <span>Compte</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11 hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserMenu;
