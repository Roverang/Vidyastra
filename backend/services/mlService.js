const axios = require('axios');

// ML Service Base URL (configured via environment variable or default local endpoint)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 60000;

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_TIMEOUT_MS,
});

/**
 * Error thrown when the ML service fails; carries the HTTP status to send back to the client.
 */
class MLServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'MLServiceError';
    this.status = status;
  }
}

/**
 * Turns an axios error into an MLServiceError with the real status and cause.
 * - ML responded with an error: keep its status and FastAPI's `detail` message.
 * - ML unreachable / timed out: 503 / 504 with the network error.
 */
const toMLServiceError = (error, url) => {
  if (error.response) {
    const { status, data } = error.response;
    const detail = typeof data === 'string' ? data : data?.detail || data?.message || JSON.stringify(data);
    return new MLServiceError(`ML service returned ${status} for ${url}: ${detail}`, status);
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new MLServiceError(`ML service at ${url} timed out after ${ML_TIMEOUT_MS} ms (${error.message})`, 504);
  }
  return new MLServiceError(
    `ML service is unreachable at ${url}: ${error.code || ''} ${error.message}`.replace(/\s+/g, ' ').trim(),
    503
  );
};

/**
 * Generic helper function to forward requests to the ML microservice.
 * @param {string} endpoint - The target route path on the ML service.
 * @param {Object} payload - The request body data.
 * @returns {Promise<any>} - The response data from the ML service.
 */
const postToMLService = async (endpoint, payload) => {
  const url = `${ML_SERVICE_URL}${endpoint}`;
  let response;
  try {
    response = await mlClient.post(endpoint, payload);
  } catch (error) {
    console.error(
      `ML Service Error: url=${url} status=${error.response?.status ?? 'no response'} code=${error.code ?? '-'} message=${error.message}`,
      'body:',
      error.response?.data
    );
    throw toMLServiceError(error, url);
  }
  if (!response.data) {
    throw new MLServiceError(`Empty response body from ML service at ${url}.`, 502);
  }
  return response.data;
};

/**
 * Forwards the AI Tutor prompt and context to the ML service.
 * @param {Object} payload - Contains message, subject, and topic.
 * @returns {Promise<{reply: string, sources: Array}>} - The AI reply and the lecture chunks it used.
 */
exports.getAITutorResponseFromML = async ({ message, subject, topic }) => {
  const data = await postToMLService('/tutor', { message, subject, topic });
  if (!data.reply) {
    throw new MLServiceError(`Reply property missing in ML service response: ${JSON.stringify(data)}`, 502);
  }
  return { reply: data.reply, sources: Array.isArray(data.sources) ? data.sources : [] };
};

exports.MLServiceError = MLServiceError;

/**
 * Forwards the AI Quiz request to the ML service.
 * @param {Object} payload - Contains subject, topic, difficulty, etc.
 * @returns {Promise<Object>} - The generated quiz data.
 */
exports.getAIQuizResponseFromML = async (payload) => {
  return await postToMLService('/quiz', payload);
};

/**
 * Forwards the AI Notes request to the ML service.
 * @param {Object} payload - Contains subject, topic, or content parameters.
 * @returns {Promise<Object>} - The generated notes content.
 */
exports.getAINotesResponseFromML = async (payload) => {
  return await postToMLService('/notes', payload);
};

/**
 * Forwards assignment-related AI assistance or evaluation requests to the ML service.
 * @param {Object} payload - Contains assignment content, code, or context.
 * @returns {Promise<Object>} - The AI evaluation or generation result.
 */
exports.getAIAssignmentResponseFromML = async (payload) => {
  return await postToMLService('/assignment', payload);
};