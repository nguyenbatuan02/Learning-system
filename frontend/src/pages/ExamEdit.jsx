import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { examService } from '../services/examService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const ExamEdit = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingMarks, setPassingMarks] = useState(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResultsImmediately, setShowResultsImmediately] = useState(true);
  const [allowReview, setAllowReview] = useState(true);

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const data = await examService.getById(examId);
      setExam(data);
      
      // Populate form
      setTitle(data.title || '');
      setDescription(data.description || '');
      setDurationMinutes(data.duration_minutes || 60);
      setPassingMarks(data.passing_marks || 0);
      setShuffleQuestions(data.shuffle_questions || false);
      setShuffleOptions(data.shuffle_options || false);
      setShowResultsImmediately(data.show_results_immediately !== false);
      setAllowReview(data.allow_review !== false);
    } catch (error) {
      console.error('Failed to load exam:', error);
      toast.error('Không thể tải thông tin đề thi');
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên đề thi');
      return;
    }

    if (durationMinutes < 1) {
      toast.error('Thời gian phải lớn hơn 0');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        title: title.trim(),
        description: description.trim(),
        duration_minutes: parseInt(durationMinutes),
        passing_marks: parseInt(passingMarks),
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        show_results_immediately: showResultsImmediately,
        allow_review: allowReview
      };

      await examService.update(examId, updateData);

      toast.success('Đã lưu thay đổi');
      navigate(`/exams/${examId}`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.detail || 'Không thể lưu thay đổi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        to={`/exams/${examId}`}
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại
      </Link>

      <h1 className="text-3xl font-bold mb-8">✏️ Chỉnh sửa đề thi</h1>

      <form onSubmit={handleSave}>
        {/* Basic Info */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Thông tin cơ bản</h2>

          <div className="space-y-4">
            <Input
              label="Tên đề thi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Kiểm tra giữa kỳ môn Toán"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả về đề thi..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Configuration */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Cấu hình</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Thời gian (phút)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              min={1}
              required
            />

            <Input
              label="Điểm đạt (tối thiểu)"
              type="number"
              value={passingMarks}
              onChange={(e) => setPassingMarks(e.target.value)}
              min={0}
              max={exam?.total_marks || 100}
              helperText={`Tổng điểm: ${exam?.total_marks || 0}`}
            />
          </div>
        </Card>

        {/* Settings */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Tùy chọn</h2>

          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-gray-900">Xáo trộn câu hỏi</p>
                <p className="text-sm text-gray-600">
                  Thứ tự câu hỏi sẽ khác nhau mỗi lần thi
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-gray-900">Xáo trộn đáp án</p>
                <p className="text-sm text-gray-600">
                  Thứ tự A, B, C, D sẽ thay đổi mỗi lần thi
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showResultsImmediately}
                onChange={(e) => setShowResultsImmediately(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-gray-900">Hiện kết quả ngay</p>
                <p className="text-sm text-gray-600">
                  Học sinh xem điểm ngay sau khi nộp bài
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReview}
                onChange={(e) => setAllowReview(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-gray-900">Cho phép xem lại</p>
                <p className="text-sm text-gray-600">
                  Học sinh có thể xem lại bài làm và đáp án
                </p>
              </div>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            icon={X}
            onClick={() => navigate(`/exams/${examId}`)}
            className="flex-1"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            icon={Save}
            loading={saving}
            className="flex-1"
          >
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ExamEdit;