import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, File, X, AlertCircle, CheckCircle, Loader2, Edit3, Sparkles } from 'lucide-react';
import { uploadService } from '../services/uploadService';
import { aiService } from '../services/aiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import ProgressBar from '../components/common/ProgressBar';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const Upload = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [uploadedFileId, setUploadedFileId] = useState(null);
  
  // NEW: States for OCR preview & edit
  const [extractedText, setExtractedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  
  // States for AI analysis results
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [bankId, setBankId] = useState(null);
  
  const [error, setError] = useState('');

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];

    if (selectedFile.size > maxSize) {
      setError('File quá lớn. Vui lòng chọn file dưới 10MB.');
      return;
    }

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Định dạng file không được hỗ trợ. Vui lòng chọn PDF, Word, hoặc ảnh (JPG, PNG).');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  // STEP 1: Upload & OCR
  const handleUploadAndOCR = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      setProcessingStep('Đang tải file lên...');
      setUploadProgress(0);

      // Upload file
      const uploadResponse = await uploadService.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });

      setUploadedFileId(uploadResponse.id);
      setProcessingStep('Đang nhận dạng văn bản (OCR)...');
      setUploadProgress(100);

      // Process file (OCR)
      await new Promise(resolve => setTimeout(resolve, 1000));
      const processResponse = await uploadService.processFile(uploadResponse.id);
      
      setExtractedText(processResponse.extracted_text);
      setEditedText(processResponse.extracted_text); // Initialize edited text
      setProcessing(false);
      setShowTextPreview(true);
      
      toast.success('OCR hoàn tất! Vui lòng kiểm tra và chỉnh sửa nếu cần.');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Đã xảy ra lỗi khi xử lý file. Vui lòng thử lại.');
      setProcessing(false);
    }
  };

  // STEP 2: AI Analyze
  const handleAIAnalyze = async () => {
    if (!editedText.trim()) {
      toast.error('Văn bản không được để trống!');
      return;
    }

    try {
      setProcessing(true);
      setProcessingStep('AI đang phân tích câu hỏi...');
      setShowTextPreview(false);

      // Analyze with AI
      const aiResponse = await aiService.analyzeText(editedText);
      
      setExtractedQuestions(aiResponse.questions || []);
      setBankId(aiResponse.bank_id);
      setProcessing(false);
      setShowQuestionPreview(true);
      
      toast.success(`Đã trích xuất ${aiResponse.questions?.length || 0} câu hỏi và lưu vào ngân hàng đề!`);

    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err.response?.data?.detail || 'Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.');
      setProcessing(false);
      setShowTextPreview(true); 
    }
  };

  const handleSaveTextEdit = () => {
    setIsEditingText(false);
    toast.success('Đã lưu chỉnh sửa!');
  };

  const handleViewBank = () => {
    if (bankId) {
      navigate(`/question-banks/${bankId}`);  
    } else {
      toast.error('Không tìm thấy ngân hàng đề');
    }
  };

  const handleCreateExam = () => {
    if (bankId) {
      navigate(`/question-banks/${bankId}/create-exam`);  
    } else {
      toast.error('Không tìm thấy ngân hàng đề');
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadProgress(0);
    setProcessing(false);
    setProcessingStep('');
    setUploadedFileId(null);
    setExtractedText('');
    setEditedText('');
    setExtractedQuestions([]);
    setShowTextPreview(false);
    setShowQuestionPreview(false);
    setIsEditingText(false);
    setExamId(null);
    setBankId(null);
    setError('');
  };

  // Helper function to render question type badge
  const getQuestionTypeBadge = (type) => {
    const types = {
      multiple_choice: { label: 'Trắc nghiệm 1 đáp án', color: 'blue' },
      multiple_answer: { label: 'Trắc nghiệm nhiều đáp án', color: 'purple' },
      true_false: { label: 'Đúng/Sai', color: 'green' },
      short_answer: { label: 'Tự luận', color: 'orange' },
      essay: { label: 'Tự luận dài', color: 'red' },
      fill_blank: { label: 'Điền từ', color: 'pink' },
      ordering: { label: 'Sắp xếp', color: 'indigo' }
    };
    
    const config = types[type] || { label: type, color: 'gray' };
    
    return (
      <span className={`text-xs bg-${config.color}-100 text-${config.color}-800 px-2 py-1 rounded`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload file đề</h1>
      </div>

      {error && (
        <Alert type="error" className="mb-6" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Upload Area */}
      {!file && !processing && (
        <Card className="mb-6">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UploadIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Kéo thả file vào đây
              </h3>
              <p className="text-sm text-gray-500 mt-4">
                Hỗ trợ: PDF, Word, Ảnh (JPG, PNG) • Tối đa 10MB
              </p>
            </label>
          </div>
        </Card>
      )}

      {/* Selected File */}
      {file && !processing && !showTextPreview && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">File đã chọn</h3>
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <File className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button onClick={handleUploadAndOCR} className="flex-1" size="lg">
              Bắt đầu OCR
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Hủy
            </Button>
          </div>
        </Card>
      )}

      {/* Processing */}
      {processing && (
        <Card className="mb-6">
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {processingStep}
            </h3>
            <p className="text-gray-600 mb-6">
              Vui lòng đợi, quá trình này có thể mất 30-60 giây...
            </p>
            {uploadProgress > 0 && <ProgressBar value={uploadProgress} size="lg" />}
          </div>
        </Card>
      )}

      {/* TEXT PREVIEW & EDIT Modal */}
      <Modal
        isOpen={showTextPreview}
        onClose={() => setShowTextPreview(false)}
        title="📄 Văn bản đã trích xuất (OCR)"
        size="xl"
        footer={
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleReset}>
              Tải file khác
            </Button>
            <div className="flex space-x-3">
              {isEditingText ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setEditedText(extractedText);
                    setIsEditingText(false);
                  }}>
                    Hủy chỉnh sửa
                  </Button>
                  <Button onClick={handleSaveTextEdit}>
                    Lưu chỉnh sửa
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingText(true)}
                    icon={Edit3}
                  >
                    Chỉnh sửa
                  </Button>
                  <Button 
                    onClick={handleAIAnalyze}
                    icon={Sparkles}
                  >
                    AI Phân tích →
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert type="info">
            <strong>Kiểm tra kỹ văn bản!</strong> Nếu OCR có lỗi, bạn có thể chỉnh sửa trước khi AI phân tích.
          </Alert>

          {isEditingText ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Chỉnh sửa văn bản tại đây..."
            />
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                {editedText}
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-500">
            Độ dài: {editedText.length} ký tự
          </div>
        </div>
      </Modal>

      {/* QUESTION PREVIEW Modal */}
      <Modal
        isOpen={showQuestionPreview}
        onClose={() => setShowQuestionPreview(false)}
        title="Kết quả phân tích AI"
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleReset}>
              Nhập đề mới
            </Button>
            <Button onClick={() => navigate(`/question-banks/${bankId}`)}>
                Xem ngân hàng đề →
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">
                  Phân tích thành công!
                </h4>
                <p className="text-sm text-green-800">
                  Đã trích xuất <strong>{extractedQuestions.length} câu hỏi</strong> và tự động lưu vào ngân hàng đề.
                </p>
              </div>
            </div>
          </div>

          {/* Questions Preview */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Danh sách câu hỏi:
            </h4>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {extractedQuestions.map((q, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-900 flex-1">
                      <span className="text-blue-600">Câu {index + 1}:</span> {q.question_text}
                    </p>
                    {getQuestionTypeBadge(q.question_type)}
                  </div>

                  {/* Render options based on question type */}
                  {q.options && (
                    <div className="space-y-1 text-sm text-gray-600 mt-3">
                      {Object.entries(q.options).map(([key, value]) => {
                        const isCorrect = Array.isArray(q.correct_answer) 
                          ? q.correct_answer.includes(key) 
                          : q.correct_answer === key;
                        
                        return (
                          <p key={key} className={isCorrect ? 'font-semibold text-green-700' : ''}>
                            {key}) {value}
                            {isCorrect && (
                              <CheckCircle className="inline h-4 w-4 text-green-600 ml-2" />
                            )}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {/* For short answer / fill blank / ordering */}
                  {!q.options && q.question_type !== 'ordering' && (
                    <div className="mt-3 p-3 bg-green-50 rounded text-sm">
                      <strong className="text-green-900">Đáp án:</strong>
                      <p className="text-gray-700 mt-1">
                        {Array.isArray(q.correct_answer) 
                          ? q.correct_answer.join(', ') 
                          : q.correct_answer}
                      </p>
                    </div>
                  )}

                  {/* For ordering - show as sequence */}
                  {q.question_type === 'ordering' && (
                    <div className="mt-3 p-3 bg-purple-50 rounded text-sm">
                        <strong className="text-purple-900">Thứ tự đúng:</strong>
                        <p className="text-gray-700 mt-1">
                        {Array.isArray(q.correct_answer) 
                            ? q.correct_answer.join(' → ') 
                            : q.correct_answer}
                        </p>
                    </div>
                    )}
                  {/* Explanation */}
                  {q.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                      <strong className="text-blue-900">Giải thích:</strong>
                      <p className="text-gray-700 mt-1">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Upload;