"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTaskForm } from "./_form-context";

export function TitlePromptSection() {
  const { title, setTitle, prompt, setPrompt } = useTaskForm();

  return (
    <>
      {/* Title */}
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <div className="flex gap-2">
          <Input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add user authentication"
          />
        </div>
      </div>

      {/* Prompt */}
      <div className="grid gap-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          name="prompt"
          required
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Create a login page with email and password fields..."
        />
        <Suggestions className="mt-1">
          <Suggestion
            suggestion="Add comprehensive unit tests for the authentication module"
            onClick={(s) => setPrompt(s)}
          />
          <Suggestion
            suggestion="Create a new REST API endpoint with full CRUD operations"
            onClick={(s) => setPrompt(s)}
          />
          <Suggestion
            suggestion="Refactor this component to improve performance and readability"
            onClick={(s) => setPrompt(s)}
          />
          <Suggestion
            suggestion="Fix the bug in the data fetching layer and add proper error handling"
            onClick={(s) => setPrompt(s)}
          />
          <Suggestion
            suggestion="Update dependencies, fix deprecations, and run security audit"
            onClick={(s) => setPrompt(s)}
          />
        </Suggestions>
      </div>
    </>
  );
}
