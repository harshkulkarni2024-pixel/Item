import React, { useState, useEffect } from 'react';
import { getLatestAlgorithmNews } from '../../services/geminiService';
import { Loader } from '../common/Loader';
import { Icon } from '../common/Icon';

interface GroundingChunk {
    web: {
        uri: string;
        title: string;
    };
}

const AlgorithmNews: React.FC = () => {
    const [article, setArticle] = useState('');
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            const cacheKey = 'instagram_algorithm_news';
            const cachedData = localStorage.getItem(cacheKey);
            const today = new Date().toISOString().split('T')[0];

            if (cachedData) {
                try {
                    const { date, article: cachedArticle, sources: cachedSources } = JSON.parse(cachedData);
                    if (date === today && cachedArticle) {
                        setArticle(cachedArticle);
                        setSources(cachedSources || []);
                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    // Cached data is corrupted, proceed to fetch new data
                    localStorage.removeItem(cacheKey);
                }
            }

            try {
                const { text, groundingChunks } = await getLatestAlgorithmNews();
                setArticle(text);
                setSources(groundingChunks || []);
                localStorage.setItem(cacheKey, JSON.stringify({ date: today, article: text, sources: groundingChunks || [] }));
            } catch (err) {
                setError('متاسفانه در دریافت آخرین اخبار مشکلی پیش آمد. لطفاً بعداً دوباره تلاش کنید.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, []);
    
    const refreshNews = () => {
        localStorage.removeItem('instagram_algorithm_news');
        setArticle('');
        setSources([]);
        setError('');
        setIsLoading(true);
        
        // Re-fetch the news immediately
        (async () => {
            try {
                const { text, groundingChunks } = await getLatestAlgorithmNews();
                const today = new Date().toISOString().split('T')[0];
                setArticle(text);
                setSources(groundingChunks || []);
                localStorage.setItem('instagram_algorithm_news', JSON.stringify({ date: today, article: text, sources: groundingChunks || [] }));
            } catch (err) {
                setError('متاسفانه در دریافت آخرین اخبار مشکلی پیش آمد. لطفاً بعداً دوباره تلاش کنید.');
            } finally {
                setIsLoading(false);
            }
        })();
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                 <h1 className="text-3xl font-bold text-white">آخرین اخبار الگوریتم اینستاگرام</h1>
                 <button onClick={refreshNews} disabled={isLoading} className="p-2 text-slate-400 hover:text-white disabled:opacity-50 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M20 4l-4 4M4 20l4-4M1 12h5M18 12h5" /></svg>
                 </button>
            </div>
            <p className="text-slate-400 mb-6">این مقاله به صورت روزانه توسط هوش مصنوعی و با جستجو در وب بروزرسانی می‌شود.</p>

            {isLoading && (
                <div className="bg-slate-800 p-8 rounded-lg text-center border border-slate-700">
                    <Loader />
                    <p className="mt-4 text-slate-300">در حال جستجو و تحلیل آخرین اخبار الگوریتم...</p>
                </div>
            )}
            
            {error && (
                 <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                    {error}
                </div>
            )}

            {!isLoading && !error && article && (
                 <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-strong:text-white prose-headings:text-violet-400 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: article }} />
                    
                    {sources.length > 0 && (
                        <div className="mt-8 border-t border-slate-700 pt-4">
                            <h3 className="text-lg font-semibold text-slate-300 mb-2 flex items-center">
                                <Icon name="document-text" className="w-5 h-5 me-2" />
                                منابع
                            </h3>
                            <ul className="list-disc list-inside space-y-1">
                                {sources.map((source, index) => (
                                    <li key={index} className="text-sm">
                                        <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors">
                                            {source.web.title || source.web.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
};

export default AlgorithmNews;