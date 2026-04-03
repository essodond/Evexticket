import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

// Component that throws on render for testing ErrorBoundary
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div>OK</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows error UI when child throws', () => {
    // Suppress console.error noise from React's error boundary internals
    const originalError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Une erreur inattendue/i)).toBeInTheDocument();
    expect(screen.getByText(/Test render error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retour à l'accueil/i })).toBeInTheDocument();

    console.error = originalError;
  });
});
