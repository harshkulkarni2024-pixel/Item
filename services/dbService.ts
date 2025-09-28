import { User, PostScenario, Plan, Report, Caption, PostIdea, BroadcastMessage, ActivityLog, UserChatHistory, UserStoryHistory, UserImageHistory, ChatMessage } from '../types';

interface DB {
  users: User[];
  post_scenarios: PostScenario[];
  plans: Plan[];
  reports: Report[];
  captions: Caption[];
  post_ideas: PostIdea[];
  broadcasts: BroadcastMessage[];
  activity_logs: ActivityLog[];
  chat_history: UserChatHistory[];
  story_history: UserStoryHistory[];
  image_history: UserImageHistory[];
}

const DB_KEY = 'item_bot_db';
const ADMIN_IDS = [1337]; 
const ADMIN_ACCESS_CODE = 'A12';
const TEST_USER_ACCESS_CODE = 'N1';
const TEST_USER_FULL_NAME = 'کاربر تست';

const getDB = (): DB => {
  const dbJson = localStorage.getItem(DB_KEY);
  const defaultDB: DB = {
    users: [],
    post_scenarios: [],
    plans: [],
    reports: [],
    captions: [],
    post_ideas: [],
    broadcasts: [],
    activity_logs: [],
    chat_history: [],
    story_history: [],
    image_history: [],
  };

  if (!dbJson) {
    return defaultDB;
  }

  try {
    const parsed = JSON.parse(dbJson);
    
    // Perform deep validation and sanitization. This is crucial to prevent crashes
    // from corrupted localStorage data, e.g., an array containing `null`.
    const sanitizedDB: DB = { ...defaultDB };
    
    if (parsed && typeof parsed === 'object') {
        const sanitize = (arr: any) => Array.isArray(arr) ? arr.filter((item: any) => item && typeof item === 'object') : [];
        
        sanitizedDB.users = sanitize(parsed.users);
        sanitizedDB.post_scenarios = sanitize(parsed.post_scenarios);
        sanitizedDB.plans = sanitize(parsed.plans);
        sanitizedDB.reports = sanitize(parsed.reports);
        sanitizedDB.captions = sanitize(parsed.captions);
        sanitizedDB.post_ideas = sanitize(parsed.post_ideas);
        sanitizedDB.broadcasts = sanitize(parsed.broadcasts);
        sanitizedDB.activity_logs = sanitize(parsed.activity_logs);
        sanitizedDB.chat_history = sanitize(parsed.chat_history);
        sanitizedDB.story_history = sanitize(parsed.story_history);
        sanitizedDB.image_history = sanitize(parsed.image_history);
    } else {
        // If parsed is not an object, data is fundamentally corrupt.
        throw new Error("Invalid DB structure in localStorage (not an object).");
    }

    return sanitizedDB;
  } catch (error) {
    console.error("Failed to parse or validate DB from localStorage. Resetting DB.", error);
    localStorage.removeItem(DB_KEY);
    return defaultDB;
  }
};

const saveDB = (db: DB) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error)    {
    console.error("Failed to save data to localStorage. Storage might be full or permissions are denied.", error);
  }
};

