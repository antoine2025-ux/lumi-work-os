import { useCallback, useState } from "react";

import { parseApiError, ParsedApiError } from "@/lib/api-error";

import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api-client";

import { emitApiDebugEvent } from "@/lib/api-debug";

function nowMs() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
}

type UseApiActionOptions<TBody> = {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * Optional function to build the fetch init from the body.
   * Defaults to JSON body for non-GET and no body for GET.
   */
  buildRequestInit?: (body: TBody | undefined) => RequestInit;
  /**
   * Default message if the API doesn't provide a clear error.
   */
  defaultErrorMessage?: string;
  /**
   * Title for error toast; if omitted, uses a generic title.
   */
  errorToastTitle?: string;
  /**
   * Optionally disable automatic error toasts and handle errors manually.
   */
  disableErrorToast?: boolean;
  /**
   * Optional label used for dev-only logging, to make it easier to map logs
   * back to a particular hook / component.
   */
  traceLabel?: string;
};

type UseApiActionResult<TData, TBody> = {
  run: (body?: TBody) => Promise<{ data: TData | null; error: ParsedApiError | null }>;
  loading: boolean;
};

export function useApiAction<TData = any, TBody = any>(
  options: UseApiActionOptions<TBody>
): UseApiActionResult<TData, TBody> {
  const {
    url,
    method = "POST",
    buildRequestInit,
    defaultErrorMessage = "Something went wrong.",
    errorToastTitle = "Something went wrong",
    disableErrorToast,
    traceLabel,
  } = options;

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (body?: TBody) => {
      setLoading(true);
      const start = nowMs();

      try {
        let init: RequestInit;

        if (buildRequestInit) {
          init = buildRequestInit(body);
        } else {
          if (method === "GET") {
            init = {
              method,
            };
          } else {
            init = {
              method,
              headers: {
                "Content-Type": "application/json",
              },
              body: body !== undefined ? JSON.stringify(body) : undefined,
            };
          }
        }

        const res = await apiFetch(url, init);
        const json = await res.json().catch(() => ({}));
        const end = nowMs();
        const durationMs = end - start;

        const isEnvelope = json && typeof json === "object" && "ok" in json;
        const success = res.ok && (!isEnvelope || json.ok === true);

        const requestId =
          res.headers.get("X-Request-Id") ||
          res.headers.get("x-request-id") ||
          undefined;

        if (!success) {
          const parsed = parseApiError(json);
          const message = parsed?.message ?? defaultErrorMessage;

          if (process.env.NODE_ENV === "development") {
            emitApiDebugEvent({
              id: requestId || `local-${Date.now()}`,
              url,
              method,
              status: res.status,
              durationMs,
              ok: false,
              errorMessage: message,
              label: traceLabel,
              timestamp: Date.now(),
              source: "useApiAction",
            });
          }

          if (process.env.NODE_ENV === "development") {
             
            console.debug(
              `[useApiAction] ${method} ${url} failed` +
                (traceLabel ? ` [${traceLabel}]` : "") +
                (requestId ? ` (requestId=${requestId})` : ""),
              {
                status: res.status,
                parsedError: parsed,
              }
            );
          }

          if (!disableErrorToast) {
            toast({
              variant: "destructive",
              title: errorToastTitle,
              description: message,
            });
          }

          return {
            data: null,
            error: parsed ?? { message },
          };
        }

        const data = isEnvelope ? (json.data as TData) : (json as TData);

        if (process.env.NODE_ENV === "development") {
          emitApiDebugEvent({
            id: requestId || `local-${Date.now()}`,
            url,
            method,
            status: res.status,
            durationMs,
            ok: true,
            label: traceLabel,
            timestamp: Date.now(),
            source: "useApiAction",
          });

          if (requestId || traceLabel) {
             
            console.debug(
              `[useApiAction] ${method} ${url} succeeded` +
                (traceLabel ? ` [${traceLabel}]` : "") +
                (requestId ? ` (requestId=${requestId})` : ""),
              {
                hasData: !!data,
              }
            );
          }
        }

        return {
          data: data ?? null,
          error: null,
        };
      } catch (err) {
        const end = nowMs();
        const durationMs = end - start;

        if (process.env.NODE_ENV === "development") {
          emitApiDebugEvent({
            id: `local-${Date.now()}`,
            url,
            method,
            status: undefined,
            durationMs,
            ok: false,
            errorMessage: defaultErrorMessage,
            label: traceLabel,
            timestamp: Date.now(),
            source: "useApiAction",
          });

           
          console.debug(
            `[useApiAction] ${method} ${url} threw` +
              (traceLabel ? ` [${traceLabel}]` : ""),
            err
          );
        }

        if (!disableErrorToast) {
          toast({
            variant: "destructive",
            title: errorToastTitle,
            description: defaultErrorMessage,
          });
        }

        return {
          data: null,
          error: {
            message: defaultErrorMessage,
          },
        };
      } finally {
        setLoading(false);
      }
    },
    [
      url,
      method,
      buildRequestInit,
      defaultErrorMessage,
      errorToastTitle,
      disableErrorToast,
      traceLabel,
      toast,
    ]
  );

  return {
    run,
    loading,
  };
}
