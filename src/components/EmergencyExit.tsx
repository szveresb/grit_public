import { ExternalLink } from 'lucide-react';

const EmergencyExit = () => {
  return (
    <a
      href="https://www.google.com"
      className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-destructive text-destructive-foreground rounded-sm hover:opacity-90 transition-opacity"
      aria-label="Emergency exit — leaves this site immediately"
    >
      <ExternalLink className="h-3 w-3" />
      Exit
    </a>
  );
};

export default EmergencyExit;