export const initializeDB = () => {
  try {
    let db = getDB();
    let dbNeedsUpdate = false;

    // --- Admin User Validation ---
    let adminUser = db.users.find(u => isUserAdmin(u.user_id));
    const impostorAdmins = db.users.filter(u => u.access_code === ADMIN_ACCESS_CODE && !isUserAdmin(u.user_id));

    if (impostorAdmins.length > 0) {
      db.users = db.users.filter(u => u.access_code !== ADMIN_ACCESS_CODE || isUserAdmin(u.user_id));
      dbNeedsUpdate = true;
      console.warn(`Removed ${impostorAdmins.length} conflicting user(s) with admin access code.`);
    }

    if (adminUser) {
      if (adminUser.access_code !== ADMIN_ACCESS_CODE || adminUser.is_verified !== 1) {
        console.warn("Admin user found but is invalid. Correcting...");
        adminUser.access_code = ADMIN_ACCESS_CODE;
        adminUser.is_verified = 1;
        dbNeedsUpdate = true;
      }
    } else {
      console.warn("Admin user not found, creating a new admin.");
      const newAdminUser: User = {
        user_id: ADMIN_IDS[0],
        full_name: 'مدیر',
        access_code: ADMIN_ACCESS_CODE,
        is_verified: 1,
        story_requests: 0,
        image_requests: 0,
        chat_messages: 0,
        last_request_date: new Date().toISOString().split('T')[0],
      };
      db.users.push(newAdminUser);
      dbNeedsUpdate = true;
    }

    // --- Default Test User Creation ---
    const testUserExists = db.users.some(u => u.access_code === TEST_USER_ACCESS_CODE);
    if (!testUserExists) {
        console.warn("Test user not found, creating a new one.");
        const newTestUser: User = {
            user_id: Date.now() + 1, // Add 1 to avoid potential collision with other timestamps
            full_name: TEST_USER_FULL_NAME,
            access_code: TEST_USER_ACCESS_CODE,
            is_verified: 1,
            story_requests: 0,
            image_requests: 0,
            chat_messages: 0,
            last_request_date: new Date().toISOString().split('T')[0],
            about_info: 'این یک کاربر تستی است.',
        };
        db.users.push(newTestUser);
        dbNeedsUpdate = true;
    }


    if (dbNeedsUpdate) {
      saveDB(db);
    }
  } catch (error) {
      // This is a last resort if initialization itself fails.
      console.error("Critical error during DB initialization. Attempting to reset DB.", error);
      try {
          localStorage.removeItem(DB_KEY);
          const freshDB: DB = {
              users: [
                  {
                    user_id: ADMIN_IDS[0],
                    full_name: 'مدیر',
                    access_code: ADMIN_ACCESS_CODE,
                    is_verified: 1,
                    story_requests: 0,
                    image_requests: 0,
                    chat_messages: 0,
                    last_request_date: new Date().toISOString().split('T')[0],
                  },
              ],
              post_scenarios: [], plans: [], reports: [], captions: [], post_ideas: [], broadcasts: [],
              activity_logs: [], chat_history: [], story_history: [], image_history: []
          };
          // Also create test user in the fresh DB
          const newTestUser: User = {
              user_id: Date.now() + 1,
              full_name: TEST_USER_FULL_NAME,
              access_code: TEST_USER_ACCESS_CODE,
              is_verified: 1,
              story_requests: 0,
              image_requests: 0,
              chat_messages: 0,
              last_request_date: new Date().toISOString().split('T')[0],
              about_info: 'این یک کاربر تستی است.',
          };
          freshDB.users.push(newTestUser);
          saveDB(freshDB);
      } catch (finalError) {
          console.error("FATAL: Could not reset the DB. The application might not work correctly.", finalError);
      }
  }
};

export const logActivity = (userId: number, action: string): void => {
    let db = getDB();
    const user = db.users.find(u => u.user_id === userId);
    // Don't log admin activity or non-existent users
    if (user && !isUserAdmin(userId)) {
        const logEntry: ActivityLog = {
            id: Date.now(),
            user_id: userId,
            user_full_name: user.full_name,
            action: action,
            timestamp: new Date().toISOString(),
        };
        db.activity_logs.unshift(logEntry); // Add to the beginning of the array
        // Limit the log size to prevent localStorage from filling up
        if (db.activity_logs.length > 100) {
            db.activity_logs.pop();
        }
        saveDB(db);
    }
};


export const isUserAdmin = (userId: number): boolean => ADMIN_IDS.includes(userId);

