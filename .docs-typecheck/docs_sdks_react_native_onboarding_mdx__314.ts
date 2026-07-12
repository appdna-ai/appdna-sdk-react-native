
import { AppDNA, StepAdvanceResult, AppDNAOnboardingDelegate } from '@appdna-ai/react-native-sdk';
import ReactNativeBiometrics from 'react-native-biometrics';

const biometrics = new ReactNativeBiometrics();

const onboardingHandler: AppDNAOnboardingDelegate = {
  onOnboardingStarted: () => {},
  onOnboardingStepChanged: () => {},
  onOnboardingCompleted: () => {},
  onOnboardingDismissed: () => {},

  async onBeforeStepAdvance(flowId, fromStepId, stepIndex, stepType, responses, stepData) {
    const action = stepData?.action as string | undefined;
    if (!action) return { type: 'proceed' };

    switch (action) {
      case 'login': {
        const email = (stepData?.email as string) ?? '';
        const password = (stepData?.password as string) ?? '';
        try {
          const user = await authClient.signIn({ email, password });
          return { type: 'proceedWithData', data: { user_id: user.id } };
        } catch {
          return { type: 'block', message: 'Invalid email or password.' };
        }
      }

      case 'register': {
        const email = (stepData?.email as string) ?? '';
        const password = (stepData?.password as string) ?? '';
        try {
          const user = await authClient.register({ email, password });
          return { type: 'proceedWithData', data: { user_id: user.id } };
        } catch {
          return { type: 'block', message: "Couldn't create account — try a different email." };
        }
      }

      case 'reset_password': {
        const email = (stepData?.email as string) ?? '';
        try {
          await authClient.requestPasswordReset({ email });
        } catch {
          // Stay quiet; we always show the same confirmation banner
        }
        // Stay on step; show inline confirmation banner.
        return {
          type: 'stay',
          message: `If an account exists for ${email}, we've emailed a reset link.`,
        };
      }

      case 'request_otp': {
        // Fail explicitly when the SDK couldn't resolve the channel
        // (step has both phone and email inputs, or neither). Set the
        // button's action_value in the Console to disambiguate.
        const channel = stepData?.channel as string | undefined;
        const recipient = stepData?.recipient as string | undefined;
        if (!channel || !recipient) {
          return {
            type: 'block',
            message: "Couldn't determine OTP delivery channel — please contact support.",
          };
        }
        try {
          await otpClient.send({ channel, to: recipient });
          return { type: 'proceed' };
        } catch {
          return { type: 'block', message: "Couldn't send code — please retry." };
        }
      }

      case 'verify_otp': {
        const code = stepData?.otp_code as string | undefined;
        const recipient = stepData?.recipient as string | undefined;
        if (!code || !recipient) {
          return { type: 'block', message: 'Missing code or recipient.' };
        }
        try {
          await otpClient.verify({ code, recipient });
          return { type: 'proceed' };
        } catch {
          return { type: 'block', message: "Code didn't match — try again." };
        }
      }

      case 'enable_biometric': {
        const { available } = await biometrics.isSensorAvailable();
        if (!available) return { type: 'proceed' };
        const { success } = await biometrics.simplePrompt({
          promptMessage: 'Enable Face ID / Fingerprint for faster sign-in',
        });
        return { type: 'proceedWithData', data: { biometric_enabled: success } };
      }

      default:
        return { type: 'proceed' };
    }
  },
};

AppDNA.onboarding.setDelegate(onboardingHandler);

export {};
