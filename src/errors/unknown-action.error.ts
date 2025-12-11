export class UnknownActionError extends Error {
  public readonly actionKey: string;

  constructor(actionKey: string) {
    super(`Unknown action: ${actionKey}`);
    this.name = 'UnknownActionError';
    this.actionKey = actionKey;
  }
}
