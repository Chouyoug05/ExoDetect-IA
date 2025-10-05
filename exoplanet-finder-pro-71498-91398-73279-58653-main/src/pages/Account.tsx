import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

const Account = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('Jean Dupont');
  const [email, setEmail] = useState('jean.dupont@example.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarName, setAvatarName] = useState<string | null>(null);

  useEffect(() => {
    const current = localStorage.getItem('exodetect_user');
    if (current) {
      const profRaw = localStorage.getItem(`exodetect_profile_${current}`);
      if (profRaw) {
        try {
          const prof = JSON.parse(profRaw);
          setEmail(prof.email || current);
          setName(prof.name || name);
          setAvatarName(prof.selectedAvatar || null);
        } catch {}
      } else {
        setEmail(current);
      }
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profil mis à jour avec succès');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    toast.success('Mot de passe modifié avec succès');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="glass-card border-b glass-border">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-secondary/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Mon Compte</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Profile Section */}
          <div className="glass-card p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 ring-4 ring-primary/20">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarName || name || 'ExoDetect')}`} alt="User" />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{name}</h2>
                <p className="text-muted-foreground">{email}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-foreground">
                  Nom complet
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-foreground">
                  Adresse email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les modifications
              </Button>
            </form>
          </div>

          {/* Password Section */}
          <div className="glass-card p-8 rounded-2xl space-y-6">
            <h3 className="text-xl font-bold text-foreground">Changer le mot de passe</h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-foreground">
                  Mot de passe actuel
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-foreground">
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                    placeholder="Minimum 8 caractères"
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-foreground">
                  Confirmer le nouveau mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary transition-colors"
                    placeholder="Confirmer le mot de passe"
                    minLength={8}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Modifier le mot de passe
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Account;
