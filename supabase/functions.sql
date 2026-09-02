-- ====================================================================
-- RPC FUNCTIONS — TẦNG BẢO MẬT PHÒNG THI
-- Chạy file này SAU schema.sql.
--
-- Nguyên tắc: sinh viên KHÔNG có quyền đọc bảng questions/question_options
-- và KHÔNG có quyền ghi bảng submissions. Mọi thao tác phòng thi đi qua
-- 3 hàm SECURITY DEFINER dưới đây, nên:
--   * đáp án đúng (is_correct) không bao giờ rời khỏi server
--   * mã PIN được so sánh trên server
--   * điểm số do server chấm, client không thể tự ghi
-- ====================================================================

-- --------------------------------------------------------------------
-- Bộ câu hỏi được rút cho một bài làm cụ thể (xác định theo seed nên
-- sinh viên F5 vẫn nhận đúng đề cũ, và lúc chấm server dựng lại y hệt).
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exam_question_ids(p_quiz_id UUID, p_seed TEXT)
RETURNS TABLE (question_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT q.id
  FROM public.questions q
  JOIN public.quizzes z ON z.id = q.quiz_id
  WHERE q.quiz_id = p_quiz_id
  ORDER BY
    CASE WHEN z.shuffle_questions OR z.questions_per_student IS NOT NULL
         THEN md5(p_seed || q.id::text) ELSE lpad(q.order_index::text, 10, '0') END
  LIMIT (SELECT COALESCE(questions_per_student, 2147483647) FROM public.quizzes WHERE id = p_quiz_id);
$fn$;

-- --------------------------------------------------------------------
-- Kiểm tra quyền vào phòng thi của sinh viên hiện tại.
-- Trả về quiz_classes.id nếu hợp lệ, ngược lại RAISE lỗi có mã rõ ràng.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_exam_access(p_quiz_id UUID, p_access_code TEXT)
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_qc RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT qc.* INTO v_qc
  FROM public.quiz_classes qc
  JOIN public.class_students cs ON cs.class_id = qc.class_id
  JOIN public.quizzes z ON z.id = qc.quiz_id
  WHERE qc.quiz_id = p_quiz_id
    AND cs.student_id = auth.uid()
    AND z.is_published
  ORDER BY qc.start_at
  LIMIT 1;

  IF v_qc IS NULL THEN
    RAISE EXCEPTION 'NOT_ASSIGNED';
  END IF;

  IF NOT v_qc.is_active THEN
    RAISE EXCEPTION 'ROOM_CLOSED';
  END IF;

  IF now() < v_qc.start_at THEN
    RAISE EXCEPTION 'NOT_STARTED';
  END IF;

  IF now() > v_qc.end_at THEN
    RAISE EXCEPTION 'ENDED';
  END IF;

  -- So sánh mã PIN trên SERVER (client không bao giờ nhận được access_code)
  IF v_qc.access_code IS NOT NULL AND length(trim(v_qc.access_code)) > 0 THEN
    IF p_access_code IS NULL OR upper(trim(p_access_code)) <> upper(trim(v_qc.access_code)) THEN
      RAISE EXCEPTION 'WRONG_PIN';
    END IF;
  END IF;

  RETURN v_qc.id;
END;
$fn$;

-- --------------------------------------------------------------------
-- Lấy đề thi cho sinh viên: mở/khôi phục bài làm và trả câu hỏi
-- ĐÃ LOẠI BỎ cột is_correct.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_exam_paper(p_quiz_id UUID, p_access_code TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_quiz     RECORD;
  v_sub      RECORD;
  v_result   JSONB;
BEGIN
  PERFORM public.verify_exam_access(p_quiz_id, p_access_code);

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;

  -- Mở bài làm mới, hoặc lấy lại bài đang dở (F5 không mất đề, không reset)
  INSERT INTO public.submissions (quiz_id, student_id)
  VALUES (p_quiz_id, auth.uid())
  ON CONFLICT (quiz_id, student_id) DO NOTHING;

  SELECT * INTO v_sub
  FROM public.submissions
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid();

  IF v_sub.status <> 'in_progress' THEN
    RAISE EXCEPTION 'ALREADY_SUBMITTED';
  END IF;

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
            FROM public.question_options o
            WHERE o.question_id = q.id
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

-- --------------------------------------------------------------------
-- Nộp bài: server tự chấm trên đúng bộ câu hỏi đã rút.
-- p_answers dạng: [{"question_id": "...", "option_id": "..."}, ...]
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_exam(
  p_quiz_id UUID,
  p_answers JSONB,
  p_violations INT DEFAULT 0,
  p_timed_out BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_sub           RECORD;
  v_quiz          RECORD;
  v_qid           UUID;
  v_selected      UUID;
  v_is_correct    BOOLEAN;
  v_points        FLOAT;
  v_earned        FLOAT := 0;
  v_total_points  FLOAT := 0;
  v_correct_count INT := 0;
  v_total_count   INT := 0;
  v_score10       FLOAT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_sub FROM public.submissions
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid();

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'NO_SUBMISSION';
  END IF;

  IF v_sub.status <> 'in_progress' THEN
    RAISE EXCEPTION 'ALREADY_SUBMITTED';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;

  -- Duyệt đúng bộ câu hỏi server đã rút — client không thể thêm/bớt câu
  FOR v_qid IN SELECT question_id FROM public.exam_question_ids(p_quiz_id, v_sub.paper_seed)
  LOOP
    v_total_count := v_total_count + 1;
    SELECT points INTO v_points FROM public.questions WHERE id = v_qid;
    v_total_points := v_total_points + v_points;

    -- Đáp án client gửi lên, chỉ chấp nhận nếu option thuộc đúng câu hỏi đó
    SELECT o.id INTO v_selected
    FROM public.question_options o
    WHERE o.question_id = v_qid
      AND o.id = (
        SELECT (a->>'option_id')::uuid FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) a
        WHERE (a->>'question_id')::uuid = v_qid
        LIMIT 1
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
                    THEN round(((v_earned / v_total_points) * 10)::numeric, 2)
                    ELSE 0 END;

  UPDATE public.submissions
  SET submitted_at = now(),
      total_score = v_score10,
      status = CASE WHEN p_timed_out THEN 'timed_out'::submission_status ELSE 'submitted'::submission_status END,
      -- chỉ cho phép tăng, sinh viên không "reset" được số lần vi phạm
      tab_violations_count = GREATEST(tab_violations_count, COALESCE(p_violations, 0))
  WHERE id = v_sub.id;

  RETURN jsonb_build_object(
    'submitted', true,
    'show_results', v_quiz.show_results,
    -- chỉ trả điểm khi Giảng viên đã công bố
    'score', CASE WHEN v_quiz.show_results THEN v_score10 ELSE NULL END,
    'correct_count', CASE WHEN v_quiz.show_results THEN v_correct_count ELSE NULL END,
    'total_questions', v_total_count
  );
END;
$fn$;

-- --------------------------------------------------------------------
-- Ghi nhận vi phạm chuyển tab ngay lúc xảy ra (chỉ tăng, không giảm)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_violation(p_quiz_id UUID, p_event TEXT, p_message TEXT)
RETURNS INT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  UPDATE public.submissions
  SET tab_violations_count = tab_violations_count + 1,
      warning_history = warning_history || jsonb_build_object(
        'timestamp', now(), 'event', p_event, 'message', p_message)
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid() AND status = 'in_progress'
  RETURNING tab_violations_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$fn$;

-- --------------------------------------------------------------------
-- Sinh viên xem điểm — chỉ trả về khi Giảng viên đã bật công bố
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_result(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_sub RECORD;
  v_show BOOLEAN;
  v_correct INT;
  v_total INT;
BEGIN
  SELECT * INTO v_sub FROM public.submissions
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid();

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT show_results INTO v_show FROM public.quizzes WHERE id = p_quiz_id;

  SELECT count(*) FILTER (WHERE is_correct), count(*)
  INTO v_correct, v_total
  FROM public.submission_answers WHERE submission_id = v_sub.id;

  RETURN jsonb_build_object(
    'found', true,
    'status', v_sub.status,
    'violations', v_sub.tab_violations_count,
    'show_results', COALESCE(v_show, false),
    'score', CASE WHEN v_show THEN v_sub.total_score ELSE NULL END,
    'correct_count', CASE WHEN v_show THEN v_correct ELSE NULL END,
    'total_questions', v_total
  );
END;
$fn$;

-- --------------------------------------------------------------------
-- Quyền gọi RPC
-- --------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.exam_question_ids(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_exam_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exam_paper(UUID, TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(UUID, JSONB, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_violation(UUID, TEXT, TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_result(UUID)            TO authenticated;
