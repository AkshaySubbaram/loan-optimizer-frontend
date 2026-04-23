import { HttpErrorResponse } from '@angular/common/http';

export type ErrorScenario = 'loan-strategy' | 'report-download' | 'amortization';

export class UserFacingError extends Error {
  constructor(
    message: string,
    readonly title: string,
    readonly technicalMessage?: string,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = 'UserFacingError';
  }
}

const scenarioTitleMap: Record<ErrorScenario, string> = {
  'loan-strategy': 'Unable to calculate strategy',
  'report-download': 'Unable to download report',
  'amortization': 'Unable to load amortization details'
};

const scenarioDefaultMessageMap: Record<ErrorScenario, string> = {
  'loan-strategy': 'Please review your loan inputs and try again.',
  'report-download': 'Please try again in a moment.',
  'amortization': 'Please try again after recalculating your loan plan.'
};

export function mapToUserFacingError(error: unknown, scenario: ErrorScenario) {
  const title = scenarioTitleMap[scenario];
  const fallbackMessage = scenarioDefaultMessageMap[scenario];

  if (error instanceof UserFacingError) {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    const backendMessage = extractBackendMessage(error);

    if (error.status === 0) {
      return new UserFacingError(
        `${title}. We could not reach the server. Check your connection or try again shortly.`,
        title,
        backendMessage || error.message,
        error.status
      );
    }

    if (error.status === 400 || error.status === 422) {
      return new UserFacingError(
        `${title}. ${backendMessage || fallbackMessage}`,
        title,
        backendMessage || error.message,
        error.status
      );
    }

    if (error.status === 404) {
      return new UserFacingError(
        `${title}. The requested service is not available right now.`,
        title,
        backendMessage || error.message,
        error.status
      );
    }

    if (error.status >= 500) {
      return new UserFacingError(
        `${title}. Our server ran into a problem. Please try again in a moment.`,
        title,
        backendMessage || error.message,
        error.status
      );
    }

    return new UserFacingError(
      `${title}. ${backendMessage || fallbackMessage}`,
      title,
      backendMessage || error.message,
      error.status
    );
  }

  if (error instanceof Error) {
    return new UserFacingError(
      `${title}. ${fallbackMessage}`,
      title,
      error.message
    );
  }

  return new UserFacingError(
    `${title}. ${fallbackMessage}`,
    title
  );
}

function extractBackendMessage(error: HttpErrorResponse) {
  const errorBody = error.error;
  const transportMessagePattern = /^Http failure response for\s/i;

  if (!errorBody) {
    return '';
  }

  if (typeof errorBody === 'string') {
    const message = errorBody.trim();
    return transportMessagePattern.test(message) ? '' : message;
  }

  if (typeof errorBody === 'object') {
    const nestedMessage = errorBody.message || errorBody.error || errorBody.title || error.message;
    if (typeof nestedMessage !== 'string') {
      return '';
    }

    const message = nestedMessage.trim();
    return transportMessagePattern.test(message) ? '' : message;
  }

  return '';
}
