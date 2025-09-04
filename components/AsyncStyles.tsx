"use client";

const AsyncStyles = () => (
  <>
    <link
      rel="preload"
      href="/tailwind.css"
      as="style"
      onLoad={(e) => {
        const target = e.currentTarget as HTMLLinkElement;
        target.onload = null;
        target.rel = "stylesheet";
      }}
    />
    <noscript
      dangerouslySetInnerHTML={{
        __html: '<link rel="stylesheet" href="/tailwind.css" />',
      }}
    />
  </>
);

export default AsyncStyles;

