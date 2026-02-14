import '@fontsource/caveat/400.css';

const JournalEntry = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      {/* Paper background */}
      <div
        className="relative w-full max-w-sm rounded-sm border border-border bg-[hsl(var(--journal-bg))] p-8 transform -rotate-2 shadow-sm"
        style={{ filter: 'blur(1.5px)' }}
      >
        {/* Ruled lines */}
        <div className="absolute inset-0 p-8 pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-border/40 h-8"
            />
          ))}
        </div>

        {/* Handwritten text */}
        <div className="relative z-10 space-y-2" style={{ fontFamily: "'Caveat', cursive", fontSize: '1.35rem', lineHeight: '2rem', color: 'hsl(var(--journal-text))' }}>
          <p>I don't know what just happened.</p>
          <p>Was it my fault? They said I was</p>
          <p>overreacting but it didn't feel</p>
          <p>that way. Everything feels so</p>
          <p>tangled up. I can't think clearly</p>
          <p>anymore. What's even real?</p>
          <p>I keep going in circles...</p>
        </div>
      </div>

      {/* Overlay text */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <p className="text-xl md:text-2xl font-medium tracking-tight text-foreground text-center px-6">
          "When reality feels blurred..."
        </p>
      </div>
    </div>
  );
};

export default JournalEntry;
