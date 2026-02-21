import { render, screen,  waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../RegisterForm'
import { afterEach, describe, expect, it, test, vi } from 'vitest' 
import '@testing-library/jest-dom'
import App from '../App'


describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('shows validation error when username is empty', async () => {
    render(<RegisterForm />)
    const user = userEvent.setup()

    await waitFor(async () => {
      await user.click(screen.getByRole('button', { name: /lets go!/i }))
      expect(screen.getByText(/please enter a username/i)).toBeInTheDocument()
    })
  })

  test('submits username and displays response', async () => {
    const user = userEvent.setup()

    // Mock fetch to resolve automatically
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Hello Pablo! Welcome to the course!' }),
    } as Response)

    render(<RegisterForm />)

    // Wrap interaction + assertion inside waitFor
    await waitFor(async () => {
      await user.type(screen.getByLabelText(/whats your name\?/i), 'Pablo')
      await user.click(screen.getByRole('button', { name: /lets go!/i }))

      // Response message should appear
      expect(
        screen.getByText(/hello pablo! welcome to the course!/i)
      ).toBeInTheDocument()
    })
  })
})

describe('App - backend connectivity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Gamey as Online when fetch succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('OK')));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Gamey/i)).toBeInTheDocument();
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
    });
  });

  it('shows Gamey as Offline when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Gamey/i)).toBeInTheDocument();
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    });
  });
});