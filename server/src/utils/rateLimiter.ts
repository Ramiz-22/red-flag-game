export class SocketRateLimiter {
  private counts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private maxPerWindow: number = 30,
    private windowMs: number = 5000,
  ) {}

  check(socketId: string): boolean {
    const now = Date.now();
    const entry = this.counts.get(socketId);
    if (!entry || now >= entry.resetAt) {
      this.counts.set(socketId, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count++;
    return entry.count <= this.maxPerWindow;
  }

  remove(socketId: string) {
    this.counts.delete(socketId);
  }
}
