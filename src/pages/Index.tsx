import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { FLock, FArrowRight } from '@/components/icons/FreudIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import PublicHeader from '@/components/PublicHeader';
import ArticleCard from '@/components/ArticleCard';
import SystemPreview from '@/components/SystemPreview';

const Index = () => {
  const { user } = useAuth();
  const { t, lang, localePath } = useLanguage();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    // Lazy-load background image after initial paint to avoid blocking LCP
    import('@/assets/bamboo-bg.jpg').then((mod) => { setBgLoaded(true); (window as any).__bambooBg = mod.default; });
  }, []);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    
    const { error } = await supabase.from('waitlist_emails' as any).insert({ email } as any);
    
    if (error) {
      // 23505 is Postgres unique_violation
      if (error.code === '23505') {
        toast.success(t.landing?.waitlistSuccess || 'Thank you! You have been added to our beta access waitlist.');
        setEmail('');
      } else {
        toast.error(t.landing?.waitlistError || 'Failed to join waitlist. Please try again.');
      }
    } else {
      toast.success(t.landing?.waitlistSuccess || 'Thank you! You have been added to our beta access waitlist.');
      setEmail('');
    }
    setSubmitting(false);
  };

  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setSubmitting(true);
    
    // Check if code is valid (anonymous check)
    const { data: isValid, error } = await supabase.rpc('check_invite_code' as any, { 
      invite_code: inviteCode.trim().toUpperCase() 
    });
    
    if (error) {
      toast.error('An error occurred. Please try again.');
    } else if (isValid) {
      // Store in session and head to auth
      sessionStorage.setItem('pending_invite_code', inviteCode.trim().toUpperCase());
      toast.success('Code verified! Log in to activate your access.');
      navigate(localePath('/auth'));
    } else {
      toast.error('Invalid or already used invite code.');
    }
    setSubmitting(false);
  };

  const bambooBgUrl = bgLoaded ? (window as any).__bambooBg : undefined;

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden">
      {bambooBgUrl && <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bambooBgUrl})`, opacity: 0.12 }} />}
      <div className="fixed inset-0 z-0 bg-background/80" />

      <PublicHeader />

      {/* Hero */}
      <section className="relative z-10 px-4 md:px-8 pt-24 pb-16 max-w-7xl mx-auto text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold tracking-widest uppercase">
            {t.landing?.betaAccess || 'Beta Access'}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight text-balance">
            {t.landing?.heroTitleBeta || t.landing.heroTitle}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto text-balance">
            {t.landing.heroSubtitle}
          </p>
          
          {!user ? (
            <div className="mt-8 max-w-sm mx-auto bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
              {isRedeeming ? (
                <form onSubmit={handleRedeemSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary text-center mb-1">
                      {t.landing.heroLabelCode}
                    </p>
                    <Input 
                      required 
                      placeholder="XXXX-XXXX" 
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="rounded-full h-11 bg-accent/50 text-center font-mono tracking-widest uppercase"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full h-11 font-semibold" disabled={submitting}>
                    {submitting ? '...' : (t.landing.verifyContinue)}
                  </Button>
                  <button 
                    type="button" 
                    onClick={() => setIsRedeeming(false)}
                    className="w-full text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest font-bold pt-1"
                  >
                    {t.landing.heroLabelBack}
                  </button>
                </form>
              ) : (
                <>
                  <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center mb-1">
                        {t.landing.heroLabelNew}
                      </p>
                      <Input 
                        type="email" 
                        required 
                        placeholder={t.landing?.waitlistEmailPlaceholder || "Enter your email address"} 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-full h-11 bg-accent/50 text-center"
                      />
                    </div>
                    <Button type="submit" className="w-full rounded-full h-11 font-semibold" disabled={submitting}>
                      {submitting ? '...' : (t.landing?.joinWaitlist || 'Join Waitlist')}
                    </Button>
                  </form>
                  <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-3 items-center">
                    <button 
                      onClick={() => setIsRedeeming(true)}
                      className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-2"
                    >
                      {t.landing.heroLabelInvite}
                    </button>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-muted-foreground">{t.landing.heroLabelMember}</span>
                      <Link 
                        to={localePath('/auth')}
                        className="text-primary hover:opacity-80 transition-opacity"
                      >
                        {t.landing.heroLabelSignIn}
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-8 flex justify-center pt-4">
              <Button size="lg" className="rounded-full px-8 h-12 text-md font-semibold" asChild>
                <Link to={localePath('/journal')}>{t.landing.goToJournal}</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-4 md:px-8 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase tracking-[0.2em] opacity-80">
            {t.landing.featuresTitle}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {[t.landing.feature1, t.landing.feature2, t.landing.feature3, t.landing.feature4, t.landing.feature5].map((feature, idx) => (
            <div key={idx} className="flex gap-4 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-accent/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {idx === 0 && <FLock className="w-5 h-5" />}
                {idx === 1 && <FLock className="w-5 h-5 scale-x-[-1]" />}
                {idx === 2 && <FArrowRight className="w-5 h-5" />}
                {idx === 3 && <FLock className="w-5 h-5" />}
                {idx === 4 && <FArrowRight className="w-5 h-5" />}
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed pt-1.5 translate-y-[-2px]">
                {feature}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Embedded System Previews (Inert) */}
      <SystemPreview />

      {/* Gated Library Section (Inert Mockups) */}
      <section className="relative z-10 px-4 md:px-8 py-16 max-w-7xl mx-auto space-y-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t.landing?.gatedSectionTitle || 'Private Library & Tools'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto text-balance">
            {t.landing?.gatedSectionDescription || 'Access is restricted to invited beta participants.'}
          </p>
        </div>

        <div className="relative rounded-[2.5rem] overflow-hidden border border-border bg-card/20 p-6 sm:p-8">
          {/* Blurred Background Mockups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 filter blur-[6px] opacity-60 pointer-events-none select-none">
            <ArticleCard
              id="mock-1"
              title={lang === 'hu' ? 'A magas konfliktusú dinamikák felismerése' : 'Recognizing High-Conflict Dynamics'}
              category={lang === 'hu' ? 'Alapok' : 'Foundation'}
              excerpt={lang === 'hu' ? 'APredictálható mintázatok megértése összetett kapcsolati rendszerekben, klinikai diagnosztikai címkék nélkül.' : "Understanding the predictable patterns in complex relationship systems without resorting to clinical diagnostic labels."}
              source={null}
              url={null}
              featured
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
              <ArticleCard
                id="mock-2"
                title={lang === 'hu' ? 'A projekció anatómiája' : 'The Anatomy of Projection'}
                category={lang === 'hu' ? 'Értelmezés' : 'Sensemaking'}
                excerpt={lang === 'hu' ? 'Hogyan befolyásolja az érzelmi állapot externalizálása az objektív valóságot.' : 'How externalizing emotional state impacts objective truth.'}
                source={null}
                url={null}
              />
              <ArticleCard
                id="mock-3"
                title={lang === 'hu' ? 'Semleges határok felállítása' : 'Establishing Neutral Boundaries'}
                category={lang === 'hu' ? 'Stratégia' : 'Strategy'}
                excerpt={lang === 'hu' ? 'Taktikai megközelítések az alapszintű stabilitás fenntartásához válsághelyzetben.' : 'Tactical approaches to maintaining baseline stability in crisis.'}
                source={null}
                url={null}
              />
            </div>
          </div>

          {/* Locked Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/10 backdrop-blur-[2px]">
            <div className="bg-card shadow-lg border border-primary/20 rounded-3xl p-8 max-w-md w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                <FLock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Beta Access Required</h3>
              <p className="text-sm text-muted-foreground">
                The full platform, including the dynamic research library and encrypted emotional anchoring tools, opens upon authentication.
              </p>
              <Button className="w-full rounded-full h-11 font-semibold" asChild>
                <Link to={localePath('/auth')}>Log In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">{t.landing.footerRights.replace('{year}', String(new Date().getFullYear()))}</span>
          <div className="flex items-center flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to={localePath('/about-legal')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.nav.about} Grit.hu</Link>
            <Link to={localePath('/terms')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.terms}</Link>
            <Link to={localePath('/cookies')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.cookies}</Link>
            <Link to={localePath('/gdpr')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.gdpr}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
