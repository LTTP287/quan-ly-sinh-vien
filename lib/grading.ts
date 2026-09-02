import { Question, SubmissionAnswer } from '@/types/database';

export interface GradeResult {
  answers: SubmissionAnswer[];
  correctCount: number;
  totalQuestions: number;
  earnedPoints: number;
  totalPoints: number;
  score10: number; // Điểm quy đổi thang 10
}

/**
 * Chấm điểm bài làm trắc nghiệm.
 * @param questions Các câu hỏi sinh viên thực sự được rút
 * @param selectedAnswers Map questionId -> optionId đã chọn
 */
export function gradeSubmission(
  questions: Question[],
  selectedAnswers: Record<string, string>,
  submissionId: string
): GradeResult {
  const answers: SubmissionAnswer[] = [];
  let earnedPoints = 0;
  let totalPoints = 0;
  let correctCount = 0;

  questions.forEach((q) => {
    const points = q.points || 1;
    totalPoints += points;

    const selectedOptionId = selectedAnswers[q.id] || null;
    const selectedOption = q.options?.find((o) => o.id === selectedOptionId);
    const isCorrect = !!selectedOption?.is_correct;

    if (isCorrect) {
      earnedPoints += points;
      correctCount += 1;
    }

    answers.push({
      id: `ans-${submissionId}-${q.id}`,
      submission_id: submissionId,
      question_id: q.id,
      selected_option_id: selectedOptionId,
      is_correct: selectedOptionId ? isCorrect : null,
      score_awarded: isCorrect ? points : 0,
    });
  });

  const score10 = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) / 10 : 0;

  return { answers, correctCount, totalQuestions: questions.length, earnedPoints, totalPoints, score10 };
}
