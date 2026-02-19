'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DelayDistribution, FaultType, LogNormalDistribution, UniformDistribution } from '@/types/wiremock'

interface DelayConfigProps {
  value: {
    fixedDelayMilliseconds?: number
    delayDistribution?: DelayDistribution
    fault?: FaultType
  }
  onChange: (value: DelayConfigProps['value']) => void
}

export function DelayConfig({ value, onChange }: DelayConfigProps) {
  const [delayType, setDelayType] = useState<'none' | 'fixed' | 'random' | 'fault'>(
    value.fault ? 'fault' : 
    value.delayDistribution ? 'random' : 
    value.fixedDelayMilliseconds ? 'fixed' : 'none'
  )

  const handleDelayTypeChange = (type: 'none' | 'fixed' | 'random' | 'fault') => {
    setDelayType(type)
    if (type === 'none') {
      onChange({})
    } else if (type === 'fixed') {
      onChange({ fixedDelayMilliseconds: 1000 })
    } else if (type === 'random') {
      onChange({ 
        delayDistribution: { 
          type: 'lognormal', 
          median: 100, 
          sigma: 0.1 
        } 
      })
    } else if (type === 'fault') {
      onChange({ fault: 'EMPTY_RESPONSE' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="delay-type">Delay Type</Label>
        <Select value={delayType} onValueChange={handleDelayTypeChange}>
          <SelectTrigger id="delay-type">
            <SelectValue placeholder="Select delay type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Delay</SelectItem>
            <SelectItem value="fixed">Fixed Delay</SelectItem>
            <SelectItem value="random">Random Delay</SelectItem>
            <SelectItem value="fault">Fault/Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {delayType === 'fixed' && (
        <div>
          <Label htmlFor="fixed-delay">Fixed Delay (milliseconds)</Label>
          <Input
            id="fixed-delay"
            type="number"
            min="0"
            value={value.fixedDelayMilliseconds || 0}
            onChange={(e) => onChange({ 
              fixedDelayMilliseconds: parseInt(e.target.value) || 0 
            })}
          />
        </div>
      )}

      {delayType === 'random' && (
        <Tabs 
          value={value.delayDistribution?.type || 'lognormal'}
          onValueChange={(type) => {
            if (type === 'lognormal') {
              onChange({ 
                delayDistribution: { 
                  type: 'lognormal', 
                  median: 100, 
                  sigma: 0.1 
                } 
              })
            } else {
              onChange({ 
                delayDistribution: { 
                  type: 'uniform', 
                  lower: 50, 
                  upper: 150 
                } 
              })
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="lognormal">Log Normal</TabsTrigger>
            <TabsTrigger value="uniform">Uniform</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lognormal" className="space-y-4">
            {value.delayDistribution?.type === 'lognormal' && (
              <>
                <div>
                  <Label htmlFor="median">Median (ms)</Label>
                  <Input
                    id="median"
                    type="number"
                    min="0"
                    value={value.delayDistribution.median}
                    onChange={(e) => {
                      const dist = value.delayDistribution as LogNormalDistribution
                      onChange({
                        delayDistribution: {
                          type: 'lognormal',
                          median: parseInt(e.target.value) || 0,
                          sigma: dist.sigma,
                          maxValue: dist.maxValue,
                        },
                      })
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    The 50th percentile of latencies
                  </p>
                </div>
                <div>
                  <Label htmlFor="sigma">Sigma</Label>
                  <Input
                    id="sigma"
                    type="number"
                    min="0"
                    step="0.1"
                    value={value.delayDistribution.sigma}
                    onChange={(e) => {
                      const dist = value.delayDistribution as LogNormalDistribution
                      onChange({
                        delayDistribution: {
                          type: 'lognormal',
                          median: dist.median,
                          sigma: parseFloat(e.target.value) || 0,
                          maxValue: dist.maxValue,
                        },
                      })
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Standard deviation. Larger values create longer tails
                  </p>
                </div>
                <div>
                  <Label htmlFor="max-value">Max Value (optional)</Label>
                  <Input
                    id="max-value"
                    type="number"
                    min="0"
                    value={value.delayDistribution.maxValue || ''}
                    onChange={(e) => {
                      const dist = value.delayDistribution as LogNormalDistribution
                      onChange({
                        delayDistribution: {
                          type: 'lognormal',
                          median: dist.median,
                          sigma: dist.sigma,
                          maxValue: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Cap the maximum delay to prevent timeouts
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="uniform" className="space-y-4">
            {value.delayDistribution?.type === 'uniform' && (
              <>
                <div>
                  <Label htmlFor="lower">Lower Bound (ms)</Label>
                  <Input
                    id="lower"
                    type="number"
                    min="0"
                    value={value.delayDistribution.lower}
                    onChange={(e) => {
                      const dist = value.delayDistribution as UniformDistribution
                      onChange({
                        delayDistribution: {
                          type: 'uniform',
                          lower: parseInt(e.target.value) || 0,
                          upper: dist.upper,
                        },
                      })
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="upper">Upper Bound (ms)</Label>
                  <Input
                    id="upper"
                    type="number"
                    min="0"
                    value={value.delayDistribution.upper}
                    onChange={(e) => {
                      const dist = value.delayDistribution as UniformDistribution
                      onChange({
                        delayDistribution: {
                          type: 'uniform',
                          lower: dist.lower,
                          upper: parseInt(e.target.value) || 0,
                        },
                      })
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Random delay between lower and upper bounds (inclusive)
                  </p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {delayType === 'fault' && (
        <div>
          <Label htmlFor="fault-type">Fault Type</Label>
          <Select 
            value={value.fault} 
            onValueChange={(fault: FaultType) => onChange({ fault })}
          >
            <SelectTrigger id="fault-type">
              <SelectValue placeholder="Select fault type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPTY_RESPONSE">Empty Response</SelectItem>
              <SelectItem value="MALFORMED_RESPONSE_CHUNK">Malformed Response Chunk</SelectItem>
              <SelectItem value="RANDOM_DATA_THEN_CLOSE">Random Data Then Close</SelectItem>
              <SelectItem value="CONNECTION_RESET_BY_PEER">Connection Reset</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
