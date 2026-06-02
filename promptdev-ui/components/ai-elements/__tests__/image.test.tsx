import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Image } from '@/components/ai-elements/image'

describe('Image', () => {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAUA'
  const mediaType = 'image/png'

  it('renders img with correct data URI', () => {
    render(<Image base64={base64} mediaType={mediaType} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', `data:${mediaType};base64,${base64}`)
  })

  it('passes alt text', () => {
    render(<Image base64={base64} mediaType={mediaType} alt="test image" />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'test image')
  })

  it('applies custom className', () => {
    render(<Image base64={base64} mediaType={mediaType} className="custom-img" />)

    const img = screen.getByRole('img')
    expect(img).toHaveClass('custom-img')
  })

  it('has default rounded styling', () => {
    render(<Image base64={base64} mediaType={mediaType} />)

    const img = screen.getByRole('img')
    expect(img).toHaveClass('rounded-md')
  })
})
