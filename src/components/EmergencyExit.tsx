import { X } from 'lucide-react';

const EmergencyExit = () => {
  return (
    <a
      href="https://www.google.com"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center h-12 w-12 rounded-full bg-bamboo-sage text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
      aria-label="Quick exit — leaves this site immediately"
      title="Quick Exit"
    >
      <X className="h-5 w-5" />
    </a>
  );
};

export default EmergencyExit;
