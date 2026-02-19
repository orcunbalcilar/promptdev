'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HttpMethod, WireMockMapping, CreateMappingRequest } from '@/types/wiremock'
import { DelayConfig } from './delay-config'
import { createMapping, updateMapping } from '@/lib/wiremock'

interface MappingFormProps {
  mapping?: WireMockMapping
  onSuccess?: () => void
  onCancel?: () => void
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE']

export function MappingForm({ mapping, onSuccess, onCancel }: MappingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateMappingRequest>({
    name: mapping?.name || '',
    request: {
      method: mapping?.request.method || 'GET',
      url: mapping?.request.url || '',
    },
    response: {
      status: mapping?.response.status || 200,
      body: mapping?.response.body || '',
      headers: mapping?.response.headers || {},
      fixedDelayMilliseconds: mapping?.response.fixedDelayMilliseconds,
      delayDistribution: mapping?.response.delayDistribution,
      fault: mapping?.response.fault,
    },
    priority: mapping?.priority,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (mapping?.id) {
        await updateMapping(mapping.id, formData)
      } else {
        await createMapping(formData)
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mapping')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Matching</CardTitle>
          <CardDescription>Define which requests this mapping should match</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Mapping Name (optional)</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My API Mock"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={formData.request.method}
                onValueChange={(method: HttpMethod) =>
                  setFormData({
                    ...formData,
                    request: { ...formData.request, method },
                  })
                }
              >
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority (optional)</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="url">URL Pattern</Label>
            <Input
              id="url"
              value={formData.request.url}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  request: { ...formData.request, url: e.target.value },
                })
              }
              placeholder="/api/users"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response</CardTitle>
          <CardDescription>Define the response to return</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="status">Status Code</Label>
            <Input
              id="status"
              type="number"
              min="100"
              max="599"
              value={formData.response.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  response: { ...formData.response, status: parseInt(e.target.value) || 200 },
                })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="body">Response Body (optional)</Label>
            <Textarea
              id="body"
              value={formData.response.body}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  response: { ...formData.response, body: e.target.value },
                })
              }
              placeholder='{"message": "Hello World"}'
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delay & Fault Configuration</CardTitle>
          <CardDescription>Simulate network latency or failures</CardDescription>
        </CardHeader>
        <CardContent>
          <DelayConfig
            value={{
              fixedDelayMilliseconds: formData.response.fixedDelayMilliseconds,
              delayDistribution: formData.response.delayDistribution,
              fault: formData.response.fault,
            }}
            onChange={(delayConfig) =>
              setFormData({
                ...formData,
                response: { ...formData.response, ...delayConfig },
              })
            }
          />
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mapping ? 'Update Mapping' : 'Create Mapping'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
