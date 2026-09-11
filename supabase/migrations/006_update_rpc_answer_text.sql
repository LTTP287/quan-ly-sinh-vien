CREATE OR REPLACE FUNCTION public.submit_exam_admin(
  p_quiz_id UUID, p_student_id UUID, p_answers JSONB,
  p_violations INT DEFAULT 0, p_timed_out BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_sub RECORD; v_quiz RECORD; v_qid UUID; v_selected UUID;
  v_is_correct BOOLEAN; v_points FLOAT;
  v_earned FLOAT := 0; v_total_points FLOAT := 0;
  v_correct_count INT := 0; v_total_count INT := 0; v_score10 FLOAT;
  v_answer_text TEXT;
BEGIN
  SELECT * INTO v_sub FROM public.submissions
  WHERE quiz_id = p_quiz_id AND student_id = p_student_id;
  IF v_sub IS NULL THEN RAISE EXCEPTION 'NO_SUBMISSION'; END IF;
  IF v_sub.status <> 'in_progress' THEN RAISE EXCEPTION 'ALREADY_SUBMITTED'; END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;

  FOR v_qid IN SELECT question_id FROM public.exam_question_ids(p_quiz_id, v_sub.paper_seed)
  LOOP
    v_total_count := v_total_count + 1;
    SELECT points INTO v_points FROM public.questions WHERE id = v_qid;
    v_total_points := v_total_points + v_points;

    SELECT o.id INTO v_selected
    FROM public.question_options o
    WHERE o.question_id = v_qid
      AND o.id = (
        SELECT (a->>'option_id')::uuid FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) a
        WHERE (a->>'question_id')::uuid = v_qid LIMIT 1
      );

    SELECT (a->>'answer_text')::text INTO v_answer_text
    FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) a
    WHERE (a->>'question_id')::uuid = v_qid LIMIT 1;

    v_is_correct := COALESCE((SELECT is_correct FROM public.question_options WHERE id = v_selected), false);
    IF v_is_correct THEN
      v_earned := v_earned + v_points;
      v_correct_count := v_correct_count + 1;
    END IF;

    INSERT INTO public.submission_answers (submission_id, question_id, selected_option_id, is_correct, score_awarded, answer_text)
    VALUES (v_sub.id, v_qid, v_selected, CASE WHEN v_selected IS NULL THEN NULL ELSE v_is_correct END,
            CASE WHEN v_is_correct THEN v_points ELSE 0 END, v_answer_text)
    ON CONFLICT (submission_id, question_id) DO UPDATE
      SET selected_option_id = EXCLUDED.selected_option_id,
          is_correct = EXCLUDED.is_correct,
          score_awarded = EXCLUDED.score_awarded,
          answer_text = EXCLUDED.answer_text;
  END LOOP;

  v_score10 := CASE WHEN v_total_points > 0
                    THEN round(((v_earned / v_total_points) * 10)::numeric, 2) ELSE 0 END;

  UPDATE public.submissions
  SET submitted_at = now(), total_score = v_score10,
      status = CASE WHEN p_timed_out THEN 'timed_out'::submission_status ELSE 'submitted'::submission_status END,
      tab_violations_count = GREATEST(tab_violations_count, COALESCE(p_violations, 0))
  WHERE id = v_sub.id;

  RETURN jsonb_build_object(
    'score', v_score10,
    'correct', v_correct_count,
    'total', v_total_count,
    'points', v_earned,
    'total_points', v_total_points
  );
END;
$fn$;
