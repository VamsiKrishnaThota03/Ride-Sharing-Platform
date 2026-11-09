import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

test('shows the login form to anonymous visitors', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email address/i)).toBeRequired();
});

test('protected dashboards redirect to login', async () => {
  window.history.pushState({}, '', '/admin-dashboard');
  render(<App />);
  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
});

test('sign-up does not offer an admin role', async () => {
  window.history.pushState({}, '', '/signup');
  render(<App />);
  expect(await screen.findByRole('heading', { name: /create your account/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/traveler/i)).toBeChecked();
  expect(screen.queryByLabelText(/^admin/i)).not.toBeInTheDocument();
});
