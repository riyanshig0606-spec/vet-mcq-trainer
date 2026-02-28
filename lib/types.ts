export type Option = { key: string; text: string };

export type Question = {
  id: string;
  stem: string;
  options: Option[];
  correctKey: string;
  explanationShort?: string;
  explanationLong?: string;
};

export type Subcategory = {
  id: string;
  title: string;
  questions: Question[];
};

export type QuestionSet = {
  id: string;
  title: string;
  subcategories: Subcategory[];
};

export type Category = {
  id: string;
  title: string;
  sets: QuestionSet[];
};

export type QuestionBank = {
  categories: Category[];
};

export type Mode = "practice" | "exam";

export type AttemptAnswer = {
  questionId: string;
  subcategoryId: string;
  selectedKey: string | null;
  correctKey: string;
  isCorrect: boolean;
  flagged: boolean;
};

export type AttemptSummary = {
  attemptId: string;
  categoryId: string;
  setId: string;
  mode: Mode;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  timerEnabled: boolean;
  wrongOnly: boolean;
  startedAt: number;
  finishedAt: number;
  answers: AttemptAnswer[];
};
