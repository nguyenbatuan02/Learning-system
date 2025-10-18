import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FileText, 
  BarChart3, 
  Settings, 
  HelpCircle,
  FileQuestion,
  AlertCircle
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Tổng quan',
      items: [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/analytics', icon: BarChart3, label: 'Phân tích' },
      ],
    },
    {
      title: 'Quản lý',
      items: [
        { to: '/admin/users', icon: Users, label: 'Người dùng' },
        { to: '/admin/exams', icon: FileText, label: 'Đề thi' },
        { to: '/admin/question-banks', icon: BookOpen, label: 'Ngân hàng câu hỏi' },
        { to: '/admin/categories', icon: FileQuestion, label: 'Danh mục' },
      ],
    },
    {
      title: 'Hệ thống',
      items: [
        { to: '/admin/reports', icon: AlertCircle, label: 'Báo cáo lỗi' },
        { to: '/admin/settings', icon: Settings, label: 'Cài đặt' },
        { to: '/admin/help', icon: HelpCircle, label: 'Trợ giúp' },
      ],
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b">
            <Link to="/admin" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Admin</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {menuItems.map((section, index) => (
              <div key={index} className="mb-6">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive(item.to)
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Back to User */}
          <div className="p-4 border-t">
            <Link
              to="/"
              className="flex items-center justify-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span>← Về trang người dùng</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;