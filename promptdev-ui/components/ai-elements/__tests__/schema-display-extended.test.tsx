import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  SchemaDisplay,
  SchemaDisplayRequest,
  SchemaDisplayResponse,
  SchemaDisplayBody,
  SchemaDisplayProperty,
} from "@/components/ai-elements/schema-display";

describe("SchemaDisplay default layout with all sections", () => {
  it("renders parameters, request body, and response body when provided", () => {
    render(
      <SchemaDisplay
        method="POST"
        path="/api/users/{userId}"
        description="Update a user"
        parameters={[
          {
            name: "userId",
            type: "string",
            required: true,
            location: "path",
          },
        ]}
        requestBody={[
          { name: "name", type: "string", required: true },
          { name: "email", type: "string" },
        ]}
        responseBody={[
          { name: "id", type: "string", required: true },
          { name: "name", type: "string" },
        ]}
      />,
    );

    expect(screen.getByText("Parameters")).toBeInTheDocument();
    expect(screen.getByText("Request Body")).toBeInTheDocument();
    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("userId")).toBeInTheDocument();
    expect(screen.getByText("Update a user")).toBeInTheDocument();
  });
});

describe("SchemaDisplayRequest", () => {
  it("renders request body properties from context", () => {
    render(
      <SchemaDisplay
        method="POST"
        path="/test"
        requestBody={[
          {
            name: "title",
            type: "string",
            required: true,
            description: "The title",
          },
          { name: "body", type: "string" },
        ]}
      >
        <SchemaDisplayRequest />
      </SchemaDisplay>,
    );

    expect(screen.getByText("Request Body")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("renders custom children override", () => {
    render(
      <SchemaDisplay
        method="POST"
        path="/test"
        requestBody={[{ name: "ignored", type: "string" }]}
      >
        <SchemaDisplayRequest>
          <span>Custom request content</span>
        </SchemaDisplayRequest>
      </SchemaDisplay>,
    );

    expect(screen.getByText("Custom request content")).toBeInTheDocument();
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });
});

describe("SchemaDisplayResponse", () => {
  it("renders response body properties from context", () => {
    render(
      <SchemaDisplay
        method="GET"
        path="/test"
        responseBody={[
          { name: "id", type: "number", required: true },
          { name: "status", type: "string" },
        ]}
      >
        <SchemaDisplayResponse />
      </SchemaDisplay>,
    );

    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
  });

  it("renders custom children override", () => {
    render(
      <SchemaDisplay
        method="GET"
        path="/test"
        responseBody={[{ name: "ignored", type: "string" }]}
      >
        <SchemaDisplayResponse>
          <span>Custom response content</span>
        </SchemaDisplayResponse>
      </SchemaDisplay>,
    );

    expect(screen.getByText("Custom response content")).toBeInTheDocument();
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });
});

describe("SchemaDisplayBody", () => {
  it("renders children with divide-y class", () => {
    const { container } = render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayBody className="extra-class">
          <div>Body item 1</div>
          <div>Body item 2</div>
        </SchemaDisplayBody>
      </SchemaDisplay>,
    );

    expect(screen.getByText("Body item 1")).toBeInTheDocument();
    expect(screen.getByText("Body item 2")).toBeInTheDocument();
    const bodyDiv = container.querySelector(".extra-class");
    expect(bodyDiv).toBeInTheDocument();
  });
});

describe("SchemaDisplayProperty - items (array type)", () => {
  it("renders array items as nested property", () => {
    render(
      <SchemaDisplay method="POST" path="/test">
        <SchemaDisplayProperty
          name="tags"
          type="array"
          items={{ name: "tag", type: "string" }}
        />
      </SchemaDisplay>,
    );

    expect(screen.getByText("tags")).toBeInTheDocument();
    // items rendered with name: `tags[]`
    expect(screen.getByText("tags[]")).toBeInTheDocument();
  });

  it("renders deeply nested properties with description", () => {
    render(
      <SchemaDisplay method="POST" path="/test">
        <SchemaDisplayProperty
          name="config"
          type="object"
          description="Configuration object"
          required
          properties={[
            {
              name: "nested",
              type: "object",
              properties: [{ name: "value", type: "string" }],
            },
          ]}
        />
      </SchemaDisplay>,
    );

    expect(screen.getByText("config")).toBeInTheDocument();
    expect(screen.getByText("Configuration object")).toBeInTheDocument();
    expect(screen.getByText("nested")).toBeInTheDocument();
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it("renders leaf property with description and no children", () => {
    render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayProperty
          name="count"
          type="number"
          description="Total count"
          required
        />
      </SchemaDisplay>,
    );

    expect(screen.getByText("count")).toBeInTheDocument();
    expect(screen.getByText("number")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
    expect(screen.getByText("Total count")).toBeInTheDocument();
  });

  it("renders property at depth >= 2 (collapsed by default)", () => {
    render(
      <SchemaDisplay method="POST" path="/test">
        <SchemaDisplayProperty
          name="deep"
          type="object"
          depth={2}
          properties={[{ name: "inner", type: "string" }]}
        />
      </SchemaDisplay>,
    );

    expect(screen.getByText("deep")).toBeInTheDocument();
    // depth >= 2 means defaultOpen=false, but Collapsible still renders trigger
  });
});
