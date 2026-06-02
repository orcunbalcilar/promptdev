import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span data-testid="badge" className={className} {...props}>{children}</span>
  ),
}))

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, ...props }: any) => <div data-testid="collapsible" {...props}>{children}</div>,
  CollapsibleTrigger: ({ children, ...props }: any) => <button data-testid="collapsible-trigger" {...props}>{children}</button>,
  CollapsibleContent: ({ children, ...props }: any) => <div data-testid="collapsible-content" {...props}>{children}</div>,
}))

import {
  TestResults,
  TestResultsHeader,
  TestResultsSummary,
  TestResultsDuration,
  TestResultsProgress,
  TestResultsContent,
  TestSuite,
  TestSuiteName,
  TestSuiteStats,
  TestSuiteContent,
  Test,
  TestStatus,
  TestName,
  TestDuration,
  TestError,
  TestErrorMessage,
} from '@/components/ai-elements/test-results'

const defaultSummary = {
  passed: 8,
  failed: 2,
  skipped: 1,
  total: 11,
  duration: 3030,
}

describe('TestResults', () => {
  it('renders children', () => {
    render(
      <TestResults summary={defaultSummary}>
        <span>Results content</span>
      </TestResults>
    )
    expect(screen.getByText('Results content')).toBeInTheDocument()
  })
})

describe('TestResultsHeader', () => {
  it('renders children', () => {
    render(
      <TestResultsHeader>
        <span>Header content</span>
      </TestResultsHeader>
    )
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })
})

describe('TestResultsSummary', () => {
  it('shows passed/failed/skipped counts', () => {
    render(
      <TestResults summary={defaultSummary}>
        <TestResultsSummary />
      </TestResults>
    )
    expect(screen.getByText(/8 passed/)).toBeInTheDocument()
    expect(screen.getByText(/2 failed/)).toBeInTheDocument()
    expect(screen.getByText(/1 skipped/)).toBeInTheDocument()
  })

  it('returns null when no summary', () => {
    const { container } = render(
      <TestResults>
        <TestResultsSummary />
      </TestResults>
    )
    expect(container.querySelector('[data-testid="badge"]')).not.toBeInTheDocument()
  })
})

describe('TestResultsDuration', () => {
  it('shows duration', () => {
    render(
      <TestResults summary={defaultSummary}>
        <TestResultsDuration />
      </TestResults>
    )
    expect(screen.getByText('3.50s')).toBeInTheDocument()
  })

  it('shows ms for short durations', () => {
    render(
      <TestResults summary={{ ...defaultSummary, duration: 500 }}>
        <TestResultsDuration />
      </TestResults>
    )
    expect(screen.getByText('500ms')).toBeInTheDocument()
  })

  it('returns null when no duration', () => {
    const { container } = render(
      <TestResults summary={{ ...defaultSummary, duration: undefined }}>
        <TestResultsDuration />
      </TestResults>
    )
    expect(container.textContent).toBe('')
  })
})

describe('TestResultsProgress', () => {
  it('renders progress bar', () => {
    render(
      <TestResults summary={defaultSummary}>
        <TestResultsProgress />
      </TestResults>
    )
    expect(screen.getByText('8/11 tests passed')).toBeInTheDocument()
    expect(screen.getByText('73%')).toBeInTheDocument()
  })

  it('returns null when no summary', () => {
    const { container } = render(
      <TestResults>
        <TestResultsProgress />
      </TestResults>
    )
    expect(container.textContent).toBe('')
  })
})

describe('TestResultsContent', () => {
  it('renders children', () => {
    render(
      <TestResultsContent>
        <span>Content area</span>
      </TestResultsContent>
    )
    expect(screen.getByText('Content area')).toBeInTheDocument()
  })
})

describe('TestSuite', () => {
  it('renders children', () => {
    render(
      <TestSuite name="my-suite" status="passed">
        <span>Suite content</span>
      </TestSuite>
    )
    expect(screen.getByText('Suite content')).toBeInTheDocument()
  })
})

describe('TestSuiteName', () => {
  it('renders name', () => {
    render(
      <TestSuite name="auth.test.ts" status="passed">
        <TestSuiteName />
      </TestSuite>
    )
    expect(screen.getByText('auth.test.ts')).toBeInTheDocument()
  })
})

describe('TestSuiteStats', () => {
  it('renders counts', () => {
    render(
      <TestSuiteStats passed={5} failed={2} skipped={1} />
    )
    expect(screen.getByText('5 passed')).toBeInTheDocument()
    expect(screen.getByText('2 failed')).toBeInTheDocument()
    expect(screen.getByText('1 skipped')).toBeInTheDocument()
  })

  it('only shows non-zero stats', () => {
    render(
      <TestSuiteStats passed={3} failed={0} skipped={0} />
    )
    expect(screen.getByText('3 passed')).toBeInTheDocument()
    expect(screen.queryByText(/failed/)).not.toBeInTheDocument()
    expect(screen.queryByText(/skipped/)).not.toBeInTheDocument()
  })
})

describe('TestSuiteContent', () => {
  it('renders children', () => {
    render(
      <TestSuite name="suite" status="passed">
        <TestSuiteContent>
          <span>Suite children</span>
        </TestSuiteContent>
      </TestSuite>
    )
    expect(screen.getByText('Suite children')).toBeInTheDocument()
  })
})

describe('Test', () => {
  it('renders children', () => {
    render(
      <Test name="should work" status="passed">
        <span>Custom test content</span>
      </Test>
    )
    expect(screen.getByText('Custom test content')).toBeInTheDocument()
  })

  it('renders default layout with name, status and duration', () => {
    render(
      <Test name="should pass" status="passed" duration={42} />
    )
    expect(screen.getByText('should pass')).toBeInTheDocument()
    expect(screen.getByText('42ms')).toBeInTheDocument()
  })
})

describe('TestStatus', () => {
  it.each([
    ['passed'],
    ['failed'],
    ['skipped'],
    ['running'],
  ] as const)('shows correct icon for %s status', (status) => {
    const { container } = render(
      <Test name="test" status={status}>
        <TestStatus />
      </Test>
    )
    const statusSpan = container.querySelector('span')
    expect(statusSpan).toBeInTheDocument()
  })
})

describe('TestName', () => {
  it('renders text from context', () => {
    render(
      <Test name="should render" status="passed">
        <TestName />
      </Test>
    )
    expect(screen.getByText('should render')).toBeInTheDocument()
  })
})

describe('TestDuration', () => {
  it('renders time', () => {
    render(
      <Test name="test" status="passed" duration={150}>
        <TestDuration />
      </Test>
    )
    expect(screen.getByText('150ms')).toBeInTheDocument()
  })

  it('returns null when no duration', () => {
    const { container } = render(
      <Test name="test" status="passed">
        <TestDuration />
      </Test>
    )
    expect(container.querySelector('.ml-auto')).not.toBeInTheDocument()
  })
})

describe('TestError', () => {
  it('renders children', () => {
    render(
      <TestError>
        <span>Error details</span>
      </TestError>
    )
    expect(screen.getByText('Error details')).toBeInTheDocument()
  })
})

describe('TestErrorMessage', () => {
  it('renders message', () => {
    render(
      <TestErrorMessage>Expected true to be false</TestErrorMessage>
    )
    expect(screen.getByText('Expected true to be false')).toBeInTheDocument()
  })
})
