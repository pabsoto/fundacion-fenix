import { Fragment, type ReactNode } from 'react';

const STRONG_PATTERN = /(<strong>.*?<\/strong>)/g;

export function SafeRichText({ text }: { text: string }): ReactNode {
  return text.split(STRONG_PATTERN).map((part, index) => {
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      return <strong key={index}>{part.slice(8, -9)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
