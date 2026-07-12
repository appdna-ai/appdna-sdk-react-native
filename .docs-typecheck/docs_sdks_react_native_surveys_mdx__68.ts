
import { AppDNA, AppDNASurveyDelegate } from '@appdna-ai/react-native-sdk';

const feedbackHandler: AppDNASurveyDelegate = {
  onSurveyPresented(surveyId) {
    console.log(`Survey shown: ${surveyId}`);
  },

  onSurveyCompleted(surveyId, responses) {
    const score = responses.nps_question as number | undefined;
    if (score !== undefined) {
      if (score >= 9) {
        showReferralPrompt();
      } else if (score <= 6) {
        showSupportLink();
      }
    }
    const feedback = responses.free_text_question as string | undefined;
    if (feedback) {
      console.log(`User feedback: ${feedback}`);
    }
  },

  onSurveyDismissed(surveyId) {
    console.log(`Survey dismissed: ${surveyId}`);
  },
};

AppDNA.surveys.setDelegate(feedbackHandler);

export {};
