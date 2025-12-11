import { render, screen } from '@testing-library/react';
import App from './App';
import { initI18n } from './i18n';

test('renders header brand and nav links exist', () => {
  initI18n();
  render(<App />);
  // Check brand heading element exists
  expect(screen.getByRole('banner')).toBeInTheDocument();
  // Check some known navigation links by role, not text content
  expect(screen.getByRole('link', { name: /jobs/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /post/i })).toBeInTheDocument();
});
