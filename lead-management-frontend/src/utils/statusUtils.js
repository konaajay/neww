export const STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  RETRY: 'RETRY',
  FAILED: 'FAILED'
};

export const MAX_RETRIES = 3;

export const isTerminal = (status) => {
  return status === STATUS.SENT || status === STATUS.FAILED;
};

export const isRetryable = (errorMessage) => {
  if (!errorMessage) return true; // Default to retryable if no specific message
  
  const msg = errorMessage.toLowerCase();
  
  // Non-retryable errors
  if (
    msg.includes('invalid email') || 
    msg.includes('malformed') || 
    msg.includes('missing data') ||
    msg.includes('corrupt') ||
    msg.includes('not found')
  ) {
    return false;
  }
  
  // Retryable errors (network, timeouts, smtp issues)
  return true;
};

// Helper for case-insensitive normalization
const getNorm = (obj, ...keys) => {
  const objKeys = Object.keys(obj);
  for (const k of keys) {
    const match = objKeys.find(ok => ok.toLowerCase() === k.toLowerCase());
    if (match && obj[match]) return obj[match];
  }
  return '-';
};

export const normalizeBackendRecord = (log) => {
  // Extract fields using normalized keys
  const id = getNorm(log, 'certificateId', 'certificateCode', 'certId', 'id');
  const name = getNorm(log, 'fullNameForCertificate', 'fullName', 'studentName', 'name', 'recipientName', 'recipient');
  const email = getNorm(log, 'emailAddress', 'email', 'mail');
  const dateStr = log.timestamp || log.issueDate || log.date || '-';
  const webinarName = getNorm(log, 'webinarName', 'webinar', 'courseName', 'course');
  let retryCount = log.retryCount || 0;
  const errorMessage = log.errorMessage || null;

  // Map backend status to UI status
  let backendStatus = (log.status || STATUS.RETRY).toUpperCase();
  let uiStatus;
  
  if (backendStatus === 'PENDING') {
    uiStatus = STATUS.PENDING;
  } else if (backendStatus === 'PROCESSING') {
    uiStatus = STATUS.PROCESSING;
  } else if (backendStatus === 'SENT' || backendStatus === 'COMPLETED' || backendStatus === 'SUCCESS') {
    uiStatus = STATUS.SENT;
  } else if (backendStatus === 'FAILED' || backendStatus === 'ERROR') {
    uiStatus = STATUS.FAILED;
  } else {
    // Treat RETRYING or unknown non-terminal statuses as RETRY
    uiStatus = STATUS.RETRY;
  }

  // Enforce Max Retries logic
  if (retryCount >= MAX_RETRIES && uiStatus !== STATUS.SENT) {
    uiStatus = STATUS.FAILED;
  }

  return {
    id,
    name,
    email,
    date: dateStr,
    webinarName,
    status: uiStatus,
    retryCount,
    errorMessage
  };
};
