import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, ClipboardCheck, Search, FileText, Users, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import bambooBg from '@/assets/bamboo-bg.jpg';

interface LibraryArticle {
  id: string;
  title: string;
  excerpt: string | null;
  source: string | null;
  category: string;
}


const samplePreviewQuestions = [
  { text: 'How would you rate your emotional stability today?', type: 'Scale 1–5' },
  { text: 'Did you experience any boundary violations this week?', type: 'Yes / No' },
  { text: 'Which coping strategies did you use?', type: 'Multiple Choice' },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<LibraryArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  useEffect(() => {
    supabase.from('library_articles').select('id, title, excerpt, source, category').eq('published', true).order('created_at', { ascending: false })
      .then(({ data }) => { setArticles(data ?? []); setArticlesLoading(false); });
  }, []);

  const handleGatedClick = (path: string) => {
    if (user) {
      navigate(path);
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Fixed bamboo background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.12 }} />
      <div className="fixed inset-0 z-0 bg-background/80" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
            Grit.hu
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#library" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Library</a>
            <a href="#research" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Research Summaries</a>
            <button onClick={() => handleGatedClick('/self-checks')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              Self-Checks
              {!user && <Lock className="h-3 w-3" />}
            </button>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
          </nav>
          {user ? (
            <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <Button size="sm" className="rounded-full px-4" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-16 pb-12 max-w-6xl mx-auto text-center">
        <div className="max-w-2xl mx-auto animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
            Your sensemaking library for navigating high-conflict dynamics
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Curated research, structured self-reflection tools, and a safe space to anchor yourself in what's real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="rounded-2xl px-6" asChild>
              <a href="#library">Browse the Library</a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-2xl px-6" onClick={() => handleGatedClick('/self-checks')}>
              Start a Self-Check
              {!user && <Lock className="h-4 w-4 ml-1.5" />}
            </Button>
          </div>
        </div>
      </section>

      {/* Library Section */}
      <section id="library" className="relative z-10 px-6 py-12 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">The Library</h2>
            <p className="mt-1 text-sm text-muted-foreground">Curated articles, studies, and book recommendations.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articlesLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card/70 backdrop-blur border border-border rounded-3xl p-6 space-y-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          ) : articles.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">No articles available yet.</p>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="bg-card/70 backdrop-blur border border-border rounded-3xl p-6 hover:shadow-md transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
                    {article.category}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {article.excerpt}
                </p>
                {article.source && (
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {article.source}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Research Summaries Section */}
      <section id="research" className="relative z-10 px-6 py-12 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Research Summaries</h2>
          <p className="mt-1 text-sm text-muted-foreground">Key findings distilled into accessible overviews.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { title: 'Attachment Styles & Conflict Escalation', finding: 'Insecure attachment patterns correlate with a 3x increase in conflict frequency within intimate relationships.', year: '2023' },
            { title: 'Effects of Reality-Distortion on Self-Trust', finding: 'Prolonged exposure to gaslighting reduces self-reported confidence scores by an average of 47% over 18 months.', year: '2022' },
            { title: 'Boundary Setting & Emotional Recovery', finding: 'Individuals who implement structured boundary protocols report 62% faster emotional recovery post-separation.', year: '2024' },
            { title: 'Journaling as a Reality-Anchoring Tool', finding: 'Daily structured journaling improves reality-testing accuracy by 38% in individuals affected by high-conflict dynamics.', year: '2023' },
          ].map((study, i) => (
            <div key={i} className="bg-card/70 backdrop-blur border border-border rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{study.year}</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{study.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{study.finding}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Self-Check Preview Section */}
      <section id="self-checks" className="relative z-10 px-6 py-12 max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Self-Check Preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">See what structured self-reflection looks like. Create an account to track your progress over time.</p>
          </div>
          <div className="bg-card/70 backdrop-blur border border-border rounded-[40px] p-8 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sample Questions</h3>
            {samplePreviewQuestions.map((q, i) => (
              <div key={i} className="border border-border rounded-2xl p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">{i + 1}. {q.text}</p>
                <Badge variant="outline" className="rounded-full text-[10px]">{q.type}</Badge>
                {q.type === 'Scale 1–5' && (
                  <div className="flex gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-xs text-muted-foreground">{n}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="text-center pt-2">
              {user ? (
                <Button className="rounded-2xl px-6" onClick={() => navigate('/self-checks')}>
                  Go to Self-Checks <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Create a free account to start tracking your patterns over time.</p>
                  <Button className="rounded-2xl px-6" onClick={() => navigate('/auth')}>
                    Create Your Space <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 px-6 py-12 max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto bg-card/70 backdrop-blur border border-border rounded-[40px] p-10 text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground">About Grit.hu</h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Grit.hu is a sensemaking information portal for people affected by high-conflict relational dynamics.
            We provide a curated library of research, structured self-reflection tools, and a private sanctuary
            for observation and reality-anchoring — all without clinical labels or diagnostic language.
          </p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Your data is yours. Everything stays private. No social features, no sharing, no community feeds.
            Just you, your observations, and the research that helps you make sense of your experience.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Grit.hu. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">GDPR Compliance</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