export const verifyAccessCode = (code: string, isSessionLogin: boolean = false): User | null => {
    const db = getDB();
    let user: User | undefined;

    if (isSessionLogin) {
        const userId = parseInt(code, 10);
        if (isNaN(userId)) return null;
        user = db.users.find(u => u.user_id === userId && u.is_verified === 1);
    } else {
        user = db.users.find(u => u.access_code === code && u.is_verified === 1);
    }
    
    if (user) {
        const today = new Date().toISOString().split('T')[0];
        if (user.last_request_date !== today) {
            user.story_requests = 0;
            user.image_requests = 0;
            user.chat_messages = 0;
            user.last_request_date = today;
            saveDB(db);
        }
        if(!isSessionLogin) { // Only log manual logins, not session refreshes
            logActivity(user.user_id, 'به برنامه وارد شد.');
        }
    }
    return user || null;
};

export const getAllUsers = (): User[] => getDB().users.filter(u => !isUserAdmin(u.user_id));

export const getUserById = (userId: number): User | null => getDB().users.find(u => u.user_id === userId) || null;

export const addUser = (fullName: string, accessCode: string): { success: boolean, message: string } => {
    const db = getDB();
    if (db.users.some(u => u.access_code === accessCode)) {
        return { success: false, message: 'این کد دسترسی قبلاً استفاده شده است.' };
    }
    const newUser: User = {
        user_id: Date.now(),
        full_name: fullName,
        access_code: accessCode,
        is_verified: 1, // Web app users are verified on creation by admin
        story_requests: 0,
        image_requests: 0,
        chat_messages: 0,
        last_request_date: new Date().toISOString().split('T')[0],
        about_info: '',
    };
    db.users.push(newUser);
    saveDB(db);
    return { success: true, message: `کاربر '${fullName}' با موفقیت اضافه شد.` };
}

export const deleteUser = (userId: number): void => {
    let db = getDB();
    db.users = db.users.filter(u => u.user_id !== userId);
    db.post_scenarios = db.post_scenarios.filter(p => p.user_id !== userId);
    db.plans = db.plans.filter(p => p.user_id !== userId);
    db.reports = db.reports.filter(r => r.user_id !== userId);
    db.captions = db.captions.filter(c => c.user_id !== userId);
    db.post_ideas = db.post_ideas.filter(i => i.user_id !== userId);
    db.activity_logs = db.activity_logs.filter(l => l.user_id !== userId);
    db.chat_history = db.chat_history.filter(h => h.user_id !== userId);
    db.story_history = db.story_history.filter(h => h.user_id !== userId);
    db.image_history = db.image_history.filter(h => h.user_id !== userId);
    saveDB(db);
}

export const updateUserAbout = (userId: number, about: string): void => {
    let db = getDB();
    const user = db.users.find(u => u.user_id === userId);
    if (user) {
        user.about_info = about;
        saveDB(db);
    }
}

// --- Usage Tracking ---
export const incrementUsage = (userId: number, type: 'story' | 'image' | 'chat'): void => {
    let db = getDB();
    const user = db.users.find(u => u.user_id === userId);
    if (user) {
        const today = new Date().toISOString().split('T')[0];
        if (user.last_request_date !== today) {
            user.story_requests = 0;
            user.image_requests = 0;
            user.chat_messages = 0;
            user.last_request_date = today;
        }

        let action = '';
        if (type === 'story') {
            user.story_requests += 1;
            action = `یک سناریوی استوری (${user.story_requests}/1) تولید کرد.`;
        } else if (type === 'image') {
            user.image_requests += 1;
            action = `یک تصویر (${user.image_requests}/5) تولید کرد.`;
        } else if (type === 'chat') {
            user.chat_messages += 1;
            action = `یک پیام در چت (${user.chat_messages}/10) ارسال کرد.`;
        }
        saveDB(db);
        logActivity(userId, action);
    }
};

// --- Plans ---
export const getPlanForUser = (userId: number): Plan | null => getDB().plans.find(p => p.user_id === userId) || null;

export const savePlanForUser = (userId: number, content: string): void => {
    let db = getDB();
    let plan = db.plans.find(p => p.user_id === userId);
    if (plan) {
        plan.content = content;
        plan.timestamp = new Date().toISOString();
    } else {
        db.plans.push({ id: Date.now(), user_id: userId, content, timestamp: new Date().toISOString() });
    }
    saveDB(db);
};

