"use client";

import { Button } from "@/components/ui/button";
import { Check, Loader2, Save } from "lucide-react";

function SaveButtonIcon({
  isPending,
  isSuccess,
}: Readonly<{ isPending: boolean; isSuccess: boolean }>) {
  if (isPending) return <Loader2 className="h-4 w-4 mr-2 animate-spin" />;
  if (isSuccess) return <Check className="h-4 w-4 mr-2" />;
  return <Save className="h-4 w-4 mr-2" />;
}

interface SaveButtonProps {
  readonly label: string;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

export function SaveButton({
  label,
  isPending,
  isSuccess,
  disabled,
  onClick,
}: Readonly<SaveButtonProps>) {
  return (
    <div className="flex justify-end">
      <Button onClick={onClick} disabled={isPending || disabled}>
        <SaveButtonIcon isPending={isPending} isSuccess={isSuccess} />
        {label}
      </Button>
    </div>
  );
}
