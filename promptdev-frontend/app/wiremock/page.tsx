'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WireMockMapping } from '@/types/wiremock'
import { getMappings, deleteMapping } from '@/lib/wiremock'
import { MappingForm } from './_components/mapping-form'
import { PlusCircle, Trash2, Edit } from 'lucide-react'

export default function WireMockPage() {
  const [mappings, setMappings] = useState<WireMockMapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMapping, setEditingMapping] = useState<WireMockMapping | undefined>()

  const loadMappings = async () => {
    try {
      setIsLoading(true)
      const data = await getMappings()
      setMappings(data.mappings)
    } catch (error) {
      console.error('Failed to load mappings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMappings()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return
    try {
      await deleteMapping(id)
      await loadMappings()
    } catch (error) {
      console.error('Failed to delete mapping:', error)
    }
  }

  const handleEdit = (mapping: WireMockMapping) => {
    setEditingMapping(mapping)
    setShowForm(true)
  }

  const handleFormSuccess = async () => {
    setShowForm(false)
    setEditingMapping(undefined)
    await loadMappings()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingMapping(undefined)
  }

  const getDelayDescription = (mapping: WireMockMapping) => {
    const { response } = mapping
    if (response.fault) {
      return `Fault: ${response.fault}`
    }
    if (response.fixedDelayMilliseconds) {
      return `Fixed: ${response.fixedDelayMilliseconds}ms`
    }
    if (response.delayDistribution) {
      const dist = response.delayDistribution
      if (dist.type === 'lognormal') {
        return `Log Normal (median: ${dist.median}ms, σ: ${dist.sigma})`
      }
      return `Uniform (${dist.lower}-${dist.upper}ms)`
    }
    return 'No delay'
  }

  if (showForm) {
    return (
      <div className="container py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {editingMapping ? 'Edit Mapping' : 'Create Mapping'}
          </h1>
          <p className="text-muted-foreground">
            Configure API mocks with delay and fault simulation
          </p>
        </div>
        <MappingForm
          mapping={editingMapping}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">WireMock Mappings</h1>
          <p className="text-muted-foreground">
            Manage API mocks with delay and fault simulation
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Mapping
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading mappings...</div>
      ) : mappings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No mappings configured yet</p>
            <Button onClick={() => setShowForm(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Mapping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mappings.map((mapping) => (
            <Card key={mapping.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {mapping.name || `${mapping.request.method} ${mapping.request.url}`}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <span className="font-medium">{mapping.request.method}</span>{' '}
                      {mapping.request.url || mapping.request.urlPath}
                      {mapping.priority && ` • Priority: ${mapping.priority}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(mapping)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mapping.id && handleDelete(mapping.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <span className={mapping.response.status >= 400 ? 'text-red-600' : 'text-green-600'}>
                      {mapping.response.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Delay:</span>{' '}
                    <span className="text-muted-foreground">
                      {getDelayDescription(mapping)}
                    </span>
                  </div>
                </div>
                {mapping.response.body && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-1">Response Body:</div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {mapping.response.body}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
