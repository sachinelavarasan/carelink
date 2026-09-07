import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '../theme/ThemeToggle';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">{title}</CardTitle>
          <ThemeToggle />
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
