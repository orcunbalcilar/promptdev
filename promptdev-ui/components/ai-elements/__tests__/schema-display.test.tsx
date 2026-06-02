import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  SchemaDisplay,
  SchemaDisplayHeader,
  SchemaDisplayMethod,
  SchemaDisplayPath,
  SchemaDisplayDescription,
  SchemaDisplayContent,
  SchemaDisplayParameters,
  SchemaDisplayParameter,
  SchemaDisplayProperty,
  SchemaDisplayExample,
} from "@/components/ai-elements/schema-display";

describe("SchemaDisplay", () => {
  it("renders children", () => {
    render(
      <SchemaDisplay method="GET" path="/api/users">
        <span>Schema content</span>
      </SchemaDisplay>,
    );

    expect(screen.getByText("Schema content")).toBeInTheDocument();
  });

  it("renders default layout when no children", () => {
    render(
      <SchemaDisplay
        method="GET"
        path="/api/users"
        description="Get all users"
      />,
    );

    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("Get all users")).toBeInTheDocument();
  });
});

describe("SchemaDisplayHeader", () => {
  it("renders children", () => {
    render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayHeader>
          <span>Header content</span>
        </SchemaDisplayHeader>
      </SchemaDisplay>,
    );

    expect(screen.getByText("Header content")).toBeInTheDocument();
  });
});

describe("SchemaDisplayMethod", () => {
  it("renders GET badge with green styling", () => {
    render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayMethod />
      </SchemaDisplay>,
    );

    const badge = screen.getByText("GET");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-green-100");
    expect(badge).toHaveClass("text-green-700");
  });

  it("renders POST badge with blue styling", () => {
    render(
      <SchemaDisplay method="POST" path="/test">
        <SchemaDisplayMethod />
      </SchemaDisplay>,
    );

    const badge = screen.getByText("POST");
    expect(badge).toHaveClass("bg-blue-100");
    expect(badge).toHaveClass("text-blue-700");
  });

  it("renders PUT badge with orange styling", () => {
    render(
      <SchemaDisplay method="PUT" path="/test">
        <SchemaDisplayMethod />
      </SchemaDisplay>,
    );

    const badge = screen.getByText("PUT");
    expect(badge).toHaveClass("bg-orange-100");
    expect(badge).toHaveClass("text-orange-700");
  });

  it("renders DELETE badge with red styling", () => {
    render(
      <SchemaDisplay method="DELETE" path="/test">
        <SchemaDisplayMethod />
      </SchemaDisplay>,
    );

    const badge = screen.getByText("DELETE");
    expect(badge).toHaveClass("bg-red-100");
    expect(badge).toHaveClass("text-red-700");
  });

  it("renders PATCH badge with yellow styling", () => {
    render(
      <SchemaDisplay method="PATCH" path="/test">
        <SchemaDisplayMethod />
      </SchemaDisplay>,
    );

    const badge = screen.getByText("PATCH");
    expect(badge).toHaveClass("bg-yellow-100");
    expect(badge).toHaveClass("text-yellow-700");
  });
});

describe("SchemaDisplayPath", () => {
  it("renders path text", () => {
    render(
      <SchemaDisplay method="GET" path="/api/users">
        <SchemaDisplayPath />
      </SchemaDisplay>,
    );

    expect(screen.getByText("/api/users")).toBeInTheDocument();
  });
});

describe("SchemaDisplayDescription", () => {
  it("renders description", () => {
    render(
      <SchemaDisplay method="GET" path="/test" description="A test endpoint">
        <SchemaDisplayDescription />
      </SchemaDisplay>,
    );

    expect(screen.getByText("A test endpoint")).toBeInTheDocument();
  });

  it("renders custom children", () => {
    render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayDescription>Custom description</SchemaDisplayDescription>
      </SchemaDisplay>,
    );

    expect(screen.getByText("Custom description")).toBeInTheDocument();
  });
});

describe("SchemaDisplayContent", () => {
  it("renders children", () => {
    render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayContent>
          <span>Content section</span>
        </SchemaDisplayContent>
      </SchemaDisplay>,
    );

    expect(screen.getByText("Content section")).toBeInTheDocument();
  });
});

describe("SchemaDisplayParameters", () => {
  it("renders parameters section", () => {
    render(
      <SchemaDisplay
        method="GET"
        path="/test"
        parameters={[
          {
            name: "id",
            type: "string",
            required: true,
            description: "User ID",
          },
        ]}
      >
        <SchemaDisplayParameters />
      </SchemaDisplay>,
    );

    expect(screen.getByText("Parameters")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
    expect(screen.getByText("User ID")).toBeInTheDocument();
  });

  it("renders children override", () => {
    render(
      <SchemaDisplay
        method="GET"
        path="/test"
        parameters={[{ name: "id", type: "string" }]}
      >
        <SchemaDisplayParameters>
          <span>Custom params</span>
        </SchemaDisplayParameters>
      </SchemaDisplay>,
    );

    expect(screen.getByText("Custom params")).toBeInTheDocument();
  });
});

describe("SchemaDisplayParameter", () => {
  it("renders param info with name, type, and location", () => {
    render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayParameter
          name="userId"
          type="string"
          required
          location="path"
          description="The user identifier"
        />
      </SchemaDisplay>,
    );

    expect(screen.getByText("userId")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
    expect(screen.getByText("path")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
    expect(screen.getByText("The user identifier")).toBeInTheDocument();
  });
});

describe("SchemaDisplayProperty", () => {
  it("renders name, type, and required badge", () => {
    render(
      <SchemaDisplay method="POST" path="/test">
        <SchemaDisplayProperty
          name="email"
          type="string"
          required
          description="User email address"
        />
      </SchemaDisplay>,
    );

    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
    expect(screen.getByText("User email address")).toBeInTheDocument();
  });

  it("renders without required badge when not required", () => {
    render(
      <SchemaDisplay method="POST" path="/test">
        <SchemaDisplayProperty name="nickname" type="string" />
      </SchemaDisplay>,
    );

    expect(screen.getByText("nickname")).toBeInTheDocument();
    expect(screen.queryByText("required")).not.toBeInTheDocument();
  });

  it("renders nested properties when properties are provided", () => {
    render(
      <SchemaDisplay method="POST" path="/test">
        <SchemaDisplayProperty
          name="address"
          type="object"
          properties={[
            { name: "street", type: "string" },
            { name: "city", type: "string" },
          ]}
        />
      </SchemaDisplay>,
    );

    expect(screen.getByText("address")).toBeInTheDocument();
    expect(screen.getByText("street")).toBeInTheDocument();
    expect(screen.getByText("city")).toBeInTheDocument();
  });
});

describe("SchemaDisplayExample", () => {
  it("renders code block content", () => {
    render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayExample>
          {'{ "id": 1, "name": "John" }'}
        </SchemaDisplayExample>
      </SchemaDisplay>,
    );

    expect(screen.getByText('{ "id": 1, "name": "John" }')).toBeInTheDocument();
  });

  it("renders as pre element", () => {
    render(
      <SchemaDisplay method="GET" path="/test">
        <SchemaDisplayExample>example code</SchemaDisplayExample>
      </SchemaDisplay>,
    );

    const pre = screen.getByText("example code");
    expect(pre.tagName).toBe("PRE");
  });
});
