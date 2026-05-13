import React from 'react';

export const convertToText = (obj: Record<string, any>) => {
  let text = '';
  if (obj.title) text += `# ${obj.title}\n\n`;
  if (obj.lastUpdated) text += `*${obj.lastUpdated}*\n\n`;
  
  const keys = Object.keys(obj).sort((a, b) => {
    const aMatch = a.match(/s(\d+)/);
    const bMatch = b.match(/s(\d+)/);
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    }
    return a.localeCompare(b);
  });
  
  for (const key of keys) {
    if (key === 'title' || key === 'lastUpdated') continue;
    
    if (key.endsWith('Title')) {
      text += `## ${obj[key]}\n\n`;
    } else if (key.endsWith('Items') && Array.isArray(obj[key])) {
      text += obj[key].map((item: string) => `- ${item}`).join('\n') + '\n\n';
    } else if (typeof obj[key] === 'string') {
      text += `${obj[key]}\n\n`;
    }
  }
  return text.trim();
};

// Strip markdown syntax for plain-text previews (cards, list snippets).
export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
};

// Inline parser: links, bold, italic, autolinks. Returns React nodes.
const renderInline = (text: string, baseKey: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  // Token regex order matters: links first, then bold, then italic, then autolinks.
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|(https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${baseKey}-i${i++}`;
    if (match[1] && match[2]) {
      nodes.push(
        <a key={key} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      nodes.push(<strong key={key} className="font-semibold text-foreground">{match[3]}</strong>);
    } else if (match[4]) {
      nodes.push(<em key={key}>{match[4]}</em>);
    } else if (match[5]) {
      nodes.push(<em key={key}>{match[5]}</em>);
    } else if (match[6]) {
      nodes.push(
        <a key={key} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
          {match[6]}
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
};

export const renderSimpleMarkdown = (text: string) => {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-2xl font-bold text-foreground mb-4">{renderInline(line.slice(2), `h1-${i}`)}</h1>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-base font-semibold text-foreground pt-4 mb-2">{renderInline(line.slice(3), `h2-${i}`)}</h2>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-sm font-semibold text-foreground pt-3 mb-1">{renderInline(line.slice(4), `h3-${i}`)}</h3>;
    }
    if (line.startsWith('*') && line.endsWith('*')) {
      return <p key={i} className="text-xs text-muted-foreground mb-4">{line.slice(1, -1)}</p>;
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="text-sm text-muted-foreground ml-5 list-disc">{renderInline(line.slice(2), `li-${i}`)}</li>;
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{renderInline(line, `p-${i}`)}</p>;
  });
};
