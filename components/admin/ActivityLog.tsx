
import React, { useState, useEffect } from 'react';
import { ActivityLog as ActivityLogType } from '../../types';
import * as db from '../../services/dbService';
import { Icon } from '../common/Icon';

const ActivityLog: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLogType[]>([]);

    useEffect(() => {
        setLogs(db.getActivityLogs());
        db.clearAdminNotifications('logs');
    }, []);

    const timeSince = (date: string): string => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " سال پیش";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " ماه پیش";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " روز پیش";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " ساعت پیش";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " دقیقه پیش";
        return "لحظاتی پیش";
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2">آخرین فعالیت‌های کاربران</h1>
            <p className="text-slate-400 mb-6">در اینجا آخرین ۱۰۰ فعالیت ثبت شده توسط کاربران را مشاهده می‌کنید.</p>

            {logs.length === 0 ? (
                <div className="text-center bg-slate-800 p-8 rounded-lg">
                    <Icon name="document-text" className="mx-auto w-12 h-12 text-slate-500 mb-4" />
                    <p className="text-slate-300">هنوز هیچ فعالیتی ثبت نشده است.</p>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-lg shadow-lg">
                    <ul className="divide-y divide-slate-700">
                        {logs.map(log => (
                            <li key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50">
                                <div>
                                    <p className="text-white">
                                        <span className="font-bold text-violet-400">{log.user_full_name}</span> {log.action}
                                    </p>
                                </div>
                                <span className="text-xs text-slate-400 flex-shrink-0">{timeSince(log.timestamp)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ActivityLog;