export const deletePlanForUser = (userId: number): void => {
    let db = getDB();
    db.plans = db.plans.filter(p => p.user_id !== userId);
    saveDB(db);
}

// --- Reports ---
export const getReportsForUser = (userId: number): Report[] => {
    return getDB().reports.filter(r => r.user_id === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const saveReportForUser = (userId: number, content: string): void => {
    let db = getDB();
    // Always add a new report, don't update existing.
    db.reports.push({ id: Date.now(), user_id: userId, content, timestamp: new Date().toISOString() });
    saveDB(db);
};

export const deleteReportForUser = (userId: number): void => {
    let db = getDB();
    db.reports = db.reports.filter(r => r.user_id !== userId);
    saveDB(db);
};

// --- Scenarios ---
export const getScenariosForUser = (userId: number): PostScenario[] => getDB().post_scenarios.filter(p => p.user_id === userId).sort((a, b) => a.scenario_number - b.scenario_number);
export const getScenarioById = (id: number): PostScenario | null => getDB().post_scenarios.find(p => p.id === id) || null;
export const addScenarioForUser = (userId: number, scenarioNumber: number, content: string): void => {
    let db = getDB();
    db.post_scenarios.push({ id: Date.now(), user_id: userId, scenario_number: scenarioNumber, content });
    saveDB(db);
};
export const deleteScenario = (scenarioId: number): void => {
    let db = getDB();
    db.post_scenarios = db.post_scenarios.filter(p => p.id !== scenarioId);
    saveDB(db);
};

// --- Ideas ---
export const getIdeasForUser = (userId: number): PostIdea[] => getDB().post_ideas.filter(i => i.user_id === userId);
export const addIdeaForUser = (userId: number, ideaText: string): void => {
    let db = getDB();
    db.post_ideas.push({ id: Date.now(), user_id: userId, idea_text: ideaText });
    saveDB(db);
    logActivity(userId, 'یک ایده پست جدید ارسال کرد.');
};
export const deleteIdea = (ideaId: number): void => {
    let db = getDB();
    db.post_ideas = db.post_ideas.filter(i => i.id !== ideaId);
    saveDB(db);
};

// --- Captions ---
export const getCaptionsForUser = (userId: number): Caption[] => getDB().captions.filter(c => c.user_id === userId).sort((a, b) => b.id - a.id);
export const addCaption = (userId: number, title: string, content: string, originalScenarioContent: string): void => {
    let db = getDB();
    db.captions.push({ id: Date.now(), user_id: userId, title, content, original_scenario_content: originalScenarioContent });
    saveDB(db);
};

// --- Broadcasts ---
export const getLatestBroadcast = (): BroadcastMessage | null => {
    const db = getDB();
    if (db.broadcasts.length === 0) return null;
    return db.broadcasts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
};

export const addBroadcast = (message: string): void => {
    let db = getDB();
    db.broadcasts.push({ id: Date.now(), message, timestamp: new Date().toISOString() });
    saveDB(db);
};

// --- Activity Log ---
export const getActivityLogs = (): ActivityLog[] => {
    return getDB().activity_logs;
};

// --- History ---
export const getChatHistory = (userId: number): ChatMessage[] => {
    const db = getDB();
    return db.chat_history.find(h => h.user_id === userId)?.messages || [];
};
export const saveChatHistory = (userId: number, messages: ChatMessage[]): void => {
    let db = getDB();
    let userHistory = db.chat_history.find(h => h.user_id === userId);
    if (userHistory) {
        userHistory.messages = messages;
    } else {
        db.chat_history.push({ user_id: userId, messages });
    }
    saveDB(db);
};

export const getStoryHistory = (userId: number): { id: number; content: string }[] => {
    const db = getDB();
    return db.story_history.find(h => h.user_id === userId)?.stories || [];
};
export const saveStoryHistory = (userId: number, storyContent: string): void => {
    let db = getDB();
    let userHistory = db.story_history.find(h => h.user_id === userId);
    const newStory = { id: Date.now(), content: storyContent };
    if (userHistory) {
        userHistory.stories.unshift(newStory);
        if(userHistory.stories.length > 10) userHistory.stories.pop();
    } else {
        db.story_history.push({ user_id: userId, stories: [newStory] });
    }
    saveDB(db);
};

export const getImageHistory = (userId: number): { id: number; url: string }[] => {
    const db = getDB();
    return db.image_history.find(h => h.user_id === userId)?.images || [];
};
export const saveImageHistory = (userId: number, imageUrl: string): void => {
    let db = getDB();
    let userHistory = db.image_history.find(h => h.user_id === userId);
    const newImage = { id: Date.now(), url: imageUrl };
    if (userHistory) {
        userHistory.images.unshift(newImage);
        if (userHistory.images.length > 10) {
            userHistory.images.pop(); // Keep only the last 10
        }
    } else {
        db.image_history.push({ user_id: userId, images: [newImage] });
    }
    saveDB(db);
};

// --- Notifications for Badges ---
export const getNotificationCounts = (userId: number): { scenarios: number, plans: number, reports: number } => {
    const scenarios = getScenariosForUser(userId).length;
    
    const lastPlanView = localStorage.getItem(`lastView_plans_${userId}`);
    const plan = getPlanForUser(userId);
    const plans = plan && (!lastPlanView || new Date(plan.timestamp).getTime() > Number(lastPlanView)) ? 1 : 0;
    
    // For reports, we check if there are any reports newer than the last view time.
    const lastReportView = localStorage.getItem(`lastView_reports_${userId}`);
    const reportsList = getReportsForUser(userId);
    const newReportsCount = reportsList.filter(report => !lastReportView || new Date(report.timestamp).getTime() > Number(lastReportView)).length;

    return { scenarios, plans, reports: newReportsCount };
};

export const getAdminNotificationCounts = (): { ideas: number, logs: number } => {
    const db = getDB();
    const ideas = db.post_ideas.length;

    const lastLogView = localStorage.getItem(`lastView_admin_logs`);
    const lastLogTime = lastLogView ? Number(lastLogView) : 0;
    const logs = db.activity_logs.filter(log => new Date(log.timestamp).getTime() > lastLogTime).length;
    
    return { ideas, logs };
};

const dismissNewsItem = (userId: number, type: 'plan' | 'report' | 'scenarios') => {
    const dismissedKey = `dismissedNews_${userId}`;
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
    let itemToDismissId: string | undefined;

    if (type === 'plan') {
        const plan = getPlanForUser(userId);
        if (plan) itemToDismissId = `plan_${plan.id}`;
    } else if (type === 'report') {
        const latestReport = getReportsForUser(userId)[0];
        if (latestReport) itemToDismissId = `report_${latestReport.id}`;
    } else if (type === 'scenarios') {
        const scenarios = getScenariosForUser(userId);
        if(scenarios.length > 0) {
            const latestScenario = scenarios.sort((a,b) => b.id - a.id)[0];
            itemToDismissId = `scenarios_${latestScenario.id}`;
        }
    }

    if (itemToDismissId && !dismissed.includes(itemToDismissId)) {
        dismissed.push(itemToDismissId);
        localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
    }
}


export const clearUserNotifications = (section: 'scenarios' | 'plans' | 'reports', userId: number): void => {
    if (section === 'scenarios') {
        dismissNewsItem(userId, 'scenarios');
    } else {
        localStorage.setItem(`lastView_${section}_${userId}`, String(Date.now()));
        // FIX: The dismissNewsItem function expects singular 'plan' or 'report', not plural.
        if (section === 'plans') {
            dismissNewsItem(userId, 'plan');
        } else { // section is 'reports'
            dismissNewsItem(userId, 'report');
        }
    }
};


export const clearAdminNotifications = (section: 'ideas' | 'logs'): void => {
     if(section === 'ideas') {
        // Ideas are cleared by being deleted, so we do nothing here.
     } else {
        localStorage.setItem(`lastView_admin_${section}`, String(Date.now()));
     }
};