import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, File, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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
  const [extractedText, setExtractedText] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
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
    // Validate file
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

  const handleUpload = async () => {
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
      setProcessingStep('AI đang phân tích câu hỏi...');

      // Analyze with AI
      await new Promise(resolve => setTimeout(resolve, 1000));
      const aiResponse = await aiService.analyzeText(processResponse.extracted_text);
      
      setExtractedQuestions(aiResponse.questions || []);
      setProcessing(false);
      setShowPreview(true);
      toast.success(`Đã trích xuất ${aiResponse.questions?.length || 0} câu hỏi!`);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Đã xảy ra lỗi khi xử lý file. Vui lòng thử lại.');
      setProcessing(false);
    }
  };

  const handleSaveToBank = () => {
    if (!extractedQuestions.length) return;
    
    // Navigate to create question bank with extracted questions
    navigate('/question-banks/create', {
      state: { questions: extractedQuestions }
    });
  };

  const handleReset = () => {
    setFile(null);
    setUploadProgress(0);
    setProcessing(false);
    setProcessingStep('');
    setUploadedFileId(null);
    setExtractedText('');
    setExtractedQuestions([]);
    setShowPreview(false);
    setError('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📤 Nhập Đề Thi</h1>
        <p className="text-gray-600 mt-2">
          Tải lên file đề thi của bạn để tự động trích xuất câu hỏi bằng AI
        </p>
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
              <p className="text-gray-600 mb-4">hoặc</p>
              <Button type="button">
                Chọn file từ máy
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Hỗ trợ: PDF, Word, Ảnh (JPG, PNG) • Tối đa 10MB
              </p>
            </label>
          </div>

        </Card>
      )}

      {/* Selected File */}
      {file && !processing && (
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
            <Button onClick={handleUpload} className="flex-1" size="lg">
              Bắt đầu xử lý
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
            <ProgressBar value={uploadProgress} size="lg" />
          </div>
        </Card>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Kết quả trích xuất"
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleReset}>
              Tải file khác
            </Button>
            <Button onClick={handleSaveToBank}>
              Lưu vào ngân hàng →
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
                  Xử lý thành công!
                </h4>
                <p className="text-sm text-green-800">
                  Đã trích xuất <strong>{extractedQuestions.length} câu hỏi</strong> từ file của bạn.
                </p>
              </div>
            </div>
          </div>

          {/* Questions Preview */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Xem trước câu hỏi:
            </h4>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {extractedQuestions.slice(0, 5).map((q, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-900">
                      Câu {index + 1}: {q.question_text}
                    </p>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {q.question_type}
                    </span>
                  </div>
                  {q.options && (
                    <div className="space-y-1 text-sm text-gray-600">
                      {Object.entries(q.options).map(([key, value]) => (
                        <p key={key}>
                          {key}) {value}
                          {q.correct_answer === key && (
                            <CheckCircle className="inline h-4 w-4 text-green-600 ml-2" />
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {extractedQuestions.length > 5 && (
                <p className="text-center text-sm text-gray-500">
                  ... và {extractedQuestions.length - 5} câu hỏi khác
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Upload;