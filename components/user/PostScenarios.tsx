
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../types';
import * as db from '../../services/dbService';
import { generateCaptionStream } from '../../services/geminiService';
import { Loader } from '../common/Loader';
import { Icon } from '../common/Icon';
import { UserViewType } from './UserView';

interface PostScenariosProps {
  user: User;
  setActiveView: (view: UserViewType) => void;
  onUserUpdate: () => void;
}

const PostScenarios: React.FC<PostScenariosProps> = ({ user, setActiveView, onUserUpdate }) => {
    const [scenarios, setScenarios] = useState(db.getScenariosForUser(user.user_id));
    const [selectedScenario, setSelectedScenario] = useState<ReturnType<typeof db.getScenarioById>>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState('');

    const refreshScenarios = useCallback(() => {
        setScenarios(db.getScenariosForUser(user.user_id));
        onUserUpdate(); // Refresh parent component's user state to update notification counts
    }, [user.user_id, onUserUpdate]);

    useEffect(() => {
        // This view functions as the notification "inbox". Viewing it clears the badge.
        // We handle this by simply re-evaluating counts in the parent.
        onUserUpdate();
    }, [onUserUpdate]);

    const handleRecord = async (scenarioId: number) => {
        setIsLoading(true);
        setNotification('عالی! در حال تولید کپشن برای شما...');
        const scenarioToProcess = db.getScenarioById(scenarioId);
        if (scenarioToProcess) {
            try {
                let captionContent = '';
                const stream = generateCaptionStream(user.about_info || '', scenarioToProcess.content);
                for await (const chunk of stream) {
                    captionContent += chunk;
                }
                const captionTitle = `کپشن سناریو شماره ${scenarioToProcess.scenario_number}`;
                db.addCaption(user.user_id, captionTitle, captionContent, scenarioToProcess.content);
                db.deleteScenario(scenarioId);
                db.logActivity(user.user_id, `سناریو شماره ${scenarioToProcess.scenario_number} را تایید کرد.`);
                setNotification(`آفرین! کپشن برای سناریو شماره ${scenarioToProcess.scenario_number} تولید شد. می‌تونی تو بخش «کپشن‌ها» پیداش کنی.`);
            } catch (error) {
                console.error(error);
                setNotification('خطا در تولید کپشن، اما سناریو به عنوان انجام شده علامت‌گذاری شد.');
                db.deleteScenario(scenarioId);
            } finally {
                refreshScenarios();
                setSelectedScenario(null);
                setIsLoading(false);
                setTimeout(() => setNotification(''), 5000);
            }
        }
    };
    
    if (selectedScenario) {
        return (
            <div className="max-w-3xl mx-auto animate-fade-in">
                <button onClick={() => setSelectedScenario(null)} className="flex items-center text-violet-400 hover:text-violet-300 mb-4">
                    <Icon name="back" className="w-5 h-5 ms-2" />
                    بازگشت به لیست
                </button>
                <div className="bg-slate-800 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4 text-white">🎬 سناریو شماره {selectedScenario.scenario_number}</h2>
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedScenario.content}</p>
                    <button 
                        onClick={() => handleRecord(selectedScenario.id)}
                        disabled={isLoading}
                        className="mt-6 w-full flex justify-center items-center bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-600 transition-colors"
                    >
                        {isLoading ? <Loader /> : '✅ این ویدیو را ضبط کردم!'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2">سناریوهای پست شما</h1>
            <p className="text-slate-400 mb-6">این‌ها ایده‌های ویدیویی هستن که منتظر هنرنمایی تو هستن.</p>

            {notification && (
                <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg mb-6 text-center">
                    {notification}
                </div>
            )}

            {scenarios.length === 0 ? (
                <div className="text-center bg-slate-800 p-8 rounded-lg">
                    <p className="text-slate-300">هنوز سناریویی برای شما ثبت نشده. با خیال راحت از دکمه «ارسال ایده» استفاده کن!</p>
                     <button onClick={() => setActiveView('post_idea')} className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                        ارسال ایده
                     </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenarios.map(scenario => (
                        <div key={scenario.id} className="bg-slate-800 p-5 rounded-lg flex flex-col justify-between shadow-lg hover:shadow-violet-500/20 transition-shadow">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">🎬 سناریو شماره {scenario.scenario_number}</h3>
                                <p className="text-slate-400 line-clamp-4">{scenario.content}</p>
                            </div>
                            <button onClick={() => setSelectedScenario(scenario)} className="mt-4 w-full bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-violet-600 transition-colors">
                                مشاهده سناریوی کامل
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PostScenarios;