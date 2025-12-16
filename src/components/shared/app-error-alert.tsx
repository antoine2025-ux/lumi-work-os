import React from "react";

type AppErrorAlertProps = {
  title?: string;
  message: string;
  details?: string;
};

export function AppErrorAlert({ title, message, details }: AppErrorAlertProps) {
  return (
    <div className="border border-destructive/40 bg-destructive/5 rounded-md px-3 py-2 text-sm">
      {title && (
        <p className="font-medium text-destructive mb-0.5">
          {title}
        </p>
      )}
      <p className="text-destructive">
        {message}
      </p>
      {details && (
        <p className="mt-1 text-xs text-muted-foreground">
          {details}
        </p>
      )}
    </div>
  );
}

