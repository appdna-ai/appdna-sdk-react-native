import React from 'react';
async onBeforeStepAdvance(
  flowId: string,
  fromStepId: string,
  stepIndex: number,
  stepType: string,
  responses: Record<string, unknown>,
  stepData: Record<string, unknown> | null,
): Promise<StepAdvanceResult> {
  // Example: validate a referral code with your backend
  if (stepType === 'form') {
    const stepResponses = responses[fromStepId] as Record<string, unknown> | undefined;
    const code = stepResponses?.referral_code as string | undefined;
    if (code) {
      const isValid = await validateReferralCode(code);
      if (!isValid) {
        return { type: 'block', message: 'Invalid referral code. Please try again.' };
      }
      return { type: 'proceedWithData', data: { referral_validated: true } };
    }
  }
  return { type: 'proceed' };
}

export {};
