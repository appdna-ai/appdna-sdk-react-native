import React from 'react';
async onBeforeStepRender(
  flowId: string,
  stepId: string,
  stepIndex: number,
  stepType: string,
  responses: Record<string, unknown>,
): Promise<StepConfigOverride | null> {
  // Pre-fill form fields based on user data
  if (stepId === 'profile_step') {
    return {
      fieldDefaults: {
        email: currentUser.email,
        name: currentUser.displayName,
      },
      title: `Welcome back, ${currentUser.firstName}!`,
    };
  }
  return null;
}

export {};
