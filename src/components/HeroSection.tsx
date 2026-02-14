import JournalEntry from '@/components/JournalEntry';
import TimelineCard from '@/components/TimelineCard';

const HeroSection = () => {
  return (
    <section className="min-h-screen flex flex-col md:flex-row">
      {/* Left — The Problem */}
      <div className="relative flex-1 bg-[hsl(var(--journal-bg))] border-b md:border-b-0 md:border-r border-border min-h-[50vh] md:min-h-screen">
        <JournalEntry />
      </div>

      {/* Right — The Solution */}
      <div className="flex-1 bg-background min-h-[50vh] md:min-h-screen">
        <TimelineCard />
      </div>
    </section>
  );
};

export default HeroSection;
