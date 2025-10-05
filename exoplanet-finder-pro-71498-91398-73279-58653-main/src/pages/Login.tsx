import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Telescope, Mail, Lock, Sparkles } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import PartnersCarousel from '@/components/PartnersCarousel';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const resp = await axios.post(apiUrl('/auth/login'), { username: email, password });
      const token = resp.data?.token;
      if (!token) throw new Error('Token manquant');
      localStorage.setItem('exodetect_token', token);
      setShowWelcome(true);
      toast.success('Connexion réussie');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = (err.response?.data as any)?.detail || err.message;
        toast.error(`Échec connexion: ${detail}`);
      } else {
        toast.error('Échec connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      {/* Welcome Dialog */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="glass-card border-primary/20 max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10 glow-primary">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl text-center">Bienvenue sur ExoDetect AI !</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Vous êtes maintenant connecté. Découvrez de nouveaux mondes grâce à l'intelligence artificielle.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Login Form */}
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700 mb-auto mt-20">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-primary/10 glow-primary">
              <Telescope className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            ExoDetect AI
          </h1>
          <p className="text-muted-foreground">
            Connectez-vous pour accéder à la plateforme
          </p>
          
        </div>

        <form onSubmit={handleLogin} className="space-y-6 glass-card p-8 rounded-2xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Adresse email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-105 hover:glow-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              className="text-primary hover:text-primary-glow transition-colors font-medium"
            >
              S'inscrire
            </Link>
          </div>
        </form>
      </div>

      {/* Partners Carousel */}
      <div className="w-full max-w-6xl mt-auto pb-8">
        <PartnersCarousel />
      </div>
    </div>
  );
};

export default Login;
