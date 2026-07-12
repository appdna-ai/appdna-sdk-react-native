
interface FlowResult {
  completed: boolean;
  screensViewed: string[]; // Ordered list of screen IDs viewed during the flow
  lastScreenId: string | null;
  responses: Record<string, unknown>;
}

export {};
