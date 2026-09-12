'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { 
  ArrowLeft, FilePlus2, Plus, Trash2, CheckCircle2, 
  HelpCircle, Lock, Eye, EyeOff, Sparkles, Clock, Calendar, 
  Shuffle, ArrowRightLeft, ShieldBan, Dice5, FileSpreadsheet, 
  FileText, Upload, Download, CopyCheck, Wand2, Star, BookOpen, CheckSquare, Square, KeyRound,
  Image as ImageIcon, Calculator, Sliders, Award, AlertTriangle, Layers
} from 'lucide-react';
import { Question, QuestionOption, Quiz, ClassModule } from '@/types/database';
import { listClasses, getQuizWithQuestions, updateQuiz } from '@/lib/data';

export default function EditQuizPage({ params }: { params: { id: string } }) {
  const quizId = params.id;
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Mode Selection: 'text' | 'excel' | 'manual'
  const [activeTab, setActiveTab] = useState<'text' | 'excel' | 'manual'>('text');

  // Multi-Class Assignment State
  const [availableClasses, setAvailableClasses] = useState<ClassModule[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Quiz Settings State
  const [title, setTitle] = useState('Bài Kiểm Tra - Introduction to Logistics & SCM');
  const [description, setDescription] = useState('Đề thi trắc nghiệm chung cho các lớp học phần Logistics & SCM.');
  const [timeLimit, setTimeLimit] = useState(45);
  const [questionsPerStudent, setQuestionsPerStudent] = useState(5);
  const [showResults, setShowResults] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [preventPrevious, setPreventPrevious] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [passcodeExpiresAt, setPasscodeExpiresAt] = useState(() => {
    const d = new Date(Date.now() + 86400000 * 7);
    return d.toISOString().slice(0, 16);
  });

  // Load Quiz Data & Classes
  useEffect(() => {
    (async () => {
      try {
        const [loadedClasses, existingQuiz] = await Promise.all([
          listClasses(),
          getQuizWithQuestions(quizId)
        ]);
        setAvailableClasses(loadedClasses);
        if (existingQuiz) {
          setTitle(existingQuiz.title || '');
          setDescription(existingQuiz.description || '');
          setTimeLimit(existingQuiz.time_limit_minutes || 45);
          setQuestionsPerStudent(existingQuiz.questions_per_student || 5);
          setShowResults(Boolean(existingQuiz.show_results));
          setShuffleQuestions(existingQuiz.shuffle_questions !== false);
          setShuffleOptions(existingQuiz.shuffle_options !== false);
          setPreventPrevious(existingQuiz.prevent_previous !== false);
          setAccessCode(existingQuiz.passcode || '');
          if (existingQuiz.passcode_expires_at) {
            try {
              setPasscodeExpiresAt(new Date(existingQuiz.passcode_expires_at).toISOString().slice(0, 16));
            } catch {}
          }
          if (existingQuiz.questions && existingQuiz.questions.length > 0) {
            setQuestions(existingQuiz.questions);
          }
          if (existingQuiz.section_sampling) {
            if (typeof existingQuiz.section_sampling.multiple_choice === 'number') {
              setSampleMcCount(existingQuiz.section_sampling.multiple_choice);
            }
            if (typeof existingQuiz.section_sampling.short_answer === 'number') {
              setSampleShortCount(existingQuiz.section_sampling.short_answer);
            }
            if (typeof existingQuiz.section_sampling.long_answer === 'number') {
              setSampleEssayCount(existingQuiz.section_sampling.long_answer);
            }
          }
          if (existingQuiz.assigned_class_ids && existingQuiz.assigned_class_ids.length > 0) {
            setSelectedClassIds(existingQuiz.assigned_class_ids);
          } else {
            setSelectedClassIds(loadedClasses.map((c) => c.id));
          }
        }
      } catch (err) {
        console.error('Không tải được thông tin bài thi', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const toggleClassSelection = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter((id) => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  const toggleSelectAllClasses = () => {
    if (selectedClassIds.length === availableClasses.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(availableClasses.map((c) => c.id));
    }
  };

  // Thang Điểm Phân Bổ Theo Loại Câu Hỏi
  const [batchMcPoints, setBatchMcPoints] = useState<number>(0.2);
  const [batchShortPoints, setBatchShortPoints] = useState<number>(1.0);
  const [batchEssayPoints, setBatchEssayPoints] = useState<number>(3.0);

  // Số Câu Hỏi Rút Ngẫu Nhiên Cho Mỗi Phần
  const [sampleMcCount, setSampleMcCount] = useState<number>(20);
  const [sampleShortCount, setSampleShortCount] = useState<number>(3);
  const [sampleEssayCount, setSampleEssayCount] = useState<number>(1);

  // Question Bank State
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-1',
      quiz_id: 'new',
      question_text: 'Yếu tố nào sau đây là mục tiêu 7Rs cốt lõi trong hoạt động Logistics?',
      question_type: 'multiple_choice',
      points: 0.2,
      order_index: 0,
      options: [
        { id: 'opt-1', question_id: 'q-1', option_text: 'Right Product, Right Quantity, Right Condition, Right Place, Right Time, Right Customer, Right Price', is_correct: true, order_index: 0 },
        { id: 'opt-2', question_id: 'q-1', option_text: 'Right Route, Right Risk, Right Revenue, Right Requirement, Right Resource, Right Return, Right Rate', is_correct: false, order_index: 1 },
        { id: 'opt-3', question_id: 'q-1', option_text: 'Right Storage, Right Safety, Right Speed, Right System, Right Scale, Right Strategy, Right Scope', is_correct: false, order_index: 2 },
      ],
    },
    {
      id: 'q-2',
      quiz_id: 'new',
      question_text: 'Mô hình Bullwhip Effect mô tả hiện tượng biến động nhu cầu gia tăng khi đi ngược lên phía trên Chuỗi cung ứng (từ bán lẻ về nhà sản xuất).',
      question_type: 'true_false',
      points: 0.2,
      order_index: 1,
      options: [
        { id: 'opt-tf-1', question_id: 'q-2', option_text: 'Đúng', is_correct: true, order_index: 0 },
        { id: 'opt-tf-2', question_id: 'q-2', option_text: 'Sai', is_correct: false, order_index: 1 },
      ],
    },
  ]);

  // Smart Text Paste State with Asterisk (*) marking correct answer syntax
  const [rawText, setRawText] = useState(`Câu 1: Khái niệm 3PL (Third-Party Logistics) để chỉ đối tượng nào?
*A. Công ty dịch vụ logistics bên thứ ba đảm nhận các hoạt động vận tải & kho bãi
B. Nhà sản xuất trực tiếp tự vận hành kho
C. Khách hàng tiêu dùng cuối cùng
D. Cơ quan hải quan nhà nước

Câu 2: Phương thức vận tải nào có chi phí đơn vị thấp nhất cho hàng hóa siêu trường siêu trọng trên cự ly dài?
A. Vận tải đường hàng không (Air Freight)
*B. Vận tải đường biển (Sea Freight)
C. Vận tải đường bộ bằng xe tải
D. Vận tải bằng đường bưu điện express

Câu 3: Chỉ số KPI On-Time In-Full (OTIF) dùng để đo lường hiệu quả giao hàng đúng giờ và đủ số lượng.
*A. Đúng
B. Sai`);

  const [importStatus, setImportStatus] = useState<string | null>(null);

  // 1. FAST EXCEL QUESTION BANK UPLOADER
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          setImportStatus('File Excel không có dữ liệu câu hỏi.');
          return;
        }

        const newParsedQuestions: Question[] = [];

        rawData.forEach((row, idx) => {
          const qText = row['Nội dung câu hỏi'] || row['Câu hỏi'] || row['Question'] || row['Nội dung'] || row['CAU HOI'];
          if (!qText) return;

          const optA = row['Đáp án A'] || row['Phương án A'] || row['A'] || '';
          const optB = row['Đáp án B'] || row['Phương án B'] || row['B'] || '';
          const optC = row['Đáp án C'] || row['Phương án C'] || row['C'] || '';
          const optD = row['Đáp án D'] || row['Phương án D'] || row['D'] || '';

          const rawCorrect = String(row['Đáp án đúng'] || row['Đáp án'] || row['DAP AN'] || 'A').trim().toUpperCase();

          const qId = `excel-q-${Date.now()}-${idx}`;
          const isCorrectA = String(optA).startsWith('*') || rawCorrect.includes('A') || rawCorrect === '1';
          const isCorrectB = String(optB).startsWith('*') || rawCorrect.includes('B') || rawCorrect === '2';
          const isCorrectC = String(optC).startsWith('*') || rawCorrect.includes('C') || rawCorrect === '3';
          const isCorrectD = String(optD).startsWith('*') || rawCorrect.includes('D') || rawCorrect === '4';

          const options: QuestionOption[] = [];
          if (optA) options.push({ id: `${qId}-optA`, question_id: qId, option_text: String(optA).replace(/^\*/, '').trim(), is_correct: isCorrectA, order_index: 0 });
          if (optB) options.push({ id: `${qId}-optB`, question_id: qId, option_text: String(optB).replace(/^\*/, '').trim(), is_correct: isCorrectB, order_index: 1 });
          if (optC) options.push({ id: `${qId}-optC`, question_id: qId, option_text: String(optC).replace(/^\*/, '').trim(), is_correct: isCorrectC, order_index: 2 });
          if (optD) options.push({ id: `${qId}-optD`, question_id: qId, option_text: String(optD).replace(/^\*/, '').trim(), is_correct: isCorrectD, order_index: 3 });

          const rowPoints = Number(row['Điểm'] || row['Thang điểm'] || row['Số điểm'] || row['Points']) || batchMcPoints;

          newParsedQuestions.push({
            id: qId,
            quiz_id: 'new',
            question_text: String(qText).trim(),
            question_type: options.length > 2 ? 'multiple_choice' : 'true_false',
            points: rowPoints,
            order_index: questions.length + idx,
            options,
          });
        });

        if (newParsedQuestions.length === 0) {
          setImportStatus('Không đọc được câu hỏi. Thầy/Cô vui lòng tải Mẫu Excel Ngân Hàng Câu Hỏi ở dưới.');
          return;
        }

        setQuestions([...questions, ...newParsedQuestions]);
        setImportStatus(`Đã nạp thành công ${newParsedQuestions.length} câu hỏi từ file Excel vào Ngân hàng đề!`);
      } catch (err) {
        setImportStatus('Lỗi đọc file Excel. Vui lòng kiểm tra lại cấu trúc file.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const downloadSampleQuestionTemplate = () => {
    const sampleData = [
      {
        'Nội dung câu hỏi': 'Chỉ số OTIF đo lường yếu tố nào trong Logistics?',
        'Đáp án A': '*Giao hàng đúng giờ và đủ số lượng',
        'Đáp án B': 'Chi phí vận chuyển',
        'Đáp án C': 'Tỷ lệ tồn kho quay vòng',
        'Đáp án D': 'Số lượng nhà cung cấp',
        'Đáp án đúng': 'A',
      },
      {
        'Nội dung câu hỏi': 'Mô hình Bullwhip Effect làm gia tăng biến động tồn kho về phía nguồn cung.',
        'Đáp án A': '*Đúng',
        'Đáp án B': 'Sai',
        'Đáp án C': '',
        'Đáp án D': '',
        'Đáp án đúng': 'A',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NganHangCauHoi');
    XLSX.writeFile(wb, 'Mau_Ngan_Hang_Cau_Hoi_Logistics.xlsx');
  };

  // 2. FAST SMART TEXT PARSER
  const handleParseText = () => {
    if (!rawText.trim()) return;

    try {
      const blocks = rawText.split(/(?:Câu\s+\d+:?|\d+\.)/i).filter((b) => b.trim().length > 0);
      const parsedList: Question[] = [];

      blocks.forEach((block, idx) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const qText = lines[0].replace(/^(?:Câu\s+\d+:?|\d+\.)/i, '').trim();
        const rawOptions: { text: string; isCorrect: boolean }[] = [];
        let explicitAnswerLetter = '';

        lines.slice(1).forEach((line) => {
          if (line.match(/Đáp án:?\s*([A-D])/i)) {
            const match = line.match(/Đáp án:?\s*([A-D])/i);
            if (match) explicitAnswerLetter = match[1].toUpperCase();
            return;
          }

          // Dấu * chỉ đánh dấu đáp án đúng khi đứng ở ĐẦU dòng ("*A. ..." hoặc "A.* ...").
          // Dấu * nằm giữa nội dung (công thức, chú thích) KHÔNG được coi là đánh dấu.
          const hasAsterisk = /^\s*\*/.test(line) || /^\s*[A-D][\.:\)]?\s*\*/i.test(line);
          let cleanLine = hasAsterisk ? line.replace(/\*/, '').trim() : line.trim();
          cleanLine = cleanLine.replace(/^[A-D][\.:\)\s]\s*/i, '').trim();
          cleanLine = cleanLine.replace(/^\*/, '').trim();

          if (cleanLine) {
            rawOptions.push({
              text: cleanLine,
              isCorrect: hasAsterisk,
            });
          }
        });

        if (explicitAnswerLetter && !rawOptions.some((o) => o.isCorrect)) {
          const letterIdx = explicitAnswerLetter.charCodeAt(0) - 65;
          if (rawOptions[letterIdx]) {
            rawOptions[letterIdx].isCorrect = true;
          }
        }

        if (rawOptions.length > 0 && !rawOptions.some((o) => o.isCorrect)) {
          rawOptions[0].isCorrect = true;
        }

        const qId = `text-q-${Date.now()}-${idx}`;
        const options: QuestionOption[] = rawOptions.map((opt, optIdx) => ({
          id: `${qId}-opt-${optIdx}`,
          question_id: qId,
          option_text: opt.text,
          is_correct: opt.isCorrect,
          order_index: optIdx,
        }));

        if (options.length > 0) {
          parsedList.push({
            id: qId,
            quiz_id: 'new',
            question_text: qText,
            question_type: options.length > 2 ? 'multiple_choice' : 'true_false',
            points: batchMcPoints,
            order_index: questions.length + idx,
            options,
          });
        }
      });

      if (parsedList.length === 0) {
        setImportStatus('Không bóc tách được câu hỏi. Thầy/Cô vui lòng kiểm tra lại định dạng dán.');
        return;
      }

      setQuestions([...questions, ...parsedList]);
      setImportStatus(`Thành công! Đã bóc tách và thêm ${parsedList.length} câu hỏi vào Ngân hàng đề.`);
      setActiveTab('manual');
    } catch (e) {
      setImportStatus('Không thể phân tích văn bản. Vui lòng kiểm tra định dạng dán.');
    }
  };

  // Point Allocation & Breakdown Calculations
  const totalPoints = Math.round(questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) * 100) / 100;
  
  const mcQuestions = questions.filter((q) => q.question_type === 'multiple_choice' || q.question_type === 'true_false');
  const mcTotalPoints = Math.round(mcQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) * 100) / 100;
  
  const shortQuestions = questions.filter((q) => q.question_type === 'short_answer');
  const shortTotalPoints = Math.round(shortQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) * 100) / 100;

  const longQuestions = questions.filter((q) => q.question_type === 'long_answer');
  const longTotalPoints = Math.round(longQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) * 100) / 100;

  // Điểm bài thi thực tế rút ngẫu nhiên cho mỗi sinh viên (Target: 10.0 điểm)
  const plannedMcPoints = Math.round((sampleMcCount * batchMcPoints) * 10) / 10;
  const plannedShortPoints = Math.round((sampleShortCount * batchShortPoints) * 10) / 10;
  const plannedEssayPoints = Math.round((sampleEssayCount * batchEssayPoints) * 10) / 10;
  const examTotalPoints = Math.round((plannedMcPoints + plannedShortPoints + plannedEssayPoints) * 10) / 10;

  const updateQuestionPoints = (qId: string, pts: number) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, points: Math.max(0, Number(pts) || 0) } : q)));
  };

  const handleApplyBatchPoints = () => {
    setQuestions(questions.map((q) => {
      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        return { ...q, points: Number(batchMcPoints) || 0 };
      }
      if (q.question_type === 'short_answer') {
        return { ...q, points: Number(batchShortPoints) || 0 };
      }
      if (q.question_type === 'long_answer') {
        return { ...q, points: Number(batchEssayPoints) || 0 };
      }
      return q;
    }));
  };

  const handleApplyMidtermPreset = () => {
    setBatchMcPoints(0.2);
    setBatchShortPoints(1.0);
    setBatchEssayPoints(3.0);
    setSampleMcCount(20);
    setSampleShortCount(3);
    setSampleEssayCount(1);
    setQuestionsPerStudent(24);
    setQuestions(questions.map((q) => {
      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        return { ...q, points: 0.2 };
      }
      if (q.question_type === 'short_answer') {
        return { ...q, points: 1.0 };
      }
      if (q.question_type === 'long_answer') {
        return { ...q, points: 3.0 };
      }
      return q;
    }));
  };

  const handleDistributeEvenly = () => {
    if (questions.length === 0) return;
    const ptPerQ = Math.round((10 / questions.length) * 100) / 100;
    setQuestions(questions.map((q) => ({ ...q, points: ptPerQ })));
  };

  const handleScaffoldMidtermTemplate = () => {
    if (questions.length > 0 && !window.confirm('Thầy/Cô có muốn khởi tạo Khung Đề Thi Midterm Chuẩn (10 điểm: 20 câu trắc nghiệm 0.2đ + 3 câu ngắn 1.0đ + 1 câu tự luận 3.0đ)? Thao tác này sẽ thay thế các câu hỏi hiện tại.')) {
      return;
    }
    setBatchMcPoints(0.2);
    setBatchShortPoints(1.0);
    setBatchEssayPoints(3.0);
    setSampleMcCount(20);
    setSampleShortCount(3);
    setSampleEssayCount(1);

    const scaffolded: Question[] = [];
    const timestamp = Date.now();

    // 20 câu trắc nghiệm (0.2 x 20 = 4.0 điểm)
    for (let i = 1; i <= 20; i++) {
      const qId = `midterm-mc-${timestamp}-${i}`;
      scaffolded.push({
        id: qId,
        quiz_id: quizId,
        question_text: `[Phần 1 - Trắc nghiệm] Câu hỏi trắc nghiệm số ${i}...`,
        question_type: 'multiple_choice',
        points: 0.2,
        order_index: i - 1,
        options: [
          { id: `${qId}-opt-1`, question_id: qId, option_text: 'Phương án A', is_correct: true, order_index: 0 },
          { id: `${qId}-opt-2`, question_id: qId, option_text: 'Phương án B', is_correct: false, order_index: 1 },
          { id: `${qId}-opt-3`, question_id: qId, option_text: 'Phương án C', is_correct: false, order_index: 2 },
          { id: `${qId}-opt-4`, question_id: qId, option_text: 'Phương án D', is_correct: false, order_index: 3 },
        ],
      });
    }

    // 3 câu ngắn (1.0 x 3 = 3.0 điểm)
    for (let i = 1; i <= 3; i++) {
      const qId = `midterm-short-${timestamp}-${i}`;
      scaffolded.push({
        id: qId,
        quiz_id: quizId,
        question_text: `[Phần 2 - Câu hỏi ngắn] Câu hỏi tình huống / bài tập ngắn số ${i}...`,
        question_type: 'short_answer',
        points: 1.0,
        order_index: 20 + (i - 1),
        options: [],
      });
    }

    // 1 câu tự luận dài (3.0 điểm)
    const qIdLong = `midterm-long-${timestamp}-1`;
    scaffolded.push({
      id: qIdLong,
      quiz_id: quizId,
      question_text: `[Phần 3 - Tự luận dài] Trình bày phân tích tình huống thực tế hoặc bài toán chiến lược tổng hợp (3.0 điểm)...`,
      question_type: 'long_answer',
      points: 3.0,
      order_index: 23,
      options: [],
    });

    setQuestions(scaffolded);
    setQuestionsPerStudent(24);
  };

  // Question Authoring Helpers
  const addQuestion = (type: Question['question_type']) => {
    const newQId = `q-${Date.now()}`;
    let defaultOptions: QuestionOption[] = [];
    let initialPoints = 1.0;

    if (type === 'multiple_choice') {
      initialPoints = batchMcPoints;
      defaultOptions = [
        { id: `opt-${Date.now()}-1`, question_id: newQId, option_text: 'Lựa chọn A', is_correct: true, order_index: 0 },
        { id: `opt-${Date.now()}-2`, question_id: newQId, option_text: 'Lựa chọn B', is_correct: false, order_index: 1 },
        { id: `opt-${Date.now()}-3`, question_id: newQId, option_text: 'Lựa chọn C', is_correct: false, order_index: 2 },
        { id: `opt-${Date.now()}-4`, question_id: newQId, option_text: 'Lựa chọn D', is_correct: false, order_index: 3 },
      ];
    } else if (type === 'true_false') {
      initialPoints = batchMcPoints;
      defaultOptions = [
        { id: `opt-tf-1`, question_id: newQId, option_text: 'Đúng', is_correct: true, order_index: 0 },
        { id: `opt-tf-2`, question_id: newQId, option_text: 'Sai', is_correct: false, order_index: 1 },
      ];
    } else if (type === 'short_answer') {
      initialPoints = batchShortPoints;
      defaultOptions = [];
    } else if (type === 'long_answer') {
      initialPoints = batchEssayPoints;
      defaultOptions = [];
    }

    const newQ: Question = {
      id: newQId,
      quiz_id: quizId,
      question_text: `Câu hỏi mới số ${questions.length + 1}...`,
      question_type: type,
      points: initialPoints,
      order_index: questions.length,
      options: defaultOptions,
    };

    setQuestions([...questions, newQ]);
  };

  const updateQuestionText = (qId: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, question_text: text } : q)));
  };

  const updateQuestionImage = (qId: string, imageUrl: string | null) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, image_url: imageUrl } : q)));
  };

  const updateOptionText = (qId: string, optId: string, text: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options?.map((opt) => (opt.id === optId ? { ...opt, option_text: text } : opt)),
        };
      })
    );
  };

  const setCorrectOption = (qId: string, optId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options?.map((opt) => ({ ...opt, is_correct: opt.id === optId })),
        };
      })
    );
  };

  const removeQuestion = (qId: string) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập Tiêu đề Bài Quiz');
      return;
    }

    if (selectedClassIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 Lớp học phần để gán bài thi này.');
      return;
    }

    if (questions.length === 0) {
      alert('Ngân hàng đề đang trống. Vui lòng thêm ít nhất 1 câu hỏi trước khi lưu.');
      return;
    }

    if (questionsPerStudent > questions.length) {
      alert(`Số câu rút ngẫu nhiên (${questionsPerStudent}) đang lớn hơn số câu trong ngân hàng đề (${questions.length}).`);
      return;
    }

    const now = new Date();
    const end = new Date(Date.now() + 86400000 * 7);

    try {
      await updateQuiz(
        quizId,
        {
          title: title.trim(),
          description: description.trim(),
          time_limit_minutes: timeLimit,
          show_results: showResults,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          prevent_previous: preventPrevious,
          questions_per_student: questionsPerStudent,
          section_sampling: {
            multiple_choice: sampleMcCount,
            short_answer: sampleShortCount,
            long_answer: sampleEssayCount,
          },
          passcode: accessCode.trim().toUpperCase() || null,
        },
        questions,
        selectedClassIds.map((classId) => ({
          class_id: classId,
          start_at: now.toISOString(),
          end_at: end.toISOString(),
          access_code: accessCode.trim().toUpperCase() || null,
        }))
      );

      alert('Đã cập nhật bài thi và ngân hàng câu hỏi thành công!');
      router.push('/lecturer/quizzes');
    } catch (err: any) {
      alert(`Không cập nhật được đề thi: ${err?.message || err}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-800 glass-panel sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/lecturer/quizzes"
              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-white">Xem & Điều Chỉnh Đề Thi Trong Test Bank</h1>
              <p className="text-xs text-slate-400 mt-0.5">Xem lại ngân hàng câu hỏi, chỉnh sửa đáp án, cấu hình và danh sách lớp áp dụng</p>
            </div>
          </div>

          <button
            onClick={handleSaveQuiz}
            className="gradient-button px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Cập Nhật Đề Thi</span>
          </button>
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-5xl mx-auto px-6 py-10 flex-1 w-full space-y-10">
        {/* SECTION: MULTI-CLASS ASSIGNMENT SELECTION */}
        <div className="glass-card p-8 rounded-2xl border border-indigo-500/30 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Gán Bài Thi Này Cho Các Lớp Học Phần</h2>
                <p className="text-xs text-slate-400">Tự động xuất hiện cho tất cả sinh viên thuộc các lớp được chọn</p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSelectAllClasses}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-indigo-400 border border-slate-700 flex items-center space-x-2"
            >
              {selectedClassIds.length === availableClasses.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>{selectedClassIds.length === availableClasses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả các lớp'}</span>
            </button>
          </div>

          {/* Classes Grid Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableClasses.map((cls) => {
              const isChecked = selectedClassIds.includes(cls.id);
              return (
                <div
                  key={cls.id}
                  onClick={() => toggleClassSelection(cls.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                    isChecked
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                      {cls.code}
                    </span>
                    <h4 className="text-xs font-semibold text-white mt-1.5">{cls.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">{cls.semester}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-indigo-300 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Đã chọn <strong className="text-white">{selectedClassIds.length} / {availableClasses.length} lớp học phần</strong>. Đề thi từ Test Bank này sẽ áp dụng đồng thời cho tất cả các nhóm học phần trên!
            </span>
          </div>
        </div>

        {/* Section 1: Basic Quiz Settings */}
        <div className="glass-card p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FilePlus2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cấu Hình Bài Kiểm Tra & Quy Tắc Thi</h2>
              <p className="text-xs text-slate-400">Đặt thời gian, số câu rút ngẫu nhiên cho mỗi SV và bật công tắc bảo mật</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Tiêu Đề Bài Quiz
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Kiểm Tra Giữa Kỳ - Introduction to Logistics & SCM"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mô Tả / Hướng Dẫn Làm Bài
              </label>
              <textarea
                rows={2}
                placeholder="Ví dụ: Bài kiểm tra rút ngẫu nhiên 5 câu hỏi từ ngân hàng đề..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Thời Gian Làm Bài (Phút)</span>
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Mã Phòng Thi (Room Passcode) — được kiểm tra trên server, không lộ xuống client */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Mã Phòng Thi (Room Passcode)</span>
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Để trống nếu không yêu cầu mã phòng thi"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white uppercase font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Đọc mã này tại lớp để sinh viên không mở bài thi từ nhà. Mã được đối chiếu trên server.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Mã Phòng Thi Hết Hiệu Lực Lúc</span>
              </label>
              <input
                type="datetime-local"
                value={passcodeExpiresAt}
                onChange={(e) => setPasscodeExpiresAt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Sau thời điểm này, mã phòng thi không còn dùng được kể cả khi gõ đúng.
              </p>
            </div>

            {/* Random Question Sampling Setting */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <Dice5 className="w-3.5 h-3.5 text-purple-400" />
                <span>Số Câu Hỏi Rút Ngẫu Nhiên Cho Mỗi SV</span>
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, questions.length)}
                value={questionsPerStudent}
                onChange={(e) => setQuestionsPerStudent(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-bold text-purple-400"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                💡 Ngân hàng đề hiện có <strong className="text-white">{questions.length} câu</strong>. Mỗi SV khi làm bài sẽ rút ngẫu nhiên <strong className="text-purple-400">{questionsPerStudent} câu</strong>.
              </p>
            </div>
          </div>

          {/* ADVANCED ANTI-CHEAT SETTINGS GRID */}
          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldBan className="w-4 h-4" />
              <span>Quy Tắc Trộn Đề & Thi Tuyến Tính</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Toggle 0: Show Results */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Xem Điểm Sau Thi</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cho xem ngay
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input type="checkbox" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Toggle 1: Shuffle Questions */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                    <span>Trộn Câu Hỏi</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Đảo thứ tự câu
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Toggle 2: Shuffle Answer Options */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Trộn Đáp Án (A, B, C, D)</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Đảo vị trí các phương án
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Toggle 3: Prevent Previous Question */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    <ShieldBan className="w-3.5 h-3.5 text-red-400" />
                    <span>Khóa Quay Lại Câu Trước</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Không cho xem lại câu cũ
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={preventPrevious}
                    onChange={(e) => setPreventPrevious(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: FAST QUESTION BANK IMPORT METHODS (TABS) */}
        <div className="glass-card p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Ngân Hàng Câu Hỏi ({questions.length} câu)</span>
                <span className="text-xs font-normal text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                  Rút {questionsPerStudent} câu ngẫu nhiên/SV
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Phương thức nhập siêu tốc: Đặt dấu <code className="text-amber-400 font-bold">*</code> trước đáp án đúng</p>
            </div>

            {/* Tab Selectors */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'text' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Dán Văn Bản Siêu Tốc (*)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'excel' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import File Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'manual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Soạn Thủ Công</span>
              </button>
            </div>
          </div>

          {importStatus && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {/* TAB 1: ULTRA-FAST TEXT PASTE WITH ASTERISK (*) SYNTAX */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-start space-x-3 text-xs">
                <Star className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">Cú Pháp Nhập Nhanh Nhất: Đặt dấu <span className="text-amber-400">*</span> trước đáp án đúng</h4>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    Copy văn bản đề thi dán vào đây. Thêm dấu <code className="text-amber-400 font-bold bg-amber-500/10 px-1 rounded">*</code> trước phương án đúng.
                  </p>
                </div>
              </div>

              <textarea
                rows={8}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  💡 Hệ thống tự bóc tách dấu <code className="text-amber-400 font-bold">*</code> và thêm trực tiếp vào Ngân hàng đề!
                </span>
                <button
                  type="button"
                  onClick={handleParseText}
                  className="gradient-button px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 bg-purple-600 hover:bg-purple-500"
                >
                  <Wand2 className="w-4 h-4 text-amber-300" />
                  <span>Phân Tích & Thêm Vào Ngân Hàng Đề</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EXCEL BULK UPLOAD */}
          {activeTab === 'excel' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Import Ngân Hàng Câu Hỏi Từ File Excel</h3>
                  <p className="text-xs text-slate-400">Nạp hàng chục câu hỏi vào ngân hàng đề chỉ với 1 cú nhấp chuột</p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleQuestionTemplate}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-emerald-400 border border-slate-700 flex items-center space-x-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File Excel Câu Hỏi Mẫu</span>
                </button>
              </div>

              <label className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <FileSpreadsheet className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 mb-3 group-hover:scale-110 transition-all" />
                <span className="text-sm font-semibold text-slate-200">
                  Nhấp vào đây để chọn file Excel Ngân Hàng Câu Hỏi (.xlsx, .csv)
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* SECTION: THANG ĐIỂM & PHÂN BỔ ĐIỂM THI */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Thang Điểm & Phân Bổ Điểm Thi</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      Math.abs(examTotalPoints - 10) < 0.05
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {Math.abs(examTotalPoints - 10) < 0.05
                        ? `✓ Chuẩn đề thi 10.0 điểm (${questionsPerStudent} câu rút)`
                        : `Chưa tròn 10 điểm (Hiện tại: ${examTotalPoints}đ)`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Phân bổ điểm theo 3 phần: Trắc nghiệm (4đ) + Câu ngắn (3đ) + Tự luận (3đ) = 10.0 điểm
                  </p>
                </div>
              </div>

              {/* Quick Presets Buttons */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleApplyMidtermPreset}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
                  title="Áp dụng thang điểm Midterm: Trắc nghiệm 0.2đ, Câu ngắn 1.0đ, Tự luận 3.0đ"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mẫu Midterm (4đ - 3đ - 3đ)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDistributeEvenly}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-all"
                  title="Chia đều 10.0 điểm cho tất cả các câu hiện có"
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Chia Đều 10 Điểm</span>
                </button>
              </div>
            </div>

            {/* 3-Section Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Phần 1 */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Phần 1: Trắc Nghiệm
                  </span>
                  <span className="text-xs font-bold text-white bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                    {Math.round((sampleMcCount * batchMcPoints) * 10) / 10} điểm
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-400">
                  <span>Kho ngân hàng: <strong className="text-white">{mcQuestions.length} câu</strong></span>
                  <span>Đơn giá: <strong className="text-indigo-300">{batchMcPoints}đ/câu</strong></span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <label className="text-[11px] text-slate-400 shrink-0">Điểm mỗi câu:</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={batchMcPoints}
                      onChange={(e) => setBatchMcPoints(Number(e.target.value) || 0)}
                      className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-slate-500">đ</span>
                  </div>
                </div>
                {/* Rút Ngẫu Nhiên Phần 1 */}
                <div className="pt-1.5 flex items-center justify-between bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                  <div className="flex items-center space-x-1">
                    <Dice5 className="w-3.5 h-3.5 text-indigo-400" />
                    <label className="text-[11px] font-semibold text-indigo-200">Rút ngẫu nhiên:</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={0}
                      max={Math.max(1, mcQuestions.length)}
                      value={sampleMcCount}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setSampleMcCount(val);
                        setQuestionsPerStudent(val + sampleShortCount + sampleEssayCount);
                      }}
                      className="w-16 bg-slate-950 border border-indigo-500/50 font-bold rounded-lg px-2 py-1 text-xs text-indigo-300 text-right focus:outline-none focus:border-indigo-400"
                    />
                    <span className="text-[11px] text-indigo-300 font-medium">câu</span>
                  </div>
                </div>
              </div>

              {/* Phần 2 */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Phần 2: Câu Hỏi Ngắn
                  </span>
                  <span className="text-xs font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    {Math.round((sampleShortCount * batchShortPoints) * 10) / 10} điểm
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-400">
                  <span>Kho ngân hàng: <strong className="text-white">{shortQuestions.length} câu</strong></span>
                  <span>Đơn giá: <strong className="text-emerald-300">{batchShortPoints}đ/câu</strong></span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <label className="text-[11px] text-slate-400 shrink-0">Điểm mỗi câu:</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={batchShortPoints}
                      onChange={(e) => setBatchShortPoints(Number(e.target.value) || 0)}
                      className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[11px] text-slate-500">đ</span>
                  </div>
                </div>
                {/* Rút Ngẫu Nhiên Phần 2 */}
                <div className="pt-1.5 flex items-center justify-between bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center space-x-1">
                    <Dice5 className="w-3.5 h-3.5 text-emerald-400" />
                    <label className="text-[11px] font-semibold text-emerald-200">Rút ngẫu nhiên:</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={0}
                      max={Math.max(1, shortQuestions.length)}
                      value={sampleShortCount}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setSampleShortCount(val);
                        setQuestionsPerStudent(sampleMcCount + val + sampleEssayCount);
                      }}
                      className="w-16 bg-slate-950 border border-emerald-500/50 font-bold rounded-lg px-2 py-1 text-xs text-emerald-300 text-right focus:outline-none focus:border-emerald-400"
                    />
                    <span className="text-[11px] text-emerald-300 font-medium">câu</span>
                  </div>
                </div>
              </div>

              {/* Phần 3 */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Phần 3: Tự Luận Dài
                  </span>
                  <span className="text-xs font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                    {Math.round((sampleEssayCount * batchEssayPoints) * 10) / 10} điểm
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-400">
                  <span>Kho ngân hàng: <strong className="text-white">{longQuestions.length} câu</strong></span>
                  <span>Đơn giá: <strong className="text-amber-300">{batchEssayPoints}đ/câu</strong></span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <label className="text-[11px] text-slate-400 shrink-0">Điểm mỗi câu:</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={batchEssayPoints}
                      onChange={(e) => setBatchEssayPoints(Number(e.target.value) || 0)}
                      className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-slate-500">đ</span>
                  </div>
                </div>
                {/* Rút Ngẫu Nhiên Phần 3 */}
                <div className="pt-1.5 flex items-center justify-between bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <div className="flex items-center space-x-1">
                    <Dice5 className="w-3.5 h-3.5 text-amber-400" />
                    <label className="text-[11px] font-semibold text-amber-200">Rút ngẫu nhiên:</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={0}
                      max={Math.max(1, longQuestions.length)}
                      value={sampleEssayCount}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setSampleEssayCount(val);
                        setQuestionsPerStudent(sampleMcCount + sampleShortCount + val);
                      }}
                      className="w-16 bg-slate-950 border border-amber-500/50 font-bold rounded-lg px-2 py-1 text-xs text-amber-300 text-right focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[11px] text-amber-300 font-medium">câu</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick apply button row & summary bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              <div className="text-xs text-slate-400 space-y-1">
                <div>
                  Đề thi sinh viên nhận ({questionsPerStudent} câu rút):{' '}
                  <strong className={Math.abs(examTotalPoints - 10) < 0.05 ? 'text-emerald-400 font-bold text-sm' : 'text-amber-400 font-bold text-sm'}>
                    {examTotalPoints} / 10.0 điểm
                  </strong>
                  <span className="text-[11px] text-slate-500 ml-2">
                    ({sampleMcCount} TN &times; {batchMcPoints}đ + {sampleShortCount} Ngắn &times; {batchShortPoints}đ + {sampleEssayCount} Tự luận &times; {batchEssayPoints}đ)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Kho ngân hàng hiện có: <strong className="text-slate-300">{questions.length} câu</strong> (Trắc nghiệm: {mcQuestions.length}, Ngắn: {shortQuestions.length}, Tự luận: {longQuestions.length}) &bull; Tổng điểm tất cả câu trong kho: <strong className="text-slate-300">{totalPoints}đ</strong>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleApplyBatchPoints}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md hover:shadow-indigo-500/20 transition-all flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Áp Dụng Phân Bổ Cho Các Câu</span>
                </button>

                <button
                  type="button"
                  onClick={handleScaffoldMidtermTemplate}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center space-x-1.5"
                  title="Tạo khung mẫu đề thi Midterm đầy đủ: 20 trắc nghiệm (4đ) + 3 câu ngắn (3đ) + 1 tự luận (3đ)"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Khởi Tạo Khung Đề Midterm Chuẩn (10đ)</span>
                </button>
              </div>
            </div>
          </div>

          {/* QUESTION BANK LIST */}
          <div className="pt-6 border-t border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Danh Sách Câu Hỏi Hiện Có Trong Ngân Hàng Đề ({questions.length} câu)</h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => addQuestion('multiple_choice')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-400 border border-slate-700 flex items-center space-x-1"
                  title="Nhiều lựa chọn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Trắc nghiệm</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('true_false')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-400 border border-slate-700 flex items-center space-x-1"
                  title="Đúng/Sai"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Đúng/Sai</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('short_answer')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 flex items-center space-x-1"
                  title="Tự luận ngắn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Câu ngắn</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('long_answer')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 flex items-center space-x-1"
                  title="Tự luận dài"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Câu dài</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <div key={q.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      Câu {qIdx + 1} trong Ngân hàng đề ({
                        q.question_type === 'multiple_choice' ? 'Nhiều lựa chọn' : 
                        q.question_type === 'true_false' ? 'Đúng / Sai' :
                        q.question_type === 'short_answer' ? 'Tự luận ngắn' : 'Tự luận dài'
                      })
                    </span>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 font-medium">Thang điểm:</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={q.points ?? 1}
                          onChange={(e) => updateQuestionPoints(q.id, Number(e.target.value))}
                          className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-amber-400 font-bold text-right focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[11px] text-slate-400 font-bold">đ</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text input */}
                  <div>
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) => updateQuestionText(q.id, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Image Attachment for Question */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-400 border border-slate-700 flex items-center space-x-1.5 transition-colors">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{q.image_url ? 'Đổi hình ảnh' : 'Thêm Picture (Đính kèm ảnh)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              updateQuestionImage(q.id, String(evt.target?.result || ''));
                            };
                            reader.readAsDataURL(f);
                          }}
                        />
                      </label>
                      {q.image_url && (
                        <button
                          type="button"
                          onClick={() => updateQuestionImage(q.id, null)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                        >
                          Xoá ảnh
                        </button>
                      )}
                    </div>

                    {q.image_url && (
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 inline-block">
                        <img
                          src={q.image_url}
                          alt="Hình ảnh đính kèm"
                          className="max-h-48 max-w-full rounded-lg object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Question Options */}
                  <div className="space-y-2 pt-1">
                    {(q.question_type === 'short_answer' || q.question_type === 'long_answer') ? (
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400 text-center border-dashed">
                        Sinh viên sẽ nhập câu trả lời tự luận vào một ô văn bản (Giảng viên chấm điểm sau).
                      </div>
                    ) : (
                      q.options?.map((opt) => (
                      <div key={opt.id} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={opt.is_correct}
                          onChange={() => setCorrectOption(q.id, opt.id)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                        />
                        <input
                          type="text"
                          value={opt.option_text}
                          onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)}
                          className={`w-full bg-slate-900/80 border rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none ${
                            opt.is_correct ? 'border-emerald-500/50 bg-emerald-500/5 font-semibold' : 'border-slate-800'
                          }`}
                        />
                        {opt.is_correct && (
                          <span className="text-xs font-semibold text-emerald-400 shrink-0 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Đáp án Đúng (*)</span>
                          </span>
                        )}
                      </div>
                    )))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
