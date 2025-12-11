import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header brand', () => {
  render(<App />);
  expect(screen.getByText(/Job Browser/i)).toBeInTheDocument();
});

test('shows key navigation links', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /jobs/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /saved/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /applications/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /assessments/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /alerts/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /interviews/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /post job/i })).toBeInTheDocument();
});
