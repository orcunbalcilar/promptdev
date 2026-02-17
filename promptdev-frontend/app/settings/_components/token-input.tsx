"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface TokenInputProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly isSet?: boolean;
  readonly placeholder?: string;
}

export function TokenInput({
  id,
  label,
  value,
  onChange,
  isSet,
  placeholder,
}: TokenInputProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {isSet && (
          <Badge variant="outline" className="ml-2 text-xs">
            <Check className="h-3 w-3 mr-1" />
            Set
          </Badge>
        )}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={showToken ? "text" : "password"}
          placeholder={isSet ? "••••••••" : placeholder ?? "Enter token"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-7 w-7 p-0"
          onClick={() => setShowToken(!showToken)}
        >
          {showToken ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
