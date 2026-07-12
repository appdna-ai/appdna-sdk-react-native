
import { AppDNA, AppDNASurveyDelegate } from '@appdna-ai/react-native-sdk';

export class FeedbackManager implements AppDNASurveyDelegate {
  constructor() {
    AppDNA.surveys.setDelegate(this);
  }

  /** Present NPS survey after a key moment */
  async askForFeedback(): Promise<void> {
    await AppDNA.surveys.present('nps_q1_2026');
  }

  onSurveyPresented(surveyId: string): void {
    // Survey is visible
  }

  onSurveyCompleted(surveyId: string, responses: Record<string, unknown>): void {
    const score = responses.nps_question as number | undefined;
    if (score === undefined) return;

    if (score >= 9) {
      showReferralPrompt();
    } else if (score <= 6) {
      showSupportLink();
    }
  }

  onSurveyDismissed(surveyId: string): void {
    // User dismissed without responding
  }
}

export {};
