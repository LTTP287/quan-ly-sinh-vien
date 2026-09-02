-- ====================================================================
-- MIGRATION 003 — Biến thể "admin" của các RPC phòng thi
--
-- Hệ thống nay dùng JWT/session riêng (bảng public.sessions) thay cho
-- Supabase Auth, nên auth.uid() luôn NULL trong các request từ API route.
-- Các hàm dưới nhận student_id tường minh và CHỈ service-role được gọi
-- (đã REVOKE khỏi anon/authenticated ở cuối file).
--
-- Chạy sau 002_auth_and_passcode.sql.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_exam_paper_admin(p_quiz_id UUID, p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_quiz RECORD;
  v_sub  RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF v_quiz IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  INSERT INTO public.submissions (quiz_id, student_id)
  VALUES (p_quiz_id, p_student_id)
  ON CONFLICT (quiz_id, student_id) DO NOTHING;

  SELECT * INTO v_sub FROM public.submissions
  WHERE quiz_id = p_quiz_id AND student_id = p_student_id;

  IF v_sub.status <> 'in_progress' THEN RAISE EXCEPTION 'ALREADY_SUBMITTED'; END IF;

  SELECT jsonb_build_object(
    'submission_id', v_sub.id,
    'started_at', v_sub.started_at,
    'tab_violations_count', v_sub.tab_violations_count,
    'quiz', jsonb_build_object(
      'id', v_quiz.id,
      'title', v_quiz.title,
      'description', v_quiz.description,
      'time_limit_minutes', v_quiz.time_limit_minutes,
      'prevent_previous', v_quiz.prevent_previous,
      'show_results', v_quiz.show_results
    ),
    'questions', COALESCE((
      SELECT jsonb_agg(qq ORDER BY qq->>'_ord')
      FROM (
        SELECT jsonb_build_object(
          '_ord', md5(v_sub.paper_seed || q.id::text),
          'id', q.id,
          'question_text', q.question_text,
          'question_type', q.question_type,
          'points', q.points,
          'options', COALESCE((
            SELECT jsonb_agg(
                     jsonb_build_object('id', o.id, 'option_text', o.option_text)
                     ORDER BY CASE WHEN v_quiz.shuffle_options
                                   THEN md5(v_sub.paper_seed || o.id::text)
                                   ELSE lpad(o.order_index::text, 10, '0') END
                   )
            FROM public.question_options o WHERE o.question_id = q.id
          ), '[]'::jsonb)
        ) AS qq
        FROM public.questions q
        WHERE q.id IN (SELECT question_id FROM public.exam_question_ids(p_quiz_id, v_sub.paper_seed))
      ) s
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$fn$;

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

    v_is_correct := COALESCE((SELECT is_correct FROM public.question_options WHERE id = v_selected), false);
    IF v_is_correct THEN
      v_earned := v_earned + v_points;
      v_correct_count := v_correct_count + 1;
    END IF;

    INSERT INTO public.submission_answers (submission_id, question_id, selected_option_id, is_correct, score_awarded)
    VALUES (v_sub.id, v_qid, v_selected, CASE WHEN v_selected IS NULL THEN NULL ELSE v_is_correct END,
            CASE WHEN v_is_correct THEN v_points ELSE 0 END)
    ON CONFLICT (submission_id, question_id) DO UPDATE
      SET selected_option_id = EXCLUDED.selected_option_id,
          is_correct = EXCLUDED.is_correct,
          score_awarded = EXCLUDED.score_awarded;
  END LOOP;

  v_score10 := CASE WHEN v_total_points > 0
                    THEN round(((v_earned / v_total_points) * 10)::numeric, 2) ELSE 0 END;

  UPDATE public.submissions
  SET submitted_at = now(), total_score = v_score10,
      status = CASE WHEN p_timed_out THEN 'timed_out'::submission_status ELSE 'submitted'::submission_status END,
      tab_violations_count = GREATEST(tab_violations_count, COALESCE(p_violations, 0))
  WHERE id = v_sub.id;

  RETURN jsonb_build_object(
    'submitted', true,
    'show_results', v_quiz.show_results,
    'score', CASE WHEN v_quiz.show_results THEN v_score10 ELSE NULL END,
    'correct_count', CASE WHEN v_quiz.show_results THEN v_correct_count ELSE NULL END,
    'total_questions', v_total_count
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.record_violation_admin(
  p_quiz_id UUID, p_student_id UUID, p_event TEXT, p_message TEXT
)
RETURNS INT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_count INT;
BEGIN
  UPDATE public.submissions
  SET tab_violations_count = tab_violations_count + 1,
      warning_history = warning_history || jsonb_build_object(
        'timestamp', now(), 'event', p_event, 'message', p_message)
  WHERE quiz_id = p_quiz_id AND student_id = p_student_id AND status = 'in_progress'
  RETURNING tab_violations_count INTO v_count;
  RETURN COALESCE(v_count, 0);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_my_result_admin(p_quiz_id UUID, p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_sub RECORD; v_show BOOLEAN; v_correct INT; v_total INT;
BEGIN
  SELECT * INTO v_sub FROM public.submissions
  WHERE quiz_id = p_quiz_id AND student_id = p_student_id;
  IF v_sub IS NULL THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT show_results INTO v_show FROM public.quizzes WHERE id = p_quiz_id;
  SELECT count(*) FILTER (WHERE is_correct), count(*) INTO v_correct, v_total
  FROM public.submission_answers WHERE submission_id = v_sub.id;

  RETURN jsonb_build_object(
    'found', true, 'status', v_sub.status, 'violations', v_sub.tab_violations_count,
    'show_results', COALESCE(v_show, false),
    'score', CASE WHEN v_show THEN v_sub.total_score ELSE NULL END,
    'correct_count', CASE WHEN v_show THEN v_correct ELSE NULL END,
    'total_questions', v_total
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_exam_paper_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_exam_admin(UUID, UUID, JSONB, INT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_violation_admin(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_result_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
