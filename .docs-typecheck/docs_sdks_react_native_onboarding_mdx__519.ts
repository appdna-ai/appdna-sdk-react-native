
onOnboardingCompleted(flowId: string, responses: Record<string, unknown>) {
  const formData = responses['profile_step'] as Record<string, unknown> | undefined;
  if (formData) {
    const name = formData['full_name'] as string | undefined;
    const age = formData['age'] as number | undefined;
    const email = formData['email'] as string | undefined;
    // Use collected data to personalize the experience
  }
}

export {};
