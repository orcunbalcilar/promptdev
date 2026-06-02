import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  PackageInfo,
  PackageInfoHeader,
  PackageInfoName,
  PackageInfoChangeType,
  PackageInfoVersion,
  PackageInfoDescription,
  PackageInfoContent,
  PackageInfoDependencies,
  PackageInfoDependency,
} from '@/components/ai-elements/package-info'

describe('PackageInfo', () => {
  it('renders children', () => {
    render(
      <PackageInfo name="react">
        <span>custom children</span>
      </PackageInfo>,
    )

    expect(screen.getByText('custom children')).toBeInTheDocument()
  })

  it('renders default layout when no children', () => {
    render(
      <PackageInfo
        name="react"
        changeType="minor"
        currentVersion="18.0.0"
        newVersion="18.2.0"
      />,
    )

    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('minor')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <PackageInfo name="test" data-testid="pkg" className="custom">
        <span>child</span>
      </PackageInfo>,
    )

    expect(screen.getByTestId('pkg')).toHaveClass('custom')
  })
})

describe('PackageInfoHeader', () => {
  it('renders children', () => {
    render(
      <PackageInfoHeader>
        <span>header content</span>
      </PackageInfoHeader>,
    )

    expect(screen.getByText('header content')).toBeInTheDocument()
  })
})

describe('PackageInfoName', () => {
  it('renders name from context', () => {
    render(
      <PackageInfo name="lodash">
        <PackageInfoName />
      </PackageInfo>,
    )

    expect(screen.getByText('lodash')).toBeInTheDocument()
  })

  it('renders custom children over context name', () => {
    render(
      <PackageInfo name="lodash">
        <PackageInfoName>custom-name</PackageInfoName>
      </PackageInfo>,
    )

    expect(screen.getByText('custom-name')).toBeInTheDocument()
  })
})

describe('PackageInfoChangeType', () => {
  it('renders correct badge text for major', () => {
    render(
      <PackageInfo name="pkg" changeType="major">
        <PackageInfoChangeType />
      </PackageInfo>,
    )

    expect(screen.getByText('major')).toBeInTheDocument()
  })

  it('renders correct badge text for minor', () => {
    render(
      <PackageInfo name="pkg" changeType="minor">
        <PackageInfoChangeType />
      </PackageInfo>,
    )

    expect(screen.getByText('minor')).toBeInTheDocument()
  })

  it('renders correct badge text for patch', () => {
    render(
      <PackageInfo name="pkg" changeType="patch">
        <PackageInfoChangeType />
      </PackageInfo>,
    )

    expect(screen.getByText('patch')).toBeInTheDocument()
  })

  it('renders correct badge text for added', () => {
    render(
      <PackageInfo name="pkg" changeType="added">
        <PackageInfoChangeType />
      </PackageInfo>,
    )

    expect(screen.getByText('added')).toBeInTheDocument()
  })

  it('renders correct badge text for removed', () => {
    render(
      <PackageInfo name="pkg" changeType="removed">
        <PackageInfoChangeType />
      </PackageInfo>,
    )

    expect(screen.getByText('removed')).toBeInTheDocument()
  })

  it('applies variant-based colors for major', () => {
    render(
      <PackageInfo name="pkg" changeType="major">
        <PackageInfoChangeType data-testid="badge" />
      </PackageInfo>,
    )

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveClass('bg-red-100')
    expect(badge).toHaveClass('text-red-700')
  })

  it('applies variant-based colors for patch', () => {
    render(
      <PackageInfo name="pkg" changeType="patch">
        <PackageInfoChangeType data-testid="badge" />
      </PackageInfo>,
    )

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveClass('bg-green-100')
    expect(badge).toHaveClass('text-green-700')
  })

  it('applies variant-based colors for added', () => {
    render(
      <PackageInfo name="pkg" changeType="added">
        <PackageInfoChangeType data-testid="badge" />
      </PackageInfo>,
    )

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveClass('bg-blue-100')
    expect(badge).toHaveClass('text-blue-700')
  })

  it('returns null when no changeType', () => {
    render(
      <PackageInfo name="pkg">
        <PackageInfoChangeType data-testid="badge" />
      </PackageInfo>,
    )

    expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
  })
})

describe('PackageInfoVersion', () => {
  it('renders version text with arrow', () => {
    render(
      <PackageInfo name="pkg" currentVersion="1.0.0" newVersion="2.0.0">
        <PackageInfoVersion />
      </PackageInfo>,
    )

    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    expect(screen.getByText('2.0.0')).toBeInTheDocument()
  })

  it('renders only current version', () => {
    render(
      <PackageInfo name="pkg" currentVersion="1.0.0">
        <PackageInfoVersion />
      </PackageInfo>,
    )

    expect(screen.getByText('1.0.0')).toBeInTheDocument()
  })

  it('returns null when no versions', () => {
    render(
      <PackageInfo name="pkg">
        <PackageInfoVersion data-testid="version" />
      </PackageInfo>,
    )

    expect(screen.queryByTestId('version')).not.toBeInTheDocument()
  })
})

describe('PackageInfoDescription', () => {
  it('renders description', () => {
    render(
      <PackageInfoDescription>A useful library</PackageInfoDescription>,
    )

    expect(screen.getByText('A useful library')).toBeInTheDocument()
  })
})

describe('PackageInfoContent', () => {
  it('renders children', () => {
    render(
      <PackageInfoContent>
        <span>extra content</span>
      </PackageInfoContent>,
    )

    expect(screen.getByText('extra content')).toBeInTheDocument()
  })
})

describe('PackageInfoDependencies', () => {
  it('renders children with Dependencies label', () => {
    render(
      <PackageInfoDependencies>
        <span>dep list</span>
      </PackageInfoDependencies>,
    )

    expect(screen.getByText('Dependencies')).toBeInTheDocument()
    expect(screen.getByText('dep list')).toBeInTheDocument()
  })
})

describe('PackageInfoDependency', () => {
  it('renders name and version', () => {
    render(<PackageInfoDependency name="react" version="^18.2.0" />)

    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('^18.2.0')).toBeInTheDocument()
  })

  it('renders only name when no version', () => {
    render(<PackageInfoDependency name="typescript" />)

    expect(screen.getByText('typescript')).toBeInTheDocument()
  })

  it('renders custom children over default layout', () => {
    render(
      <PackageInfoDependency name="react" version="18">
        <span>custom dep content</span>
      </PackageInfoDependency>,
    )

    expect(screen.getByText('custom dep content')).toBeInTheDocument()
    expect(screen.queryByText('react')).not.toBeInTheDocument()
  })
})
