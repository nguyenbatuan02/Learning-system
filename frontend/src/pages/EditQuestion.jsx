import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { questionBankService } from '../services/questionBankService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const EditQuestion = () => {
  const { bankId, questionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: { A: '', B: '', C: '', D: '' },
    correct_answer: '',
    explanation: '',
    difficulty: 'medium',
    marks: 1,
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadQuestion();
  }, [questionId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const questions = await questionBankService.getQuestions(bankId);
      const question = questions.find(q => q.id === questionId);
      
      if (question) {
        // Convert array correct_answer to string for form
        let correctAnswerDisplay = question.correct_answer;
        if (Array.isArray(question.correct_answer)) {
          correctAnswerDisplay = question.correct_answer.join(',');
        }

        setFormData({
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.options || { A: '', B: '', C: '', D: '' },
          correct_answer: correctAnswerDisplay,
          explanation: question.explanation || '',
          difficulty: question.difficulty || 'medium',
          marks: question.marks,
          tags: question.tags || []
        });
      } else {
        toast.error('Không tìm thấy câu hỏi');
        navigate(`/question-banks/${bankId}`);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Không thể tải câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.question_text.trim()) {
      toast.error('Vui lòng nhập câu hỏi');
      return;
    }

    // Validate options for multiple choice/answer
    if (['multiple_choice', 'multiple_answer'].includes(formData.question_type)) {
      const hasEmptyOption = Object.values(formData.options).some(opt => !opt.trim());
      if (hasEmptyOption) {
        toast.error('Vui lòng điền đầy đủ các đáp án');
        return;
      }
    }

    if (!formData.correct_answer) {
      toast.error('Vui lòng chọn/nhập đáp án đúng');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare data based on question type
      const submitData = { ...formData };
      
      // Remove options if not multiple choice/answer
      if (!['multiple_choice', 'multiple_answer'].includes(formData.question_type)) {
        delete submitData.options;
      }

      await questionBankService.updateQuestion(bankId, questionId, submitData);
      toast.success('Cập nhật câu hỏi thành công!');
      navigate(`/question-banks/${bankId}`);
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.detail || 'Không thể cập nhật câu hỏi');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionTypeChange = (type) => {
    const newFormData = {
      ...formData,
      question_type: type,
      correct_answer: ''
    };

    // Reset options based on type
    if (type === 'multiple_choice' || type === 'multiple_answer') {
      newFormData.options = formData.options || { A: '', B: '', C: '', D: '' };
    } else if (type === 'true_false') {
      newFormData.options = { A: 'Đúng', B: 'Sai' };
    } else {
      newFormData.options = null;
    }

    setFormData(newFormData);
  };

  const addOption = () => {
    const keys = Object.keys(formData.options);
    const nextKey = String.fromCharCode(65 + keys.length); // A=65, B=66, etc.
    if (keys.length < 10) { // Limit to 10 options (A-J)
      setFormData({
        ...formData,
        options: { ...formData.options, [nextKey]: '' }
      });
    }
  };

  const removeOption = (key) => {
    const newOptions = { ...formData.options };
    delete newOptions[key];
    
    // Re-index options (A, B, C, ...)
    const values = Object.values(newOptions);
    const reIndexed = {};
    values.forEach((val, idx) => {
      reIndexed[String.fromCharCode(65 + idx)] = val;
    });

    setFormData({
      ...formData,
      options: reIndexed,
      correct_answer: '' // Reset correct answer when options change
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(`/question-banks/${bankId}`)}
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại ngân hàng đề
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Chỉnh sửa câu hỏi</h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <div className="space-y-6">
            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại câu hỏi <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.question_type}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
                options={[
                  { value: 'multiple_choice', label: 'Trắc nghiệm 1 đáp án' },
                  { value: 'multiple_answer', label: 'Trắc nghiệm nhiều đáp án' },
                  { value: 'true_false', label: 'Đúng/Sai' },
                  { value: 'short_answer', label: 'Trả lời ngắn' },
                  { value: 'essay', label: 'Tự luận' },
                  { value: 'fill_blank', label: 'Điền từ' },
                  { value: 'ordering', label: 'Sắp xếp' },
                ]}
              />
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Câu hỏi <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập nội dung câu hỏi..."
                required
              />
            </div>

            {/* Options for multiple choice/answer */}
            {(formData.question_type === 'multiple_choice' || formData.question_type === 'multiple_answer') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Các đáp án <span className="text-red-500">*</span>
                  </label>
                  {formData.question_type === 'multiple_choice' && Object.keys(formData.options).length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Plus}
                      onClick={addOption}
                    >
                      Thêm đáp án
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {Object.entries(formData.options).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-8">{key})</span>
                      <Input
                        value={value}
                        onChange={(e) => setFormData({
                          ...formData,
                          options: { ...formData.options, [key]: e.target.value }
                        })}
                        placeholder={`Đáp án ${key}`}
                        className="flex-1"
                        required
                      />
                      {Object.keys(formData.options).length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(key)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options for True/False */}
            {formData.question_type === 'true_false' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Các đáp án
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <span className="w-8">A)</span>
                    <span>Đúng</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <span className="w-8">B)</span>
                    <span>Sai</span>
                  </div>
                </div>
              </div>
            )}

            {/* Correct Answer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đáp án đúng <span className="text-red-500">*</span>
              </label>
              
              {/* For multiple choice & true/false - select from options */}
              {formData.question_type === 'multiple_choice' || formData.question_type === 'true_false' ? (
                <Select
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  options={[
                    { value: '', label: '-- Chọn đáp án đúng --' },
                    ...Object.entries(formData.options).map(([key, value]) => ({
                      value: key,
                      label: `${key}) ${value}`
                    }))
                  ]}
                  required
                />
              ) : formData.question_type === 'multiple_answer' ? (
                <div>
                  <Input
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    placeholder="Ví dụ: A,C,D (các đáp án đúng cách nhau bởi dấu phẩy)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nhập các đáp án đúng cách nhau bởi dấu phẩy. VD: A,C,D
                  </p>
                </div>
              ) : formData.question_type === 'ordering' ? (
                <div>
                  <Input
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    placeholder="Ví dụ: Bước 1, Bước 2, Bước 3 (các bước cách nhau bởi dấu phẩy)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nhập thứ tự đúng của các bước, cách nhau bởi dấu phẩy
                  </p>
                </div>
              ) : (
                <textarea
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập đáp án đúng..."
                  required
                />
              )}
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giải thích (không bắt buộc)
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Giải thích đáp án đúng..."
              />
            </div>

            {/* Difficulty & Marks */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Độ khó
                </label>
                <Select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  options={[
                    { value: 'easy', label: 'Dễ' },
                    { value: 'medium', label: 'Trung bình' },
                    { value: 'hard', label: 'Khó' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Điểm số
                </label>
                <Input
                  type="number"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={100}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/question-banks/${bankId}`)}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            icon={Save}
            loading={saving}
          >
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditQuestion;