import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Check } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload = ({ onFileSelect, isLoading }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/fits': ['.fits', '.fit'],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative p-16 rounded-2xl glass-card glass-border
          transition-all duration-500 cursor-pointer group
          ${isDragActive 
            ? 'border-primary bg-primary/10 scale-[1.02] glow-primary' 
            : 'hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01]'
          }
        `}
      >
        <input {...getInputProps()} disabled={isLoading} />
        
        <div className="flex flex-col items-center gap-6 text-center">
          <div className={`
            p-6 rounded-2xl bg-primary/10 transition-all duration-500
            ${isDragActive ? 'scale-110 rotate-6 glow-primary' : 'group-hover:scale-105'}
          `}>
            <Upload className="w-10 h-10 text-primary" />
          </div>
          
          {selectedFile ? (
            <>
              <div className="flex items-center gap-4 px-6 py-4 glass-card rounded-xl glass-border animate-in fade-in zoom-in duration-300">
                <FileText className="w-6 h-6 text-primary" />
                <div className="text-left flex-1">
                  <p className="text-base font-semibold text-foreground">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Check className="w-6 h-6 text-success glow-success" />
              </div>
              <p className="text-sm text-primary font-medium">
                ✓ Fichier prêt à être analysé
              </p>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-foreground">
                  Téléverser un fichier de données
                </h3>
                <p className="text-base text-muted-foreground">
                  Glissez-déposez votre fichier ici ou cliquez pour sélectionner
                </p>
              </div>
              
              <div className="flex gap-3 text-sm">
                <span className="px-4 py-2 glass-card rounded-lg font-medium text-foreground">CSV</span>
                <span className="px-4 py-2 glass-card rounded-lg font-medium text-foreground">FITS</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
