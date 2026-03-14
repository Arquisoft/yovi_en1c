import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('shows validation error when username is empty', async () => {
    const onRegistered = vi.fn()
    render(<RegisterForm onRegistered={onRegistered} />)
    const user = userEvent.setup()

    await waitFor(async () => {
      await user.click(screen.getByRole('button', { name: /lets go!/i }))
      expect(screen.getByText(/please enter a username/i)).toBeInTheDocument()
    })
  })

  test('submits username and calls onRegistered', async () => {
    const onRegistered = vi.fn()
    const user = userEvent.setup()

    render(<RegisterForm onRegistered={onRegistered} />)

    await user.type(screen.getByLabelText(/whats your name\?/i), 'Pablo')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))

    await waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith('Pablo')
    })
  })
})