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

export const renderSimpleMarkdown = (text: string) => {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-2xl font-bold text-foreground mb-4">{line.slice(2)}</h1>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-base font-semibold text-foreground pt-4 mb-2">{line.slice(3)}</h2>;
    }
    if (line.startsWith('*') && line.endsWith('*')) {
      return <p key={i} className="text-xs text-muted-foreground mb-4">{line.slice(1, -1)}</p>;
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="text-sm text-muted-foreground ml-5 list-disc">{line.slice(2)}</li>;
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{line}</p>;
  });
};
