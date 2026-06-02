import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h2 className="text-2xl font-semibold">Page Not Found</h2>
      <p className="text-muted-foreground">The page you{"'"}re looking for doesn{"'"}t exist.</p>
      <Button asChild variant="outline">
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
