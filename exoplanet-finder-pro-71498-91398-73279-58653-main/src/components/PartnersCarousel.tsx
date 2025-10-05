import { useEffect, useRef } from 'react';
import rcepLogo from '@/assets/partners/rcep-gabon.jpg';
import aninfLogo from '@/assets/partners/aninf.jpg';
import sobragaLogo from '@/assets/partners/sobraga.jpg';
import airtelLogo from '@/assets/partners/airtel.jpg';
import ondscLogo from '@/assets/partners/ondsc.jpg';
import erametLogo from '@/assets/partners/eramet.jpg';
import g1ereLogo from '@/assets/partners/g1ere.jpg';
import gabon2aLogo from '@/assets/partners/2a-gabon.jpg';
import sogaraLogo from '@/assets/partners/sogara.jpg';
import nasaLogo from '@/assets/partners/nasa.jpg';

const partners = [
  { name: 'RCEP Gabon', logo: rcepLogo },
  { name: 'ANINF', logo: aninfLogo },
  { name: 'Sobraga', logo: sobragaLogo },
  { name: 'Airtel', logo: airtelLogo },
  { name: 'ONDSC', logo: ondscLogo },
  { name: 'Eramet Comilog', logo: erametLogo },
  { name: 'G1ère Gabon', logo: g1ereLogo },
  { name: '2A Gabon', logo: gabon2aLogo },
  { name: 'SOGARA', logo: sogaraLogo },
  { name: 'NASA', logo: nasaLogo },
];

const PartnersCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationFrameId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const scroll = () => {
      scrollPosition += scrollSpeed;
      
      if (scrollContainer.scrollWidth && scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      
      scrollContainer.scrollLeft = scrollPosition;
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="w-full py-8">
      <div className="text-center mb-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Nos Partenaires
        </h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="overflow-hidden relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-12 w-max">
          {/* Premier set de logos */}
          {partners.map((partner, index) => (
            <div
              key={`partner-1-${index}`}
              className="flex-shrink-0 w-32 h-20 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
          
          {/* Deuxième set de logos pour créer une boucle infinie */}
          {partners.map((partner, index) => (
            <div
              key={`partner-2-${index}`}
              className="flex-shrink-0 w-32 h-20 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PartnersCarousel;
