
import React, { useState, useEffect } from 'react';
import { User, Report } from '../../types';
import { getReportForUser, clearUserNotifications } from '../../services/dbService';
import { Icon } from '../common/Icon';

interface ReportsProps {
  user: User;
  onUserUpdate: () => void;
}

const Reports: React.FC<ReportsProps> = ({ user, onUserUpdate }) => {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    setReport(getReportForUser(user.user_id));
    clearUserNotifications('reports', user.user_id);
    onUserUpdate(); // Let parent know to refresh notification counts
  }, [user.user_id, onUserUpdate]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-2">گزارشات شما</h1>
      <p className="text-slate-400 mb-6">آخرین گزارش‌های مربوط به عملکرد محتوای خود را بررسی کنید.</p>

      <div className="bg-slate-800 p-6 rounded-lg">
        {report && report.content ? (
          <p className="text-slate-300 whitespace-pre-wrap">{report.content}</p>
        ) : (
          <div className="text-center py-8">
             <Icon name="report" className="mx-auto w-12 h-12 text-slate-500 mb-4" />
            <p className="text-slate-400">هنوز گزارشی برای شما موجود نیست.</p>
            <p className="text-sm text-slate-500">برای مشاهده تحلیل عملکرد خود بعداً مراجعه کنید.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;