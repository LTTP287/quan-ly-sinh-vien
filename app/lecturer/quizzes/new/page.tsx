'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { 
  ArrowLeft, FilePlus2, Plus, Trash2, CheckCircle2, 
  HelpCircle, Lock, Eye, EyeOff, Sparkles, Clock, Calendar, 
  Shuffle, ArrowRightLeft, ShieldBan, Dice5, FileSpreadsheet, 
  FileText, Upload, Download, CopyCheck, Wand2, Star, BookOpen, CheckSquare, Square 
} from 'lucide-react';
import { Question, QuestionOption, Quiz, ClassModule } from '@/types/database';
import { getStoredClasses, saveStoredQuiz } from '@/lib/classStore';

export default function NewQuizPage() {
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

  // Load Classes for Assignment
  useEffect(() => {
    const loadedClasses = getStoredClasses();
    setAvailableClasses(loadedClasses);
    // Select all classes by default for fast multi-class assignment
    setSelectedClassIds(loadedClasses.map((c) => c.id));
  }, []);

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

  // Question Bank State
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-1',
      quiz_id: 'new',
      question_text: 'Yếu tố nào sau đây là mục tiêu 7Rs cốt lõi trong hoạt động Logistics?',
      question_type: 'multiple_choice',
      points: 1.0,
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
      points: 1.0,
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

          newParsedQuestions.push({
            id: qId,
            quiz_id: 'new',
            question_text: String(qText).trim(),
            question_type: options.length > 2 ? 'multiple_choice' : 'true_false',
            points: 1.0,
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

          const hasAsterisk = line.startsWith('*') || line.includes('*');
          let cleanLine = line.replace(/\*/g, '').trim();
          cleanLine = cleanLine.replace(/^[A-D][\.:\s]\s*/i, '').trim();

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
            points: 1.0,
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

  // Question Authoring Helpers
  const addQuestion = (type: 'multiple_choice' | 'true_false') => {
    const newQId = `q-${Date.now()}`;
    let defaultOptions: QuestionOption[] = [];

    if (type === 'multiple_choice') {
      defaultOptions = [
        { id: `opt-${Date.now()}-1`, question_id: newQId, option_text: 'Lựa chọn A', is_correct: true, order_index: 0 },
        { id: `opt-${Date.now()}-2`, question_id: newQId, option_text: 'Lựa chọn B', is_correct: false, order_index: 1 },
        { id: `opt-${Date.now()}-3`, question_id: newQId, option_text: 'Lựa chọn C', is_correct: false, order_index: 2 },
        { id: `opt-${Date.now()}-4`, question_id: newQId, option_text: 'Lựa chọn D', is_correct: false, order_index: 3 },
      ];
    } else {
      defaultOptions = [
        { id: `opt-tf-1`, question_id: newQId, option_text: 'Đúng', is_correct: true, order_index: 0 },
        { id: `opt-tf-2`, question_id: newQId, option_text: 'Sai', is_correct: false, order_index: 1 },
      ];
    }

    const newQ: Question = {
      id: newQId,
      quiz_id: 'new',
      question_text: `Câu hỏi mới số ${questions.length + 1}...`,
      question_type: type,
      points: 1.0,
      order_index: questions.length,
      options: defaultOptions,
    };

    setQuestions([...questions, newQ]);
  };

  const updateQuestionText = (qId: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, question_text: text } : q)));
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

  const handleSaveQuiz = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập Tiêu đề Bài Quiz');
      return;
    }

    if (selectedClassIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 Lớp học phần để gán bài thi này.');
      return;
    }

    const createdQuiz: Quiz = {
      id: `quiz-tb-${Date.now()}`,
      assigned_class_ids: selectedClassIds,
      title: title.trim(),
      description: description.trim(),
      time_limit_minutes: timeLimit,
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      is_published: true,
      show_results: showResults,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      prevent_previous: preventPrevious,
      questions_per_student: questionsPerStudent,
      created_at: new Date().toISOString(),
      questions_count: questions.length,
      assigned_classes_count: selectedClassIds.length,
    };

    saveStoredQuiz(createdQuiz);
    alert(`Đã lưu Đề thi vào Test Bank và Gán thành công cho ${selectedClassIds.length} lớp học phần!`);
    router.push('/lecturer/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-800 glass-panel sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/lecturer/dashboard"
              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-white">Khởi Tạo Đề Thi Trong Test Bank Dùng Chung</h1>
              <p className="text-xs text-slate-400 mt-0.5">Tạo 1 đề thi duy nhất & Gán hàng loạt cho nhiều Lớp cùng học phần</p>
            </div>
          </div>

          <button
            onClick={handleSaveQuiz}
            className="gradient-button px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Lưu & Gán Cho Các Lớp</span>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Toggle 1: Shuffle Questions */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                    <span>Trộn Thứ Tự Câu Hỏi</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Xáo trộn thứ tự câu hỏi
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

          {/* QUESTION BANK LIST */}
          <div className="pt-6 border-t border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Danh Sách Câu Hỏi Hiện Có Trong Ngân Hàng Đề ({questions.length} câu)</h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => addQuestion('multiple_choice')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-400 border border-slate-700 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm 1 câu thủ công</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <div key={q.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      Câu {qIdx + 1} trong Ngân hàng đề ({q.question_type === 'multiple_choice' ? 'Nhiều lựa chọn' : 'Đúng / Sai'})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

                  {/* Question Options */}
                  <div className="space-y-2 pt-1">
                    {q.options?.map((opt) => (
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
                    ))}
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
