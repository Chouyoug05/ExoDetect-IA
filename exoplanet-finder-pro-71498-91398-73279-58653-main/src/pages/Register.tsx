import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Telescope, Mail, Lock, User as UserIcon, Sparkles, Building2, Rocket, Star, Moon, Orbit, Satellite, Sparkle, Globe, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [userType, setUserType] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('Telescope');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const avatarOptions = [
    { icon: Telescope, name: 'Telescope', color: 'text-blue-400' },
    { icon: Rocket, name: 'Rocket', color: 'text-red-400' },
    { icon: Star, name: 'Star', color: 'text-yellow-400' },
    { icon: Moon, name: 'Moon', color: 'text-purple-400' },
    { icon: Orbit, name: 'Orbit', color: 'text-green-400' },
    { icon: Satellite, name: 'Satellite', color: 'text-cyan-400' },
    { icon: Sparkle, name: 'Sparkle', color: 'text-orange-400' },
    { icon: Globe, name: 'Globe', color: 'text-teal-400' },
    { icon: Radar, name: 'Radar', color: 'text-pink-400' },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);
    try {
      const profile = { name, email, organization, userType, selectedAvatar };
      localStorage.setItem(`exodetect_profile_${email}`, JSON.stringify(profile));
      localStorage.setItem('exodetect_user', email);
      setShowSuccess(true);
      toast.success('Compte créé avec succès');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      toast.error("Impossible de créer le compte pour le moment. Réessayez plus tard.");
      console.error('Register error', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="glass-card border-primary/20 max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-success/10 glow-success">
                <Sparkles className="w-12 h-12 text-success" />
              </div>
            </div>
            <DialogTitle className="text-2xl text-center">Compte créé avec succès !</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Votre compte a été créé. Vous allez être redirigé vers le tableau de bord.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Register Form */}
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-primary/10 glow-primary">
              <Telescope className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Créer un compte
          </h1>
          <p className="text-muted-foreground">
            Rejoignez ExoDetect AI pour découvrir de nouveaux mondes
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6 glass-card p-8 rounded-2xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Nom complet
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

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
              <Label htmlFor="organization" className="text-foreground">
                Institution / Organisation
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="organization"
                  type="text"
                  placeholder="Université, Observatoire, etc."
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType" className="text-foreground">
                Profil
              </Label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger className="bg-secondary/50 border-border focus:border-primary transition-colors">
                  <SelectValue placeholder="Sélectionnez votre profil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="researcher">Chercheur</SelectItem>
                  <SelectItem value="student">Étudiant</SelectItem>
                  <SelectItem value="amateur">Amateur d'astronomie</SelectItem>
                  <SelectItem value="teacher">Enseignant</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">
                Choisissez votre avatar
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {avatarOptions.map((avatar) => {
                  const Icon = avatar.icon;
                  return (
                    <button
                      key={avatar.name}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.name)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                        selectedAvatar === avatar.name
                          ? 'border-primary bg-primary/10 glow-primary'
                          : 'border-border bg-secondary/30 hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto ${avatar.color}`} />
                    </button>
                  );
                })}
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
                  placeholder="Minimum 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmer votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                  required
                  minLength={8}
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
                Création du compte...
              </span>
            ) : (
              'Créer mon compte'
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Vous avez déjà un compte ?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-glow transition-colors font-medium"
            >
              Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
