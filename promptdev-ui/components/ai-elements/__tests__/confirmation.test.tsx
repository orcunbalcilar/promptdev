import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from '@/components/ai-elements/confirmation'

describe('Confirmation', () => {
  it('renders children with context', () => {
    render(
      <Confirmation
        approval={{ id: '1' }}
        state="approval-requested"
      >
        <span>Child content</span>
      </Confirmation>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('returns null when no approval', () => {
    const { container } = render(
      <Confirmation approval={undefined} state="approval-requested">
        <span>Hidden</span>
      </Confirmation>
    )
    expect(container.innerHTML).toBe('')
  })

  it('returns null when state is input-streaming', () => {
    const { container } = render(
      <Confirmation approval={{ id: '1' }} state="input-streaming">
        <span>Hidden</span>
      </Confirmation>
    )
    expect(container.innerHTML).toBe('')
  })

  it('returns null when state is input-available', () => {
    const { container } = render(
      <Confirmation approval={{ id: '1' }} state="input-available">
        <span>Hidden</span>
      </Confirmation>
    )
    expect(container.innerHTML).toBe('')
  })
})

describe('ConfirmationTitle', () => {
  it('renders text', () => {
    render(
      <Confirmation approval={{ id: '1' }} state="approval-requested">
        <ConfirmationTitle>My Title</ConfirmationTitle>
      </Confirmation>
    )
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })
})

describe('ConfirmationRequest', () => {
  it('shows when state is approval-requested', () => {
    render(
      <Confirmation approval={{ id: '1' }} state="approval-requested">
        <ConfirmationRequest>
          <span>Request content</span>
        </ConfirmationRequest>
      </Confirmation>
    )
    expect(screen.getByText('Request content')).toBeInTheDocument()
  })

  it('hides when state is not approval-requested', () => {
    render(
      <Confirmation
        approval={{ id: '1', approved: true }}
        state="approval-responded"
      >
        <ConfirmationRequest>
          <span>Request content</span>
        </ConfirmationRequest>
      </Confirmation>
    )
    expect(screen.queryByText('Request content')).not.toBeInTheDocument()
  })
})

describe('ConfirmationAccepted', () => {
  it('shows when approved and in response state', () => {
    render(
      <Confirmation
        approval={{ id: '1', approved: true }}
        state="approval-responded"
      >
        <ConfirmationAccepted>
          <span>Accepted!</span>
        </ConfirmationAccepted>
      </Confirmation>
    )
    expect(screen.getByText('Accepted!')).toBeInTheDocument()
  })

  it('hides when not approved', () => {
    render(
      <Confirmation
        approval={{ id: '1', approved: false }}
        state="approval-responded"
      >
        <ConfirmationAccepted>
          <span>Accepted!</span>
        </ConfirmationAccepted>
      </Confirmation>
    )
    expect(screen.queryByText('Accepted!')).not.toBeInTheDocument()
  })
})

describe('ConfirmationRejected', () => {
  it('shows when not approved and in response state', () => {
    render(
      <Confirmation
        approval={{ id: '1', approved: false }}
        state="approval-responded"
      >
        <ConfirmationRejected>
          <span>Rejected!</span>
        </ConfirmationRejected>
      </Confirmation>
    )
    expect(screen.getByText('Rejected!')).toBeInTheDocument()
  })

  it('hides when approved', () => {
    render(
      <Confirmation
        approval={{ id: '1', approved: true }}
        state="approval-responded"
      >
        <ConfirmationRejected>
          <span>Rejected!</span>
        </ConfirmationRejected>
      </Confirmation>
    )
    expect(screen.queryByText('Rejected!')).not.toBeInTheDocument()
  })
})

describe('ConfirmationActions', () => {
  it('renders children when state is approval-requested', () => {
    render(
      <Confirmation approval={{ id: '1' }} state="approval-requested">
        <ConfirmationActions>
          <button type="button">Approve</button>
        </ConfirmationActions>
      </Confirmation>
    )
    expect(screen.getByText('Approve')).toBeInTheDocument()
  })

  it('hides when state is not approval-requested', () => {
    render(
      <Confirmation
        approval={{ id: '1', approved: true }}
        state="approval-responded"
      >
        <ConfirmationActions>
          <button type="button">Approve</button>
        </ConfirmationActions>
      </Confirmation>
    )
    expect(screen.queryByText('Approve')).not.toBeInTheDocument()
  })
})

describe('ConfirmationAction', () => {
  it('renders button', () => {
    render(
      <Confirmation approval={{ id: '1' }} state="approval-requested">
        <ConfirmationAction>Click me</ConfirmationAction>
      </Confirmation>
    )
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })
})
