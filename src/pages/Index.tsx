import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, ClipboardCheck, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import bambooBg from '@/assets/bamboo-bg.jpg';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      {/* Fixed bamboo background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.12 }}
      />
      <div className="fixed inset-0 z-0 bg-background/80" />

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-lg font-semibold text-foreground tracking-tight">Liftoff</span>
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link to="/journal" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Journal</Link>
          <Link to="/self-checks" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Self-Checks</Link>
          <Link to="/timeline" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">History</Link>
          {user ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4"
              onClick={() => navigate('/profile')}
            >
              <User className="h-4 w-4 mr-1.5" />
              Account
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-full px-4"
              onClick={() => navigate('/auth')}
            >
              Get Started
            </Button>
          )}
        </div>
      </nav>

      {/* Central Hub */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-16 pb-20">
        <div className="w-full max-w-lg bg-card/80 backdrop-blur-xl rounded-[40px] border border-border p-10 shadow-lg animate-fade-in">
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome to Liftoff
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              A safe space to observe, reflect, and anchor yourself in what's real. Your personal sensemaking sanctuary.
            </p>
          </div>

          {user ? (
            <Button
              className="w-full rounded-2xl h-12 text-sm font-semibold"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </Button>
          ) : (
            <Button
              className="w-full rounded-2xl h-12 text-sm font-semibold"
              onClick={() => navigate('/auth')}
            >
              Create Your Space
            </Button>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10 max-w-lg w-full">
          <button
            onClick={() => navigate(user ? '/journal' : '/auth')}
            className="group bg-bamboo-sage-light/80 backdrop-blur border border-border rounded-3xl p-6 text-left hover:shadow-md transition-all"
          >
            <BookOpen className="h-6 w-6 text-bamboo-sage mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Journal Entry</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Record observations and anchor your thoughts with structured documentation.
            </p>
          </button>

          <button
            onClick={() => navigate(user ? '/self-checks' : '/auth')}
            className="group bg-bamboo-sage-light/80 backdrop-blur border border-border rounded-3xl p-6 text-left hover:shadow-md transition-all"
          >
            <ClipboardCheck className="h-6 w-6 text-bamboo-sage mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Self-Check</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Complete guided check-ins to track your emotional wellbeing over time.
            </p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Index;
