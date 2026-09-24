export function Notice({ error, success }: { error?: string; success?: string }) {
  const message = error ?? success;
  if (!message) return null;
  return <p className={`notice ${error ? "notice-error" : "notice-success"}`} role="status">{message}</p>;
}

