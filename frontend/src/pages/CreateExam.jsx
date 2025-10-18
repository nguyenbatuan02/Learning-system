import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Target,
  Clock,
  BookOpen,
  Shuffle,
  Eye,
  EyeOff,
  RotateCcw,
  Save
} from 'lucide-react';
import { questionBankService } from '../services/questionBankService';
import { examService } from '../services/examService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Loading from '../components/common/Loading';
import Badge from '../components/common/Badge';
import Alert from '../components/common/Alert';
import toast from 'react-hot-toast';

const CreateExam = () => {
  const { bankId } = useParams();
  const navigate = useNavigate();

  const [bank, setBank] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [examTitle, setExamTitle] = useState('');
  const [numQuestions, setNumQuestions] = useState(20);
  const [duration, setDuration] = useState(30);
  const [selectionMode, setSelectionMode] = useState('random'); // random or manual
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  
  // Filters
  const [filterTypes, setFilterTypes] = useState({
    multiple_choice: true,
    true_false: true,
    short_answer: true,
    essay: true,
  });
  const [filterDifficulties, setFilterDifficulties] = useState({
    easy: true,
    medium: true,
    hard: true,
  });

  // Settings
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  const [allowRetake, setAllowRetake] = useState(true);
  const [passPercentage, setPassPercentage] = useState(70);

  useEffect(() => {
    loadBankData();
  }, [bankId]);

  const loadBankData = async () => {
    try {
      setLoading(true);
      const [bankData, questionsData] = await Promise.all([
        questionBankService.getById(bankId),
        questionBankService.getQuestions(bankId)
      ]);
      
      setBank(bankData);
      setAllQuestions(questionsData);
      setExamTitle(`${bankData.name} - Kiểm tra`);
      setNumQuestions(Math.min(20, questionsData.length));
    } catch (error) {
      console.error('Failed to load bank:', error);
      toast.error('Không thể tải thông tin ngân hàng đề');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredQuestions = () => {
    return allQuestions.filter(q => {
      const typeMatch = filterTypes[q.question_type];
      const difficultyMatch = !q.difficulty || filterDifficulties[q.difficulty];
      return typeMatch && difficultyMatch;
    });
  };

  const handleCreateExam = async () => {
    // Validation
    if (!examTitle.trim()) {
      toast.error('Vui lòng nhập tên đề thi');
      return;
    }

    const filteredQuestions = getFilteredQuestions();
    
    if (selectionMode === 'random') {
      if (numQuestions > filteredQuestions.length) {
        toast.error(`Chỉ có ${filteredQuestions.length} câu hỏi phù hợp. Vui lòng giảm số lượng câu hoặc thay đổi bộ lọc.`);
        return;
      }
    } else {
      if (selectedQuestionIds.length === 0) {
        toast.error('Vui lòng chọn ít nhất 1 câu hỏi');
        return;
      }
    }

    try {
      setCreating(true);

      let selectedQuestions;
      if (selectionMode === 'random') {
        // Random selection
        const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
        selectedQuestions = shuffled.slice(0, numQuestions);
      } else {
        // Manual selection
        selectedQuestions = allQuestions.filter(q => selectedQuestionIds.includes(q.id));
      }

      // Create exam
      const examData = {
        title: examTitle,
        description: `Đề thi được tạo từ ngân hàng: ${bank.name}`,
        duration: duration,
        total_marks: selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0),
        shuffle_questions: shuffleQuestions,
        show_answers_after_submit: showAnswers,
        allow_retake: allowRetake,
        pass_percentage: passPercentage,
      };

      const examResponse = await examService.create(examData);
      const examId = examResponse.id;

      // Add questions to exam
      for (let i = 0; i < selectedQuestions.length; i++) {
        const q = selectedQuestions[i];
        await examService.addQuestion(examId, {
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          marks: q.marks || 1,
          order_number: i + 1,
        });
      }

      toast.success('Đã tạo đề thi thành công!');
      navigate(`/exam/${examId}`);

    } catch (error) {
      console.error('Create exam error:', error);
      toast.error('Không thể tạo đề thi. Vui lòng thử lại.');
    } finally {
      setCreating(false);
    }
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestionIds(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const selectAllQuestions = () => {
    const filtered = getFilteredQuestions();
    setSelectedQuestionIds(filtered.map(q => q.id));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestionIds([]);
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải..." />;
  }

  const filteredQuestions = getFilteredQuestions();
  const questionsByType = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.question_type]) acc[q.question_type] = 0;
    acc[q.question_type]++;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        to={`/question-banks/${bankId}`}
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Về ngân hàng đề
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎯 Tạo Đề Thi
        </h1>
        <p className="text-gray-600">
          Từ ngân hàng: <strong>{bank?.name}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Thông tin đề thi
            </h2>
            <div className="space-y-4">
              <Input
                label="Tên đề thi"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Nhập tên đề thi..."
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Số câu hỏi"
                  type="number"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max={filteredQuestions.length}
                  disabled={selectionMode === 'manual'}
                  helperText={`Tối đa: ${filteredQuestions.length} câu`}
                  leftIcon={BookOpen}
                />
                
                <Input
                  label="Thời gian (phút)"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  leftIcon={Clock}
                />
              </div>
            </div>
          </Card>

          {/* Selection Mode */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Chọn câu hỏi
            </h2>
            
            <div className="flex space-x-4 mb-6">
              <label className="flex-1">
                <input
                  type="radio"
                  name="selectionMode"
                  value="random"
                  checked={selectionMode === 'random'}
                  onChange={(e) => setSelectionMode(e.target.value)}
                  className="mr-2"
                />
                <span className="font-medium">Ngẫu nhiên từ ngân hàng</span>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="selectionMode"
                  value="manual"
                  checked={selectionMode === 'manual'}
                  onChange={(e) => setSelectionMode(e.target.value)}
                  className="mr-2"
                />
                <span className="font-medium">Tự chọn câu</span>
              </label>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lọc theo loại câu:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'multiple_choice', label: 'Trắc nghiệm' },
                    { key: 'true_false', label: 'Đúng/Sai' },
                    { key: 'short_answer', label: 'Trả lời ngắn' },
                    { key: 'essay', label: 'Tự luận' },
                  ].map(type => (
                    <label key={type.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterTypes[type.key]}
                        onChange={(e) => setFilterTypes({
                          ...filterTypes,
                          [type.key]: e.target.checked
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {type.label} ({allQuestions.filter(q => q.question_type === type.key).length})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lọc theo độ khó:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'easy', label: 'Dễ' },
                    { key: 'medium', label: 'Trung bình' },
                    { key: 'hard', label: 'Khó' },
                  ].map(diff => (
                    <label key={diff.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterDifficulties[diff.key]}
                        onChange={(e) => setFilterDifficulties({
                          ...filterDifficulties,
                          [diff.key]: e.target.checked
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">{diff.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Manual Selection */}
            {selectionMode === 'manual' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    Đã chọn: <strong>{selectedQuestionIds.length}</strong> câu
                  </p>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllQuestions}
                    >
                      Chọn tất cả
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAllQuestions}
                    >
                      Bỏ chọn
                    </Button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                  {filteredQuestions.map((q, index) => (
                    <label
                      key={q.id}
                      className="flex items-start p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(q.id)}
                        onChange={() => toggleQuestionSelection(q.id)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            Câu {index + 1}
                          </span>
                          <Badge variant="primary" size="sm">
                            {q.question_type}
                          </Badge>
                          {q.difficulty && (
                            <Badge size="sm">
                              {q.difficulty}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {q.question_text}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Settings */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Cài đặt
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Shuffle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Xáo trộn câu hỏi</p>
                    <p className="text-sm text-gray-500">Thứ tự câu hỏi sẽ ngẫu nhiên</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Eye className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Hiển thị đáp án sau khi nộp</p>
                    <p className="text-sm text-gray-500">Học sinh có thể xem đáp án đúng</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <RotateCcw className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Cho phép làm lại</p>
                    <p className="text-sm text-gray-500">Học sinh có thể làm bài nhiều lần</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowRetake}
                  onChange={(e) => setAllowRetake(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <div className="p-3 border border-gray-200 rounded-lg">
                <label className="block mb-2">
                  <span className="font-medium text-gray-900">Điểm đạt (%)</span>
                  <p className="text-sm text-gray-500">Điểm tối thiểu để đạt</p>
                </label>
                <Input
                  type="number"
                  value={passPercentage}
                  onChange={(e) => setPassPercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card className="sticky top-4">
            <h3 className="font-bold text-gray-900 mb-4">Tóm tắt</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tổng câu hỏi:</span>
                <span className="font-medium text-gray-900">
                  {selectionMode === 'random' ? numQuestions : selectedQuestionIds.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Thời gian:</span>
                <span className="font-medium text-gray-900">{duration} phút</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Điểm đạt:</span>
                <span className="font-medium text-gray-900">{passPercentage}%</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Phân bố câu hỏi:</p>
              <div className="space-y-2">
                {Object.entries(questionsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {type === 'multiple_choice' ? 'Trắc nghiệm' :
                       type === 'true_false' ? 'Đúng/Sai' :
                       type === 'short_answer' ? 'Trả lời ngắn' : 'Tự luận'}:
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              icon={Target}
              onClick={handleCreateExam}
              loading={creating}
              disabled={
                selectionMode === 'random'
                  ? numQuestions > filteredQuestions.length
                  : selectedQuestionIds.length === 0
              }
            >
              Tạo đề thi
            </Button>
          </Card>

          {/* Warning */}
          {selectionMode === 'random' && numQuestions > filteredQuestions.length && (
            <Alert type="warning">
              Không đủ câu hỏi! Hiện có {filteredQuestions.length} câu phù hợp, 
              vui lòng giảm số lượng hoặc thay đổi bộ lọc.
            </Alert>
          )}

          {selectionMode === 'manual' && selectedQuestionIds.length === 0 && (
            <Alert type="info">
              Vui lòng chọn ít nhất 1 câu hỏi để tạo đề thi.
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateExam;