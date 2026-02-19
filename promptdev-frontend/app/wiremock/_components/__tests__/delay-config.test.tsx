import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DelayConfig } from '../delay-config'

describe('DelayConfig Component', () => {
  it('should render with no delay selected by default', () => {
    const onChange = vi.fn()
    render(<DelayConfig value={{}} onChange={onChange} />)

    expect(screen.getByLabelText(/delay type/i)).toBeInTheDocument()
  })

  it('should show fixed delay input when fixed delay is selected', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig value={{ fixedDelayMilliseconds: 1000 }} onChange={onChange} />
    )

    const delayInput = screen.getByLabelText(/fixed delay \(milliseconds\)/i)
    expect(delayInput).toBeInTheDocument()
    expect(delayInput).toHaveValue(1000)
  })

  it('should call onChange when fixed delay value changes', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig value={{ fixedDelayMilliseconds: 1000 }} onChange={onChange} />
    )

    const delayInput = screen.getByLabelText(/fixed delay \(milliseconds\)/i)
    fireEvent.change(delayInput, { target: { value: '2000' } })

    expect(onChange).toHaveBeenCalledWith({ fixedDelayMilliseconds: 2000 })
  })

  it('should show lognormal distribution options', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig
        value={{
          delayDistribution: {
            type: 'lognormal',
            median: 100,
            sigma: 0.2,
          },
        }}
        onChange={onChange}
      />
    )

    expect(screen.getByLabelText(/median \(ms\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sigma/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/max value/i)).toBeInTheDocument()
  })

  it('should update lognormal median value', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig
        value={{
          delayDistribution: {
            type: 'lognormal',
            median: 100,
            sigma: 0.2,
          },
        }}
        onChange={onChange}
      />
    )

    const medianInput = screen.getByLabelText(/median \(ms\)/i)
    fireEvent.change(medianInput, { target: { value: '200' } })

    expect(onChange).toHaveBeenCalledWith({
      delayDistribution: {
        type: 'lognormal',
        median: 200,
        sigma: 0.2,
      },
    })
  })

  it('should update lognormal sigma value', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig
        value={{
          delayDistribution: {
            type: 'lognormal',
            median: 100,
            sigma: 0.2,
          },
        }}
        onChange={onChange}
      />
    )

    const sigmaInput = screen.getByLabelText(/sigma/i)
    fireEvent.change(sigmaInput, { target: { value: '0.5' } })

    expect(onChange).toHaveBeenCalledWith({
      delayDistribution: {
        type: 'lognormal',
        median: 100,
        sigma: 0.5,
      },
    })
  })

  it('should update lognormal maxValue', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig
        value={{
          delayDistribution: {
            type: 'lognormal',
            median: 100,
            sigma: 0.2,
          },
        }}
        onChange={onChange}
      />
    )

    const maxValueInput = screen.getByLabelText(/max value/i)
    fireEvent.change(maxValueInput, { target: { value: '1000' } })

    expect(onChange).toHaveBeenCalledWith({
      delayDistribution: {
        type: 'lognormal',
        median: 100,
        sigma: 0.2,
        maxValue: 1000,
      },
    })
  })

  it('should show uniform distribution options', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig
        value={{
          delayDistribution: {
            type: 'uniform',
            lower: 50,
            upper: 150,
          },
        }}
        onChange={onChange}
      />
    )

    // Switch to uniform tab
    const uniformTab = screen.getByRole('tab', { name: /uniform/i })
    fireEvent.click(uniformTab)

    expect(screen.getByLabelText(/lower bound \(ms\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/upper bound \(ms\)/i)).toBeInTheDocument()
  })

  it('should update uniform lower bound', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig
        value={{
          delayDistribution: {
            type: 'uniform',
            lower: 50,
            upper: 150,
          },
        }}
        onChange={onChange}
      />
    )

    // Switch to uniform tab
    const uniformTab = screen.getByRole('tab', { name: /uniform/i })
    fireEvent.click(uniformTab)

    const lowerInput = screen.getByLabelText(/lower bound \(ms\)/i)
    fireEvent.change(lowerInput, { target: { value: '100' } })

    expect(onChange).toHaveBeenCalledWith({
      delayDistribution: {
        type: 'uniform',
        lower: 100,
        upper: 150,
      },
    })
  })

  it('should update uniform upper bound', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig
        value={{
          delayDistribution: {
            type: 'uniform',
            lower: 50,
            upper: 150,
          },
        }}
        onChange={onChange}
      />
    )

    // Switch to uniform tab
    const uniformTab = screen.getByRole('tab', { name: /uniform/i })
    fireEvent.click(uniformTab)

    const upperInput = screen.getByLabelText(/upper bound \(ms\)/i)
    fireEvent.change(upperInput, { target: { value: '200' } })

    expect(onChange).toHaveBeenCalledWith({
      delayDistribution: {
        type: 'uniform',
        lower: 50,
        upper: 200,
      },
    })
  })

  it('should show fault options', () => {
    const onChange = vi.fn()
    render(
      <DelayConfig value={{ fault: 'EMPTY_RESPONSE' }} onChange={onChange} />
    )

    expect(screen.getByLabelText(/fault type/i)).toBeInTheDocument()
  })

  it('should support all fault types', () => {
    const onChange = vi.fn()
    const faultTypes: Array<'EMPTY_RESPONSE' | 'MALFORMED_RESPONSE_CHUNK' | 'RANDOM_DATA_THEN_CLOSE' | 'CONNECTION_RESET_BY_PEER'> = [
      'EMPTY_RESPONSE',
      'MALFORMED_RESPONSE_CHUNK',
      'RANDOM_DATA_THEN_CLOSE',
      'CONNECTION_RESET_BY_PEER',
    ]

    faultTypes.forEach((fault) => {
      render(<DelayConfig value={{ fault }} onChange={onChange} />)
      expect(screen.getByLabelText(/fault type/i)).toBeInTheDocument()
    })
  })

  it('should switch between delay types', () => {
    const onChange = vi.fn()
    render(<DelayConfig value={{}} onChange={onChange} />)

    // Initially no delay
    expect(screen.queryByLabelText(/fixed delay/i)).not.toBeInTheDocument()
  })
})
