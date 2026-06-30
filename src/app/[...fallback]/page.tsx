import React from 'react';
import FallbackWorkspaceClient from './FallbackWorkspaceClient';

export function generateStaticParams() {
  return [
    { fallback: ['products', 'adjustment'] },
    { fallback: ['reports', 'sales'] },
    { fallback: ['reports', 'purchases'] },
    { fallback: ['reports', 'stock'] },
    { fallback: ['users'] },
    { fallback: ['settings'] },
  ];
}

export default function FallbackPage() {
  return <FallbackWorkspaceClient />;
}
