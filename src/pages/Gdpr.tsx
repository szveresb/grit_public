import { useLanguage } from '@/hooks/useLanguage';
import PublicHeader from '@/components/PublicHeader';

const Gdpr = () => {
  const { t } = useLanguage();
  const content = t.legal.gdpr;

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>
        <p className="text-xs text-muted-foreground">{content.lastUpdated}</p>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">{content.s1Title}</h2>
          <p>{content.s1Desc}</p>
          <p className="font-medium text-foreground">{content.s1Controller}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s2Title}</h2>
          <p><strong>{content.s2Item1Title}:</strong> {content.s2Item1Desc}</p>
          <p><strong>{content.s2Item2Title}:</strong> {content.s2Item2Desc}</p>
          <p>{content.s2NoSensitive}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s3Title}</h2>
          <p>{content.s3Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s4Title}</h2>
          <ul className="list-disc pl-5 space-y-2">
            {content.s4Items.map((item, i) => {
              const [title, desc] = item.split(':');
              return (
                <li key={i}>
                  <strong>{title}:</strong>{desc}
                </li>
              );
            })}
          </ul>

          <h2 className="text-base font-semibold text-foreground">{content.s5Title}</h2>
          <p>{content.s5Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s6Title}</h2>
          <p>{content.s6Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s7Title}</h2>
          <p>{content.s7Desc}</p>
        </section>
      </main>
    </div>
  );
};

export default Gdpr;
