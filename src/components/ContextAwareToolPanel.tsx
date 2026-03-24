import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { FBookOpen, FEye, FClipboardCheck } from '@/components/icons/FreudIcons';

const ContextAwareToolPanel = () => {
  const navigate = useNavigate();
  const { t, localePath } = useLanguage();
  const { activeSubject } = useStance();
  const isRelative = activeSubject.type === 'relative';

  const tools = isRelative
    ? [
        {
          title: t.subjects.observerLogTitle,
          description: t.subjects.observerLogDesc,
          icon: FEye,
          href: '/journal',
        },
        {
          title: t.subjects.thirdPartyQuestionnaireTitle,
          description: t.subjects.thirdPartyQuestionnaireDesc.replace('{name}', activeSubject.name),
          icon: FClipboardCheck,
          href: '/surveys',
        },
      ]
    : [
        {
          title: t.subjects.selfJournalTitle,
          description: t.subjects.selfJournalDesc,
          icon: FBookOpen,
          href: '/journal',
        },
        {
          title: t.subjects.selfQuestionnaireTitle,
          description: t.subjects.selfQuestionnaireDesc,
          icon: FClipboardCheck,
          href: '/surveys',
        },
      ];

  return (
    <section className="mb-6 md:mb-8 grid gap-3 sm:grid-cols-2">
      {tools.map((tool) => (
        <button
          key={tool.title}
          type="button"
          onClick={() => navigate(localePath(tool.href))}
          className="rounded-3xl border border-border bg-card/70 p-5 text-left backdrop-blur transition-colors hover:border-primary/30 hover:bg-card"
        >
          <tool.icon className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-sm font-semibold text-foreground">{tool.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
        </button>
      ))}
    </section>
  );
};

export default ContextAwareToolPanel;
