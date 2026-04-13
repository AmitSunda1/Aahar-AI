/**
 * Rate limit manager for Gemini API
 * Implements exponential backoff and request queuing
 */

interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  reject: (error: Error) => void;
  resolve: (result: any) => void;
}

class RateLimitManager {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minDelayMs = 1000; // Minimum 1 second between requests (free tier limitation)
  private retryDelayMs = 5000; // Start with 5 second retry delay
  private maxRetries = 3;

  /**
   * Execute a function with rate limiting and retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName: string = "API call",
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryDelayMs;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Wait before executing to respect rate limits
        await this.waitForSlot();

        // Execute the function
        const result = await fn();
        return result;
      } catch (error) {
        const err = error as any;
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a rate limit error
        const isRateLimitError =
          err.message?.includes("429") ||
          err.message?.includes("quota") ||
          err.message?.includes("Too Many Requests");

        if (!isRateLimitError) {
          // Not a rate limit error, throw immediately
          throw lastError;
        }

        // Parse retry delay from error if available
        const retryMatch = err.message?.match(/retry.*?(\d+)\.?\d*\s*s/i);
        if (retryMatch) {
          delay = Math.ceil(parseFloat(retryMatch[1]) * 1000);
        }

        // If this is the last attempt, throw
        if (attempt === this.maxRetries) {
          throw new Error(
            `${operationName} exceeded retry limit. ${lastError.message}`,
          );
        }

        console.warn(
          `[RateLimitManager] ${operationName} rate limited (attempt ${attempt + 1}/${this.maxRetries}). Retrying in ${delay}ms...`,
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff for next attempt
        delay = Math.min(delay * 1.5, 60000); // Cap at 60 seconds
      }
    }

    throw lastError || new Error(`${operationName} failed after retries`);
  }

  /**
   * Wait for a slot to become available (rate limit throttling)
   */
  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minDelayMs - timeSinceLastRequest),
      );
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Add a request to the queue for batch processing
   */
  async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        execute: fn,
        resolve,
        reject,
      };

      this.queue.push(request);
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      try {
        const result = await this.executeWithRetry(
          () => request.execute(),
          `Queued request ${request.id}`,
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error as Error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
      minDelayMs: this.minDelayMs,
    };
  }
}

// Export singleton instance
export const rateLimitManager = new RateLimitManager();
