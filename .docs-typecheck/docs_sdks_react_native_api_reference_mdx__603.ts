
interface SurveyResult {
  surveyId: string;
  completed: boolean;            // false if dismissed early
  questionsAnswered: number;
  answers: SurveyAnswer[] | null;
}

export {};
