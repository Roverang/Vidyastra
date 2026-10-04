// Turns an axios error into the message to show. 4xx messages are written for the student
// (e.g. "No indexed lecture covers 'X' yet.") and shown as-is; others get the status for diagnosis.
export const apiErrorMessage = (err, label) => {
  const status = err.response?.status;
  const data = err.response?.data;
  const reason = data?.message || data?.error || err.message;
  if (status >= 400 && status < 500) return reason;
  return status ? `${label} error (${status}): ${reason}` : `${label} request failed: ${reason}`;
};
