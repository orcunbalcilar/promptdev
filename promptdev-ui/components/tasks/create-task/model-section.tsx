"use client";

import { ModelSelector } from "@/components/shared/model-selector";
import { useTaskForm } from "./_form-context";

export function ModelSection() {
  const { selectedModel, setSelectedModel, models, modelsLoading } =
    useTaskForm();

  return (
    <ModelSelector
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
      models={models}
      modelsLoading={modelsLoading}
    />
  );
}
