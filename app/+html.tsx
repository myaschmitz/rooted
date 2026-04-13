import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom HTML wrapper for the web app.
 * This file customizes the <html>, <head>, and <body> tags on web.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#4CAF50" />
        <meta name="description" content="Rooted — Plant care tracking app" />

        {/* Disable body scrolling to let React Native handle scroll */}
        <ScrollViewStyleReset />

        {/* Global web styles */}
        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveStyles = `
  body {
    overflow: hidden;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  #root {
    display: flex;
    height: 100vh;
  }

  /* Smooth scrolling for all scrollable containers */
  * {
    -webkit-overflow-scrolling: touch;
  }

  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  /* Focus styles for accessibility */
  *:focus-visible {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  /* Disable default tap highlight on mobile web */
  * {
    -webkit-tap-highlight-color: transparent;
  }
`;
