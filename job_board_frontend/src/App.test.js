import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header brand', () => {
  render(<App />);
  expect(screen.getByText(/Job Browser/i)).toBeInTheDocument();
});
