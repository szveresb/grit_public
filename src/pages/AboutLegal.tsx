import { useLanguage } from '@/hooks/useLanguage';
import PublicHeader from '@/components/PublicHeader';

const AboutLegal = () => {
  const { t } = useLanguage();
  const content = t.legal.about;

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8 text-sm text-muted-foreground leading-relaxed">
        <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>

        <p>{content.p1}</p>
        <p>{content.p2}</p>

        <h2 className="text-lg font-bold text-foreground pt-4">{content.purposeTitle}</h2>
        <ul className="list-disc pl-5 space-y-1">
          {content.purposeItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p>{content.purposeNote}</p>

        <h2 className="text-lg font-bold text-foreground pt-4">{content.regTitle}</h2>

        <h3 className="text-base font-semibold text-foreground">{content.reg1Title}</h3>
        <ul className="list-disc pl-5 space-y-1">
          {content.reg1Items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        
        <p className="pt-2 font-medium">{content.reg1SubTitle}</p>
        <ul className="list-disc pl-5 space-y-1">
          {content.reg1SubItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        
        <p className="pt-2 font-medium">{content.reg1NotTitle}</p>
        <ul className="list-disc pl-5 space-y-1">
          {content.reg1NotItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3 className="text-base font-semibold text-foreground pt-4">{content.regAiTitle}</h3>
        <p>{content.regAiDesc}</p>
        <ul className="list-disc pl-5 space-y-1">
          {content.regAiItems.map((item, i) => (
            <li key={i}>
              <strong>{item.title}:</strong> {item.desc}
            </li>
          ))}
        </ul>

        <h3 className="text-base font-semibold text-foreground pt-4">{content.regMdrTitle}</h3>
        <p>{content.regMdrDesc}</p>
        
        <p className="pt-2 font-medium">{t.nav.explore}:</p>
        <ul className="list-disc pl-5 space-y-1">
          {content.regMdrItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        
        <p className="pt-2 font-medium">{content.regMdrNotTitle}</p>
        <ul className="list-disc pl-5 space-y-1">
          {content.regMdrNotItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p>{content.regMdrNote}</p>

        <h2 className="text-lg font-bold text-foreground pt-4">{content.safetyTitle}</h2>

        <h3 className="text-base font-semibold text-foreground">{content.safetyZeroTitle}</h3>
        <p>{content.safetyZeroDesc}</p>
        <blockquote className="border-l-4 border-primary/40 pl-4 italic">
          {content.safetyZeroNote}
        </blockquote>

        <h3 className="text-base font-semibold text-foreground pt-4">{content.safetyHitlTitle}</h3>
        <ul className="list-disc pl-5 space-y-1">
          {content.safetyHitlItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h2 className="text-lg font-bold text-foreground pt-4">{content.liabilityTitle}</h2>
        <p>{content.liabilityDesc}</p>
        
        <p className="pt-2 font-medium">{content.liabilityUserTitle}</p>
        <ul className="list-disc pl-5 space-y-1">
          {content.liabilityUserItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p>{content.liabilityNote}</p>

        <h2 className="text-lg font-bold text-foreground pt-4">{content.secondaryUseTitle}</h2>
        <p>{content.secondaryUseDesc}</p>
        <ul className="list-disc pl-5 space-y-1">
          {content.secondaryUseItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p>{content.secondaryUseNote}</p>

        <p className="pt-4 text-xs text-muted-foreground">{content.contact}</p>
      </main>
    </div>
  );
};

export default AboutLegal;
