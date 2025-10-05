import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

const HowToDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-2 rounded-lg hover:bg-secondary/50 transition-all duration-300 group">
          <HelpCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl">Comment utiliser ExoDetect AI ?</DialogTitle>
          <DialogDescription>
            Guide d'utilisation de la plateforme de détection d'exoplanètes
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-3 gap-6 pt-4">
          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                1
              </div>
            </div>
            <h4 className="font-semibold text-foreground">Téléchargez vos données</h4>
            <p className="text-sm text-muted-foreground">
              Sélectionnez un fichier de courbe de lumière stellaire au format CSV ou FITS issu de Kepler, K2 ou TESS.
            </p>
          </div>

          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                2
              </div>
            </div>
            <h4 className="font-semibold text-foreground">Analyse automatique</h4>
            <p className="text-sm text-muted-foreground">
              Notre IA analyse les variations de luminosité pour détecter la présence potentielle d'exoplanètes.
            </p>
          </div>

          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                3
              </div>
            </div>
            <h4 className="font-semibold text-foreground">Résultats détaillés</h4>
            <p className="text-sm text-muted-foreground">
              Obtenez un diagnostic de confiance et visualisez la courbe de lumière annotée.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t glass-border">
          <p className="text-sm text-muted-foreground text-center">
            <strong className="text-foreground">Format attendu :</strong> Fichier CSV ou FITS avec colonnes 'time' et 'flux'
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HowToDialog;
